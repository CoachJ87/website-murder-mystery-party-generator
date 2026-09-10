# ADR-0120: an orphaned, always-present accomplice-confession stage direction leaks into `detective_script`'s reveal when there is no accomplice

- **Status:** `Parent64` imported and live. All 10 confirmed-real historical packages remediated. `Parent65` (a follow-up fix for `character`-style mysteries specifically) drafted, not yet imported. See Addendum 1.
- **Date:** 2026-09-05
- **Related:** ADR-0103 Addendum 19 (a *different* accomplice-tagging bug found the same week — role over-assignment, not this template leak), the Make.com blueprint historically named "Parent49 (Accomplice-Beat Silent-Omission)" (introduced the correct mechanism this ADR's fix relies on, but left the buggy one behind), ADR-0069 Addendum 1/2 (the `has_accomplice`/`player_count` staleness investigation that led here)

## Context

Sweeping "The Oath And The Poisoned Cup" (a real, correctly-built accomplice mystery) surfaced that `conversations.has_accomplice` doesn't reliably track whether a package's actual roster has an accomplice character — that part was fixed directly (see below). But checking the historical corpus for the same mismatch in the *opposite* direction (`has_accomplice = true`, no accomplice character) found **30 paid packages**, far too many to be the same narrow staleness bug.

Reading one of the 30 ("The Final Cut") explained it: `detective_script`'s REVEAL section contains a literal, unresolved leaked bracket, in the customer-facing text a host would read aloud at the climactic arrest:

> *The detective turns, naming the accomplice, and waits.*
> **`*[If there is an accomplice: the accomplice (player) reads their confession aloud.]*`**
> *Detective Inspector Ashford nods slowly, satisfied at last...*

This isn't a rare fluke. A corpus-wide check for this exact bracket pattern found:

| Package | Purchased/generated | Player count | Style | Host email |
|---|---|---|---|---|
| The Final Cut | 2026-09-04 | 13 | character | — |
| Blood, Dust & Dead Man's Hand | 2026-09-02 | 8 | character | dhr148@gmail.com |
| Elementary, My Dear Cadaver | 2026-09-01 | 12 | character | — |
| The Workshop Of St. Nick | 2026-08-31 | 10 | character | alana.holmes@live.com.au |
| Casa Ferrel | 2026-08-30 | 9 | character | romanelegoaster@gmail.com |
| Love Island Season 8 Reunion Murder Mystery | 2026-08-29 | 11 | character | saanchijain04@gmail.com |
| Operation: Thirty & Murdery | 2026-08-25 | 30 | character | — |
| Murder In Paradise: Death At Coral Cove Resort | 2026-08-24 | 16 | character | — |
| The Enchanted Family Reunion Murder | 2026-08-02 | 6 | detective | — |
| The Case Of The Stolen Golden Flamingo | 2026-08-01 | 8 | detective | — |
| Death At The Deadwood Saloon | 2026-04-22 | 9 | character | — |

11 paid packages, 2026-04-22 through 2026-09-04 — this has been live for over 4 months. 9 of 11 are `mystery_style = 'character'` (slip-style), though the reveal narration itself reads as a central-detective voice regardless of style, meaning both styles share this prompt section. Several `host_email` values are null (not every purchase captures one) — full identification would need cross-referencing `conversations`/order records, not attempted here.

**Root cause, found directly in the live Make.com Parent blueprint** (`temp-files/MM Live - Parent63 (Single Accomplice Constraint).blueprint.json`, read locally, nothing edited in Make.com): the detective_script REVEAL prompt contains two separate, back-to-back mechanisms for the accomplice confession beat:

1. A correctly-worded conditional **instruction** (an `[ACCOMPLICE BEAT — conditional...]` bracket): *"First check whether the master_context defines an accomplice. If it DOES: after the murderer's confession, add one paragraph... If it does NOT: write nothing here — no paragraph, no placeholder, no bracketed note... Never output this instruction itself..."* This one works as designed — it's an instruction *about* what to write, correctly told not to leak itself.
2. Immediately following it, a **second, separate, always-present line** styled exactly like the legitimate host stage-direction convention used correctly elsewhere in the same prompt (e.g. `*[Present Round 2 Evidence]*`): `*[If there is an accomplice: the accomplice (player) reads their confession aloud.]*`

Line 2 is a leftover duplicate of what line 1 already handles — but because it's formatted identically to the *other* stage directions the model is told elsewhere to preserve verbatim, the model frequently copies it straight through into player-facing output even when there is no accomplice, rather than recognizing it needs the same conditional treatment as line 1. This produces exactly the symptom found: a stub "naming the accomplice" sentence pointing at no one, followed by the raw, unresolved bracket instruction, sitting in text a host reads aloud at the game's climax.

This line predates the Make.com blueprint historically named "Parent49 (Accomplice-Beat Silent-Omission)" — the fix that correctly introduced mechanism 1 — and appears to be exactly what that fix should have replaced but didn't: a paired-predicate-drift shape (two mechanisms answering the same question, only one ever updated), the same recurring bug family this project has hit multiple times before (see `feedback_regex_pair_alignment` / `project_gate_detector_deadlock` in memory).

## Decision

**Immediate, low-risk part — done:**
- Corrected `conversations.has_accomplice` for "The Oath And The Poisoned Cup" (`a3c58f9a-368e-4fca-ab32-3b87e37925bd`) directly.
- Added an auto-sync to `validate_package_characters()` (the existing ADR-0108 completion trigger): on every transition of a package's `generation_status` into `'completed'`, `conversations.has_accomplice` is corrected to match whether `mystery_characters` actually has a `character_role = 'accomplice'` row for that package — unconditional, best-effort, same spirit as `player_count`'s existing auto-sync. Migration `20260905183501_sync_has_accomplice_from_actual_characters.sql`, tested end-to-end on a live package (forced a stale value, re-triggered completion, confirmed self-correction with zero disturbance to the otherwise-clean package).

**The actual leak — root-caused, fix drafted, not yet imported:**
- Duplicated `Parent63` to `MM Live - Parent64 (Remove Orphaned Accomplice Stage Direction).blueprint.json` (confirmed 63 was the current head before duplicating, per this project's versioning convention), deleting the orphaned line 2 from all 4 routes that carry this prompt. `temp-files/build-parent-v64.py` applies the removal as a verified single-substring replacement (asserted exactly 4 matches, one per route) — mechanism 1 (the working conditional) and the `[CLOSING]` beat are both left untouched, since mechanism 1 alone is already sufficient to produce the correct confession paragraph when an accomplice genuinely exists.
- Validated: output is well-formed JSON, and a sorted-key diff against Parent63 shows exactly the 4 intended deletions and nothing else.
- **Not deployed.** Per this project's established Make.com pattern, importing `Parent64` into the live scenario and any live-generation validation are Jonathan's to do — this session has no Make.com API access.

**Not yet decided — flagged for Jonathan, not resolved here:**
- Whether/how to remediate the 11 historical packages' `detective_script` text. Each needs the exact leaked bracket replaced with either a real accomplice-confession paragraph (if `master_context` shows one was actually meant to exist and just never got named — needs per-package inspection) or removed cleanly with the closing arrest line adjusted to name only the murderer (if there truly is no accomplice). This is customer-facing content on paid orders, several delivered months ago — likely already used for real parties — so a blind mechanical strip risks being wrong per-package in a way the Golden Feather Magpie fix wasn't. Recommend a `sweep`-style pass per package rather than a bulk script.
- Whether to backfill `conversations.has_accomplice` for the 30-package corpus found in the opposite-direction check (only 11 of the 30 were confirmed to share this exact leaked-bracket root cause; the remaining ~19 weren't individually verified in this pass and may be a legitimately different shape — not conflated with this ADR's scope).

## Consequences

- Confirmed this is not a one-off: 11 real paid customers received a package with an unresolved template bracket sitting in their game's central reveal moment, some as recently as yesterday.
- The `has_accomplice` DB flag being wrong for months made this systemic pattern invisible to any check that trusted it — the flag mismatch, once actually investigated instead of assumed benign, is what surfaced the real content bug underneath it.
- `list_packages_with_meta_text_leak()` does not catch this pattern (its bracket markers don't include this phrase) — a natural follow-up once the historical-remediation approach is decided, mirroring ADR-0103's practice of extending that detector alongside each newly-found leak shape.

## Key files

- Make.com Parent blueprint (not in this repo) — actual root cause. `temp-files/MM Live - Parent63 (Single Accomplice Constraint).blueprint.json` (previously live) / `temp-files/MM Live - Parent64 (Remove Orphaned Accomplice Stage Direction).blueprint.json` (drafted fix, not yet imported) / `temp-files/build-parent-v64.py` (the verified transform)
- `supabase/migrations/20260905183501_sync_has_accomplice_from_actual_characters.sql` — `has_accomplice` auto-sync, live
- `supabase/functions/mystery-webhook-trigger/index.ts` — confirmed `has_accomplice` is read-only here, never written (not the sync site; the trigger above is)
- Fixed directly: `conversations` row for `a3c58f9a-368e-4fca-ab32-3b87e37925bd`
- Remediated: the 10 confirmed-real packages listed in Addendum 1

## Discussion

This was found by refusing to accept "has_accomplice is probably just a stale flag, not a big deal" at face value — checking the opposite direction of the mismatch (flag says true, no character exists) rather than stopping once the narrow, already-understood direction (flag says false, character exists) was fixed. The volume (30 mismatches) was the signal that something structural was wrong, not a handful of one-off chat-decision-never-synced cases; reading even one of the 30's actual delivered content is what turned "a data hygiene footnote" into "a customer-facing defect that's been live for four months."

## Addendum 1 (2026-09-05, same day): `Parent64` imported, corrected the affected count to 10 (one false positive), found `mystery_style='character'` needs its own fix, all 10 remediated, `Parent65` drafted

Jonathan imported `Parent64` and asked to work through the historical packages one by one. Doing that surfaced two corrections to the Context above.

**The corpus-wide search pattern (`ilike '%[if%accomplice%'`) had a false positive.** "Death At The Deadwood Saloon" doesn't actually have the leaked bracket at all — the loose `LIKE` pattern matched an unrelated `accomplice` mention in an earlier, legitimate card-collection instruction, several paragraphs before any bracket. Re-ran the check with a proper anchored regex (`\[if[^\]]{0,80}accomplice[^\]]{0,120}\]`) against all 11 originally-flagged packages: **10 are real, 1 is not.**

**`mystery_style='character'` mysteries are not a variant of the same bug — they're a different design the original fix didn't account for.** Found the actual Make.com Part 1 spec: *"NO FIXED CULPRIT: the murderer is selected by slip-draw at the table... If accomplice mechanism exists, murderer privately tells their designated accomplice partner."* For this style, `master_context` never defines a specific accomplice (or murderer) by design — identity is decided live at the table, not at generation time. This matches the exact caveat already documented in this project's own `sweep` checklist about legitimate `[MURDERER NAME]`-style host-fill-in brackets for slip-style games, which this investigation should have applied from the start.

Reading all 7 `character`-style, `has_accomplice=true` packages individually (not just the one sampled in Context) showed real variety in how well each historical prompt version handled this: some already fully and correctly named the accomplice in prose; two used clean, deliberate `[ACCOMPLICE NAME]`-style host-fill-in placeholders (legitimate, not touched); one ("Operation: Thirty & Murdery") already had a well-written host instruction ("host: reveal the player who drew the ACCOMPLICE slip...") sitting right before the *same* orphaned trailing bracket found everywhere else. Across all of them, the one common, genuine defect was the same trailing bracket this ADR already identified — just following very different lead-in text depending on which prompt version generated each one.

**Fix applied per package: made the trailing bracket declarative instead of deleting it outright**, since `has_accomplice=true` is already confirmed for every one of these specific orders — `*[If there is an accomplice: the accomplice (player) reads their confession aloud.]*` → `*[The accomplice (player) reads their confession aloud.]*`. This exactly mirrors the convention this same prompt already uses successfully for the murderer's own confession cue two lines earlier (no name printed there either — the host says it live, since the murderer's identity is also drawn, not fixed). Verified clean (`package_completion_blocking_defects()`, `list_packages_with_meta_text_leak()`) on all 10:

| Package | Fix applied |
|---|---|
| The Enchanted Family Reunion Murder (detective, `accompliceSelection.character: null`) | Removed the entire unresolved conditional block (an older, more extensive leak — included a literal never-filled `[Name the accomplice]` placeholder) |
| The Case Of The Stolen Golden Flamingo (detective, real accomplice already correctly named in prose) | Deleted the redundant trailing bracket only |
| Murder In Paradise: Death At Coral Cove Resort (character, `has_accomplice=false`) | Deleted the bracket — no accomplice mechanism exists for this order at all |
| Blood, Dust & Dead Man's Hand (character, `has_accomplice=false`, older wording variant) | Deleted the bracket (`[If there was an accomplice, add that beat here...]` variant) |
| The Final Cut, The Workshop Of St. Nick, Elementary My Dear Cadaver, Casa Ferrel, Love Island Season 8 Reunion, Operation: Thirty & Murdery (all character, `has_accomplice=true`) | Made the trailing bracket declarative, matching the murderer's own cue convention |

**One unrelated pre-existing defect surfaced during verification, not fixed here:** "Operation: Thirty & Murdery" independently flags `missing_round_content.Cypress/Celine Beaumont` via `package_completion_blocking_defects()` — unrelated to the accomplice fix (this package is the same "Jaclyn's 30-player package" incident ADR-0108 investigated for a different structural gap). Not remediated in this pass; flagged for a separate follow-up.

**Drafted `Parent65`, not yet imported:** `Parent64`'s blanket deletion is correct and sufficient for Detective Style (routes 0/2), where the ACCOMPLICE BEAT instruction already writes a complete, self-contained confession invitation naming a real character. But it reproduces the same gap for Character Based (routes 1/3) going forward: that instruction's own conditional check ("does master_context define an accomplice") is a Detective-Style-only concept that never applies to slip-draw mysteries, so its generated paragraph can only ever gesture vaguely at "naming the accomplice" without naming anyone — and after Parent64's deletion, nothing follows it at all, the same dead-end just found and hand-fixed in the 6 historical packages above. `Parent65` rewrites the ACCOMPLICE BEAT instruction for routes 1/3 only (routes 0/2 confirmed byte-identical, untouched) to check `hasAccomplice` instead of `master_context`, and to fold the declarative confession cue into its own generated output — closing the two-mechanisms-answering-one-question shape that caused the original bug, rather than reproducing it. Verified: valid JSON, diff against `Parent64` shows exactly the 2 intended route changes and nothing else.

## Key files (Addendum 1)

- `temp-files/MM Live - Parent65 (Character Style Accomplice Beat Fix).blueprint.json` / `temp-files/build-parent-v65.py` — drafted fix for `character`-style routes, not yet imported
- Remediated directly: `mystery_packages.detective_script` for the 10 packages in the table above
- Not remediated, separate issue: "Operation: Thirty & Murdery" (`b8428a57-1c2b-4bf1-881c-98c8436be6a9`) `missing_round_content.Cypress/Celine Beaumont`

## Addendum 2 (2026-09-10): swept the remaining ~19-20 of the original 30-package corpus never individually checked — found and fixed one live instance this ADR's own per-package pass had missed

Part of a broader audit (ADR-0103 Addendum 38) of items deferred under the old "wait for a 2nd occurrence" policy that the new impact/cost framework calls for finishing now — this one was cheap to complete: the original anchored regex (`\[if[^\]]{0,80}accomplice[^\]]{0,120}\]`) was already proven correct, it just needed to be re-run (case-insensitively — the first attempt used the case-sensitive `~` operator and silently matched nothing, caught and corrected before trusting a "clean" result) against the ~19-20 packages Addendum 1 never got to.

**Result: one real, live, unfixed instance — "Operation: Thirty & Murdery" itself, the same package Addendum 1's table lists as already remediated.** It has a SECOND leaked bracket of a different shape than the one Addendum 1 fixed: `*[If there is an accomplice — host: reveal the player who drew the ACCOMPLICE slip, and briefly connect their own motive to how they helped cover the crime, in your own words.]*`, sitting between the murderer's confession cue and the accomplice's own `**[ACCOMPLICE PLAYER'S NAME]**` fill-in slot — this is the "mechanism 1" conditional-instruction-prefix leak this ADR's own Context section describes (distinct from "mechanism 2," the simpler trailing-bracket shape Addendum 1's per-package pass searched for and fixed). Addendum 1's remediation only touched the exact `*[If there is an accomplice: the accomplice (player) reads their confession aloud.]*` substring; this package's mechanism-1 leak used different wording ("host: reveal the player who drew the ACCOMPLICE slip...") and was never matched or noticed.

**Fixed the same way as every other mechanism-1 leak this ADR has handled:** stripped the leftover conditional prefix ("If there is an accomplice — "), leaving a clean declarative host instruction that matches the style of every sibling stage-direction already correct in the same document (e.g. "*[Host: reveal the player who drew the GUILTY slip. Say their name here.]*"). Confirmed `**[ACCOMPLICE PLAYER'S NAME]**` immediately after is the legitimate slip-style host-fill-in convention (Addendum 1's own established exception), not touched. Re-verified: the anchored regex no longer matches this package's `detective_script`.

**The other ~24 packages checked: all clean.** No further live instances of either bracket shape.

**A separate, older, structurally different anomaly surfaced during this sweep, not fixed here.** 7 packages in the has_accomplice-mismatch corpus (2025-08-11 through 2025-11-23, `is_test=false`) have `detective_script IS NULL`; 5 of those 7 also have `game_overview IS NULL` and `host_guide IS NULL` despite `generation_status='completed'` — essentially empty packages marked complete, from roughly 10-14 months before this project's active detector/sweep infrastructure existed (the earliest tracked incidents in memory start ~April 2026). This doesn't match the accomplice-bracket-leak shape at all (there's no `detective_script` text to leak a bracket into) and looks like a different, much older generation-pipeline gap. Not investigated further — flagged as a separate open item (`00_INBOX/deferred-bug-audit-2026-09-10-mystery-maker.md` in the vault) rather than folded into this ADR's scope.

**Not done:** the `has_accomplice` backfill question Addendum 1 left open (whether to correct the DB flag for the full 30-package corpus, not just the 11-then-10 confirmed-real ones) is still not decided — this pass confirmed content correctness, not the flag itself.

## Key files (Addendum 2)

- Remediated directly: `mystery_packages.detective_script` for "Operation: Thirty & Murdery" (`b8428a57-1c2b-4bf1-881c-98c8436be6a9`) — the second, previously-missed bracket
- Flagged, not remediated: 7 packages with `detective_script IS NULL` (5 also missing `game_overview`/`host_guide`) — see vault note above
