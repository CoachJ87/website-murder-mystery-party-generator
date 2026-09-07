import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * regenerate-child-content — ADR-0051 layer 3: the child-content regenerator.
 *
 * This is the keystone ADR-0051 named: it turns the ADR-0053 completion gate's
 * "hold" into "self-heal", and gives the ADR-0047 auto-remediation worker a real
 * fix for the two classes it currently escalates untouched (identity_contamination,
 * slip_culprit_leak) plus the character-sourced half of meta_text_leak.
 *
 * WHY A SEPARATE FUNCTION FROM regenerate-parent-content:
 * regenerate-parent-content (v6) re-runs the 4 HOST-facing Claude calls
 * (game_overview, materials, detective_script, evidence_cards) from master_context
 * alone — those fields don't reference other characters, so no cross-character
 * coherence risk exists. Character fields are the opposite: they are exactly
 * where identity contamination, slip-culprit leaks, and self-directed questions
 * live, because every field is generated with knowledge of every OTHER character
 * (via master_context.relationshipMatrix). Regenerating a character field blind —
 * without that same cross-character context and the same G-rule guardrails the
 * original Child scenario used — reintroduces the very defect being repaired.
 * This function exists to not do that.
 *
 * MIRROR-DRIFT WARNING (same trade-off regenerate-parent-content already carries):
 * the prompts below are mirrored from the Make "MM Live - Child (Unified)19"
 * blueprint (temp-files/MM Live - Child (Unified)19-SlipGuilt-OutputHygiene-
 * VictimQuestions.blueprint.json, modules 401/405/409 for detective-style,
 * 501/505/509/513/517 for character-style). If that blueprint's G-rules or
 * output_schema change, this file's PROMPT_GROUPS must be updated to match, or a
 * repair could reintroduce a defect the live generator no longer produces (or
 * fail to reproduce a new guardrail the live generator has). No automated sync
 * exists between the two — this comment (and ADR-0054) is the only tripwire.
 *
 * WHAT THIS FUNCTION DOES:
 *   1. Loads the package's master_context, mystery_style, extracted_characters
 *      (the original per-character seed description) and user_conversation
 *      (brainstorming fallback), plus every character row in the package (for
 *      cross-character coherence: names, roles, and — for the specific target
 *      character(s) — their OWN established fields as an anchor, so a field
 *      being regenerated doesn't contradict a field that's staying put).
 *   2. For an identity_contamination / slip_culprit_leak / meta_text_leak defect
 *      hint, auto-discovers every OTHER character also implicated by that same
 *      defect on this package (via the same ADR-0042/0041 detector RPCs
 *      auto-remediate-packages already uses) and regenerates all of them
 *      together — a single claimant fix often can't clear a 3+-claimant identity
 *      conflict, and a slip-culprit-leak fix needs every leaking character fixed
 *      before the package-level detector goes quiet.
 *   3. Calls Claude directly (mirroring the Child scenario's prompts, G-rules,
 *      and JSON-safety rules verbatim) per affected character, per "call group"
 *      (the same call boundaries the Make blueprint uses — description/
 *      background/relationships/secret/introduction together, rumors/
 *      accusations together, and the round-script bundle together). A call
 *      does NOT regenerate its whole group — the output_schema sent to Claude
 *      is filtered down to only the requested/effective fields within that
 *      group (`fieldsToGenerate = group.fields.filter(f =>
 *      effectiveFields.includes(f))`), and every field that IS generated is
 *      written; nothing extra is generated, and nothing generated is withheld.
 *      Cross-field coherence within a call — like "don't re-target a question
 *      at someone round 2 already asked" — is preserved only for whichever
 *      fields in the group were actually requested together in the same call;
 *      a request naming a single field in a group does not pull its
 *      groupmates along for that benefit.
 *   4. Writes back ONLY the whitelisted fields the caller asked for, through the
 *      SAME `remediation_read_field` / `remediation_write_field` accessors
 *      ADR-0047 built (jsonb-scalar handling for `relationships`; the rest
 *      plain text). This function cannot write a non-whitelisted column — the
 *      accessors enforce that independently of anything below.
 *   5. THE RE-DETECT GATE (mandatory, non-negotiable): re-runs the same
 *      detector RPCs before and after, for all four character-level classes
 *      (identity_conflicts, meta_text_leak, slip_culprit_leak,
 *      self_directed_questions) — not just the hinted one — so a fix can never
 *      be accepted if it silently introduces a DIFFERENT defect class while
 *      curing the targeted one. self_directed_questions is included because
 *      this function is whitelisted to write round2/3/4_questions, and
 *      ADR-0053's completion gate blocks on that class exactly as it does the
 *      other three. Accept only if every defect instance naming a touched
 *      character is gone and no new instance (for ANY of the four classes)
 *      appeared; otherwise revert every write byte-for-byte and report
 *      failure. This is the identical
 *      accept-or-revert invariant `auto-remediate-packages`'s `runGatedAttempt`
 *      enforces — re-implemented here rather than imported because this
 *      function's unit of repair is "N characters, M fields" rather than
 *      auto-remediate-packages's single deterministic edit, but the safety
 *      property (worst case degrades to today's escalate-to-human path, never
 *      "shipped something worse") is the same.
 *   6. Logs every attempt to `auto_remediation_log` (before-value, cost,
 *      outcome) — the same audit table ADR-0047 built — and honors a daily
 *      spend cap read from the SAME table, so this function and the periodic
 *      worker share one global ceiling rather than each getting their own.
 *
 * SCOPE (per the layer-3 task): this function is a standalone, directly-callable
 * primitive. It is NOT wired into the ADR-0053 gate's repair-in-loop or into the
 * ADR-0047 worker's escalate paths in this pass — see ADR-0054 for the exact
 * call contract those integrations will use.
 *
 * POST body:
 *   {
 *     package_id: string,               // required
 *     character_id: string,             // required — the primary/triggering character
 *     character_ids?: string[],         // optional extra characters to include explicitly
 *     fields: string[],                 // required — whitelisted character fields to regenerate
 *     defect_class_hint?: "identity_contamination" | "slip_culprit_leak" | "meta_text_leak",
 *     dry_run?: boolean,                // report the plan; call no Claude, write nothing, spend nothing
 *   }
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// Updated 2026-08-22 (ADR-0098 Addendum 6): was hardcoded to Haiku, matching
// a comment that predates ADR-0074's 2026-08-11 blanket Sonnet 5 upgrade —
// the live Child blueprint has run on Sonnet 5 for every call since then,
// this file just hadn't been updated to match. Caught live: a Haiku call
// here reproduced a self_directed_questions defect (ADR-0042) on its first
// real backfill attempt, the exact defect class ADR-0074 named Haiku for.
// regenerate-parent-content (index.ts) has the same staleness — not fixed
// here, flagged in the ADR as a follow-up.
const MODEL = "claude-sonnet-5";
const ANTHROPIC_VERSION = "2023-06-01";
// Was 4000 (calibrated for Haiku). Bumped 2026-08-22 alongside the Sonnet 5
// switch — caught live: Sonnet 5 produces more verbose output than Haiku for
// the same prompt, and a real call truncated mid-string ("Unterminated
// string in JSON") at the 4000-token cap on a 5-field call group.
const MAX_TOKENS = 8000;

/**
 * Flat per-Claude-call cost estimate (USD), same style as auto-remediate-
 * packages's OVERVIEW_REGEN_COST_USD — an approximation for spend-cap
 * accounting, not a metered actual. Updated 2026-08-22 alongside the Sonnet 5
 * model switch above — was calibrated to Haiku ($1/$5 per MTok) at $0.03/call;
 * Sonnet 5 intro pricing ($2/$10 per MTok, through 2026-08-31) is roughly 3x,
 * standard pricing ($3/$15) roughly 4-5x, so $0.10 stays a reasonable flat
 * estimate at the full 4000-token budget these calls run at.
 */
const CLAUDE_CALL_COST_USD = 0.1;

/**
 * Shared daily spend cap. This function writes to the SAME `auto_remediation_log`
 * table auto-remediate-packages sums for its own cap, so `spentToday()` below
 * reflects BOTH functions' spend — one global ceiling, not two independent ones.
 */
const DAILY_SPEND_CAP_USD = 5.0;

/** Bound on how many characters a single request can expand to (auto-discovery
 *  for multi-claimant identity conflicts / multi-character slip leaks). Keeps a
 *  pathological detector match from turning one call into a runaway fan-out. */
const MAX_TARGET_CHARACTERS = 8;

/**
 * Unbounded lookback for the re-detect gate's detector calls. Deliberately NOT
 * the periodic worker's 30-day window: this function repairs ONE named package
 * on demand (old `needs_review` packages are exactly what it exists to unblock),
 * so the gate must see that package regardless of age. A single-package repair
 * call paying for a full-history scan once is an acceptable trade the periodic
 * sweep (which runs every 4 hours over everything) could not afford.
 */
