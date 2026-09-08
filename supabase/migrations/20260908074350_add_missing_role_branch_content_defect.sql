-- Extends package_completion_blocking_defects() to catch a per-character
-- role-branch content gap that the existing missing_round_content check
-- (ADR-0096) deliberately excluded: round2/3/4_accomplice, final_accomplice,
-- reveal_confession_guilty, reveal_confession_accomplice.
--
-- ADR-0096 excluded these because it believed the accomplice branch was
-- "conditional on conversations.has_accomplice" -- ADR-0103 Addendum 31 found
-- that's wrong: conversations.has_accomplice is unreliable for mystery_style
-- = 'character' (validate_package_characters() resets it based on whether any
-- character_role = 'accomplice' is PRE-ASSIGNED, which never happens in a
-- slip-style game -- roles are drawn at the table, not stored until played).
--
-- Gate: peer-existence WITHIN THE SAME PACKAGE, not a keyword/date check.
-- If ANY character in this package has a given field populated, every
-- character should (everyone might draw any role at the table) -- so an
-- empty one on a peer is a real gap. A package that legitimately has no
-- accomplice role at all (nobody has the field) never trips this. This also
-- sidesteps the reveal_confession_guilty/accomplice fields' rollout date
-- (added ~2026-08-05) without hardcoding it: an old package where NO
-- character has the field looks the same as one that predates the field
-- existing, and both are correctly not flagged.
--
-- Deliberately NOT keyword-matching detective_script text (e.g. "accomplice")
-- as the gate: the sweep that found this also found it breaks for non-English
-- packages ("Veneno En La Medianoche" never says the English word "accomplice"
-- despite legitimately having a full accomplice branch) -- the exact
-- English-pattern blind spot ADR-0103 step 6 already warns about for manual
-- checks, now avoided here by construction rather than by remembering to
-- translate a regex.
CREATE OR REPLACE FUNCTION public.package_completion_blocking_defects(_pkg mystery_packages)
 RETURNS text[]
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  _defects text[] := ARRAY[]::text[];
  _pattern text := '<html[\s>]|<!doctype\s+html|bad gateway|gateway[\s-]*time[\s-]*out|50[234]\s+(bad gateway|service unavailable|gateway[\s-]*time[\s-]*out)';
  _meta_pattern text := '(let me reconsider|let me reread|let me recalculate|let me look at this more carefully|i need to correct this|on second thought|master_context|as an ai language model|wait, i need to|\[closing paragraph|\[insert |\[choose |\[if guilty)';
  _hit record;
  _overview_name text;
  _overview_surname text;
  _has_r2acc boolean;
  _has_r3acc boolean;
  _has_r4acc boolean;
  _has_finalacc boolean;
  _has_revacc boolean;
  _has_revguilty boolean;
