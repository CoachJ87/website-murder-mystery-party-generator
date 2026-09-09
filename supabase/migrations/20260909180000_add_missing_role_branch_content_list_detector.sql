-- ADR-0103 Addendum 35/36: wires missing_role_branch_content (Addendum 31)
-- into the auto-heal pipeline. Addendum 31 built the DETECTION
-- (package_completion_blocking_defects()'s peer-existence check) but left
-- the FIX manual/alert-only: "only 2 live instances found... wiring a new
-- auto-heal path for a defect this rare is more standing machinery than the
-- evidence currently supports. Revisit if this recurs." It recurred the very
-- next day (Addendum 35) on an unrelated package -- this migration is that
-- revisit.
--
-- auto-remediate-packages (ADR-0047/0061) already self-heals three other
-- character-scope defect classes (identity_contamination, slip_culprit_leak,
-- meta_text_leak) by delegating to regenerate-child-content, but it dispatches
-- from a `list_packages_with_*` RPC per class, not from
-- package_completion_blocking_defects() directly (that function returns a
-- flat text[] of "class.character" strings for the completion-gate triggers,
-- not the structured {package_id, character_name, fields} shape the
-- delegation loop needs). This function is the missing `list_packages_with_*`
-- counterpart, built specifically for delegation: one row per
-- (package_id, character_name) naming exactly which of the 6 accomplice/
-- reveal-confession fields are missing on THAT peer, so regenerate-child-
-- content is called with a precise field list instead of re-deriving it.
--
-- Same peer-existence gate as package_completion_blocking_defects() (verified
-- to produce identical hits below), same 30-day-window / completed-or-
-- needs_review / non-test / character-style scoping as every sibling
-- list_packages_with_* detector -- which also means the ~13 pre-2026-08-11
-- historical instances Addendum 31 explicitly decided not to backfill stay
-- untouched by construction, not by a special-case exclusion.
CREATE OR REPLACE FUNCTION public.list_packages_with_missing_role_branch_content(
  _since timestamptz DEFAULT '2026-04-01 00:00:00+00'::timestamptz
)
RETURNS TABLE(
  package_id uuid,
  conversation_id uuid,
  title text,
  is_paid boolean,
  created_at timestamptz,
  character_name text,
  fields text[]
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH pkg AS (
    SELECT mp.id AS package_id, mp.conversation_id, c.title, c.is_paid, mp.created_at
    FROM mystery_packages mp
    JOIN conversations c ON c.id = mp.conversation_id
    WHERE (mp.generation_status ->> 'status') IN ('completed', 'needs_review')
      AND mp.created_at >= _since
      AND NOT c.is_test
      AND mp.mystery_style = 'character'
  ),
  peer AS (
    SELECT p.package_id,
      bool_or(coalesce(mc.round2_accomplice,'') <> '') AS has_r2acc,
      bool_or(coalesce(mc.round3_accomplice,'') <> '') AS has_r3acc,
      bool_or(coalesce(mc.round4_accomplice,'') <> '') AS has_r4acc,
      bool_or(coalesce(mc.final_accomplice,'') <> '') AS has_finalacc,
      bool_or(coalesce(mc.reveal_confession_accomplice,'') <> '') AS has_revacc,
      bool_or(coalesce(mc.reveal_confession_guilty,'') <> '') AS has_revguilty
    FROM pkg p
    JOIN mystery_characters mc ON mc.package_id = p.package_id
    GROUP BY p.package_id
  )
  SELECT p.package_id, p.conversation_id, p.title, p.is_paid, p.created_at, mc.character_name,
    array_remove(ARRAY[
      CASE WHEN pr.has_r2acc AND coalesce(mc.round2_accomplice,'') = '' THEN 'round2_accomplice' END,
      CASE WHEN pr.has_r3acc AND coalesce(mc.round3_accomplice,'') = '' THEN 'round3_accomplice' END,
      CASE WHEN pr.has_r4acc AND coalesce(mc.round4_accomplice,'') = '' THEN 'round4_accomplice' END,
      CASE WHEN pr.has_finalacc AND coalesce(mc.final_accomplice,'') = '' THEN 'final_accomplice' END,
      CASE WHEN pr.has_revacc AND coalesce(mc.reveal_confession_accomplice,'') = '' THEN 'reveal_confession_accomplice' END,
      CASE WHEN pr.has_revguilty AND coalesce(mc.reveal_confession_guilty,'') = '' THEN 'reveal_confession_guilty' END
    ], NULL) AS fields
  FROM pkg p
  JOIN peer pr ON pr.package_id = p.package_id
  JOIN mystery_characters mc ON mc.package_id = p.package_id
  WHERE
    (pr.has_r2acc AND coalesce(mc.round2_accomplice,'') = '') OR
    (pr.has_r3acc AND coalesce(mc.round3_accomplice,'') = '') OR
    (pr.has_r4acc AND coalesce(mc.round4_accomplice,'') = '') OR
    (pr.has_finalacc AND coalesce(mc.final_accomplice,'') = '') OR
    (pr.has_revacc AND coalesce(mc.reveal_confession_accomplice,'') = '') OR
    (pr.has_revguilty AND coalesce(mc.reveal_confession_guilty,'') = '')
  ORDER BY p.is_paid DESC, p.created_at DESC;
$function$;