const FULL_HISTORY_SINCE = "2000-01-01T00:00:00Z";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

type MysteryStyle = "detective" | "character";
type DefectHint = "identity_contamination" | "slip_culprit_leak" | "meta_text_leak";
type Outcome = "fixed" | "escalated" | "failed" | "planned" | "noop";

// ---------------------------------------------------------------------------
// Whitelist — MUST mirror the `chr_text` / `chr_json` arrays inside
// `remediation_read_field` / `remediation_write_field` (see
// supabase/migrations/20260729_auto_remediation_log.sql). This is a defensive,
// fail-fast copy — the DB functions are the actual enforcement boundary and
// will reject anything not on their own list regardless of what happens here.
// ---------------------------------------------------------------------------

const CHR_TEXT_FIELDS = [
  "introduction", "rumors", "background", "secret", "accusations", "description",
  "round2_script", "round3_script", "round4_script", "final_statement",
  "round2_questions", "round3_questions", "round4_questions",
  "round2_innocent", "round2_guilty", "round2_accomplice",
  "round3_innocent", "round3_guilty", "round3_accomplice",
  "round4_innocent", "round4_guilty", "round4_accomplice",
  "final_innocent", "final_guilty", "final_accomplice",
  "reveal_confession_guilty", "reveal_confession_accomplice",
];
/** Only `relationships` has a Child-prompt generation equivalent. `secrets`
 *  (plural, jsonb) is in the DB whitelist but the Child scenario never
 *  generates it — only the `secret` (singular, text) field. Requesting
 *  `secrets` is rejected below with an explicit error rather than silently
 *  no-op'd or guessed at. */
const CHR_JSON_FIELDS = ["relationships"];
const SUPPORTED_FIELDS = new Set([...CHR_TEXT_FIELDS, ...CHR_JSON_FIELDS]);

// ---------------------------------------------------------------------------
// Prompt fragments — mirrored verbatim from the Child blueprint. See the
// mirror-drift warning at the top of this file.
// ---------------------------------------------------------------------------

function roleBlock(style: MysteryStyle): string {
  return style === "detective"
    ? `<role>
You are an expert mystery designer regenerating specific fields of one character's package for a murder mystery party game, to repair a detected content defect. The mystery is detective-style — the murderer and accomplice are predetermined; you will be told this character's specific role. Preserve everything about this character that is NOT being regenerated; you are fixing named fields, not reinventing the character.
</role>`
    : `<role>
You are an expert mystery designer regenerating specific fields of one character's package for a murder mystery party game, to repair a detected content defect. The mystery is character-based — the murderer is determined by slip-draw at the table, NOT pre-assigned. Preserve everything about this character that is NOT being regenerated; you are fixing named fields, not reinventing the character.
</role>`;
}

function contentCoherenceRules(style: MysteryStyle): string {
  const base = `<content_coherence_rules>
These rules apply to every field you generate:
- LANGUAGE: This function has no explicit language parameter — write every field in the SAME language as the master context and this character's established fields (background/relationships/secret) below. If those are in a language other than English, your entire output must be too, including brief instructional asides (e.g. an accusations-phase reminder line) — never leave a sentence half-translated or a short aside in English while the surrounding field is in another language. (ADR-0112 addendum, 2026-08-29: this function is a separate re-implementation of per-character generation that never got an explicit language signal the way the main pipeline's mystery-webhook-trigger now has; this rule closes the same gap here at zero extra cost, using context already in this prompt, rather than adding another detection call.)
- CHARACTER IDENTITY: Write every field strictly as THIS character (the Character name above). NEVER claim another character's identity, kinship, or relationship to the victim (e.g. calling the victim 'my brother' when the master context assigns that relationship to a different character). NEVER give this character another character's secret, alibi, or guilty knowledge - in particular, the murderer's storyline and evidence trail must never bleed into any other character's scripts. Before writing any line where this character states their relationship to the victim, verify it against this character's OWN ESTABLISHED FIELDS (below) and the master context.
- TIMING: When a character refers to time, use approximate, event-relative phrasing ('just before nine', 'as the ceremony was about to begin', 'shortly after dinner') rather than exact clock times. Only give an exact minute if it is a deliberate clue AND you give the character a concrete reason they would remember that exact moment (they checked a watch, heard a clock chime). Do not build player-facing recall around minute-precise timelines.
- QUESTIONS: Every question in a character's 'questions to ask' list must be directed at a DIFFERENT, LIVING character. NEVER generate a question this character asks of themselves, and NEVER address a question to the victim (the victim is dead and not a player).
- ACCOMPLICE COHERENCE (only when this character's role is accomplice): their consistent goal is to PROTECT the murderer. They deflect suspicion away from the murderer and toward other suspects. NEVER script the accomplice to accuse, incriminate, or turn on the murderer in any round.
- BLACKMAIL / SECRET LOGIC: If a secret is being used to blackmail this character, that secret must still be genuinely hidden from the public — the harm is what WOULD happen if exposed. NEVER write that the same fact was already discovered or made public AND is still being used as active blackmail leverage.
- SECRET STAKES: Every secret must spell out the concrete consequences the character faces if exposed (ruin, arrest, loss of position, social destruction), and make clear this character will go to great lengths to keep it hidden.
- REAL-WORLD-SENSITIVE HARM THEMES: Do not write any character's secret, backstory, motive, or rumor around sexual assault, human trafficking, or the sexual exploitation/predation of minors or young women - whether this character is the perpetrator, an enabler, or someone who witnessed such harm and stayed silent about it. This applies regardless of the character's role (suspect, murderer, accomplice, victim). Other dark or adult themes (fraud, violence, addiction, affairs, blackmail over non-sexual misconduct) remain in scope and do not need to be softened.`;
  const slip = `
- SLIP-STYLE GUILT (culprit is drawn at the table — no character is guilty in advance): this character's static secret/background/description/introduction must give a MOTIVE or something-to-hide, NEVER a murder confession or guilty knowledge ('you killed X', 'you did it'). Guilt appears ONLY in the guilty-slip branch. In innocent branches and accusations, spread suspicion — never converge on one specific person as the murderer.`;
  return base + (style === "character" ? slip : "") + `
</content_coherence_rules>`;
}

const NO_CHAIN_OF_THOUGHT = `<no_chain_of_thought_in_output>
Never include phrases like "Wait, this is wrong", "Let me recalculate", "Actually, reviewing the matrix", "Disregard the above", "On second thought", "reviewing the relationship matrix", "looking again at..." in any output field. If you make a mistake mid-generation, silently rewrite the field cleanly. Do NOT show your reasoning or self-corrections. The relationships field is the highest-risk site — give it extra scrutiny before emitting.
</no_chain_of_thought_in_output>`;

const NO_META_TEXT = `<no_meta_text_in_output>
The output is what players READ. Do NOT include meta-instructions like "CRITICAL: Target 3 DIFFERENT characters" or "Pick a character from your relationship matrix" inside the field VALUES. Strip any "CRITICAL:", "Note:", "Pick a character from", "Target N characters", or similar instructional preambles from the field values. ALSO strip any bracketed authoring directions or placeholders that leak into player-facing values — e.g. '[choose someone with a strong motive]', '[insert name]', '[CLOSING PARAGRAPH — No Accomplice Beat…]'. These must NEVER appear in output; silently write the finished line instead.
</no_meta_text_in_output>`;

const CRITICAL_JSON_RULES = `<critical_json_rules>
1. Output a SINGLE valid JSON object. No markdown wrapper, no commentary before or after.
2. Some fields wrap quoted text in SINGLE QUOTES per their own schema template below (e.g. rumors, round*_questions, and any other field whose template literally shows '...' around the text you write) — for those, open the quote AND close it with a single quote. NEVER use unescaped double quotes inside string values — they break JSON parsing. Most other fields (backgrounds, introductions, guilty/innocent/accomplice scripts, confessions) are plain prose per their schema template with NO surrounding quote marks at all — do NOT add an opening or trailing quote mark to these; a lone trailing apostrophe with nothing to pair it with is a bug, not a stylistic flourish.
3. Apostrophes inside string values are PLAIN characters. DO NOT escape them with a backslash. Write \`That's\` not \`That\\'s\`. The sequence \\' is invalid JSON and breaks the parser. ONLY backslash escapes valid in JSON: \\", \\\\, \\n, \\t. Nothing else.
4. NEVER write '' (two apostrophes in a row) at the end of a quoted phrase, and never leave a single unpaired trailing quote mark on a field whose schema template shows it as unquoted prose.
5. Before emitting, scan every string value for: unescaped ", the sequence \\', the sequence '', and — on any field whose schema template is unquoted prose — a trailing apostrophe with no matching opening one. Fix all of these.
6. Verify the closing } and the final closing " on the last field are present and matched.
</critical_json_rules>`;

