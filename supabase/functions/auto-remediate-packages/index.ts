import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * auto-remediate-packages — closed-loop auto-remediation worker. See ADR-0047.
 *
 * ADR-0042 gave us detection (read-only detectors + the 6-hourly health check
 * that opens a GitHub issue / emails the owner). Remediation stayed manual:
 * every live catch so far was found automatically but *fixed* only because the
 * owner was in the loop. This worker removes the owner from the loop for the
 * mechanical defect classes, and keeps a human gate exactly where judgment is
 * load-bearing.
 *
 * For each detector-flagged package in a bounded recent window it attempts a
 * class-specific fix, then RE-RUNS THAT DETECTOR and only accepts the fix if
 * the package now passes. That re-detect gate is the core safety invariant:
 * auto-remediation can never ship something worse than today's escalate-to-a-
 * human path, because the worst case *is* today's path.
 *
 *   Defect class                    Action
 *   ------------------------------  -----------------------------------------
 *   missing_images                  regenerate via generate-evidence-images
 *                                   (prompt derived from the card DESCRIPTION)
 *   self_directed_questions         deterministic retarget to a living suspect
 *   template_artifact               strip the offending line; embedded
 *                                   (unstrippable) character-scope instances
 *                                   DELEGATE to regenerate-child-content
 *   game_overview_victim_mismatch   regenerate-parent-content game_overview
 *   identity_contamination          DELEGATE to regenerate-child-content
 *   slip_culprit_leak               DELEGATE to regenerate-child-content
 *   missing_role_branch_content     DELEGATE to regenerate-child-content, one
 *                                   call per character with that character's
 *                                   own precise missing-field list (ADR-0103
 *                                   Addendum 36)
 *
 * ADR-0061 (2026-08-02): identity_contamination and slip_culprit_leak used to
 * be escalate-only ("child-generated, judgment-heavy, no safe deterministic
 * fix and no child-content regenerator yet"). ADR-0054 built that regenerator;
 * this file now delegates to it for those two classes plus the character-scope
 * half of template_artifact/meta_text_leak that the deterministic strip below
 * refuses to touch. Delegation is direct (see delegateToRegenerator) — NOT
 * wrapped in runGatedAttempt, because regenerate-child-content already
 * re-detects and reverts internally; wrapping it would create a second,
 * independent revert path racing the first. See ADR-0061 for the full
 * rationale, the concurrency claim, and the shared-spend-cap reconciliation.
 *
 * Safety rails (all mandatory, all enforced below — do not weaken):
 *   1. Re-detect gate after EVERY fix; revert if feasible + escalate on failure.
 *      For delegated repairs, this gate lives inside regenerate-child-content
 *      itself (ADR-0054) rather than in runGatedAttempt — see above.
 *   2. Per-package/per-defect attempt cap (2), counted from auto_remediation_log,
 *      so the worker can never loop on something it cannot fix. Applies to
 *      delegated repairs too (the regenerator has no attempt memory of its own).
 *   3. Global daily spend cap, summed from auto_remediation_log; halt + escalate.
 *      Shared with regenerate-child-content via the same table (ADR-0054).
 *   4. Bounded window (30 days) so it never churns ancient/already-played packages.
 *   5. Every action logged with its before-value, so anything it did is
 *      reconstructable and recoverable by hand. For delegated repairs, the
 *      regenerator itself writes this row — the worker never double-logs.
 *   6. Concurrency claim (ADR-0061) around every delegated repair, so the new
 *      5-minute held-only sweep and the existing 4-hour full sweep can't both
 *      repair the same package at once.
 *
 * POST {} — or { dry_run: true } to detect and report the planned actions
 * without mutating anything or spending a cent (use this to eval it).
 * Optional { window_days: number } to narrow (never widen) the window.
 * Optional { only_needs_review: true } (ADR-0061) to restrict to packages
 * currently held in needs_review — used by the 5-minute held-only sweep.
 * Optional { classes: DefectClass[] } (ADR-0061) to restrict to a subset of
 * defect classes — also used by the held-only sweep, to avoid touching the
 * paid classes that don't need a tighter cadence.
 */

// ---------------------------------------------------------------------------
// Safety constants. These are the rails. Changing them changes the blast radius.
// ---------------------------------------------------------------------------

/** Bounded window — matches the health check's 30-day alerting window. */
const WINDOW_DAYS = 30;

/** Per-package/per-defect attempt cap. Never loop on a package we can't fix. */
const MAX_ATTEMPTS_PER_DEFECT = 2;

/**
 * Global daily spend cap (USD), shared with notify-generation-issue's
 * empty-character re-fire (same auto_remediation_log table, one ceiling not
 * two independent budgets — ADR-0076). Raised $5 -> $10 (ADR-0086,
 * 2026-08-14): a single 34-character package's own recovery burned $3.90
 * (78%) of one day's $5 cap, leaving only $0.05 of headroom for every other
 * package's recovery that same day. The per-character/per-defect 2-attempt
 * cap already bounds any one item's worst case, so the daily ceiling was the
 * binding constraint on multi-incident days, not runaway spend on a single
 * broken item.
 */
const DAILY_SPEND_CAP_USD = 10.0;

/** Replicate Flux 1.1 Pro, per image (ADR-0017). */
const IMAGE_COST_USD = 0.04;

/**
 * Retry tolerance for a Flux "NSFW content detected" false positive
 * (generate-evidence-images' `safety_tolerance` input, 1=strictest..6=most
 * permissive; the pipeline's default is 2). Confirmed 2026-08-05: an evidence
 * description with no graphic content (a glass decanter stopper, a forensic
 * latex-residue report) failed identically twice at tolerance=2, then
 * succeeded on the FIRST attempt at tolerance=5 with the byte-identical
 * prompt. A stricter default is still the right general setting; this is a
 * bounded, single retry for a specific, recognizable rejection reason, not a
 * general loosening.
 */
const NSFW_RETRY_SAFETY_TOLERANCE = 5;

/** One Claude Haiku game_overview regeneration (~1.5k output tokens). */
const OVERVIEW_REGEN_COST_USD = 0.01;

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

type Outcome = "fixed" | "escalated" | "failed";

type DefectClass =
  | "missing_images"
  | "self_directed_questions"
  | "template_artifact"
  | "game_overview_victim_mismatch"
  | "identity_contamination"
  | "slip_culprit_leak"
  | "missing_role_branch_content";

/**
 * ADR-0061: the delegated meta_text_leak fallback (character-scope artifacts
 * the deterministic strip refuses to touch) is logged under the literal
 * string "meta_text_leak" — matching what regenerate-child-content's
 * defect_class_hint actually writes to auto_remediation_log — not under
 * "template_artifact" (this worker's own name for the free-strip lane). The
 * two are deliberately separate, independently-capped repair lanes for the
 * same underlying detector; see ADR-0061 Decision 3.
 */
type LogDefectClass = DefectClass | "meta_text_leak";

/** The detector RPC that defines — and re-checks — each defect class. */
const DETECTOR_RPC: Record<DefectClass, string> = {
  missing_images: "list_packages_missing_evidence_images",
  self_directed_questions: "list_packages_with_self_directed_questions",
  template_artifact: "list_packages_with_meta_text_leak",
  game_overview_victim_mismatch: "list_packages_with_victim_mismatch",
  identity_contamination: "list_packages_with_identity_conflicts",
  slip_culprit_leak: "list_packages_with_slip_culprit_leak",
  missing_role_branch_content: "list_packages_with_missing_role_branch_content",
};

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

const escapeRx = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

async function callDetector(rpc: string, sinceIso: string): Promise<Record<string, unknown>[]> {
  const { data, error } = await supabase.rpc(rpc, { _since: sinceIso });
  if (error) throw new Error(`detector ${rpc} failed: ${error.message}`);
  return (data ?? []) as Record<string, unknown>[];
}

/**
 * THE RE-DETECT GATE. Re-runs the class's own detector and answers "is this
 * package still flagged?". A fix is only ever accepted when this returns false.
 */
async function stillFlagged(
  defectClass: DefectClass,
  sinceIso: string,
  packageId: string,
): Promise<boolean> {
  const rows = await callDetector(DETECTOR_RPC[defectClass], sinceIso);
  return rows.some((r) => r.package_id === packageId);
}

async function logRow(entry: {
  package_id: string;
  defect_class: LogDefectClass;
  action: string;
  before_value: string | null;
  outcome: Outcome;
  cost_usd: number;
}): Promise<void> {
  const { error } = await supabase.from("auto_remediation_log").insert(entry);
  if (error) console.error(`auto_remediation_log insert failed: ${error.message}`, entry.action);
}

/**
 * Attempt-cap counter. Skip/no-op bookkeeping rows (action starting `skip:` or
 * `escalate:`) are excluded so the cap counts real remediation attempts only —
 * otherwise a package that merely got logged twice could never be tried.
 */
async function attemptsUsed(packageId: string, defectClass: LogDefectClass): Promise<number> {
  const { data, error } = await supabase
    .from("auto_remediation_log")
    .select("action")
    .eq("package_id", packageId)
    .eq("defect_class", defectClass);
  if (error) throw new Error(`attempt-cap lookup failed: ${error.message}`);
  return (data ?? []).filter(
    (r: { action: string }) => !r.action.startsWith("skip:") && !r.action.startsWith("escalate:"),
  ).length;
}

/** Has this exact bookkeeping action already been logged? Keeps the log from
 *  growing a duplicate row every 4 hours for a package nothing will ever fix. */
async function alreadyLogged(
  packageId: string,
  defectClass: LogDefectClass,
  action: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("auto_remediation_log")
    .select("id")
    .eq("package_id", packageId)
    .eq("defect_class", defectClass)
    .eq("action", action)
    .limit(1);
  if (error) throw new Error(`log lookup failed: ${error.message}`);
  return (data ?? []).length > 0;
}

/** Sum of everything spent since UTC midnight — the global daily cap's input. */
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

async function readField(scope: "package" | "character", rowId: string, field: string): Promise<string> {
  const { data, error } = await supabase.rpc("remediation_read_field", {
    _scope: scope,
    _row_id: rowId,
    _field: field,
  });
  if (error) throw new Error(`read ${scope}.${field} failed: ${error.message}`);
  return (data as string) ?? "";
}

async function writeField(
  scope: "package" | "character",
  rowId: string,
  field: string,
  value: string,
  opts?: { bypassLossGuard?: boolean },
): Promise<void> {
  // Content-loss guard — a backstop independent of any handler. The re-detect
  // gate cannot catch a gutted-but-clean field (a shorter, artifact-free field
  // still passes its detector), so this is what turns "silently destroyed paid
  // content" into a thrown error the gate handles as revert + escalate. Never
  // empty a substantive field or delete the bulk of it.
  //
  // `bypassLossGuard` is for REVERTS: restoring a captured before-value is always
  // legitimate, even when it's shorter than what's there now (e.g. the
  // victim-mismatch revert restores the shorter original over a longer
  // regenerated overview — finding #3). A forward fix must never pass it.
  if (!opts?.bypassLossGuard) {
    const current = (await readField(scope, rowId, field)).trim();
    if (current.length >= 40) {
      const newLen = value.trim().length;
      if (newLen === 0 || newLen < current.length * 0.7) {
        throw new Error(
          `content-loss guard: ${scope}.${field} ${current.length}->${newLen} chars (>30% loss) — refusing`,
        );
      }
    }
  }
  const { error } = await supabase.rpc("remediation_write_field", {
    _scope: scope,
    _row_id: rowId,
    _field: field,
    _value: value,
  });
  if (error) throw new Error(`write ${scope}.${field} failed: ${error.message}`);
}

async function invokeFunction(name: string, body: unknown): Promise<{ ok: boolean; detail: string }> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify(body),
  });
  const detail = await res.text();
  return { ok: res.ok, detail: detail.slice(0, 500) };
}

