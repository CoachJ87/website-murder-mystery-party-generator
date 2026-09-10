#!/usr/bin/env node
/**
 * Truncated-concept-message detector (ADR-0103 Addendum 37).
 *
 * A customer's approved concept message can state a roster total in its own
 * header ("## Character List (28 players)") while the body below that header
 * only lists a fraction of that many names — the header line is written
 * first, before the model starts listing characters, so it still reflects
 * the ORIGINAL intended count even when the reply gets cut off mid-list by
 * hitting mystery-ai's max_tokens ceiling. That's a structural, deterministic
 * signal (no LLM judgment needed) that the concept generation was itself
 * truncated, independent of whatever `mystery_characters` count the package
 * ended up with — the existing roster-count-mismatch detector (ADR-0064)
 * only compares "approved" to "actual" and both can already reflect the same
 * truncated read, exactly as happened on Terminus 13 (approved parsed as 14,
 * actual delivered 15, stated header said 28 — the real gap only the header
 * comparison below would have caught).
 *
 * The root cause is now fixed at the source: mystery-ai retries once with a
 * continuation call whenever stop_reason is 'max_tokens' (2026-09-10). This
 * script is the backstop for messages already in the database from before
 * that fix, and for the rare reply that still truncates after the one bounded
 * continuation attempt.
 *
 * A truncated-looking header alone isn't enough to flag: "Death At The Velvet
 * Viper" has a stale 60-player approved snapshot that reads as truncated by
 * this same test (ends mid-item, "43. **Lucky/Lucia Fabron** –", parses to
 * 42) but the customer's delivered package correctly has 30 characters,
 * matching player_count. Even the delivered-count corroboration alone isn't
 * enough here — the header's stated 60 is itself stale, not a genuine target,
 * so comparing against it always shows a "gap" even on a correct delivery.
 * The actual reason this message never caused harm: its parsed count (42)
 * exceeds the same 35-character cap `scripts/detect-roster-mismatches.mjs`
 * documents production as using before falling through to a different
 * generation path (legacy scan / Claude fallback) — so production never
 * trusted this message's roster in the first place, unlike Terminus 13's
 * parse (14), comfortably inside that bound. This script reuses that same
 * cap for the same reason: outside it, the header/parse numbers were never
 * what production actually generated from, so a "gap" against them is noise.
 *
 * Re-parses each paid, completed package's approved concept snapshot with the
 * SHIPPED extractRosterFromMessage/extractStatedRosterCount — same technique
 * as scripts/detect-roster-mismatches.mjs: transpile the real source with
 * esbuild and run it, never a hand-copy (ADR-0057 discipline).
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node scripts/detect-truncated-concept-messages.mjs [--since=ISO_DATE] [--json]
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { transformSync } from 'esbuild';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Requires SUPABASE_URL and SUPABASE_SERVICE_KEY env vars');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const asJson = process.argv.includes('--json');
const sinceArg = process.argv.find((a) => a.startsWith('--since='));
const since = sinceArg ? sinceArg.split('=')[1] : new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();

// Load the SHIPPED extractors, not a copy.
const SRC_PATH = new URL('../supabase/functions/mystery-webhook-trigger/index.ts', import.meta.url);
const src = readFileSync(SRC_PATH, 'utf8');
const start = src.indexOf('const CHARACTER_LIST_HEADERS');
const end = src.indexOf('// Primary extraction: regex-based');
if (start < 0 || end < start) {
  console.error('Could not locate extractRosterFromMessage/extractStatedRosterCount prelude in mystery-webhook-trigger/index.ts — source shape changed, update this script.');
  process.exit(1);
}
const js = transformSync(
  src.slice(start, end) + '\nexport { extractRosterFromMessage, extractStatedRosterCount };',
  { loader: 'ts', format: 'esm' },
).code;
const { extractRosterFromMessage, extractStatedRosterCount } = await import(
  'data:text/javascript;base64,' + Buffer.from(js).toString('base64')
);

// A gap this size or larger, relative to the stated header count, is treated
// as "looks truncated" rather than an ordinary last-minute trim (a customer
// legitimately cutting a couple of characters shouldn't flag). Mirrors the
// same spirit as isPlausibleRosterCount's tolerance in the shipped source,
// but deliberately wider here since this check is about a GROSS mismatch
// between what a message claims and what it delivers, not a plausibility
// judgment against player_count.
const MIN_GAP = 5;
const MIN_GAP_FRACTION = 0.3;

async function main() {
  const { data: packages, error } = await supabase
    .from('mystery_packages')
    .select('id, conversation_id, created_at')
    .eq('generation_status->>status', 'completed')
    .gte('created_at', since);

  if (error) throw error;

  const { data: acknowledged } = await supabase
    .from('acknowledged_health_alerts')
    .select('package_id')
    .eq('detector', 'truncated_concept_message');
  const acknowledgedIds = new Set((acknowledged ?? []).map((a) => a.package_id));

  const findings = [];
  for (const pkg of packages ?? []) {
    if (acknowledgedIds.has(pkg.id)) continue;

    const { data: conv } = await supabase
      .from('conversations')
      .select('id, title, is_paid, is_test, approved_concept_message_id')
      .eq('id', pkg.conversation_id)
      .maybeSingle();
    if (!conv?.is_paid || conv?.is_test || !conv?.approved_concept_message_id) continue;

    const { data: msg } = await supabase
      .from('messages')
      .select('content')
      .eq('id', conv.approved_concept_message_id)
      .maybeSingle();
    if (!msg?.content) continue;

    const statedCount = extractStatedRosterCount(msg.content);
    if (statedCount === null) continue;

    const parsedRoster = extractRosterFromMessage(msg.content);
    const parsedCount = parsedRoster.length;
    // Mirrors detect-roster-mismatches.mjs's documented bound: outside it,
    // production never trusted this parse to begin with (falls through to a
    // legacy scan / Claude fallback instead), so the header/parse numbers
    // aren't what actually got generated from — see file header comment.
    if (parsedCount > 35) continue;
    const messageGap = statedCount - parsedCount;
    if (messageGap < MIN_GAP) continue;
    if (messageGap < statedCount * MIN_GAP_FRACTION) continue;

    // Corroborate against the actual delivered count, not just the parsed
    // count — see the "Death At The Velvet Viper" false-positive note above.
    const { count: actualCount, error: countErr } = await supabase
      .from('mystery_characters')
      .select('id', { count: 'exact', head: true })
      .eq('package_id', pkg.id);
    if (countErr) continue;
    const actualGap = statedCount - (actualCount ?? 0);
    if (actualGap < MIN_GAP) continue;
    if (actualGap < statedCount * MIN_GAP_FRACTION) continue;

    findings.push({
      package_id: pkg.id,
      conversation_id: conv.id,
      title: conv.title,
      stated_roster_count: statedCount,
      parsed_roster_count: parsedCount,
      actual_character_count: actualCount ?? 0,
      actual_gap: actualGap,
    });
  }

  if (asJson) {
    console.log(JSON.stringify(findings));
  } else if (findings.length === 0) {
    console.log('No truncated concept messages found.');
  } else {
    console.log(`${findings.length} package(s) with a concept message that looks truncated:`);
    for (const f of findings) {
      console.log(`  - ${f.title} [${f.package_id}]: header states ${f.stated_roster_count}, message parses to ${f.parsed_roster_count}, delivered ${f.actual_character_count} (gap ${f.actual_gap})`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
