# Murder Mystery Party Generator — Claude Code Instructions

## Shorthand Commands

- **"sweep"** = Run a coherence sweep on a pasted purchase notification. Trigger: Jonathan pastes a purchase notification into a fresh session and says "sweep" — no other setup required, this file is auto-loaded. Branch on the notification's header/fields:

  **"New Purchase!" (a new mystery)** → New-Purchase Coherence Sweep (ADR-0103). Conversation ID is the only field actually needed.
  1. Resolve `package_id`/`mystery_style`/`player_count`/`has_accomplice`/language from the `conversation_id`.
  2. Note whether the package predates or postdates the 2026-08-11 blanket Sonnet 5 upgrade (ADR-0074) — pre-upgrade gets extra scrutiny, but don't skip post-upgrade.
  3. Run `list_packages_with_meta_text_leak`, `list_packages_with_victim_mismatch`, and `list_packages_with_unresolved_victim_name` scoped to this package — a clean result is a data point, not proof (all three have known blind spots, see ADR-0103; the third checks whether `master_context`'s victim name still contains "/" — a real regression only if the package predates ADR-0107's fix or the fix wasn't actually imported yet, since ADR-0107 deliberately didn't rewrite `master_context` on already-fixed historical packages).
  4. Manually cross-check the victim's name across `game_overview`, `detective_script`, and 3-4 characters' own background/relationships text. Any mismatch is high-severity by default.
  5. Read the full `detective_script` for leaked brackets/placeholders, garbled sentences, and — for slip-style (`mystery_style = 'character'`) games — confirm any `[MURDERER NAME]`-style bracket is the legitimate host-fill-in convention, not a leak.
  6. Spot-check 2-3 characters' full content (relationships, secrets, round scripts, accusations) for leaked authoring notes, self-directed questions, dangling references to removed characters, garbled text — **in the package's actual language**, not just English patterns.
     - **If the language has a formal/informal address distinction** (German Sie/du, French tu/vous, Spanish tú/usted, Portuguese tu/você, Italian tu/lei, Dutch je/u), check every character's round/final branch-selection headers use the *same* register as that character's own introduction. Found once already (ADR-0103 Addendum 13, "Tod Auf Der Alm 3000") — no detector catches it, and there's no reason to think it was a one-off. If it recurs: that's the trigger to decide, with Jonathan, between another one-off patch (cheap, proven, matches the pattern of every other sweep fix) and scoping the structural fix discussed after that sweep — deciding the register once (per-character, early in generation) and threading it through every downstream call, rather than leaving each call to choose independently. Don't default to building the structural fix on the strength of one occurrence; don't default to patching forever once it's clearly recurring either — surface the choice, don't decide it solo.
     - **Check whether a character's `secret`/`secrets` field reverses who-did-what-to-whom versus that same character's own `background`, `description`, round scripts, and `master_context`'s `howVictimWrongedThem`/`specificMotive`.** Found once (ADR-0103 Addendum 33, "The Last Supper At Ravenscroft Manor") — a character's secret claimed *they* had embezzled the money their own background/round scripts said the victim stole *from* them. This is a semantic inversion inside otherwise well-formed prose, not a string pattern (leaked bracket, name mismatch), so none of the existing detectors catch it and a cheap SQL one isn't obviously buildable — reliably catching "does this field contradict that field" needs something that understands meaning. No detector shipped on the strength of one occurrence, matching this checklist's own established bar (see ADR-0103 Addendum 31, which required 2 live instances before shipping a detector). If it recurs: that's the trigger to decide, with Jonathan, whether an LLM-based semantic-contradiction check is worth the standing spend (needs his sign-off per the no-paid-API-without-permission rule) versus continuing to catch it by hand.
  7. Run `package_completion_blocking_defects()` for genuinely missing content.
  8. Found something → fix it, re-verify, CHANGELOG entry + an addendum to **ADR-0103** (not ADR-0098 — different incident). Clean → report in chat only, no permanent document for a routine "nothing found."
  - Full checklist detail and rationale: `docs/adr/0103-new-purchase-coherence-sweep-ritual.md`.

  **"New 'Remove a Character' Purchase" (has a Batch ID field)** → Adaptation Batch Completion Sweep. Batch ID is the only field actually needed. No automated alert exists for this path (ADR-0088 deliberately deferred a cron here — paid packages, needs explicit sign-off before automating), so this manual sweep is currently the only thing that catches a partial batch failure.
  1. Query `mystery_adaptations` for every row with this `batch_id`, ordered by `batch_sequence`. Every row should be `status = 'verified'`. Any `'rolled_back'` or `'failed'` row is a real problem — the batch's own chain-dispatch guarantees it won't get stuck, but "didn't crash" isn't the same as "customer got what they paid for."
  2. For any non-`'verified'` row, read `error_message` and root-cause it before just retrying blindly — a rollback can be a false positive in the verify logic (like the 2026-08-28 sibling-batch-exclusion gap, ADR-0088 addendum) or a genuine unscrubbed content leak; only the former is safe to retry as-is.
  3. Cross-check current package state against what the customer actually paid for: character count in `mystery_characters` + `conversations.player_count` should both reflect every requested removal/reassignment actually landing, not just what the batch's own rows claim.
  4. If a row is stuck non-terminal, root cause fixed, and safe to retry: complete it directly — a new `$0`, pre-`'paid'` single-row `mystery_adaptations` batch + a direct call to `adapt-mystery-apply`, no second charge (the customer already paid for this as part of the original batch). Confirm zero verify issues on the retry.
  5. Found something → fix it, re-verify, CHANGELOG entry + an addendum to **ADR-0088** (the ADR that owns this feature's batching/verify design). Clean → report in chat only, no permanent document for a routine "nothing found."

## Changelog

After every meaningful code change, update `CHANGELOG.md` with a dated entry.

- Match the existing format: date headers (`## YYYY-MM-DD`), category prefixes (`### Fix:`, `### Feature:`, `### Improvement:`, `### UX:`, `### UI:`)
- Each entry: bold category prefix in the header, then bullet points explaining what changed and why
- If today's section doesn't exist yet, create it at the top (below the header)
- Don't duplicate entries — check if the change is already logged
- **Vault sync:** after updating `CHANGELOG.md`, append the same new entry to `/Users/jonathanmiller/Obsidian Vault/01_Projects/Mystery-Maker/changelog.md`

## Architecture Decision Records

When making a technical decision — new dependency, pattern change, API design, infrastructure choice, or deferring a significant feature — create an ADR in `docs/adr/`.

- Use the next sequential number: check the last file in `docs/adr/` and increment (`0013-`, `0014-`, etc.)
- Format: Title, Status, Date, Context, Decision, Rationale, Alternatives Considered, Consequences, Key files
- Include a **Discussion** section capturing key trade-offs debated and how the final decision was reached
- Use `docs/adr/0001-record-architecture-decisions.md` as a formatting reference
- **Vault sync:** after creating the ADR in `docs/adr/`, also write a copy to `/Users/jonathanmiller/Obsidian Vault/01_Projects/Mystery-Maker/decisions/adr-NNNN-slug.md` with this frontmatter prepended:
  ```
  ---
  date: YYYY-MM-DD
  project: mystery-maker
  area: n/a
  type: adr
  tags: [adr, mystery-maker]
  status: open
  ---
  ```
  Status mapping: Accepted → `resolved`, Proposed/Deferred → `open`, Superseded → `superseded`. Add a `## Links` section at the bottom pointing to `[[01_Projects/Mystery-Maker]]`.

## Decision Tracking — Nothing Falls Through the Cracks

Every decision made during work — not just architectural ones — needs a durable home so we can reconstruct the trail. If you're making a call and can't say where it'll be findable in three months, write it down before continuing.

The routing:
- **Code change shipping behaviour** → `CHANGELOG.md` entry (see Changelog section above)
- **Architectural / pattern / dependency / API decision** → ADR in `docs/adr/` (see ADR section above)
- **Deferred work, known-but-unresolved issues, signals worth tracking** (e.g. "Pinterest pipeline broke around date X, 21 slugs need backfill") → vault note in `/Users/jonathanmiller/Obsidian Vault/00_INBOX/<topic>-YYYY-MM-DD-mystery-maker.md` with `status: open` frontmatter
- **Scope decisions during a task** ("we'll fix X but defer Y because Z") → captured in the same ADR/CHANGELOG entry that ships the X-fix. Don't let the "why we didn't do Y" reasoning live only in chat history
- **Operational follow-ups blocked on a date or external signal** → `/schedule` or a vault note with the date

If a decision doesn't fit any of these, default to a vault note in `00_INBOX/` with `status: open`. Better an over-captured note that gets pruned later than a decision that exists only in conversation context.

When closing a task, scan the conversation for decisions made and confirm each one landed in one of the above. If something didn't, capture it before moving on.

## Vault Integration

Obsidian vault for this project: `/Users/jonathanmiller/Obsidian Vault/01_Projects/Mystery-Maker/`

- ADRs and changelog entries are synced to vault per the rules above (automatic, part of the ADR/changelog workflow)
- Session-closing notes go to `00_INBOX/` as `session-YYYY-MM-DD-mystery-maker.md`
- Claude Code conversation history is auto-extracted nightly to `00_INBOX/` via `~/scripts/claude-extract-sync.sh`
  — run "process inbox" in Claude to create summaries and file them

## Model Upgrades — Check for Stale Hardcoded Models

Whenever a Claude model upgrade decision is made (e.g. the ADR-0074 blanket Sonnet 5 upgrade), it's easy to update the primary generation pipeline (Make.com blueprints) and miss standalone edge functions that hand-implement their own Anthropic call with their own hardcoded model string — they have no automated sync with the blueprints they mirror. ADR-0098 Addenda 7/8 found two of these (`regenerate-child-content`, `regenerate-parent-content`) still on Haiku weeks after the blanket upgrade, each also missing the `temperature`/`thinking`/`max_tokens` adjustments Sonnet 5 requires.

Before/after any model upgrade decision, run:
```
grep -rn "claude-haiku\|claude-sonnet\|claude-opus" supabase/functions/*/index.ts
```
Check every hit against the decision just made — deliberately-different models (e.g. a cheaper model for a narrow deterministic extraction task) are fine; anything that's just been forgotten isn't. This is a manual checklist, not automated tooling — deliberately kept that lightweight per the ADR-0098 discussion (the actual risk is bounded, doesn't warrant a shared-config refactor or a standing detector).

## Git Workflow

- **Commit (and push) after every meaningful change, without waiting to be asked first.** This project-level rule overrides the global "commit and push only when I ask" default from `~/.claude/CLAUDE.md`.
  *(why: Jonathan's call, 2026-08-31 — "I can't think of a time where I didn't want to commit a change that I made." Scoped to this project only; the global default still applies elsewhere, including Sync/Pulse's stricter one-trunk-plus-PR workflow where auto-committing to `main` would be wrong.)*
  - "Meaningful change" = the same bar as the Changelog rule above: a real code/config/doc change worth its own CHANGELOG entry, not every intermediate edit mid-task. Commit once the change is complete and verified (type-checked/tested/deployed as applicable), not line-by-line.
  - Still applies: stage only the files for the change actually made (never a blanket `git add -A`), never force-push, never skip hooks, never touch destructive git ops without asking — this rule is about not waiting for permission to commit, not a license for less careful git hygiene.
  - Still commit as a separate, focused commit per logical change (not one giant end-of-session commit) — matches this project's existing pattern of one commit per fix/ADR-addendum.
- Write concise commit messages that explain the "why" not the "what"