BEGIN
  IF _pkg.id IS NULL THEN
    RETURN NULL;
  END IF;

  FOR _hit IN
    SELECT kv.key
    FROM jsonb_each_text(to_jsonb(_pkg)) AS kv(key, value)
    WHERE kv.key IN (
      'title', 'game_overview', 'host_guide', 'materials', 'preparation_instructions',
      'timeline', 'hosting_tips', 'evidence_cards', 'relationship_matrix', 'detective_script'
    )
    AND kv.value ~* _pattern
  LOOP
    _defects := _defects || ('error_body_in_package.' || _hit.key);
  END LOOP;

  FOR _hit IN
    SELECT mc.character_name AS key
    FROM mystery_characters mc
    WHERE mc.package_id = _pkg.id
      AND mc.character_role IS NOT NULL
      AND mc.character_role NOT IN ('murderer', 'accomplice', 'suspect', 'redHerring')
  LOOP
    _defects := _defects || ('invalid_role.' || _hit.key);
  END LOOP;

  FOR _hit IN
    SELECT mc.character_name || '.' || kv.key AS key
    FROM mystery_characters mc,
         jsonb_each_text(to_jsonb(mc)) AS kv(key, value)
    WHERE mc.package_id = _pkg.id
      AND kv.key NOT IN ('id', 'package_id', 'created_at', 'updated_at')
      AND kv.value ~* _pattern
  LOOP
    _defects := _defects || ('error_body_in_character.' || _hit.key);
  END LOOP;

  IF (
    coalesce(_pkg.game_overview,'') || ' ' || coalesce(_pkg.detective_script,'') || ' ' ||
    coalesce(_pkg.host_guide,'') || ' ' || coalesce(_pkg.timeline,'') || ' ' ||
    coalesce(_pkg.hosting_tips,'') || ' ' || coalesce(_pkg.preparation_instructions,'') || ' ' ||
    coalesce(_pkg.evidence_cards #>> '{}','')
  ) ~* _meta_pattern THEN
    _defects := _defects || 'meta_text_leak.package'::text;
  END IF;

  FOR _hit IN
    SELECT mc.character_name AS key
    FROM mystery_characters mc
    WHERE mc.package_id = _pkg.id
      AND (
        coalesce(mc.introduction,'') || ' ' || coalesce(mc.rumors,'') || ' ' ||
        coalesce(mc.background,'') || ' ' || coalesce(mc.secret,'') || ' ' ||
        coalesce(mc.relationships::text,'') || ' ' || coalesce(mc.description::text,'') || ' ' ||
        coalesce(mc.accusations,'') || ' ' ||
        coalesce(mc.round2_script,'') || ' ' || coalesce(mc.round3_script,'') || ' ' ||
        coalesce(mc.round4_script,'') || ' ' || coalesce(mc.final_statement,'') || ' ' ||
        coalesce(mc.round2_innocent,'') || ' ' || coalesce(mc.round2_guilty,'') || ' ' || coalesce(mc.round2_accomplice,'') || ' ' ||
        coalesce(mc.round3_innocent,'') || ' ' || coalesce(mc.round3_guilty,'') || ' ' || coalesce(mc.round3_accomplice,'') || ' ' ||
        coalesce(mc.round4_innocent,'') || ' ' || coalesce(mc.round4_guilty,'') || ' ' || coalesce(mc.round4_accomplice,'') || ' ' ||
        coalesce(mc.final_innocent,'') || ' ' || coalesce(mc.final_guilty,'') || ' ' || coalesce(mc.final_accomplice,'')
      ) ~* _meta_pattern
  LOOP
    _defects := _defects || ('meta_text_leak.character.' || _hit.key);
  END LOOP;

  FOR _hit IN
    SELECT mc.character_name AS key
    FROM mystery_characters mc
    WHERE mc.package_id = _pkg.id
      AND (coalesce(mc.round2_questions,'') || ' ' || coalesce(mc.round3_questions,'') || ' ' || coalesce(mc.round4_questions,''))
          ~* ('\*\*to ' || regexp_replace(mc.character_name, '([\[\](){}.*+?^$\\|])', '\\\1', 'g') || '\M')
  LOOP
    _defects := _defects || ('self_directed_question.' || _hit.key);
  END LOOP;

  -- ADR-0096: a character's round-content call group (round2/3/4_script +
  -- final_statement for detective style; round2/3/4_innocent + final_innocent
  -- + round2/3/4_guilty + final_guilty for character style -- these two
  -- branches are generated for every character regardless of role, so an
  -- empty one is never legitimate) occasionally comes back and gets written
  -- as entirely empty while Make.com still reports the run as successful.
  -- round2/3/4_questions is shared by both styles and checked either way.
  FOR _hit IN
    SELECT mc.character_name AS key
    FROM mystery_characters mc
    WHERE mc.package_id = _pkg.id
      AND (
        (_pkg.mystery_style = 'character' AND (
          coalesce(mc.round2_innocent,'') = '' OR coalesce(mc.round3_innocent,'') = '' OR
          coalesce(mc.round4_innocent,'') = '' OR coalesce(mc.final_innocent,'') = '' OR
          coalesce(mc.round2_guilty,'') = '' OR coalesce(mc.round3_guilty,'') = '' OR
          coalesce(mc.round4_guilty,'') = '' OR coalesce(mc.final_guilty,'') = ''
        ))
        OR (_pkg.mystery_style IS DISTINCT FROM 'character' AND (
          coalesce(mc.round2_script,'') = '' OR coalesce(mc.round3_script,'') = '' OR
          coalesce(mc.round4_script,'') = '' OR coalesce(mc.final_statement,'') = ''
        ))
        OR coalesce(mc.round2_questions,'') = '' OR coalesce(mc.round3_questions,'') = '' OR coalesce(mc.round4_questions,'') = ''
      )
  LOOP
    _defects := _defects || ('missing_round_content.' || _hit.key);
  END LOOP;

  -- ADR-0103 Addendum 31 (2026-09-08): the accomplice branch + reveal
  -- confession fields ADR-0096 deliberately left out above. See migration
  -- header comment for the peer-existence gate rationale.
  IF _pkg.mystery_style = 'character' THEN
    SELECT
      bool_or(coalesce(round2_accomplice,'') <> ''),
      bool_or(coalesce(round3_accomplice,'') <> ''),
      bool_or(coalesce(round4_accomplice,'') <> ''),
      bool_or(coalesce(final_accomplice,'') <> ''),
      bool_or(coalesce(reveal_confession_accomplice,'') <> ''),
      bool_or(coalesce(reveal_confession_guilty,'') <> '')
    INTO _has_r2acc, _has_r3acc, _has_r4acc, _has_finalacc, _has_revacc, _has_revguilty
    FROM mystery_characters
    WHERE package_id = _pkg.id;

    FOR _hit IN
      SELECT mc.character_name AS key
      FROM mystery_characters mc
      WHERE mc.package_id = _pkg.id
        AND (
          (_has_r2acc AND coalesce(mc.round2_accomplice,'') = '') OR
          (_has_r3acc AND coalesce(mc.round3_accomplice,'') = '') OR
          (_has_r4acc AND coalesce(mc.round4_accomplice,'') = '') OR
          (_has_finalacc AND coalesce(mc.final_accomplice,'') = '') OR
          (_has_revacc AND coalesce(mc.reveal_confession_accomplice,'') = '') OR
          (_has_revguilty AND coalesce(mc.reveal_confession_guilty,'') = '')
        )
    LOOP
      _defects := _defects || ('missing_role_branch_content.' || _hit.key);
    END LOOP;
  END IF;

  _overview_name := (regexp_match(coalesce(_pkg.game_overview,''), 'Game Overview\s*\n+\s*([A-Z][a-z]+\s+[A-Z][a-z]+)'))[1];
  IF _overview_name IS NOT NULL THEN
    _overview_surname := (regexp_match(_overview_name, '([A-Za-z]+)$'))[1];
    IF _overview_surname IS NOT NULL AND length(_overview_surname) >= 4
       AND coalesce(_pkg.master_context,'') !~* ('\m' || _overview_surname || '\M')
       AND NOT EXISTS (
         SELECT 1 FROM mystery_characters mc
         WHERE mc.package_id = _pkg.id
           AND (coalesce(mc.background,'') || ' ' || coalesce(mc.relationships::text,'')) ~* ('\m' || _overview_surname || '\M')
       )
    THEN
      _defects := _defects || ('victim_mismatch.' || _overview_name);
    END IF;
  END IF;

  IF _pkg.mystery_style = 'character'
     AND NOT EXISTS (SELECT 1 FROM mystery_characters m2 WHERE m2.package_id = _pkg.id AND m2.character_role = 'murderer')
  THEN
    FOR _hit IN
      SELECT mc.character_name AS key
      FROM mystery_characters mc
      WHERE mc.package_id = _pkg.id
        AND (coalesce(mc.secret,'') || ' ' || coalesce(mc.secrets::text,'')) ~* '\myou (poisoned|killed|murdered|stabbed|strangled|shot|smothered)\M'
        AND (coalesce(mc.secret,'') || ' ' || coalesce(mc.secrets::text,'')) ~* '(hide|hiding|conceal|cover up).{0,60}(guilt|your crime|your own crime|what you did)'
    LOOP
      _defects := _defects || ('slip_culprit_leak.' || _hit.key);
    END LOOP;
  END IF;

  FOR _hit IN
    WITH kin AS (
      SELECT unnest(ARRAY[
        'brother','sister','father','mother','husband','wife','son','daughter',
        'uncle','aunt','nephew','niece','cousin','twin'
      ]) AS term
    ),
    chars AS (
      SELECT mc.character_name,
        coalesce(mc.introduction,'') || ' ' || coalesce(mc.round2_script,'') || ' ' ||
        coalesce(mc.round3_script,'') || ' ' || coalesce(mc.round4_script,'') || ' ' ||
        coalesce(mc.final_statement,'') AS claims,
        coalesce(mc.background,'') || ' ' || coalesce(mc.relationships::text,'') || ' ' ||
        coalesce(mc.description::text,'') AS truth
      FROM mystery_characters mc
      WHERE mc.package_id = _pkg.id
    ),
    conflicts AS (
      SELECT k.term, ch.character_name
      FROM chars ch CROSS JOIN kin k
      WHERE ch.claims ~* ('\mmy (own )?' || k.term || '\M')
        AND ch.truth !~* ('\m' || k.term)
    )
    SELECT term, array_to_string(array_agg(character_name ORDER BY character_name), ',') AS claimants
    FROM conflicts
    GROUP BY term
    HAVING count(*) >= 2
  LOOP
    _defects := _defects || ('identity_conflict.' || _hit.term || ':' || _hit.claimants);
  END LOOP;

  _defects := _defects || coalesce(public.package_victim_is_playable_character(_pkg), ARRAY[]::text[]);

  IF array_length(_defects, 1) IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN _defects;
END;
$function$;
