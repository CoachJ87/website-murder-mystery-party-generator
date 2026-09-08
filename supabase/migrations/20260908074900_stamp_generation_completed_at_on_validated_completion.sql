-- ADR-0103 Addendum 30 (follow-up): validate_package_characters() should be
-- the single source of truth for generation_completed_at, not just
-- generation_status.
--
-- Traced why Nathan Dubois's package showed generation_completed_at =
-- 21:33:32 even though the real completion (logged: "promoted from
-- needs_review to completed") happened at 21:52:00, ~19 minutes and 3
-- characters later. The trigger already re-validates generation_status on
-- every transition into 'completed' (ADR-0108) and correctly demotes a
-- premature attempt to 'needs_review' -- but it has never touched
-- generation_completed_at, so whichever caller set that column on the
-- premature attempt (this repo's own generation-complete.js, the client
-- self-heal in mysteryPackageService.ts, or Make.com's Child scenario
-- writing directly -- exact writer not conclusively identified) leaves a
-- stale timestamp sitting in the row even after the status is later
-- correctly promoted for real by promote_complete_packages() /
-- heal_completed_packages().
--
-- Confirmed via query_logs this is not a one-off: 4 of the last 28
-- completed packages show generation_completed_at preceding the last
-- character's actual created_at (one by ~3 hours).
--
-- No customer-facing consumer currently reads this column's *value* (only
-- IS NULL / IS NOT NULL truthiness -- confirmed by grep across src/,
-- supabase/functions/, api/), so this is deliberately scoped as cheap
-- insurance rather than an urgent fix: it makes the column trustworthy
-- again in case anything (analytics, a future SLA display) ever starts
-- reading its value, without requiring a Make.com blueprint audit to find
-- the actual premature writer -- closing the gap regardless of which
-- external system performs the write, same philosophy as ADR-0108's own
-- fix to this same function.
--
-- Fix: on the validated-clean branch (array_length(_reasons,1) IS NULL --
-- i.e. this transition into 'completed' actually passed every guard), stamp
-- generation_completed_at := now() unconditionally, overriding whatever any
-- caller tried to set. promote_complete_packages()'s own precondition
-- (generation_completed_at IS NOT NULL) is unaffected: that value is still
-- set by the original (possibly premature) writer during the demoted
-- interim state, this only refines it at the moment genuine completion is
-- actually confirmed.
--
-- See docs/adr/0103-new-purchase-coherence-sweep-ritual.md Addendum 29/30.

CREATE OR REPLACE FUNCTION public.validate_package_characters()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  _expected_count int;
  _actual_count int;
  _empty_count int;
  _conversation_id uuid;
  _structural_defects text[];
  _reasons text[] := ARRAY[]::text[];
  _anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM2MTc5MTIsImV4cCI6MjA1OTE5MzkxMn0.xrGd-6SlR2UNOf_1HQJWIsKNe-rNOtPuOsYE8VrRI6w';
BEGIN
  -- ADR-0108: fire on EVERY transition of generation_status into
  -- 'completed', not just the first generation_completed_at write. Skip
  -- when NEW isn't becoming 'completed' at all, or when OLD was already
  -- 'completed' (an unrelated later edit to an already-validated row --
  -- prevents re-validation churn / repeat notify-generation-issue calls
  -- on every subsequent touch of an already-completed package).
  IF NEW.generation_status->>'status' IS DISTINCT FROM 'completed'
     OR OLD.generation_status->>'status' = 'completed' THEN
    RETURN NEW;
  END IF;

  _conversation_id := NEW.conversation_id;

  -- Count expected characters from extracted_characters (ADR-0094: shared
  -- parser, was inline here).
  _expected_count := public.package_expected_character_count(NEW);

  -- Count actual characters with content
  SELECT COUNT(*), COUNT(*) FILTER (WHERE description IS NULL OR character_role IS NULL)
  INTO _actual_count, _empty_count
  FROM mystery_characters
  WHERE package_id = NEW.id;

  -- ADR-0049: structural-integrity gate -- invalid character_role enum values,
  -- or a raw upstream error/HTML body verbatim in any delivered field. Catches
  -- the Velvet Viper (2026-07-30) / Coronation (2026-07-31) failure mode
  -- BEFORE completion, rather than after (ADR-0048's detector).
  _structural_defects := public.package_completion_blocking_defects(NEW);

  IF _empty_count > 0 OR (_expected_count > 0 AND _actual_count < _expected_count) THEN
    _reasons := _reasons || (_empty_count || ' character(s) have missing content');
  END IF;

  IF _structural_defects IS NOT NULL THEN
    _reasons := _reasons || _structural_defects;
  END IF;

  -- If there are empty characters, missing characters, or structural defects,
  -- flag and notify instead of letting completion stand.
  IF array_length(_reasons, 1) > 0 THEN
    NEW.generation_status := jsonb_build_object(
      'status', 'needs_review',
      'progress', 100,
      'currentStep', 'Generation completed but needs review: ' || array_to_string(_reasons, '; '),
      'sections', jsonb_build_object(
        'hostGuide', true,
        'characters', (_empty_count = 0 AND _structural_defects IS NULL),
        'clues', true
      ),
      'emptyCharacters', _empty_count,
      'expectedCharacters', _expected_count,
      'actualCharacters', _actual_count,
      'structuralDefects', to_jsonb(coalesce(_structural_defects, ARRAY[]::text[]))
    );

    -- Call the Edge Function via pg_net
    PERFORM net.http_post(
      url := 'https://mhfikaomkmqcndqfohbp.supabase.co/functions/v1/notify-generation-issue',
      body := jsonb_build_object('conversation_id', _conversation_id),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || _anon_key,
        'apikey', _anon_key
      )
    );

    RAISE LOG 'Package % flagged at completion: %', NEW.id, array_to_string(_reasons, '; ');
  ELSE
    -- Genuinely validated completion: this trigger is the authoritative
    -- source of truth for when a package actually finished, overriding
    -- whatever timestamp any caller (in-repo or external) tried to set in
    -- the same statement. Fixes the stale-timestamp shape from ADR-0103
    -- Addendum 29.
    NEW.generation_completed_at := now();
  END IF;

  RETURN NEW;
END;
$function$;