const ROLE_DETERMINATION = `<role_determination>
This character's role has ALREADY been established in the database — do not re-derive it. It is given below as "Established role". Write consistently with that role.
</role_determination>`;

function rumorTargetingRules(style: MysteryStyle): string {
  return style === "detective"
    ? `<rumor_targeting_rules>
Distribute rumors and accusations across characters you have HOSTILE or NEUTRAL relationships with per master_context.relationshipMatrix. NEVER target characters marked Friendly. Never target the victim (the victim is not a player). Pick 3 different cast members for rumors.
</rumor_targeting_rules>`
    : `<rumor_targeting_rules>
Distribute rumors across characters with HOSTILE or NEUTRAL relationships per master_context.relationshipMatrix. NEVER target Friendly characters or the victim. Pick 3 different cast members.
</rumor_targeting_rules>`;
}

// ---------------------------------------------------------------------------
// Prompt groups — mirror the Child blueprint's exact call boundaries (modules
// 401/405/409 detective-style; 501/505/509/513/517 character-style) so
// within-call coherence (e.g. round3 targeting different suspects than round2)
// works the same way it did at original generation time.
// ---------------------------------------------------------------------------

interface PromptGroup {
  key: string;
  style: MysteryStyle | "both";
  fields: string[];
  /** Extra rule blocks specific to this group, appended after the shared ones. */
  extraRules?: (style: MysteryStyle) => string;
  /** The output_schema body (verbatim from the blueprint, minus the outer <output_schema> tags). */
  schema: string;
  /** Trailing notes inside <output_schema>, after the JSON template. */
  schemaFooter?: string;
  /** True for the identity group: needs role_determination (detective only). */
  includeRoleDetermination?: boolean;
  /** Anchor fields whose CURRENT values are worth showing even though they're
   *  not being regenerated (drives coherence — e.g. guilty scripts should stay
   *  close to the innocent scripts already on file). */
  anchorHints?: string[];
}

const GROUP_IDENTITY: PromptGroup = {
  key: "identity",
  style: "both",
  fields: ["description", "background", "relationships", "secret", "introduction"],
  includeRoleDetermination: true,
  schema: `{
  "description": "## CHARACTER DESCRIPTION\\n\\n[2-3 paragraphs of who this character is, their role in the production/world, what makes them distinct]",
  "background": "## CHARACTER BACKGROUND\\n\\n**Name:** {{CHARACTER_NAME}}\\n\\n**Role:** [their job/position]\\n\\n**Background:**\\n\\n[3-4 paragraphs of life history, relationships, secrets, motive — pull specific details from master_context]\\n\\n**Your Relationship to the Victim:**\\n\\n[1-2 paragraphs of why this character had reason to dislike, fear, or oppose the victim]",
  "relationships": "## YOUR RELATIONSHIPS\\n\\n**ALLIES:**\\n\\n**[Cast Character Name]** - [1-2 sentences grounded in both characters' backgrounds]\\n\\n[2-3 ally entries — must be Friendly per master_context.relationshipMatrix; cast names only]\\n\\n**RIVALS & ENEMIES:**\\n\\n**[Cast Character Name]** - [1-2 sentences on tension or conflict]\\n\\n[2-3 rival entries — must be Hostile per master_context.relationshipMatrix; cast names only; never include the victim here]",
  "secret": "## YOUR SECRET\\n\\n[One significant secret this character is hiding, 1-2 paragraphs]\\n\\n**Why This Matters:** [1-2 sentences on why exposure of this secret would matter]",
  "introduction": "## ROUND 1: YOUR INTRODUCTION\\n\\n**Read this aloud when introducing yourself:**\\n\\n[2-3 paragraphs of first-person introduction speech, conversational tone, establishes character voice]"
}`,
};

const GROUP_SOCIAL_DETECTIVE: PromptGroup = {
  key: "social_detective",
  style: "detective",
  fields: ["rumors", "accusations"],
  extraRules: rumorTargetingRules,
  schema: `{
  "rumors": "## RUMORS TO SPREAD\\n\\n**During the rumor phase, share these pieces of gossip about other characters:**\\n\\n1. **About [Cast Name]:** '[rumor in single quotes — body of rumor as one or two sentences]'\\n\\n2. **About [Cast Name]:** '...'\\n\\n3. **About [Cast Name]:** '...'",
  "accusations": "## ACCUSATIONS\\n\\n### YOUR ACCUSATION\\n\\n*During the accusations phase, name one suspect and give a brief reason based on what you observed during the rounds. This is improvised in-the-moment.*[FOR MURDERER OR ACCOMPLICE ROLES ONLY: append \\n\\n### DEFLECTING SUSPICION — FOR YOUR EYES ONLY\\n\\n- [tactical bullet 1]\\n- [tactical bullet 2]\\n- [tactical bullet 3]\\n- [tactical bullet 4]\\n- [tactical bullet 5]]"
}`,
  schemaFooter: `If characterRole is 'suspect' or 'redHerring', emit ONLY the generic 'YOUR ACCUSATION' stub for the accusations field. The 'DEFLECTING SUSPICION' block ONLY appears for 'murderer' or 'accomplice' (this mystery's culprit is predetermined — no slips are drawn, so never use slip language).`,
};

const GROUP_SOCIAL_CHARACTER: PromptGroup = {
  key: "social_character",
  style: "character",
  fields: ["rumors", "accusations"],
  extraRules: rumorTargetingRules,
  schema: `{
  "rumors": "## RUMORS TO SPREAD\\n\\n**During the rumor phase, share these pieces of gossip about other characters:**\\n\\n1. **About [Cast Name]:** '[rumor in single quotes]'\\n\\n2. **About [Cast Name]:** '...'\\n\\n3. **About [Cast Name]:** '...'",
  "accusations": "## ACCUSATIONS\\n\\n### IF YOU DREW THE GUILTY/CULPRIT SLIP — DEFLECTION TIPS\\n\\n- [tactical bullet 1]\\n- [tactical bullet 2]\\n- [tactical bullet 3]\\n- [tactical bullet 4]\\n- [tactical bullet 5]"
}`,
  schemaFooter: `For character-based mysteries: every character's guide includes the guilty deflection block (since they might draw the guilty slip). Innocent players just improvise — no separate innocent accusation script.`,
};

const GROUP_ROUNDS_DETECTIVE: PromptGroup = {
  key: "rounds_detective",
  style: "detective",
  fields: [
    "round2_questions", "round2_script", "round3_questions", "round3_script",
    "round4_questions", "round4_script", "final_statement",
  ],
  schema: `{
  "round2Questions": "## ROUND 2: MOTIVES\\n\\n### QUESTIONS TO ASK\\n\\n1. **To [Cast Name]:** '[question in single quotes]'\\n\\n2. **To [Cast Name]:** '...'\\n\\n3. **To [Cast Name]:** '...'",
  "round2Script": "## ROUND 2: MOTIVES\\n\\n**YOUR SCRIPT**\\n\\n**When asked about your feelings toward the victim:**\\n\\n[3-4 paragraph prose script in first person, role-aware: murderer/accomplice scripts deflect; suspects show genuine motive but deny]",
  "round3Questions": "## ROUND 3: METHOD\\n\\n### QUESTIONS TO ASK\\n\\n1. **To [Cast Name]:** '...'\\n\\n2. **To [Cast Name]:** '...'\\n\\n3. **To [Cast Name]:** '...' (target 3 DIFFERENT characters than round 2)",
  "round3Script": "## ROUND 3: METHOD\\n\\n**YOUR SCRIPT**\\n\\n**When asked about your knowledge or capability:**\\n\\n[3-4 paragraph prose script]",
  "round4Questions": "## ROUND 4: OPPORTUNITY\\n\\n### QUESTIONS TO ASK\\n\\n1. **To [Cast Name]:** '...'\\n\\n2. **To [Cast Name]:** '...'\\n\\n3. **To [Cast Name]:** '...' (target 3 DIFFERENT characters than rounds 2-3)",
  "round4Script": "## ROUND 4: OPPORTUNITY\\n\\n**YOUR SCRIPT**\\n\\n**When asked about your whereabouts:**\\n\\n[3-4 paragraph prose script]",
  "finalStatement": "## FINAL STATEMENT\\n\\n**YOUR FINAL STATEMENT**\\n\\n**Read this when called upon during final statements:**\\n\\n[3-4 paragraph speech in first person — for murderer this is the confession revealing motive/method/timing; for innocents it is an emotional defense and theory]"
}`,
  schemaFooter: `This call's output can be large. Pace yourself: write each round, verify the comma and closing quote are present, then move to the next round. Do not rush.`,
};

