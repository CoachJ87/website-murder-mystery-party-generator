-- ADR-0055 Addendum (2026-09-07): restore the needs_review widening that
-- 20260810_add_is_test_flag_and_harden_health_check_detectors.sql silently
-- reverted.
--
-- ADR-0055 (2026-08-02) widened 8 list_packages_* detector RPCs from
-- `status = 'completed'` to `status IN ('completed', 'needs_review')` (and
-- `IN ('completed','complete')` to `IN ('completed','complete','needs_review')`
-- for list_packages_with_structural_defects). Reason: the completion gate
-- (validate_package_characters) sets needs_review precisely when one of these
-- detectors finds a defect -- and the old '= completed' filter then made that
-- same package invisible to the auto-remediation worker meant to heal it. A
-- gate that hides its own casualties.
--
-- The 2026-08-10 migration recreated those same 8 functions (to add an
-- unrelated is_test filter) from stale pre-ADR-0055 bodies instead of
-- rewriting them programmatically the way ADR-0055's own migration did.
-- That silently dropped the widening on all 8, live in production, for a
-- month, with nobody noticing until this: package
-- 323e0cc7-801f-4d0e-b35c-69e36ebc4dfc ("Blood Moon Requiem", paid,
-- conversation 488f078b-349d-4066-9be8-18d3c50d03c9) hit the exact same
-- deadlock ADR-0055 first found on "Golden Flamingo":
--
--   select package_completion_blocking_defects(mp.*) from mystery_packages mp
--   where mp.id = '323e0cc7-801f-4d0e-b35c-69e36ebc4dfc';
--   -- {"self_directed_question.Sable/Saben Crimson"}
--
--   select * from list_packages_with_self_directed_questions('2026-09-01');
--   -- (0 rows)
--
-- This migration re-runs ADR-0055's exact rewrite. EXCLUDES
-- list_packages_with_unconfessed_culprit: created 2026-08-08, after ADR-0055
-- shipped, never part of its widened set. Its completed-only scope is a
-- deliberate design choice for a final-statement check that only makes sense
-- once generation is fully done, not a casualty of this regression.

DO $migration$
DECLARE
  _fn record;
  _new_def text;
  _changed int := 0;
BEGIN
  FOR _fn IN
    SELECT p.oid, p.proname, pg_get_functiondef(p.oid) AS def
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname LIKE 'list_packages_%'
      AND p.proname <> 'list_packages_with_unconfessed_culprit'
  LOOP
    _new_def := replace(
      replace(_fn.def,
        '(mp.generation_status->>''status'') = ''completed''',
        '(mp.generation_status->>''status'') IN (''completed'', ''needs_review'')'),
      ') IN (''completed'', ''complete'')',
      ') IN (''completed'', ''complete'', ''needs_review'')'
    );

    IF _new_def <> _fn.def THEN
      EXECUTE _new_def;
      _changed := _changed + 1;
      RAISE LOG 'restored ADR-0055 needs_review widening on %', _fn.proname;
    END IF;
  END LOOP;

  IF _changed <> 8 THEN
    RAISE EXCEPTION 'expected to restore widening on 8 detector RPCs, restored %', _changed;
  END IF;
END
$migration$;