/**
 * ADR-0061: same call shape as invokeFunction, but returns the FULL parsed
 * JSON body rather than a 500-char truncated string. delegateToRegenerator
 * needs to read regenerate-child-content's `outcome`/`cost_usd` fields
 * reliably — a truncated note is fine for a human-readable log line, not for
 * a field a program branches on.
 */
async function invokeFunctionJson(
  name: string,
  body: unknown,
): Promise<{ ok: boolean; json: Record<string, unknown> | null }> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify(body),
  });
  const raw = await res.text();
  let json: Record<string, unknown> | null = null;
  try {
    json = JSON.parse(raw);
  } catch {
    json = null; // non-JSON error body (e.g. a raw 502/504 from a cold-start or gateway blip)
  }
  return { ok: res.ok, json };
}

/**
 * ADR-0061 concurrency claim. Atomic single-statement UPDATE (see the
 * migration for why this needs no advisory lock): two concurrent callers
 * racing this on the same package serialize on the row, and the loser affects
 * zero rows. Self-releasing via TTL if the caller crashes before releasing.
 */
async function claimPackage(packageId: string, ttlMinutes = 10): Promise<boolean> {
  const { data, error } = await supabase.rpc("claim_package_for_remediation", {
    _pkg_id: packageId,
    _ttl_minutes: ttlMinutes,
  });
  if (error) throw new Error(`claim failed: ${error.message}`);
  return data === true;
}

/** Best-effort release — the TTL is the real backstop, so a failure here is
 *  logged, not thrown; it must never abort an otherwise-successful repair. */
async function releaseClaim(packageId: string): Promise<void> {
  const { error } = await supabase.rpc("release_package_remediation_claim", { _pkg_id: packageId });
  if (error) console.error(`release claim failed for ${packageId}: ${error.message}`);
}

// ---------------------------------------------------------------------------
// Content transforms (pure, unit-testable by inspection)
// ---------------------------------------------------------------------------

/**
 * Pull one round's evidence card out of the evidence_cards markdown.
 *
 * CRITICAL: we take only the player-facing `#### DESCRIPTION` body and stop at
 * the next `####`. The `#### SIGNIFICANCE (Host Only)` block routinely names
 * the murderer (that is its job), and must never reach an image prompt.
 */