const GROUP_ROUNDS_INNOCENT: PromptGroup = {
  key: "rounds_innocent",
  style: "character",
  fields: [
    "round2_questions", "round2_innocent", "round3_questions", "round3_innocent",
    "round4_questions", "round4_innocent", "final_innocent",
  ],
  schema: `{
  "round2Questions": "## ROUND 2: MOTIVES\\n\\n### QUESTIONS TO ASK\\n\\n1. **To [Cast Name]:** '[question]'\\n\\n2. **To [Cast Name]:** '...'\\n\\n3. **To [Cast Name]:** '...'",
  "round2Innocent": "## ROUND 2: MOTIVES\\n\\n**IF YOU'RE INNOCENT**\\n\\n[3-4 paragraph prose script — admit motive but deny acting on it; show what an innocent person with this motive would say]",
  "round3Questions": "## ROUND 3: METHOD\\n\\n### QUESTIONS TO ASK\\n\\n[same format as r2; target 3 DIFFERENT characters than r2]",
  "round3Innocent": "## ROUND 3: METHOD\\n\\n**IF YOU'RE INNOCENT**\\n\\n[3-4 paragraph prose script]",
  "round4Questions": "## ROUND 4: OPPORTUNITY\\n\\n### QUESTIONS TO ASK\\n\\n[same format; target 3 DIFFERENT characters than r2/r3]",
  "round4Innocent": "## ROUND 4: OPPORTUNITY\\n\\n**IF YOU'RE INNOCENT**\\n\\n[3-4 paragraph prose script — alibi/whereabouts]",
  "finalInnocent": "## FINAL STATEMENT\\n\\n**IF YOU'RE INNOCENT**\\n\\n[3-4 paragraph emotional defense, theory about who really did it]"
}`,
};

const GROUP_ROUNDS_GUILTY: PromptGroup = {
  key: "rounds_guilty",
  style: "character",
  fields: ["round2_guilty", "round3_guilty", "round4_guilty", "final_guilty"],
  anchorHints: ["round2_innocent", "round3_innocent", "round4_innocent", "final_innocent"],
  schema: `{
  "round2Guilty": "## ROUND 2: MOTIVES\\n\\n**IF YOU'RE GUILTY**\\n\\n[3-4 paragraph prose script — admit motive openly but redirect; subtle deflection]",
  "round3Guilty": "## ROUND 3: METHOD\\n\\n**IF YOU'RE GUILTY**\\n\\n[3-4 paragraph prose script — admit knowledge but deny using it]",
  "round4Guilty": "## ROUND 4: OPPORTUNITY\\n\\n**IF YOU'RE GUILTY**\\n\\n[3-4 paragraph prose script — fabricate alibi convincingly]",
  "finalGuilty": "## FINAL STATEMENT\\n\\n**IF YOU'RE GUILTY**\\n\\n[3-4 paragraph confession revealing motive, method, timing — the dramatic reveal moment]"
}`,
  schemaFooter: `These are the GUILTY-SLIP scripts (what the player says if they draw the guilty slip — they are the murderer). Scripts should be 85-90% similar to the innocent scripts already on file for this character (shown below as anchor context): admit motive/knowledge/opportunity but DENY committing murder.`,
};

const GROUP_ROUNDS_ACCOMPLICE: PromptGroup = {
  key: "rounds_accomplice",
  style: "character",
  fields: ["round2_accomplice", "round3_accomplice", "round4_accomplice", "final_accomplice"],
  anchorHints: ["round2_innocent", "round3_innocent", "round4_innocent", "final_innocent"],
  schema: `{
  "round2Accomplice": "## ROUND 2: MOTIVES\\n\\n**IF YOU'RE THE ACCOMPLICE**\\n\\n[3-4 paragraph prose script — protect the murderer; redirect suspicion to others]",
  "round3Accomplice": "## ROUND 3: METHOD\\n\\n**IF YOU'RE THE ACCOMPLICE**\\n\\n[3-4 paragraph prose script]",
  "round4Accomplice": "## ROUND 4: OPPORTUNITY\\n\\n**IF YOU'RE THE ACCOMPLICE**\\n\\n[3-4 paragraph prose script]",
  "finalAccomplice": "## FINAL STATEMENT\\n\\n**IF YOU'RE THE ACCOMPLICE**\\n\\n[3-4 paragraph statement — reveal accomplice role only at the very end if at all; primarily defend the murderer]"
}`,
  schemaFooter: `These are the ACCOMPLICE-SLIP scripts (what the player says if they draw the accomplice slip — they helped the murderer).`,
};

// ADR-0103: "THE REVEAL — YOUR CONFESSION" beat — a distinct field from
// final_guilty/final_accomplice (the closing statement during Final
// Statements) read only once the murderer/accomplice slip-holder is
// revealed at the end of the game. Character-style only; no detective-style
// equivalent exists (that style's single final_statement already carries
// the confession for a predetermined murderer). Added after the "Elementary,
// My Dear Cadaver" sweep found this function had no way to repair either
// field even though both are real customer-facing content
// (src/interfaces/mystery.ts, src/lib/characterGuideCopy.ts) — previously
// this whole beat was unrecoverable through the standard tool.
const GROUP_REVEAL_CONFESSION: PromptGroup = {
  key: "reveal_confession",
  style: "character",
  fields: ["reveal_confession_guilty", "reveal_confession_accomplice"],
  anchorHints: ["final_guilty", "final_accomplice"],
  schema: `{
  "revealConfessionGuilty": "## THE REVEAL — YOUR CONFESSION\\n\\n[3-4 paragraph first-person confession, read aloud once this character is revealed as the murderer — motive, method, and timing laid out plainly, no more deflecting]",
  "revealConfessionAccomplice": "## THE REVEAL — YOUR CONFESSION\\n\\n[3-4 paragraph first-person confession, read aloud once this character is revealed as the accomplice — what they knew, what they did to help or cover for the murderer, and why]"
}`,
  schemaFooter: `These are read aloud once at THE REVEAL, after the murderer/accomplice slip-holder is named — distinct from final_guilty/final_accomplice (shown below as anchor context), which are read earlier during Final Statements while the character is still deflecting. This is the moment all pretense drops.`,
};

const ALL_GROUPS: PromptGroup[] = [
  GROUP_IDENTITY, GROUP_SOCIAL_DETECTIVE, GROUP_SOCIAL_CHARACTER,
  GROUP_ROUNDS_DETECTIVE, GROUP_ROUNDS_INNOCENT, GROUP_ROUNDS_GUILTY, GROUP_ROUNDS_ACCOMPLICE,
  GROUP_REVEAL_CONFESSION,
];

/** DB field name -> the JSON key Claude emits for it (Child prompts use camelCase). */
const DB_TO_JSON_KEY: Record<string, string> = {
  description: "description", background: "background", relationships: "relationships",
  secret: "secret", introduction: "introduction", rumors: "rumors", accusations: "accusations",
  round2_questions: "round2Questions", round3_questions: "round3Questions", round4_questions: "round4Questions",
  round2_script: "round2Script", round3_script: "round3Script", round4_script: "round4Script",
  final_statement: "finalStatement",
  round2_innocent: "round2Innocent", round3_innocent: "round3Innocent", round4_innocent: "round4Innocent",
  final_innocent: "finalInnocent",
  round2_guilty: "round2Guilty", round3_guilty: "round3Guilty", round4_guilty: "round4Guilty",
  final_guilty: "finalGuilty",
  round2_accomplice: "round2Accomplice", round3_accomplice: "round3Accomplice", round4_accomplice: "round4Accomplice",
  final_accomplice: "finalAccomplice",
  reveal_confession_guilty: "revealConfessionGuilty", reveal_confession_accomplice: "revealConfessionAccomplice",
};

/** Groups applicable to a package's style, in a stable order. */
function groupsForStyle(style: MysteryStyle): PromptGroup[] {
  return ALL_GROUPS.filter((g) => g.style === "both" || g.style === style);
}

/** Which groups (for this style) does `fields` touch? */
function groupsNeeded(style: MysteryStyle, fields: string[]): PromptGroup[] {
  const set = new Set(fields);
  return groupsForStyle(style).filter((g) => g.fields.some((f) => set.has(f)));
}

// ---------------------------------------------------------------------------
// DB access helpers
// ---------------------------------------------------------------------------

interface PackageRow {
  id: string;
  conversation_id: string;
  master_context: string | null;
  mystery_style: string | null;
  title: string | null;
  user_conversation: string | null;
  extracted_characters: unknown;
  created_at: string;
}

interface CharacterRow {
  id: string;
  package_id: string;
  character_name: string;
  character_role: string | null;
  [field: string]: unknown;
}

async function loadPackage(packageId: string): Promise<PackageRow> {
  const { data, error } = await supabase
    .from("mystery_packages")
    .select("id, conversation_id, master_context, mystery_style, title, user_conversation, extracted_characters, created_at")
    .eq("id", packageId)
    .single();
  if (error || !data) throw new Error(`package not found: ${error?.message ?? packageId}`);
  return data as PackageRow;
}

// ---------------------------------------------------------------------------
// Removed-character leak check (ADR-0088 addendum, 2026-09-06) — this
// function is re-read live by any package that's ever had a character
// removed via adapt-mystery-apply (which feeds master_context.
// relationshipMatrix into this file's own prompt, see buildPrompt below).
// That matrix can go stale the moment a removal happens, so a regeneration
// here could pick a REMOVED character as a rumor/accusation target straight
// out of stale context, even with an accurate `cast` roster sitting right
// next to it in the same prompt. None of this function's existing 4
// detector classes are shaped to catch "names someone who no longer
// exists" — they're all leak-shaped (contamination between two LIVE
// characters), not absence-shaped. This closes that gap the same way
// adapt-mystery-apply's own verify gate does: a bounded, precise scan
// against the actual list of characters removed from THIS package, not a
// generic "any unrecognized name" heuristic that would false-positive on
// ordinary prose.
// nameVariants/buildVariantRegex ported verbatim from
// supabase/functions/adapt-mystery-apply/index.ts — not shared/imported,
// matching this codebase's existing "small helpers are duplicated per
// function, not centralized" convention (see that file's own header for
// why: two edge functions independently evolving their own copy is safer
// here than a shared module that couples their deploys).
// ---------------------------------------------------------------------------

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function nameVariants(fullName: string): string[] {
  const variants = new Set<string>();
  const trimmed = fullName.trim();
  variants.add(trimmed);

  const slashMatch = trimmed.match(/^(.*?)\/(\S+)( .*)$/);
  if (slashMatch) {
    const [, before, altToken, rest] = slashMatch;
    variants.add(`${before}${rest}`.trim());
    variants.add(`${altToken}${rest}`.trim());
    variants.add(`${before}/${altToken}`.trim());
  }

  const dashMatch = trimmed.match(/^(.+?)\s+-\s+\S+$/);
  if (dashMatch) variants.add(dashMatch[1].trim());

  const tokens = trimmed.replace("/", " ").split(/\s+/).filter(Boolean);
  const surname = tokens[tokens.length - 1];
  if (surname && surname.length >= 4) variants.add(surname);

  return [...variants].filter((v) => v.length >= 3);
}

function buildVariantRegex(variants: string[]): RegExp {
  const sorted = [...variants].sort((a, b) => b.length - a.length);
  return new RegExp(sorted.map((v) => `\\b${escapeRegex(v)}\\b`).join("|"), "gi");
}

interface RemovedCharacter { name: string; regex: RegExp }

/** Every character ever removed from this package via a verified adaptation
 *  — the bounded, known-bad-name list this check scans fresh generations
 *  against. Empty for the overwhelming majority of packages (no adaptation
 *  history), so this is a no-op query-and-skip for them, not fixed overhead
 *  that assumes every package needs it. */
async function loadRemovedCharacters(packageId: string): Promise<RemovedCharacter[]> {
  const { data, error } = await supabase
    .from("mystery_adaptations")
    .select("character_name")
    .eq("package_id", packageId)
    .eq("status", "verified");
  if (error) throw new Error(`removed-character lookup failed: ${error.message}`);
  const names = new Set((data ?? []).map((r) => r.character_name as string));
  return [...names].map((name) => ({ name, regex: buildVariantRegex(nameVariants(name)) }));
}

/** Scans newly-written field values for any removed character's name. Takes
 *  the AFTER values specifically (not the detector RPCs, which only see
 *  committed DB state) so this check runs against exactly what this call is
 *  about to accept, before it's too late to revert.
 *
 *  Known false-positive source, same one adapt-mystery-apply's own
 *  bare-surname fallback already accepts: `\bLyle\b` matches inside a
 *  hyphenated compound like "Lyle-brand" (the hyphen is a non-word
 *  boundary). That codebase's own comment calls this an acceptable
 *  trade-off there because a false positive just means an extra harmless
 *  substitution; here a false positive means an extra REVERT + escalation
 *  instead of a silent accept — never a corrupted write, never worse than
 *  the existing 4 detector classes' own false-positive risk in this same
 *  gate. Tightening the bare-surname threshold specifically for this check
 *  would diverge from "same variants as the primary removal path" for no
 *  demonstrated real collision yet — matching this codebase's existing
 *  pattern of guarding a specific name only once it's actually hit live
 *  (see "Cross"/"across", ADR-0098) rather than pre-guessing every
 *  possible one. */
function removedCharacterLeaksIn(
  afterValues: { character_id: string; character_name: string; field: string; value: string }[],
  removed: RemovedCharacter[],
): string[] {
  if (removed.length === 0) return [];
  const hits: string[] = [];
  for (const av of afterValues) {
    for (const rc of removed) {
      if (rc.regex.test(av.value)) hits.push(`${av.character_name}.${av.field} names removed character "${rc.name}"`);
      rc.regex.lastIndex = 0;
    }
  }
  return hits;
}

async function loadConversation(conversationId: string): Promise<{ has_accomplice: boolean | null; mystery_type: string | null }> {
  const { data } = await supabase
    .from("conversations")
    .select("has_accomplice, mystery_type")
    .eq("id", conversationId)
    .maybeSingle();
  return { has_accomplice: data?.has_accomplice ?? null, mystery_type: data?.mystery_type ?? null };
}

async function loadCharacters(packageId: string): Promise<CharacterRow[]> {
  const { data, error } = await supabase
    .from("mystery_characters")
    .select("*")
    .eq("package_id", packageId);
  if (error) throw new Error(`character lookup failed: ${error.message}`);
  return (data ?? []) as CharacterRow[];
}

async function readField(rowId: string, field: string): Promise<string> {
  const { data, error } = await supabase.rpc("remediation_read_field", {
    _scope: "character", _row_id: rowId, _field: field,
  });
  if (error) throw new Error(`read character.${field} failed: ${error.message}`);
  return (data as string) ?? "";
}

async function writeField(rowId: string, field: string, value: string): Promise<void> {
  const { error } = await supabase.rpc("remediation_write_field", {
    _scope: "character", _row_id: rowId, _field: field, _value: value,
  });
  if (error) throw new Error(`write character.${field} failed: ${error.message}`);
}

async function spentToday(): Promise<number> {
  const midnight = new Date();
  midnight.setUTCHours(0, 0, 0, 0);
  const { data, error } = await supabase
    .from("auto_remediation_log")
    .select("cost_usd")
    .gte("created_at", midnight.toISOString());
  if (error) throw new Error(`spend lookup failed: ${error.message}`);
  return (data ?? []).reduce((sum: number, r: { cost_usd: number }) => sum + Number(r.cost_usd || 0), 0);
}

async function logRow(entry: {
  package_id: string; defect_class: string; action: string;
  before_value: string | null; outcome: Outcome; cost_usd: number;
}): Promise<void> {
  const { error } = await supabase.from("auto_remediation_log").insert(entry);
  if (error) console.error(`auto_remediation_log insert failed: ${error.message}`, entry.action);
}

// ---------------------------------------------------------------------------
// The re-detect gate — reuses the exact ADR-0042/0041 detector RPCs
// auto-remediate-packages already calls (list_packages_with_*), scoped to a
// single package via an unbounded `_since` (see FULL_HISTORY_SINCE above).
// ---------------------------------------------------------------------------

interface DetectorState {
  identity: { claimants: string[] }[]; // one entry per flagged kin_term row for this package
  meta: string[] | null;               // `sources` for this package, or null if clean
  slip: string[] | null;               // `characters` for this package, or null if clean
  selfDirected: string[] | null;       // `offenders` for this package, or null if clean
}

async function callDetector(rpc: string): Promise<Record<string, unknown>[]> {
  const { data, error } = await supabase.rpc(rpc, { _since: FULL_HISTORY_SINCE });
  if (error) throw new Error(`detector ${rpc} failed: ${error.message}`);
  return (data ?? []) as Record<string, unknown>[];
}