export function extractCard(
  ecText: string,
  roundNum: number,
): { title: string; description: string } | null {
  const sectionRx = new RegExp(
    `##\\s*EVIDENCE:\\s*ROUND\\s*${roundNum}\\b([\\s\\S]*?)(?=\\n##\\s*EVIDENCE:\\s*ROUND\\b|$)`,
    "i",
  );
  const section = sectionRx.exec(ecText);
  if (!section) return null;
  const body = section[1];

  const title = (/^[ \t]*###[ \t]+(.+)$/m.exec(body)?.[1] ?? `Round ${roundNum} evidence`).trim();
  // Stop at the next heading in ANY form — `#{2,6}` (with or without a trailing
  // space, so `####SIGNIFICANCE` and `##### SIGNIFICANCE` both terminate).
  let description = /####[ \t]*DESCRIPTION[ \t]*\r?\n([\s\S]*?)(?=\r?\n[ \t]*#{2,6}|$)/i
    .exec(body)?.[1]?.trim();

  if (!description) return null;
  // Belt-and-suspenders: the SIGNIFICANCE (Host Only) block names the murderer
  // and must NEVER reach an image prompt. Truncate at a line-anchored
  // "significance" whatever markup precedes it (####, #####, **…**, blockquote),
  // covering any heading form the terminator above might miss.
  description = description.replace(/\r?\n[ \t]*[#*>\s]*significance\b[\s\S]*$/i, "").trim();
  if (!description) return null;
  return { title, description };
}

/** House forensic style, matching the images the owner has generated by hand
 *  during past recoveries (cinematic low-key, no lettering — garbled evidence
 *  markers were the reason earlier manual re-rolls were needed). */
export function forensicPrompt(title: string, description: string): string {
  const desc = description.replace(/\s+/g, " ").trim().slice(0, 900);
  return (
    `Forensic evidence photograph of a single piece of physical evidence from a fictional ` +
    `murder-mystery investigation: ${title}. ${desc} ` +
    `Photorealistic still-life, cinematic low-key crime-scene lighting, shallow depth of field, ` +
    `the object catalogued on a neutral surface, 16:9. ` +
    `No text, no lettering, no labels, no numbers, no watermarks, no people, no faces.`
  );
}

/**
 * What may sit between a question's target name and the closing `**`: an
 * optional parenthetical annotation the model sometimes emits, then an optional
 * colon — e.g. `**To Polly Paradise (self):**`.
 *
 * MUST stay in sync with the detector `list_packages_with_self_directed_questions()`,
 * which matches `**to <name>` with a `\M` word-end and therefore DOES flag the
 * annotated form. ADR-0056: when this pattern was narrower than the detector's,
 * the worker detected a defect it could not repair — and because revert is
 * all-or-nothing per package, it discarded a valid fix for a *different*
 * character in the same package and escalated. Widening the detector without
 * widening this, or vice versa, re-creates that deadlock.
 */
const TARGET_ANNOTATION_RX = String.raw`\s*(?:\([^)]*\))?`;

/**
 * Retarget `**To <bad name>:**` questions onto a living suspect who is not
 * already questioned in this round.
 *
 * Deterministic by construction: candidates are filtered (no self, no victim,
 * nobody already targeted this round) then sorted, and consumed in order — so
 * the same input always produces the same output, and a re-run after a revert
 * behaves identically.
 */
export function retargetQuestions(
  text: string,
  badNames: string[],
  allCharacterNames: string[],
): { text: string; changed: number; exhausted: boolean } {
  if (!text) return { text, changed: 0, exhausted: false };

  // Capture stops before `(` so an annotated target (`**To X (self):**`) registers
  // as "X already questioned", not as the distinct name "X (self)" — otherwise the
  // candidate pool would happily hand back someone this round already asks about.
  const alreadyTargeted = new Set<string>();
  for (
    const m of text.matchAll(
      new RegExp(String.raw`\*\*\s*To\s+([^:*\n(]+?)${TARGET_ANNOTATION_RX}\s*:?\s*\*\*`, "gi"),
    )
  ) {
    alreadyTargeted.add(norm(m[1]));
  }

  const bad = new Set(badNames.map(norm));
  const pool = allCharacterNames
    .filter((n) => !bad.has(norm(n)) && !alreadyTargeted.has(norm(n)))
    .sort((a, b) => a.localeCompare(b));

  let out = text;
  let changed = 0;

  for (const badName of badNames) {
    // Non-global regex: `replace` swaps the FIRST remaining occurrence, so each
    // offending question gets its own distinct replacement target.
    //
    // The annotation is CONSUMED, not looked ahead at, so it disappears with the
    // name it described — retargeting `**To Polly Paradise (self):**` must yield
    // `**To Captain Kei:**`, never `**To Captain Kei (self):**`, which would be a
    // false claim about the new target and would still read as self-directed.
    const rx = new RegExp(
      `(\\*\\*\\s*To\\s+)${escapeRx(badName)}${TARGET_ANNOTATION_RX}(?=\\s*:?\\s*\\*\\*)`,
      "i",
    );
    while (rx.test(out)) {
      const replacement = pool.shift();
      if (!replacement) return { text: out, changed, exhausted: true };
      out = out.replace(rx, (_full, prefix: string) => `${prefix}${replacement}`);
      changed++;
    }
  }

  return { text: out, changed, exhausted: false };
}

/**
 * Remove known template artifacts — but ONLY when doing so is safe, i.e. the
 * artifact sat on its own line as an authoring note (the shape it takes in the
 * Black Swan detective-reveal case). If an artifact is embedded inside
 * substantive content — e.g. an accusation "I believe [choose based on evidence]
 * is the murderer" — excising it leaves broken/gutted prose that the re-detect
 * gate CANNOT catch (a shorter, artifact-free field still passes the detector).
 * In that case we refuse (`safe: false`) so the handler routes it to the
 * character-scope delegation path below (ADR-0099) instead of silently
 * destroying paid content.
 *
 * All five bracketed ADR-0047/ADR-0099 patterns are attempted as clean spans
 * first. Free-text chain-of-thought ("let me reconsider", "wait, i need to",
 * etc. — ADR-0099) has no bracket to excise, so a match is always `safe:
 * false`: never touched here, always routed to delegation/escalation, same as
 * an embedded bracket artifact. Keep this in sync BY HAND with
 * list_packages_with_meta_text_leak's marker regex (supabase/migrations/
 * 20260810_add_is_test_flag_and_harden_health_check_detectors.sql) — the two
 * drifting apart (only 3 of 13 alternatives recognized here) is exactly what
 * silently broke delegation for prose leaks until ADR-0099.
 */
const ARTIFACT_SPAN_RX = [
  /\[choose[^\]]*\]/gi,
  /\[closing paragraph[^\]]*\]/gi,
  /\[insert[^\]]*\]/gi,
  /\[if guilty[^\]]*\]/gi,
  /\[[^\]]*master_context[^\]]*\]/gi,
];
/** Any surviving occurrence of these means the artifact wasn't cleanly removed. */
const ARTIFACT_TOKEN_RX = /\[choose\b|\[closing paragraph\b|\[insert\b|\[if guilty\b|master_context/i;
/**
 * Free-text chain-of-thought phrases (ADR-0099) — no bracket boundary, so
 * never attempt a strip; any match is unconditionally unsafe.
 */
const PROSE_LEAK_RX =
  /let me reconsider|let me reread|let me recalculate|let me look at this more carefully|i need to correct this|on second thought|as an ai language model|wait, i need to/i;

export function stripArtifactLines(
  text: string,
): { text: string; removed: string[]; safe: boolean } {
  if (!text) return { text, removed: [], safe: true };
  const removed: string[] = [];
  const outLines: string[] = [];

  for (const line of text.split("\n")) {
    if (PROSE_LEAK_RX.test(line)) return { text, removed: [], safe: false };
    if (!ARTIFACT_TOKEN_RX.test(line)) {
      outLines.push(line);
      continue;
    }
    // Excise every recognised bracketed artifact span from this line.
    let excised = line;
    for (const rx of ARTIFACT_SPAN_RX) excised = excised.replace(rx, "");
    // A token surviving excision means a bare/undelimited artifact (e.g. an
    // unbracketed master_context) we can't clean safely — refuse.
    if (ARTIFACT_TOKEN_RX.test(excised)) return { text, removed: [], safe: false };
    // If nothing substantive remains, the line was a standalone authoring note —
    // safe to drop entirely. Otherwise the artifact was embedded in real content,
    // and excising it would gut the line — refuse and escalate.
    const remainder = excised.replace(/[\s\p{P}]+/gu, "");
    if (remainder !== "") return { text, removed: [], safe: false };
    removed.push(line.trim());
  }

  if (removed.length === 0) return { text, removed, safe: true };
  return { text: outLines.join("\n").replace(/\n{3,}/g, "\n\n"), removed, safe: true };
}

// ---------------------------------------------------------------------------
// Run context + the single gated attempt path
// ---------------------------------------------------------------------------

interface RunCtx {
  sinceIso: string;
  dryRun: boolean;
  budgetRemaining: number;
  spendHalted: boolean;
  results: AttemptResult[];
}

interface AttemptResult {
  package_id: string;
  defect_class: LogDefectClass;
  action: string;
  outcome: Outcome | "skipped" | "planned";
  cost_usd: number;
  note?: string;
}

interface FixPlan {
  /** Human-readable description of what will be done, logged as `action`. */
  action: string;
  /** Money this fix will spend if it runs. 0 for the deterministic fixes. */
  costUsd: number;
  /** Perform the mutation. Returns the before-value(s) for the audit log. */
  apply: () => Promise<{ beforeValue: string | null; note?: string }>;
  /** Undo it. Return false when a revert isn't feasible (e.g. generated images). */
  revert: (beforeValue: string | null) => Promise<boolean>;
}

/**
 * The ONLY path by which a package is ever mutated. Every rail lives here so no
 * defect-class handler can accidentally bypass one:
 *   attempt cap -> spend cap -> apply -> RE-DETECT -> accept or revert+escalate.
 */
async function runGatedAttempt(
  ctx: RunCtx,
  packageId: string,
  defectClass: DefectClass,
  buildPlan: () => Promise<FixPlan | null>,
): Promise<void> {
  // --- Rail 2: per-package/per-defect attempt cap -------------------------
  const used = await attemptsUsed(packageId, defectClass);
  if (used >= MAX_ATTEMPTS_PER_DEFECT) {
    const action = "skip:attempt_cap";
    if (!ctx.dryRun && !(await alreadyLogged(packageId, defectClass, action))) {
      await logRow({
        package_id: packageId,
        defect_class: defectClass,
        action,
        before_value: null,
        outcome: "escalated",
        cost_usd: 0,
      });
    }
    ctx.results.push({
      package_id: packageId,
      defect_class: defectClass,
      action,
      outcome: "skipped",
      cost_usd: 0,
      note: `${used} prior attempts, cap ${MAX_ATTEMPTS_PER_DEFECT} — needs a human`,
    });
    return;
  }

  let plan: FixPlan | null;
  try {
    plan = await buildPlan();
  } catch (e) {
    const message = (e as Error).message;
    if (!ctx.dryRun) {
      await logRow({
        package_id: packageId,
        defect_class: defectClass,
        action: "plan_failed",
        before_value: null,
        outcome: "failed",
        cost_usd: 0,
      });
    }
    ctx.results.push({
      package_id: packageId,
      defect_class: defectClass,
      action: "plan_failed",
      outcome: "failed",
      cost_usd: 0,
      note: message,
    });
    return;
  }

  // No mechanical fix available for this instance (e.g. no spare suspect to
  // retarget onto, no parsable card description) -> escalate, don't guess.
  if (!plan) {
    const action = "escalate:no_mechanical_fix";
    if (!ctx.dryRun && !(await alreadyLogged(packageId, defectClass, action))) {
      await logRow({
        package_id: packageId,
        defect_class: defectClass,
        action,
        before_value: null,
        outcome: "escalated",
        cost_usd: 0,
      });
    }
    ctx.results.push({
      package_id: packageId,
      defect_class: defectClass,
      action,
      outcome: "escalated",
      cost_usd: 0,
    });
    return;
  }

  // --- Rail 3: global daily spend cap -------------------------------------
  if (plan.costUsd > 0) {
    if (ctx.spendHalted || plan.costUsd > ctx.budgetRemaining) {
      ctx.spendHalted = true; // halt ALL further paid work this run
      const action = "skip:daily_spend_cap";
      if (!ctx.dryRun && !(await alreadyLogged(packageId, defectClass, action))) {
        await logRow({
          package_id: packageId,
          defect_class: defectClass,
          action,
          before_value: null,
          outcome: "escalated",
          cost_usd: 0,
        });
      }
      ctx.results.push({
        package_id: packageId,
        defect_class: defectClass,
        action,
        outcome: "escalated",
        cost_usd: 0,
        note: `needs $${plan.costUsd.toFixed(2)}, $${ctx.budgetRemaining.toFixed(2)} left of the $${DAILY_SPEND_CAP_USD.toFixed(2)} daily cap`,
      });
      return;
    }
  }

  if (ctx.dryRun) {
    ctx.results.push({
      package_id: packageId,
      defect_class: defectClass,
      action: plan.action,
      outcome: "planned",
      cost_usd: plan.costUsd,
      note: "dry_run — nothing mutated, nothing spent",
    });
    return;
  }

  // --- Apply --------------------------------------------------------------
  let beforeValue: string | null = null;
  let note: string | undefined;
  try {
    const applied = await plan.apply();
    beforeValue = applied.beforeValue;
    note = applied.note;
  } catch (e) {
    // The fix itself errored. Money may still have been spent (e.g. the image
    // call charged then the DB write failed), so charge the run's budget.
    ctx.budgetRemaining -= plan.costUsd;
    // A throw mid-apply may have written some fields but not others (e.g. the
    // content-loss guard tripped on field 3 of 5). Revert to clean up the
    // partial mutation — the multi-field handlers read their edits from closure,
    // so revert works even though beforeValue was never returned. This preserves
    // the all-or-nothing invariant.
    const reverted = await plan.revert(beforeValue).catch(() => false);
    await logRow({
      package_id: packageId,
      defect_class: defectClass,
      action: `${plan.action}|apply_failed${reverted ? "|reverted" : "|revert_not_feasible"}`,
      before_value: beforeValue,
      outcome: "failed",
      cost_usd: plan.costUsd,
    });
    ctx.results.push({
      package_id: packageId,
      defect_class: defectClass,
      action: plan.action,
      outcome: "failed",
      cost_usd: plan.costUsd,
      note: `${(e as Error).message}${reverted ? " (reverted)" : ""}`,
    });
    return;
  }
  ctx.budgetRemaining -= plan.costUsd;

  // --- Rail 1: THE RE-DETECT GATE ----------------------------------------
  // Non-negotiable. A fix is accepted only when the detector that flagged this
  // package now returns clean for it.
  let flaggedAfter: boolean;
  try {
    flaggedAfter = await stillFlagged(defectClass, ctx.sinceIso, packageId);
  } catch (e) {
    // Can't confirm the fix -> treat exactly like a failed gate. Never accept
    // an unverified mutation.
    const reverted = await plan.revert(beforeValue).catch(() => false);
    await logRow({
      package_id: packageId,
      defect_class: defectClass,
      action: `${plan.action}|redetect_error${reverted ? "|reverted" : "|revert_not_feasible"}`,
      before_value: beforeValue,
      outcome: "escalated",
      cost_usd: plan.costUsd,
    });
    ctx.results.push({
      package_id: packageId,
      defect_class: defectClass,
      action: plan.action,
      outcome: "escalated",
      cost_usd: plan.costUsd,
      note: `re-detect failed: ${(e as Error).message}`,
    });
    return;
  }

  if (!flaggedAfter) {
    await logRow({
      package_id: packageId,
      defect_class: defectClass,
      action: plan.action,
      before_value: beforeValue,
      outcome: "fixed",
      cost_usd: plan.costUsd,
    });
    ctx.results.push({
      package_id: packageId,
      defect_class: defectClass,
      action: plan.action,
      outcome: "fixed",
      cost_usd: plan.costUsd,
      note,
    });
    return;
  }

  // Gate rejected the fix: the package is still flagged. Put it back the way we
  // found it where that's possible, and hand it to a human.
  const reverted = await plan.revert(beforeValue).catch(() => false);
  await logRow({
    package_id: packageId,
    defect_class: defectClass,
    action: `${plan.action}|redetect_still_flagged${reverted ? "|reverted" : "|revert_not_feasible"}`,
    before_value: beforeValue,
    outcome: "escalated",
    cost_usd: plan.costUsd,
  });
  ctx.results.push({
    package_id: packageId,
    defect_class: defectClass,
    action: plan.action,
    outcome: "escalated",
    cost_usd: plan.costUsd,
    note: reverted
      ? "still flagged after fix — reverted, escalated"
      : "still flagged after fix — revert not feasible, escalated",
  });
}

// ---------------------------------------------------------------------------
// Delegated repair (ADR-0061)
//
// identity_contamination, slip_culprit_leak, and the meta_text_leak
// character-scope fallback are NOT run through runGatedAttempt above.
// regenerate-child-content (ADR-0054) already re-detects and reverts
// internally, so wrapping it in a second, independent gate here would risk
// reverting writes the regenerator already committed as good. This worker's
// job for these three is narrower: the attempt cap (the regenerator has none
// of its own — only a spend cap), the concurrency claim, and translating the
// regenerator's response into this run's bookkeeping WITHOUT re-logging (the
// regenerator already wrote the auto_remediation_log row for the attempt).
// ---------------------------------------------------------------------------

/**
 * Default field(s) to request per delegated class. identity_contamination's
 * field set is auto-widened by the regenerator itself to the full
 * claims-bearing field set (ADR-0054) — a minimal seed is enough here.
 * slip_culprit_leak is not auto-widened, so this must name the field the
 * detector's own SQL actually matches (the static confession lives in
 * `secret`). The meta_text_leak fallback doesn't use this map — it passes the
 * exact fields the deterministic strip refused to touch.
 */
const DELEGATE_DEFAULT_FIELDS: Record<"identity_contamination" | "slip_culprit_leak", string[]> = {
  identity_contamination: ["introduction"],
  slip_culprit_leak: ["secret"],
};

async function delegateToRegenerator(
  ctx: RunCtx,
  hint: "identity_contamination" | "slip_culprit_leak" | "meta_text_leak" | "missing_role_branch_content",
  packageId: string,
  characterNames: string[],
  fields: string[],
): Promise<void> {
  const logClass: LogDefectClass = hint;

  // --- attempt cap (regenerator has none of its own) -----------------------
  const used = await attemptsUsed(packageId, logClass);
  if (used >= MAX_ATTEMPTS_PER_DEFECT) {
    const action = "skip:attempt_cap";
    if (!ctx.dryRun && !(await alreadyLogged(packageId, logClass, action))) {
      await logRow({ package_id: packageId, defect_class: logClass, action, before_value: null, outcome: "escalated", cost_usd: 0 });
    }
    ctx.results.push({
      package_id: packageId, defect_class: logClass, action, outcome: "skipped", cost_usd: 0,
      note: `${used} prior attempts, cap ${MAX_ATTEMPTS_PER_DEFECT} — needs a human`,
    });
    return;
  }

  // --- shared spend cap: if an earlier paid action this run already halted
  // spend, short-circuit rather than let the regenerator reject the call
  // itself (same outcome, one fewer round trip and one fewer claim/release). --
  if (ctx.spendHalted) {
    const action = "skip:daily_spend_cap";
    if (!ctx.dryRun && !(await alreadyLogged(packageId, logClass, action))) {
      await logRow({ package_id: packageId, defect_class: logClass, action, before_value: null, outcome: "escalated", cost_usd: 0 });
    }
    ctx.results.push({
      package_id: packageId, defect_class: logClass, action, outcome: "skipped", cost_usd: 0,
      note: `$${ctx.budgetRemaining.toFixed(2)} left of the $${DAILY_SPEND_CAP_USD.toFixed(2)} daily cap`,
    });
    return;
  }

  if (characterNames.length === 0) return; // nothing named to resolve to a character_id

  const characters = await getCharacters(packageId);
  const targetIds = characterNames
    .map((n) => characters.find((c) => norm(c.character_name) === norm(n))?.id)
    .filter((id): id is string => !!id);
  if (targetIds.length === 0) return; // detector named characters that no longer resolve — nothing to do

  const [primaryId, ...restIds] = targetIds;

  if (ctx.dryRun) {
    ctx.results.push({
      package_id: packageId, defect_class: logClass,
      action: `delegate:regenerate_child_content:${fields.join(",")}`,
      outcome: "planned", cost_usd: 0,
      note: "dry_run — nothing called, nothing written, nothing spent",
    });
    return;
  }

  // --- concurrency claim (ADR-0061) -----------------------------------------
  const claimed = await claimPackage(packageId).catch((e) => {
    console.error(`claim error for ${packageId}: ${(e as Error).message}`);
    return false;
  });
  if (!claimed) {
    // Another lane (the 4-hour full sweep or the 5-minute held-only sweep) is
    // already repairing this package. Transient, not an error — deliberately
    // not logged to auto_remediation_log, so it doesn't count against the
    // attempt cap or clutter the audit trail; the next tick retries if the
    // package is still flagged then.
    ctx.results.push({
      package_id: packageId, defect_class: logClass, action: "skip:claimed_elsewhere",
      outcome: "skipped", cost_usd: 0, note: "another repair is already in flight for this package",
    });
    return;
  }

  try {
    const { ok, json } = await invokeFunctionJson("regenerate-child-content", {
      package_id: packageId,
      character_id: primaryId,
      character_ids: restIds,
      fields,
      defect_class_hint: hint,
    });

    if (!ok || !json) {
      // The call itself failed before the regenerator could log anything of
      // its own (network error, cold-start 5xx, etc.) — the worker must log
      // here, or this attempt vanishes from the audit trail entirely.
      await logRow({
        package_id: packageId, defect_class: logClass,
        action: "delegate:regenerate_child_content|invoke_failed",
        before_value: null, outcome: "failed", cost_usd: 0,
      });
      ctx.results.push({
        package_id: packageId, defect_class: logClass, action: "delegate:regenerate_child_content",
        outcome: "failed", cost_usd: 0, note: "regenerate-child-content call failed before it could respond",
      });
      return;
    }

    const rawOutcome = typeof json.outcome === "string" ? json.outcome : "failed";
    const outcome: Outcome = rawOutcome === "fixed" || rawOutcome === "failed" ? rawOutcome : "escalated";
    const costUsd = Number(json.cost_usd ?? 0) || 0;

    // The regenerator already logged this attempt's own auto_remediation_log
    // row (see file header) — never call logRow again here. Only adjust this
    // run's LOCAL budget view, so any paid fix later in this same run
    // (game_overview_victim_mismatch, missing_images) sees accurate headroom
    // instead of the stale snapshot taken at run start (ADR-0061 Decision 3).
    ctx.budgetRemaining -= costUsd;
    if (ctx.budgetRemaining <= 0) ctx.spendHalted = true;

    ctx.results.push({
      package_id: packageId, defect_class: logClass,
      action: `delegate:regenerate_child_content:${fields.join(",")}`,
      outcome, cost_usd: costUsd,
      note: typeof json.note === "string" ? json.note : undefined,
    });
  } finally {
    await releaseClaim(packageId);
  }
}

// ---------------------------------------------------------------------------
// Per-class handlers
// ---------------------------------------------------------------------------

async function getCharacters(packageId: string): Promise<{ id: string; character_name: string }[]> {
  const { data, error } = await supabase
    .from("mystery_characters")
    .select("id, character_name")
    .eq("package_id", packageId);
  if (error) throw new Error(`character lookup failed: ${error.message}`);
  return (data ?? []).filter((c: { character_name: string | null }) => !!c.character_name) as {
    id: string;
    character_name: string;
  }[];
}

/** Victim name from master_context's victimProfile — used to spot questions
 *  aimed at the dead as well as at oneself. Absence is not an error. */
async function getVictimName(packageId: string): Promise<string | null> {
  const { data } = await supabase
    .from("mystery_packages")
    .select("master_context")
    .eq("id", packageId)
    .maybeSingle();
  const mc = (data?.master_context as string) ?? "";
  return /"victimProfile"\s*:\s*\{[\s\S]{0,400}?"name"\s*:\s*"([^"]+)"/.exec(mc)?.[1]?.trim() ?? null;
}

const QUESTION_FIELDS = ["round2_questions", "round3_questions", "round4_questions"] as const;

async function handleSelfDirectedQuestions(ctx: RunCtx, row: Record<string, unknown>): Promise<void> {
  const packageId = row.package_id as string;
  const offenders = (row.offenders as string[]) ?? [];

  await runGatedAttempt(ctx, packageId, "self_directed_questions", async () => {
    const characters = await getCharacters(packageId);
    const victim = await getVictimName(packageId);
    const allNames = characters.map((c) => c.character_name);

    // field-by-field plan; before-values captured for the audit log + revert
    const edits: { charId: string; field: string; before: string; after: string }[] = [];

    for (const offenderName of offenders) {
      const character = characters.find((c) => norm(c.character_name) === norm(offenderName));
      if (!character) continue;

      // A question may target the asking character OR the victim — neither can
      // answer. Both retarget onto a living suspect.
      const badNames = [character.character_name, ...(victim ? [victim] : [])];

      for (const field of QUESTION_FIELDS) {
        const before = await readField("character", character.id, field);
        if (!before) continue;
        const { text: after, changed, exhausted } = retargetQuestions(before, badNames, allNames);
        // Exhausted pool = every other suspect is already questioned this round.
        // No safe deterministic target left -> hand the whole package to a human.
        if (exhausted) return null;
        if (changed > 0) edits.push({ charId: character.id, field, before, after });
      }
    }

    if (edits.length === 0) return null; // detector saw something we can't parse

    return {
      action: `retarget_questions:${edits.map((e) => e.field).join(",")}`,
      costUsd: 0,
      apply: async () => {
        for (const e of edits) await writeField("character", e.charId, e.field, e.after);
        return {
          beforeValue: JSON.stringify(
            edits.map((e) => ({ character_id: e.charId, field: e.field, before: e.before })),
          ),
          note: `${edits.length} field(s) retargeted`,
        };
      },
      revert: async () => {
        for (const e of edits) await writeField("character", e.charId, e.field, e.before);
        return true;
      },
    };
  });
}

/** ADR-0061: identity_contamination — delegated whole to regenerate-child-content.
 *  `claimants` (character names) comes straight from
 *  list_packages_with_identity_conflicts; the regenerator's own
 *  defect_class_hint auto-expansion will pick up any claimant this detector
 *  row didn't happen to name too. */
async function handleIdentityContamination(ctx: RunCtx, row: Record<string, unknown>): Promise<void> {
  const packageId = row.package_id as string;
  const claimants = (row.claimants as string[]) ?? [];
  await delegateToRegenerator(
    ctx, "identity_contamination", packageId, claimants,
    DELEGATE_DEFAULT_FIELDS.identity_contamination,
  );
}

/** ADR-0061: slip_culprit_leak — delegated whole to regenerate-child-content.
 *  `characters` comes straight from list_packages_with_slip_culprit_leak. */
async function handleSlipCulpritLeak(ctx: RunCtx, row: Record<string, unknown>): Promise<void> {
  const packageId = row.package_id as string;
  const characters = (row.characters as string[]) ?? [];
  await delegateToRegenerator(
    ctx, "slip_culprit_leak", packageId, characters,
    DELEGATE_DEFAULT_FIELDS.slip_culprit_leak,
  );
}

/** ADR-0103 Addendum 36: missing_role_branch_content — delegated whole to
 *  regenerate-child-content, one row per character. Unlike identity_
 *  contamination/slip_culprit_leak, this detector's own row already names the
 *  exact missing fields for THIS character (list_packages_with_missing_role_
 *  branch_content's peer-existence gate), so there's no DELEGATE_DEFAULT_FIELDS
 *  entry to seed from and no auto-widening needed — the fields list is passed
 *  through as-is. */
async function handleMissingRoleBranchContent(ctx: RunCtx, row: Record<string, unknown>): Promise<void> {
  const packageId = row.package_id as string;
  const characterName = row.character_name as string;
  const fields = (row.fields as string[]) ?? [];
  if (!characterName || fields.length === 0) return;
  await delegateToRegenerator(ctx, "missing_role_branch_content", packageId, [characterName], fields);
}

const PACKAGE_ARTIFACT_FIELDS = [
  "game_overview",
  "detective_script",
  "host_guide",
  "timeline",
  "hosting_tips",
  "preparation_instructions",
  "evidence_cards",
];
const CHARACTER_ARTIFACT_FIELDS = [
  "introduction",
  "rumors",
  "background",
  "secret",
  "accusations",
  "relationships",
  "description",
  "round2_script",
  "round3_script",
  "round4_script",
  "final_statement",
  "round2_innocent",
  "round2_guilty",
  "round2_accomplice",
  "round3_innocent",
  "round3_guilty",
  "round3_accomplice",
  "round4_innocent",
  "round4_guilty",
  "round4_accomplice",
  "final_innocent",
  "final_guilty",
  "final_accomplice",
];

async function handleTemplateArtifacts(ctx: RunCtx, row: Record<string, unknown>): Promise<void> {
  const packageId = row.package_id as string;
  const sources = (row.sources as string[]) ?? [];

  // ADR-0061: fields the deterministic strip below refuses to touch because
  // the artifact is embedded in real content (package-scope refusals are NOT
  // collected here — regenerate-child-content can't write mystery_packages
  // fields, so those stay out of scope and continue to escalate as before).
  const unsafeCharacterFields: { charId: string; charName: string; field: string }[] = [];

  await runGatedAttempt(ctx, packageId, "template_artifact", async () => {
    const edits: {
      scope: "package" | "character";
      rowId: string;
      field: string;
      before: string;
      after: string;
      removed: string[];
    }[] = [];

    if (sources.includes("package")) {
      for (const field of PACKAGE_ARTIFACT_FIELDS) {
        const before = await readField("package", packageId, field);
        if (!before) continue;
        const { text: after, removed, safe } = stripArtifactLines(before);
        if (!safe) return null; // artifact embedded in real content — escalate, don't gut it (unchanged)
        if (removed.length > 0) {
          edits.push({ scope: "package", rowId: packageId, field, before, after, removed });
        }
      }
    }

    const characterSources = sources
      .filter((s) => s.startsWith("character:"))
      .map((s) => s.slice("character:".length));
    if (characterSources.length > 0) {
      const characters = await getCharacters(packageId);
      for (const name of characterSources) {
        const character = characters.find((c) => norm(c.character_name) === norm(name));
        if (!character) continue;
        for (const field of CHARACTER_ARTIFACT_FIELDS) {
          const before = await readField("character", character.id, field);
          if (!before) continue;
          const { text: after, removed, safe } = stripArtifactLines(before);
          if (!safe) {
            // ADR-0061: previously this bailed the WHOLE plan here with no
            // record of which field was the problem, so a character-scope
            // embedded artifact always fell through to an uninformative
            // escalate:no_mechanical_fix. Now: record it and keep checking
            // this character's remaining fields (and any other implicated
            // character's) for safe, free strips — those still apply exactly
            // as before. Every recorded field gets a real repair attempt via
            // delegateToRegenerator below, after this gated attempt resolves.
            unsafeCharacterFields.push({ charId: character.id, charName: character.character_name, field });
            continue;
          }
          if (removed.length > 0) {
            edits.push({ scope: "character", rowId: character.id, field, before, after, removed });
          }
        }
      }
    }

    // Nothing free-strippable and nothing recorded as unsafe-character-scope
    // either — either the field is genuinely clean, or the leak is
    // package-scope prose (regenerate-child-content can't write package
    // fields, so that case still has no delegation path and escalates here).
    if (edits.length === 0) return null;

    return {
      action: `strip_template_artifacts:${edits.map((e) => `${e.scope}.${e.field}`).join(",")}`,
      costUsd: 0,
      apply: async () => {
        for (const e of edits) await writeField(e.scope, e.rowId, e.field, e.after);
        return {
          beforeValue: JSON.stringify(
            edits.map((e) => ({ scope: e.scope, row_id: e.rowId, field: e.field, before: e.before })),
          ),
          note: `${edits.reduce((n, e) => n + e.removed.length, 0)} line(s) stripped`,
        };
      },
      revert: async () => {
        for (const e of edits) await writeField(e.scope, e.rowId, e.field, e.before);
        return true;
      },
    };
  });

  // ADR-0061: delegate every embedded (unsafe-to-strip) character-scope field
  // to regenerate-child-content, one call per character with all of that
  // character's refused fields together. Runs regardless of what the gated
  // strip attempt above resolved to — a package can have a freely-strippable
  // artifact on one character and an embedded one on another at the same time.
  const byCharacter = new Map<string, { charName: string; fields: string[] }>();
  for (const f of unsafeCharacterFields) {
    const entry = byCharacter.get(f.charId) ?? { charName: f.charName, fields: [] as string[] };
    if (!entry.fields.includes(f.field)) entry.fields.push(f.field);
    byCharacter.set(f.charId, entry);
  }
  for (const { charName, fields } of byCharacter.values()) {
    await delegateToRegenerator(ctx, "meta_text_leak", packageId, [charName], fields);
  }
}

async function handleVictimMismatch(ctx: RunCtx, row: Record<string, unknown>): Promise<void> {
  const packageId = row.package_id as string;

  await runGatedAttempt(ctx, packageId, "game_overview_victim_mismatch", async () => {
    // Capture the before-value at plan-build time so it lives in this closure.
    // The revert then reads it from closure rather than from its argument, which
    // is why it still works when apply THREW after regenerate-parent-content had
    // already overwritten game_overview (the arg is null on that path — finding
    // #4: previously that left the regenerated text with no recoverable original).
    const before = await readField("package", packageId, "game_overview");
    return {
      action: "regenerate_parent_content:game_overview",
      costUsd: OVERVIEW_REGEN_COST_USD,
      apply: async () => {
        const res = await invokeFunction("regenerate-parent-content", {
          packageId,
          fields: ["game_overview"],
        });
        if (!res.ok) throw new Error(`regenerate-parent-content: ${res.detail}`);
        return { beforeValue: before, note: res.detail.slice(0, 200) };
      },
      // Restores the captured original. Reads `before` from closure (not the
      // arg) so it survives an apply-failure, and bypasses the content-loss guard
      // because the original is legitimately shorter than the regeneration
      // (finding #3 — otherwise the revert threw and the bad overview stayed).
      revert: async () => {
        await writeField("package", packageId, "game_overview", before, { bypassLossGuard: true });
        return true;
      },
    };
  });
}

async function handleMissingImages(ctx: RunCtx, row: Record<string, unknown>): Promise<void> {
  const packageId = row.package_id as string;
  const missingRounds = (row.missing_rounds as string[]) ?? [];
  if (missingRounds.length === 0) return;

  await runGatedAttempt(ctx, packageId, "missing_images", async () => {
    const ecText = await readField("package", packageId, "evidence_cards");
    if (!ecText) return null;

    const prompts: Record<string, string> = {};
    for (const round of missingRounds) {
      const n = Number(round.replace(/\D/g, ""));
      if (!n) continue;
      const card = extractCard(ecText, n);
      if (!card) continue; // unparsable card -> don't invent a prompt
      prompts[round] = forensicPrompt(card.title, card.description);
    }
    if (Object.keys(prompts).length === 0) return null;

    const rounds = Object.keys(prompts).sort();
    return {
      action: `regenerate_images:${rounds.join(",")}`,
      costUsd: IMAGE_COST_USD * rounds.length,
      apply: async () => {
        // before-value = the image map as it stood, so the audit trail shows
        // exactly which rounds were empty before we spent money.
        const { data } = await supabase
          .from("mystery_packages")
          .select("evidence_card_images")
          .eq("id", packageId)
          .maybeSingle();
        const beforeValue = JSON.stringify(data?.evidence_card_images ?? null);

        const { ok, json } = await invokeFunctionJson("generate-evidence-images", {
          package_id: packageId,
          prompts,
        });

        if (ok) {
          return { beforeValue, note: JSON.stringify(json).slice(0, 200) };
        }

        // Distinguish an NSFW false-positive rejection from every other
        // failure (network, rate-limit, storage, etc.) — only the former gets
        // a bounded retry at a higher safety_tolerance; the latter fails
        // exactly as before (a looser filter can't fix a network error, and
        // trying would just mask it).
        const failedList = Array.isArray(json?.failed)
          ? (json!.failed as Array<{ round: string; error: string }>)
          : [];
        const nsfwRounds = failedList
          .filter((f) => typeof f?.error === "string" && /NSFW content detected/i.test(f.error))
          .map((f) => f.round)
          .filter((r) => prompts[r]);

        if (nsfwRounds.length === 0) {
          throw new Error(`generate-evidence-images: ${JSON.stringify(json ?? { ok }).slice(0, 400)}`);
        }

        const retryPrompts = Object.fromEntries(nsfwRounds.map((r) => [r, prompts[r]]));
        const retry = await invokeFunctionJson("generate-evidence-images", {
          package_id: packageId,
          prompts: retryPrompts,
          safety_tolerance: NSFW_RETRY_SAFETY_TOLERANCE,
        });

        const nonNsfwStillFailed = failedList.some((f) => !nsfwRounds.includes(f.round));
        const retryStillFailed =
          !retry.ok || (Array.isArray(retry.json?.failed) && (retry.json!.failed as unknown[]).length > 0);

        if (nonNsfwStillFailed || retryStillFailed) {
          // Genuinely rejected even at a permissive tolerance (or a separate
          // non-NSFW round also failed) — not a false positive, escalate with
          // both attempts' detail. Any round the retry DID recover is already
          // saved (generate-evidence-images merges per-round, independent of
          // this throw), so nothing already-fixed is lost by escalating here.
          throw new Error(
            `generate-evidence-images: initial=${JSON.stringify(json).slice(0, 200)} ` +
              `| nsfw-retry@tolerance=${NSFW_RETRY_SAFETY_TOLERANCE}=${JSON.stringify(retry.json).slice(0, 200)}`
          );
        }

        return {
          beforeValue,
          note: `NSFW false-positive on [${nsfwRounds.join(",")}], recovered at safety_tolerance=${NSFW_RETRY_SAFETY_TOLERANCE}`,
        };
      },
      // Not feasible, and not desirable: an extra generated image is never
      // worse than a missing one, and deleting it would only re-open the defect.
      revert: async () => false,
    };
  });
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { status: 200 });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST only" }), { status: 405 });
  }

  const startedAt = Date.now();

  try {
    let body: {
      dry_run?: boolean;
      window_days?: number;
      only_needs_review?: boolean;
      classes?: DefectClass[];
    } = {};
    try {
      body = await req.json();
    } catch {
      body = {}; // pg_cron posts '{}'; an empty body is also fine
    }

    const dryRun = body.dry_run === true;
    // Rail 4: bounded window. A caller may narrow it, never widen it.
    const windowDays = Math.min(Number(body.window_days) || WINDOW_DAYS, WINDOW_DAYS);
    const sinceIso = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();

    // ADR-0061: the 5-minute held-only sweep passes both of these to restrict
    // itself to needs_review packages and to the three newly-delegatable
    // classes, without touching the paid classes that don't need a tighter
    // cadence. An old caller posting '{}' (the 4-hour job, manual dry_run)
    // gets neither filter applied — fully backward compatible.
    const onlyNeedsReview = body.only_needs_review === true;
    const classFilter = Array.isArray(body.classes) && body.classes.length > 0 ? new Set(body.classes) : null;
    const shouldRun = (c: DefectClass) => !classFilter || classFilter.has(c);

    const alreadySpent = await spentToday();
    const ctx: RunCtx = {
      sinceIso,
      dryRun,
      budgetRemaining: Math.max(0, DAILY_SPEND_CAP_USD - alreadySpent),
      spendHalted: false,
      results: [],
    };

    /** ADR-0061: restrict detector rows to packages currently held in
     *  needs_review — used only when only_needs_review is set. Bulk-fetches
     *  generation_status once per detector call rather than per row. */
    async function filterNeedsReview(rows: Record<string, unknown>[]): Promise<Record<string, unknown>[]> {
      if (!onlyNeedsReview || rows.length === 0) return rows;
      const ids = [...new Set(rows.map((r) => r.package_id as string))];
      const { data, error } = await supabase
        .from("mystery_packages")
        .select("id, generation_status")
        .in("id", ids);
      if (error) throw new Error(`needs_review filter lookup failed: ${error.message}`);
      const heldIds = new Set(
        (data ?? [])
          .filter((p: { generation_status: { status?: string } | null }) => p.generation_status?.status === "needs_review")
          .map((p: { id: string }) => p.id as string),
      );
      return rows.filter((r) => heldIds.has(r.package_id as string));
    }

    // Free work first, so a spend halt can never starve the deterministic fixes.

    // 1. Self/victim-directed questions — deterministic, free.
    if (shouldRun("self_directed_questions")) {
      for (const row of await filterNeedsReview(await callDetector(DETECTOR_RPC.self_directed_questions, sinceIso))) {
        await handleSelfDirectedQuestions(ctx, row);
      }
    }

    // 2. Template artifacts — deterministic strip (free) + delegated fallback
    //    for embedded character-scope instances (paid; ADR-0061).
    if (shouldRun("template_artifact")) {
      for (const row of await filterNeedsReview(await callDetector(DETECTOR_RPC.template_artifact, sinceIso))) {
        await handleTemplateArtifacts(ctx, row);
      }
    }

    // 3-4. identity_contamination / slip_culprit_leak — delegated to
    //    regenerate-child-content (ADR-0061; previously escalate-only).
    if (shouldRun("identity_contamination")) {
      for (const row of await filterNeedsReview(await callDetector(DETECTOR_RPC.identity_contamination, sinceIso))) {
        await handleIdentityContamination(ctx, row);
      }
    }
    if (shouldRun("slip_culprit_leak")) {
      for (const row of await filterNeedsReview(await callDetector(DETECTOR_RPC.slip_culprit_leak, sinceIso))) {
        await handleSlipCulpritLeak(ctx, row);
      }
    }

    // 4b. missing_role_branch_content — delegated to regenerate-child-content
    //    (ADR-0103 Addendum 36; previously alert-only since Addendum 31).
    if (shouldRun("missing_role_branch_content")) {
      for (const row of await filterNeedsReview(await callDetector(DETECTOR_RPC.missing_role_branch_content, sinceIso))) {
        await handleMissingRoleBranchContent(ctx, row);
      }
    }

    // 5. game_overview victim mismatch — paid (Haiku).
    if (shouldRun("game_overview_victim_mismatch")) {
      for (const row of await filterNeedsReview(await callDetector(DETECTOR_RPC.game_overview_victim_mismatch, sinceIso))) {
        await handleVictimMismatch(ctx, row);
      }
    }

    // 6. Missing evidence images — paid (Replicate).
    if (shouldRun("missing_images")) {
      for (const row of await filterNeedsReview(await callDetector(DETECTOR_RPC.missing_images, sinceIso))) {
        await handleMissingImages(ctx, row);
      }
    }

    const spentThisRun = ctx.results.reduce((sum, r) => sum + (r.outcome === "planned" ? 0 : r.cost_usd), 0);
    const summary = {
      dry_run: dryRun,
      window_days: windowDays,
      since: sinceIso,
      considered: ctx.results.length,
      fixed: ctx.results.filter((r) => r.outcome === "fixed").length,
      escalated: ctx.results.filter((r) => r.outcome === "escalated").length,
      failed: ctx.results.filter((r) => r.outcome === "failed").length,
      skipped: ctx.results.filter((r) => r.outcome === "skipped").length,
      planned: ctx.results.filter((r) => r.outcome === "planned").length,
      spent_usd: Number(spentThisRun.toFixed(4)),
      spent_today_usd: Number((alreadySpent + spentThisRun).toFixed(4)),
      daily_cap_usd: DAILY_SPEND_CAP_USD,
      spend_halted: ctx.spendHalted,
      duration_ms: Date.now() - startedAt,
      results: ctx.results,
    };

    console.log(
      `auto-remediate: ${summary.fixed} fixed, ${summary.escalated} escalated, ` +
        `${summary.failed} failed, ${summary.skipped} skipped, $${summary.spent_usd} spent` +
        (dryRun ? " (DRY RUN)" : ""),
    );

    return new Response(JSON.stringify(summary), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("auto-remediate fatal:", (error as Error).message);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