// NOTE: there are 4 relevant classes here, not 3. This function is whitelisted
// to write round2/3/4_questions, and ADR-0053's completion gate blocks on
// self_directed_question (a "**To <own name>:**" question) exactly as it does
// on the other three classes below. Omitting list_packages_with_self_directed_
// questions from this set would let a repair silently reintroduce a
// self-directed question and still report outcome: "fixed" — the same failure
// mode the cross-class regression guard exists to prevent for the other three.
async function detectorState(packageId: string): Promise<DetectorState> {
  const [identityRows, metaRows, slipRows, selfDirectedRows] = await Promise.all([
    callDetector("list_packages_with_identity_conflicts"),
    callDetector("list_packages_with_meta_text_leak"),
    callDetector("list_packages_with_slip_culprit_leak"),
    callDetector("list_packages_with_self_directed_questions"),
  ]);
  const identity = identityRows
    .filter((r) => r.package_id === packageId)
    .map((r) => ({ claimants: (r.claimants as string[]) ?? [] }));
  const metaRow = metaRows.find((r) => r.package_id === packageId);
  const slipRow = slipRows.find((r) => r.package_id === packageId);
  const selfDirectedRow = selfDirectedRows.find((r) => r.package_id === packageId);
  return {
    identity,
    meta: metaRow ? ((metaRow.sources as string[]) ?? []) : null,
    slip: slipRow ? ((slipRow.characters as string[]) ?? []) : null,
    selfDirected: selfDirectedRow ? ((selfDirectedRow.offenders as string[]) ?? []) : null,
  };
}

const normName = (s: string) => s.trim().toLowerCase();

/** Does any part of this detector state still name one of the touched characters? */
function stillImplicatesTouched(state: DetectorState, touchedNames: Set<string>): string[] {
  const hits: string[] = [];
  for (const row of state.identity) {
    if (row.claimants.some((c) => touchedNames.has(normName(c)))) {
      hits.push(`identity_contamination:${row.claimants.join(",")}`);
    }
  }
  if (state.meta) {
    for (const source of state.meta) {
      const name = source.startsWith("character:") ? source.slice("character:".length) : null;
      if (name && touchedNames.has(normName(name))) hits.push(`meta_text_leak:${name}`);
    }
  }
  if (state.slip) {
    for (const name of state.slip) {
      if (touchedNames.has(normName(name))) hits.push(`slip_culprit_leak:${name}`);
    }
  }
  if (state.selfDirected) {
    for (const name of state.selfDirected) {
      if (touchedNames.has(normName(name))) hits.push(`self_directed_questions:${name}`);
    }
  }
  return hits;
}

/** Did a class that was CLEAN before become flagged after, for anyone (not just
 *  touched characters)? This is the regression guard — a fix must never trade
 *  one defect for a new one, even on a character nobody touched this call. */
function regressions(before: DetectorState, after: DetectorState): string[] {
  const out: string[] = [];
  const beforeIdentityTerms = new Set(before.identity.map((r) => r.claimants.slice().sort().join(",")));
  for (const row of after.identity) {
    const key = row.claimants.slice().sort().join(",");
    if (!beforeIdentityTerms.has(key)) out.push(`new identity_contamination: ${row.claimants.join(",")}`);
  }
  if (after.meta && !before.meta) out.push(`new meta_text_leak: ${after.meta.join(",")}`);
  if (after.meta && before.meta) {
    const beforeSet = new Set(before.meta);
    for (const s of after.meta) if (!beforeSet.has(s)) out.push(`new meta_text_leak source: ${s}`);
  }
  if (after.slip && !before.slip) out.push(`new slip_culprit_leak: ${after.slip.join(",")}`);
  if (after.slip && before.slip) {
    const beforeSet = new Set(before.slip);
    for (const c of after.slip) if (!beforeSet.has(c)) out.push(`new slip_culprit_leak character: ${c}`);
  }
  if (after.selfDirected && !before.selfDirected) out.push(`new self_directed_questions: ${after.selfDirected.join(",")}`);
  if (after.selfDirected && before.selfDirected) {
    const beforeSet = new Set(before.selfDirected);
    for (const c of after.selfDirected) if (!beforeSet.has(c)) out.push(`new self_directed_questions character: ${c}`);
  }
  return out;
}

/** Auto-discover every OTHER character implicated by the SAME defect instance
 *  as the primary character, per the hinted class. See the file header —
 *  fixing one of 3+ identity claimants, or one of several slip-leaking
 *  characters, may not clear the package; this expands the target set so a
 *  single call can actually finish the job. Bounded by MAX_TARGET_CHARACTERS. */
function autoExpand(
  hint: DefectHint | undefined,
  before: DetectorState,
  primaryName: string,
): string[] {
  if (!hint) return [];
  const names = new Set<string>();
  if (hint === "identity_contamination") {
    for (const row of before.identity) {
      if (row.claimants.some((c) => normName(c) === normName(primaryName))) {
        for (const c of row.claimants) names.add(c);
      }
    }
  } else if (hint === "slip_culprit_leak" && before.slip) {
    for (const c of before.slip) names.add(c);
  } else if (hint === "meta_text_leak" && before.meta) {
    for (const s of before.meta) {
      if (s.startsWith("character:")) names.add(s.slice("character:".length));
    }
  }
  return [...names];
}

/**
 * When defect_class_hint === 'identity_contamination', regenerating only the
 * caller-specified fields can leave the contamination in a field the caller
 * didn't think to name (the detector's own "claims" text search spans
 * introduction + all round scripts + final statement — see
 * list_packages_with_identity_conflicts). To make a single call reliably
 * clear the defect, identity-contamination requests widen `fields` to the
 * full claims-bearing set for the package's style, UNIONED with whatever the
 * caller asked for (never narrowed) — see ADR-0054's wiring contract.
 */
const CLAIMS_FIELDS_BY_STYLE: Record<MysteryStyle, string[]> = {
  detective: ["introduction", "round2_script", "round3_script", "round4_script", "final_statement"],
  character: ["introduction", "round2_innocent", "round3_innocent", "round4_innocent", "final_innocent"],
};

function effectiveFieldsFor(hint: DefectHint | undefined, style: MysteryStyle, requested: string[]): string[] {
  if (hint !== "identity_contamination") return requested;
  const widened = new Set([...requested, ...CLAIMS_FIELDS_BY_STYLE[style]]);
  return [...widened];
}

// ---------------------------------------------------------------------------
// Prompt assembly
// ---------------------------------------------------------------------------

function extractSeedDescription(extracted: unknown, characterName: string): string {
  try {
    const arr = typeof extracted === "string" ? JSON.parse(extracted) : extracted;
    if (!Array.isArray(arr)) return "";
    const norm = normName(characterName);
    const hit = arr.find((c: { name?: string }) => {
      const n = normName(String(c?.name ?? ""));
      return n === norm || n.split("/").some((part) => part.trim() === norm) || norm.includes(n) || n.includes(norm);
    });
    return hit?.description ?? "";
  } catch {
    return "";
  }
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + " …[truncated]" : s;
}

/**
 * Build the full prompt for one (character, group) pair. Mirrors the Child
 * blueprint's <context> block, with two additions specific to a REPAIR (vs.
 * first-generation) call: an "established fields" anchor (this character's
 * current values for fields NOT being regenerated, so the rewrite doesn't
 * contradict them) and a full cast roster (names + roles only) so targeting
 * rules stay correct without re-sending every other character's full text.
 */
function buildPrompt(opts: {
  style: MysteryStyle;
  group: PromptGroup;
  fieldsToGenerate: string[]; // subset of group.fields actually requested
  masterContext: string;
  character: CharacterRow;
  seedDescription: string;
  conversationContent: string;
  hasAccomplice: boolean | null;
  mysteryType: string | null;
  cast: { character_name: string; character_role: string | null }[];
}): string {
  const { style, group, fieldsToGenerate, masterContext, character, seedDescription,
    conversationContent, hasAccomplice, mysteryType, cast } = opts;

  const castRoster = cast
    .map((c) => `- ${c.character_name}${c.character_role ? ` (${c.character_role})` : ""}`)
    .join("\n");

  const anchorFieldNames = new Set<string>([
    ...group.fields.filter((f) => !fieldsToGenerate.includes(f)),
    ...(group.anchorHints ?? []),
  ]);
  const anchorLines: string[] = [];
  for (const f of anchorFieldNames) {
    const v = character[f];
    if (typeof v === "string" && v.trim()) {
      anchorLines.push(`**${f}** (current — do not contradict; regenerate ONLY the requested fields):\n${truncate(v, 1200)}`);
    }
  }
  // Always anchor the identity-bearing fields when NOT in the current group,
  // so round/rumor regeneration never drifts from established background,
  // relationships, or secret — the exact drift class identity_contamination is.
  for (const f of ["background", "relationships", "secret", "description"]) {
    if (!anchorFieldNames.has(f) && !fieldsToGenerate.includes(f)) {
      const v = character[f];
      if (typeof v === "string" && v.trim()) {
        anchorLines.push(`**${f}** (current — established truth, do not contradict):\n${truncate(v, 1200)}`);
      }
    }
  }

  const parts = [
    roleBlock(style),
    contentCoherenceRules(style),
    `<context>
**Master context (the mystery's full design):**
${masterContext}

**Character name:** ${character.character_name}
**Established role:** ${character.character_role ?? "(not set)"}
**Original character seed description:** ${seedDescription || "(not recorded — rely on master_context and established fields below)"}
**Has accomplice:** ${hasAccomplice ?? "unknown"}
**Mystery type:** ${mysteryType ?? "unknown"}

**Full cast (for targeting rumors/questions/accusations — never target Friendly-only characters per master_context.relationshipMatrix, and never target the victim):**
${castRoster}

**Brainstorming conversation (fallback context only; the per-character chat excerpts the original generator used are not recoverable post-hoc):**
${truncate(conversationContent || "(none recorded)", 4000)}
</context>`,
  ];

  if (anchorLines.length > 0) {
    parts.push(`<established_fields>
This character's CURRENT content for fields you are NOT regenerating this call. Treat these as ground truth — the fields you DO generate must stay consistent with them, not contradict them:

${anchorLines.join("\n\n")}
</established_fields>`);
  }

  if (group.includeRoleDetermination && style === "detective") parts.push(ROLE_DETERMINATION);
  parts.push(NO_CHAIN_OF_THOUGHT, NO_META_TEXT, CRITICAL_JSON_RULES);
  if (group.extraRules) parts.push(group.extraRules(style));

  // Filter the schema down to only the requested keys, preserving the
  // verbatim per-field template text from the blueprint.
  const fullSchema = JSON.parse(
    group.schema.replace(/\{\{CHARACTER_NAME\}\}/g, character.character_name),
  ) as Record<string, string>;
  const wantedJsonKeys = fieldsToGenerate.map((f) => DB_TO_JSON_KEY[f]);
  const filteredSchema: Record<string, string> = {};
  for (const k of wantedJsonKeys) if (fullSchema[k] !== undefined) filteredSchema[k] = fullSchema[k];

  parts.push(`<output_schema>
Output a SINGLE valid JSON object with EXACTLY these fields, nothing else:

${JSON.stringify(filteredSchema, null, 2)}
${group.schemaFooter ? "\n" + group.schemaFooter : ""}
</output_schema>`);

  return parts.join("\n\n");
}

async function callClaude(prompt: string, apiKey: string): Promise<{ text: string; costUsd: number }> {
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      // temperature: 0.7 removed 2026-08-22 alongside the Sonnet 5 switch —
      // Sonnet 5 rejects any non-default sampling parameter with a 400
      // (ADR-0074 already hit and fixed this exact landmine in the live
      // Child/Parent blueprints; this file just hadn't been touched since).
      //
      // thinking: disabled added same day — caught live: without it, a real
      // Sonnet 5 call returned content[0] as a non-text block, so
      // `data.content?.[0]?.text` was undefined and every field failed with
      // "No content in Anthropic response" (zero cost — fails before any
      // write). adapt-mystery-apply already sets this exact flag for its own
      // Sonnet 5 calls (ADR-0074); this file just hadn't matched it.
      model: MODEL,
      max_tokens: MAX_TOKENS,
      thinking: { type: "disabled" },
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Anthropic API ${resp.status}: ${errText}`);
  }
  const data = await resp.json();
  const text = data.content?.[0]?.text;
  if (!text) throw new Error("No content in Anthropic response");
  // Flat estimate (see CLAUDE_CALL_COST_USD) rather than metering actual
  // usage — consistent with the flat-rate cost accounting auto-remediate-
  // packages already uses for its own Claude call (OVERVIEW_REGEN_COST_USD).
  return { text: text.trim(), costUsd: CLAUDE_CALL_COST_USD };
}

/** Escape raw control-character bytes (literal newline/tab/CR) that appear
 *  inside a JSON string literal, leaving everything outside strings untouched.
 *  Ported from parse-claude-json/index.ts (2026-08-29, ADR-0103 Addendum 5
 *  follow-up): this file has its own independent JSON parse/repair pass that
 *  never got this fix — found live testing regenerate-child-content directly,
 *  where a multi-paragraph field (introduction) reliably failed with "Bad
 *  control character in string literal" on the very first and second real
 *  calls, because Claude sometimes emits a literal newline inside a string
 *  value instead of the escaped \n the JSON spec requires. The existing
 *  repair pass here only handled apostrophe/quote slips, not this. */
function escapeControlCharsInStrings(s: string): string {
  let out = "";
  let inString = false;
  let escaped = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inString) {
      if (escaped) { out += ch; escaped = false; continue; }
      if (ch === "\\") { out += ch; escaped = true; continue; }
      if (ch === '"') { inString = false; out += ch; continue; }
      if (ch === "\n") { out += "\\n"; continue; }
      if (ch === "\r") { out += "\\r"; continue; }
      if (ch === "\t") { out += "\\t"; continue; }
      out += ch;
    } else {
      if (ch === '"') inString = true;
      out += ch;
    }
  }
  return out;
}

/** Parse Claude's JSON response, with the same repair pass the rest of the
 *  pipeline needs for occasional apostrophe/quote slips (see
 *  critical_json_rules above — this is the backstop for when the model
 *  doesn't fully follow them). */
function parseJsonResponse(raw: string): Record<string, string> {
  const stripped = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  try {
    return JSON.parse(stripped);
  } catch {
    // Repair pass: invalid backslash-escaped apostrophes, doubled trailing
    // apostrophes (the two failure modes critical_json_rules calls out by
    // name), and raw control characters inside string values.
    const repaired = escapeControlCharsInStrings(stripped.replace(/\\'/g, "'").replace(/''/g, "'"));
    return JSON.parse(repaired);
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

interface RequestBody {
  package_id?: string;
  character_id?: string;
  character_ids?: string[];
  fields?: string[];
  defect_class_hint?: DefectHint;
  dry_run?: boolean;
}

interface FieldResult {
  character_id: string;
  character_name: string;
  field: string;
  status: "generated" | "skipped_content_loss_guard" | "error";
  note?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { status: 200 });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST only" }), { status: 405 });
  }

  try {
    const body: RequestBody = await req.json();
    const { package_id, character_id, character_ids, fields, defect_class_hint, dry_run } = body;

    if (!package_id) return new Response(JSON.stringify({ error: "package_id required" }), { status: 400 });
    if (!character_id) return new Response(JSON.stringify({ error: "character_id required" }), { status: 400 });
    if (!Array.isArray(fields) || fields.length === 0) {
      return new Response(JSON.stringify({ error: "fields (non-empty array) required" }), { status: 400 });
    }
    const unsupported = fields.filter((f) => !SUPPORTED_FIELDS.has(f));
    if (unsupported.length > 0) {
      return new Response(JSON.stringify({
        error: `unsupported field(s): ${unsupported.join(", ")}`,
        note: "secrets (jsonb, plural) has no Child-prompt generation equivalent — only 'secret' (text) is supported. See ADR-0054.",
      }), { status: 400 });
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

    const pkg = await loadPackage(package_id);
    if (!pkg.master_context) throw new Error("master_context is empty — cannot regenerate without it");
    const style: MysteryStyle = pkg.mystery_style === "character" ? "character" : "detective";
    const effectiveFields = effectiveFieldsFor(defect_class_hint, style, fields);
    const { has_accomplice, mystery_type } = await loadConversation(pkg.conversation_id);
    const allCharacters = await loadCharacters(package_id);

    const primary = allCharacters.find((c) => c.id === character_id);
    if (!primary) throw new Error(`character ${character_id} not found in package ${package_id}`);

    const masterContextStr = typeof pkg.master_context === "string" ? pkg.master_context : JSON.stringify(pkg.master_context);

    // --- Gate step 1: capture BEFORE state, then auto-expand target characters ---
    const before = await detectorState(package_id);
    const autoExpandedNames = autoExpand(defect_class_hint, before, primary.character_name);

    const explicitIds = new Set([character_id, ...(character_ids ?? [])]);
    const targets = new Map<string, CharacterRow>();
    for (const id of explicitIds) {
      const c = allCharacters.find((ch) => ch.id === id);
      if (c) targets.set(c.id, c);
    }
    for (const name of autoExpandedNames) {
      const c = allCharacters.find((ch) => normName(ch.character_name) === normName(name));
      if (c) targets.set(c.id, c);
    }
    const targetList = [...targets.values()].slice(0, MAX_TARGET_CHARACTERS);
    const truncatedTargets = targets.size > MAX_TARGET_CHARACTERS;
    const touchedNames = new Set(targetList.map((c) => normName(c.character_name)));

    const groups = groupsNeeded(style, effectiveFields);
    if (groups.length === 0) {
      return new Response(JSON.stringify({
        package_id, outcome: "noop" as Outcome,
        note: `none of the requested fields apply to mystery_style '${style}'`,
      }), { headers: { "Content-Type": "application/json" } });
    }

    // --- Spend cap ---
    const totalCalls = targetList.length * groups.length;
    const estimatedCost = totalCalls * CLAUDE_CALL_COST_USD;
    const alreadySpent = await spentToday();
    const budgetRemaining = Math.max(0, DAILY_SPEND_CAP_USD - alreadySpent);
    if (!dry_run && estimatedCost > budgetRemaining) {
      const action = "skip:daily_spend_cap";
      await logRow({
        package_id, defect_class: defect_class_hint ?? "child_content_regen", action,
        before_value: null, outcome: "escalated", cost_usd: 0,
      });
      return new Response(JSON.stringify({
        package_id, outcome: "escalated" as Outcome,
        note: `needs ~$${estimatedCost.toFixed(2)}, $${budgetRemaining.toFixed(2)} left of the $${DAILY_SPEND_CAP_USD.toFixed(2)} daily cap (shared with auto-remediate-packages)`,
      }), { headers: { "Content-Type": "application/json" } });
    }

    if (dry_run) {
      return new Response(JSON.stringify({
        package_id,
        outcome: "planned" as Outcome,
        targets: targetList.map((c) => ({ id: c.id, name: c.character_name })),
        truncated_targets: truncatedTargets,
        groups: groups.map((g) => g.key),
        fields_requested: fields,
        fields_effective: effectiveFields,
        estimated_cost_usd: Number(estimatedCost.toFixed(4)),
        note: "dry_run — nothing called, nothing written, nothing spent",
      }), { headers: { "Content-Type": "application/json" } });
    }

    // --- Generate + write (capturing before-values for revert) ---
    const results: FieldResult[] = [];
    const beforeValues: { character_id: string; field: string; value: string }[] = [];
    // Mirrors beforeValues, but the NEW value — needed by the removed-
    // character leak check below, which must scan what's about to be
    // accepted, not what's already committed.
    const afterValues: { character_id: string; character_name: string; field: string; value: string }[] = [];
    let actualCost = 0;
    let hadError = false;

    for (const character of targetList) {
      const seedDescription = extractSeedDescription(pkg.extracted_characters, character.character_name);
      // Exclude the character being written about — including self in the "cast
      // names only" roster let the model pick itself as its own ally/rival
      // (e.g. "You are yourself"), seen on dual-gender-variant names.
      const cast = allCharacters
        .filter((c) => c.id !== character.id)
        .map((c) => ({ character_name: c.character_name, character_role: c.character_role }));
      for (const group of groups) {
        const fieldsToGenerate = group.fields.filter((f) => effectiveFields.includes(f));
        if (fieldsToGenerate.length === 0) continue;

        let parsed: Record<string, string>;
        try {
          const prompt = buildPrompt({
            style, group, fieldsToGenerate, masterContext: masterContextStr, character,
            seedDescription, conversationContent: pkg.user_conversation ?? "",
            hasAccomplice: has_accomplice, mysteryType: mystery_type, cast,
          });
          const { text, costUsd } = await callClaude(prompt, apiKey);
          actualCost += costUsd;
          parsed = parseJsonResponse(text);
        } catch (e) {
          hadError = true;
          for (const f of fieldsToGenerate) {
            results.push({ character_id: character.id, character_name: character.character_name, field: f, status: "error", note: (e as Error).message });
          }
          continue;
        }

        for (const field of fieldsToGenerate) {
          const jsonKey = DB_TO_JSON_KEY[field];
          const value = parsed[jsonKey];
          if (typeof value !== "string" || !value.trim()) {
            hadError = true;
            results.push({ character_id: character.id, character_name: character.character_name, field, status: "error", note: "missing/empty in Claude response" });
            continue;
          }
          // Guarded write: readField/writeField (remediation_read_field /
          // remediation_write_field) can throw mid-loop — reproduced for
          // `relationships` on characters whose existing value is null or a
          // jsonb object (~7% of prod characters), but the invariant below
          // must hold for ANY field's throw, not just that one. Before this
          // guard, an unhandled throw here escaped both for-loops and the
          // hadError handling below entirely, was caught only by the
          // function's outermost try/catch, and returned a bare 500 WITHOUT
          // revertAll() or logRow() — leaving whatever fields this call had
          // already written in this same invocation committed, unreverted,
          // and unlogged. That's exactly the "shipped something worse" outcome
          // the re-detect gate exists to prevent; degrade to escalate instead.
          try {
            const currentValue = await readField(character.id, field);
            // Content-loss guard, same shape as auto-remediate-packages's
            // writeField guard: never accept a regeneration that guts a
            // substantive field, even though this is a fresh LLM call rather
            // than a deterministic edit.
            if (currentValue.trim().length >= 40 && value.trim().length < currentValue.trim().length * 0.5) {
              results.push({ character_id: character.id, character_name: character.character_name, field, status: "skipped_content_loss_guard", note: `${currentValue.length}->${value.length} chars` });
              continue;
            }
            beforeValues.push({ character_id: character.id, field, value: currentValue });
            const trimmedValue = value.trim();
            await writeField(character.id, field, trimmedValue);
            afterValues.push({ character_id: character.id, character_name: character.character_name, field, value: trimmedValue });
            results.push({ character_id: character.id, character_name: character.character_name, field, status: "generated" });
          } catch (e) {
            hadError = true;
            results.push({ character_id: character.id, character_name: character.character_name, field, status: "error", note: (e as Error).message });
          }
        }
      }
    }

    async function revertAll(): Promise<void> {
      for (const bv of beforeValues) {
        await writeField(bv.character_id, bv.field, bv.value).catch((e) =>
          console.error(`revert failed for ${bv.character_id}.${bv.field}: ${(e as Error).message}`));
      }
    }

    if (hadError) {
      await revertAll();
      await logRow({
        package_id, defect_class: defect_class_hint ?? "child_content_regen",
        action: `regenerate_child_content:${fields.join(",")}|generation_error|reverted`,
        before_value: JSON.stringify(beforeValues), outcome: "failed", cost_usd: actualCost,
      });
      return new Response(JSON.stringify({
        package_id, outcome: "failed" as Outcome, results,
        note: "one or more fields failed to generate — all writes reverted",
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    // --- Gate step 2: re-detect, accept or revert ---
    const after = await detectorState(package_id);
    const stillFlagged = stillImplicatesTouched(after, touchedNames);
    const regressed = regressions(before, after);
    // ADR-0088 addendum, 2026-09-06: none of the 4 detector classes above
    // are shaped to catch a regeneration naming a character removed from
    // this package (via adapt-mystery-apply) — see loadRemovedCharacters'
    // comment for why that's a real, not hypothetical, risk on any package
    // with adaptation history. Cheap query, no-op for the overwhelming
    // majority of packages that have never had a removal.
    const removedCharacters = await loadRemovedCharacters(package_id);
    const removedCharacterLeaks = removedCharacterLeaksIn(afterValues, removedCharacters);

    if (stillFlagged.length > 0 || regressed.length > 0 || removedCharacterLeaks.length > 0) {
      await revertAll();
      await logRow({
        package_id, defect_class: defect_class_hint ?? "child_content_regen",
        action: `regenerate_child_content:${fields.join(",")}|redetect_failed|reverted`,
        before_value: JSON.stringify(beforeValues), outcome: "escalated", cost_usd: actualCost,
      });
      return new Response(JSON.stringify({
        package_id, outcome: "escalated" as Outcome, results,
        still_flagged: stillFlagged, regressions: regressed, removed_character_leaks: removedCharacterLeaks,
        note: "re-detect gate rejected the fix — all writes reverted byte-for-byte; needs a human or another pass (e.g. more claimant characters than MAX_TARGET_CHARACTERS allowed in one call)",
      }), { headers: { "Content-Type": "application/json" } });
    }

    await logRow({
      package_id, defect_class: defect_class_hint ?? "child_content_regen",
      action: `regenerate_child_content:${targetList.map((c) => c.character_name).join("+")}:${fields.join(",")}`,
      before_value: JSON.stringify(beforeValues), outcome: "fixed", cost_usd: actualCost,
    });

    return new Response(JSON.stringify({
      package_id,
      outcome: "fixed" as Outcome,
      targets: targetList.map((c) => ({ id: c.id, name: c.character_name })),
      truncated_targets: truncatedTargets,
      fields_requested: fields,
      fields_effective: effectiveFields,
      groups: groups.map((g) => g.key),
      cost_usd: Number(actualCost.toFixed(4)),
      results,
    }), { headers: { "Content-Type": "application/json" } });
  } catch (error) {
    console.error("regenerate-child-content fatal:", (error as Error).message);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
