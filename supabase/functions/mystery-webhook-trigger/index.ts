
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS: restrict to production domains
const ALLOWED_ORIGINS = [
  'https://www.mysterymaker.party',
  'https://mysterymaker.party',
  'http://localhost:5173',
  'http://localhost:3000',
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

// Initialize Supabase client with environment variables
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseKey);

// Define webhook URL from environment
const webhookUrl = Deno.env.get("WEBHOOK_URL") || "";

// All locale translations of "Character List" section header + common variants
const CHARACTER_LIST_HEADERS = [
  "Character List", "Characters", "Cast of Characters",
  "Complete Character List", "COMPLETE CHARACTER LIST", "Full Character List",
  "Lista de Personajes", "Personajes",
  "Liste des personnages", "Personnages",
  "Charakterliste", "Charaktere",
  "Elenco Personaggi", "Personaggi",
  "Lista de Personagens", "Personagens",
  "Personagelijst", "Personages",
  "Karaktärslista", "Karakterliste",
  "Hahmoluettelo", "Hahmot",
  "캐릭터 목록", "등장인물",
  "キャラクターリスト", "登場人物",
  "角色列表", "角色名单",
];

interface ExtractedCharacter {
  name: string;
  description: string;
}

// profiles.language code -> full English name for the child scenario's Claude
// prompt. Matches the 13 locales in src/i18n. Sent as a plain name (not the
// raw code) so the prompt can say "write in {{language}}" without the model
// having to interpret a bare code like "pt" or "zh-cn".
const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
  nl: "Dutch",
  da: "Danish",
  sv: "Swedish",
  fi: "Finnish",
  ko: "Korean",
  ja: "Japanese",
  "zh-cn": "Chinese (Simplified)",
};
const DEFAULT_LANGUAGE_NAME = "English";

// ADR-0112: detect the customer's actual language from their conversation
// text, rather than trusting profiles.language (an account-level UI setting
// that can diverge from what a specific conversation was written in - e.g. a
// customer browsing the English site who writes their concept in Dutch, and
// whose profile still reads "en"). Parent generation never had this problem
// because it just continues in whatever language conversationContent is
// written in - a cheap Haiku classification against that same text is a lot
// more reliable than a pure character-set heuristic (mystery-ai's
// detectLocale() only catches languages with distinctive diacritics; plain
// Dutch text often has none).
async function detectConversationLanguage(conversationContent: string): Promise<string | null> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    console.warn("No ANTHROPIC_API_KEY set, skipping conversation language detection");
    return null;
  }

  // A sample is plenty for language ID; sending the full (sometimes 100KB+)
  // conversationContent would add cost/latency for no accuracy gain.
  const sample = conversationContent.slice(0, 3000);
  const supportedCodes = Object.keys(LANGUAGE_NAMES);

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 10,
        temperature: 0,
        system: `You are a strict language classifier. Identify the dominant natural language of the given conversation text. Output ONLY one of these exact codes, nothing else: ${supportedCodes.join(", ")}. If genuinely ambiguous or too short to tell, output "unknown".`,
        messages: [{ role: "user", content: sample }],
      }),
    });

    if (!response.ok) {
      console.error(`Language detection API returned ${response.status}`);
      return null;
    }

    const result = await response.json();
    const code = (result.content?.[0]?.text || "").trim().toLowerCase();
    return supportedCodes.includes(code) ? code : null;
  } catch (error) {
    console.error("Language detection failed:", error);
    return null;
  }
}

// Build regex to match any locale's character list header
// Pattern: ## <Header> (N PLAYERS) or ## <Header>
const headerAlternatives = CHARACTER_LIST_HEADERS.map(h =>
  h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
).join('|');
const sectionHeaderRegex = new RegExp(
  `^#{2,3}\\s+(?:${headerAlternatives})(?:\\s*\\(\\d+\\s+.+?\\))?[:\\s]*$`, 'im'
);

// Same header, but capturing the stated count (e.g. "Character List (28
// players)" -> 28) instead of just matching its presence. Used only by
// `extractStatedRosterCount` below — kept separate from `sectionHeaderRegex`
// so that regex stays exactly what it was (ADR-0057: don't grow the one
// "does this look like a roster header" predicate extra responsibilities).
const sectionHeaderCountRegex = new RegExp(
  `^#{2,3}\\s+(?:${headerAlternatives})\\s*\\((\\d+)\\s+.+?\\)`, 'im'
);

// Pattern for numbered character lines (multiple formats):
// 1. **Name** - Description  (bold with dash)
// 1. **Name**: Description   (bold with colon)
// 1. Name - Description      (plain with dash)
const characterLineRegex = /^\d+\.\s+(?:\*\*(.+?)\*\*|([A-Z\u00C0-\u024F\u0400-\u04FF\u3000-\u9FFF\uAC00-\uD7AF].+?))(?:\s*\*?\([^)]*\)\*?)?\s*[-–—:]\s*(.+)/;

// Header-agnostic: 4+ consecutive "**Name** - Description" lines.
const boldCharRegex = /^\*\*(.+?)\*\*(?:\s*\*?\([^)]*\)\*?)?\s*[-–—:]\s*(.+)/;

/** A message proposing fewer names than this isn't a cast. */
const MIN_ROSTER_SIZE = 4;

// A numbered/bold line can match characterLineRegex/boldCharRegex structurally
// while not naming a real character at all — e.g. a truncated draft's leftover
// placeholder slot: "21. **[RESERVE CHARACTER - Brian's Alternate]** - If Brian
// cannot attend, his character's secrets and motives will be redistributed..."
// Real character names are never wrapped in brackets, so this is a safe,
// structural (not literal-wording) filter, same principle as ADR-0063/ADR-0068.
const isPlaceholderCharacterName = (name: string): boolean => name.trim().startsWith('[');

/**
 * What cast does THIS ONE message propose? Tries the explicit header section
 * first, then falls back to the header-agnostic batch pattern (4+ consecutive
 * numbered/bold "Name - description" lines).
 *
 * ADR-0057: this is the SINGLE definition of "a message that proposes a cast",
 * used both to CHOOSE `approved_concept_message_id` and to EXTRACT from it. They
 * used to be two different predicates - the chooser tested a header allow-list
 * (`Character List|Characters|Cast of Characters|...`) while the extractor parsed
 * lines. When a customer asked for players-as-investigators and the AI renamed its
 * section `## Suspect List`, the allow-list stopped matching, "latest match" silently
 * fell back to her FIRST draft, and she received a completely different mystery from
 * the one she approved. One function means the snapshot can never point at a message
 * the extractor cannot read.
 *
 * Do NOT reintroduce a header test as the gate. Header wording is model output and
 * will keep drifting; the parse either finds a cast or it doesn't.
 */
function extractRosterFromMessage(content: string): ExtractedCharacter[] {
  if (!content) return [];

  // Header path: start after an explicit list header and read numbered lines.
  const headerMatch = content.match(sectionHeaderRegex);
  if (headerMatch) {
    const viaHeader = new Map<string, ExtractedCharacter>();
    const afterHeader = content.substring(headerMatch.index! + headerMatch[0].length);
    const lines = afterHeader.split('\n');
    let started = false;

    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (!trimmed) continue;

      const charMatch = trimmed.match(characterLineRegex);
      if (charMatch) {
        const name = (charMatch[1] || charMatch[2]).trim().replace(/"/g, "'");
        const description = charMatch[3].trim().replace(/"/g, "'");
        if (!isPlaceholderCharacterName(name)) viaHeader.set(name.toLowerCase(), { name, description });
        started = true;
      } else if (started) {
        // Tolerate subheadings/dividers between entries; stop only at a new
        // section header that isn't itself another character-list header AND
        // doesn't lead back into more roster lines (e.g. "### Optional
        // Characters (for 16-18 players)" is a roster continuation, not a new
        // section - the model's wording for "more characters" will keep
        // drifting, so check structure instead: does a character line follow?).
        if (/^#{2,3}\s+/.test(trimmed) && !sectionHeaderRegex.test(trimmed)) {
          let nextContentLine = '';
          for (let j = i + 1; j < lines.length; j++) {
            const t = lines[j].trim();
            if (t) { nextContentLine = t; break; }
          }
          if (!characterLineRegex.test(nextContentLine)) break;
        }
      }
    }
    if (viaHeader.size >= MIN_ROSTER_SIZE) return Array.from(viaHeader.values());
  }

  // Batch path: the roster is present but the header is worded in a way we do not
  // recognise (or absent entirely). This is what makes the function header-agnostic.
  const found = new Map<string, ExtractedCharacter>();
  let batch: ExtractedCharacter[] = [];
  const flush = () => {
    if (batch.length >= MIN_ROSTER_SIZE) for (const c of batch) found.set(c.name.toLowerCase(), c);
    batch = [];
  };

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    const numbered = trimmed.match(characterLineRegex);
    const bold = trimmed.match(boldCharRegex);

    if (numbered) {
      const name = (numbered[1] || numbered[2]).trim().replace(/"/g, "'");
      if (!isPlaceholderCharacterName(name)) {
        batch.push({ name, description: numbered[3].trim().replace(/"/g, "'") });
      }
    } else if (bold) {
      const name = bold[1].trim().replace(/"/g, "'");
      if (!isPlaceholderCharacterName(name)) {
        batch.push({ name, description: bold[2].trim().replace(/"/g, "'") });
      }
    } else if (batch.length > 0 && trimmed !== '') {
      flush();
    }
  }
  flush();

  return found.size >= MIN_ROSTER_SIZE ? Array.from(found.values()) : [];
}

/**
 * ADR-0103 Addendum 37 (2026-09-10): what count does this message's OWN header
 * claim (e.g. "## Character List (28 players)" -> 28)? Independent of what
 * `extractRosterFromMessage` can actually parse out of the body below that
 * header - the two can disagree when the reply got cut off mid-list (hits
 * `stop_reason: 'max_tokens'` in mystery-ai, now mitigated at the source with
 * one bounded continuation call, see that function's comment) and the header
 * line itself (written first, before the model started listing names) still
 * states the original, larger, intended total. Returns null when the message
 * has no such header or the header carries no explicit count - this is a
 * corroborating signal for `scripts/detect-truncated-concept-messages.mjs`,
 * not a replacement for the roster parse itself.
 */
function extractStatedRosterCount(content: string): number | null {
  const match = content.match(sectionHeaderCountRegex);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Is this parsed count plausible as an actual character roster for this mystery?
 * `extractRosterFromMessage`'s structural pattern (4+ consecutive "N. **Bold** -
 * text" lines) has no concept of "character" at all - it matches ANY numbered,
 * bolded, dash-separated list, including things like a reply offering 4 "murder
 * method direction options" in exactly that format. player_count is an
 * independent signal (set from the customer's own chat/form, unrelated to this
 * regex) that a coincidental false-positive match is very unlikely to satisfy,
 * so it's used here as a corroborating check rather than a wording-based gate -
 * consistent with this file's existing principle of structural, not textual,
 * validation. Falls open (treats any count as plausible) when playerCount is
 * unknown, since there's no basis to judge against.
 *
 * Tolerance mirrors the existing `playerCount - 2` floor used elsewhere in this
 * file (allows for e.g. an inspector role trimmed from the played cast) with a
 * small ceiling for a modest few extra background characters.
 */
function isPlausibleRosterCount(count: number, playerCount?: number | null): boolean {
  if (!playerCount || playerCount <= 0) return true;
  return count >= playerCount - 2 && count <= playerCount + 3;
}

/**
 * ADR-0069 Addendum 1 (2026-09-05): is this candidate roster trustworthy, either by
 * player_count plausibility OR by being a clear revision of a known-good reference
 * roster (e.g. the current approved snapshot)?
 *
 * `player_count` alone regressed same-day: it's a form-captured value that chat-only
 * edits never update, so a customer who legitimately trims their roster by more than
 * `isPlausibleRosterCount`'s tolerance (e.g. removing one of 24 characters across
 * several chat turns, form never touched) gets their real final roster rejected as
 * "implausible" and the stale snapshot wins by default - reopening the exact gap
 * ADR-0069 fixed, via a different mechanism (Golden Feather Awards, 2026-09-05).
 *
 * A high name-overlap with a reference roster (the customer's own prior approved
 * cast) is a second, independent signal that survives a stale player_count: a real
 * revision keeps most of the same names, while ADR-0118's original false-positive
 * ("Holloway's Compound", "Ashgrave's Old Craft" - a murder-method options list, not
 * a cast) shares essentially none, exact-match, with the real roster it was
 * momentarily confused for. `referenceRoster` is optional and only supplied where a
 * trustworthy prior roster actually exists (the re-capture check) - first-capture,
 * where there is no prior roster to compare against, is unaffected and keeps relying
 * on player_count alone, exactly as before this addendum.
 */
function isPlausibleRosterCandidate(
  candidateRoster: ExtractedCharacter[],
  playerCount?: number | null,
  referenceRoster?: ExtractedCharacter[],
): boolean {
  if (isPlausibleRosterCount(candidateRoster.length, playerCount)) return true;
  if (referenceRoster && referenceRoster.length > 0) {
    return rosterOverlapFraction(candidateRoster, referenceRoster) >= 0.5;
  }
  return false;
}

/**
 * Latest assistant message that actually proposes a cast - the concept the user is
 * approving when they pay. Chronological, last wins, so a post-revision draft beats
 * an earlier one. Returns null when no message parses into a roster.
 *
 * When `playerCount` (and/or `referenceRoster`) is provided, prefers the latest
 * message whose parsed roster is plausible per `isPlausibleRosterCandidate` over a
 * more recent structural match that isn't - this is what stops a later reply that
 * merely LOOKS like a roster (e.g. a numbered list of narrative options) from
 * displacing the real one. Falls back to the plain "latest structural match"
 * behavior if no plausible candidate exists, so a real roster is still returned
 * when player_count itself is stale or wrong and no reference roster is available,
 * rather than nothing.
 */
function findLatestConceptMessage(
  messages: any[],
  playerCount?: number | null,
  referenceRoster?: ExtractedCharacter[],
): any | null {
  const assistant = (messages ?? [])
    .filter((m: any) => m.role === 'assistant' || m.is_ai)
    .sort((a: any, b: any) =>
      new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime());

  let latest: any = null;
  let latestPlausible: any = null;
  for (const m of assistant) {
    const roster = extractRosterFromMessage(m.content || '');
    if (roster.length >= MIN_ROSTER_SIZE) {
      latest = m;
      if (isPlausibleRosterCandidate(roster, playerCount, referenceRoster)) latestPlausible = m;
    }
  }
  return latestPlausible ?? latest;
}

/**
 * ADR-0110: a message whose roster starts numbering above 1 (e.g. "17. **Name** -
 * ...") is a CONTINUATION the customer explicitly asked for after an earlier reply
 * got cut off mid-list (LLM output limit), not a standalone or replacement cast.
 * Untreated, `findLatestConceptMessage` picks it as "the" approved message on its
 * own and every downstream extractor only ever sees its tail (e.g. 6 of 22).
 *
 * Splice the continuation's content onto the end of the immediately preceding
 * assistant message so every extraction path below sees one complete roster.
 * Real rosters we generate always start at "1." - a message starting higher is
 * never a legitimate from-scratch cast, so this is a safe structural signal, same
 * principle as `isPlaceholderCharacterName` and ADR-0057's "structure not wording."
 */
function firstCharacterNumber(content: string): number | null {
  for (const line of (content || '').split('\n')) {
    const m = line.trim().match(/^(\d+)\.\s+(?:\*\*.+?\*\*|[A-Za-z])/);
    if (m) return parseInt(m[1], 10);
  }
  return null;
}

function mergeRosterContinuations(messages: any[]): any[] {
  const sorted = [...(messages ?? [])].sort((a, b) =>
    new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime());

  // Anchor to the nearest PRIOR roster-bearing message, not merely the nearest
  // prior assistant message - an intervening non-roster reply (e.g. "continuing
  // below:") between a truncated list and its continuation must not break the
  // chain. A merged message becomes the new anchor for any further continuation,
  // so a roster split across 3+ messages chains correctly.
  let prevRosterIndex = -1;
  const merged = sorted.map((m) => ({ ...m }));

  for (let i = 0; i < merged.length; i++) {
    const m = merged[i];
    if (!(m.role === 'assistant' || m.is_ai)) continue;

    const firstNum = firstCharacterNumber(m.content || '');
    if (firstNum !== null && firstNum > 1 && prevRosterIndex !== -1) {
      merged[i].content = `${merged[prevRosterIndex].content || ''}\n\n${m.content || ''}`;
    }
    if (extractRosterFromMessage(merged[i].content || '').length >= MIN_ROSTER_SIZE) {
      prevRosterIndex = i;
    }
  }

  return merged;
}

/**
 * What fraction of these two rosters' names match, by normalized exact name (not
 * substring/fuzzy) - shared by `rosterDiffersMeaningfully` and
 * `isPlausibleRosterCandidate` below so both use one definition of "the same cast."
 * Exact-match is deliberate: ADR-0118's fake "roster" ("Holloway's Compound",
 * "Ashgrave's Old Craft") embeds real character surnames inside unrelated phrases,
 * which would substring-match and defeat the whole point of this check. Normalized
 * exact equality only credits an actual restated character name.
 */
function rosterOverlapFraction(a: ExtractedCharacter[], b: ExtractedCharacter[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const normalize = (n: string) => n.toLowerCase().replace(/[^a-z0-9]/g, '');
  const aNames = new Set(a.map((c) => normalize(c.name)));
  const bNames = new Set(b.map((c) => normalize(c.name)));
  let shared = 0;
  for (const n of aNames) if (bNames.has(n)) shared++;
  return shared / Math.max(aNames.size, bNames.size, 1);
}

/**
 * ADR-0069: does a LATER message that independently parses into a cast propose
 * a meaningfully different roster than the current snapshot? `findLatestConceptMessage`
 * already guarantees the later message is itself a clean, structurally complete roster
 * (>= MIN_ROSTER_SIZE) - this only decides whether it's a DIFFERENT one worth promoting.
 *
 * Conservative on purpose: only "different" when the character count changed or fewer
 * than half the names match. Cosmetic rewording of the same cast (spelling tweaks, a
 * subheading reshuffle, a header rename with the same 10 names) must NOT trigger a
 * re-snapshot - that would just be re-litigating ADR-0057 in the other direction.
 */
function rosterDiffersMeaningfully(
  snapshotRoster: ExtractedCharacter[],
  latestRoster: ExtractedCharacter[],
): boolean {
  if (latestRoster.length === 0) return false;
  if (snapshotRoster.length !== latestRoster.length) return true;
  return rosterOverlapFraction(snapshotRoster, latestRoster) < 0.5;
}

// Primary extraction: regex-based (free, deterministic, <1ms)
// If approvedMessageId is provided, extracts ONLY from that message (the concept
// snapshot the user explicitly approved at purchase time).
// Otherwise, falls back to the latest assistant message that proposes a cast.
function extractCharactersFromMessages(rawMessages: any[], approvedMessageId?: string | null, playerCount?: number | null): ExtractedCharacter[] | null {

  // ADR-0110: fold any roster-continuation reply into the message it continues
  // before any extraction path runs (including the approvedMessageId lookup below).
  const messages = mergeRosterContinuations(rawMessages);

  const assistantMessages = messages
    .filter((m: any) => m.role === 'assistant' || m.is_ai);

  console.log(`[CharExtract] Scanning ${assistantMessages.length} assistant messages (of ${messages.length} total)`);

  // If the user explicitly approved a specific concept message at purchase time,
  // use ONLY that message. This is the most reliable source — guaranteed to match
  // what the user saw and approved on the preview page.
  let latestMessageWithList: any = null;
  if (approvedMessageId) {
    latestMessageWithList = messages.find((m: any) => m.id === approvedMessageId);
    if (latestMessageWithList) {
      console.log(`[CharExtract] Using approved concept message ${approvedMessageId}`);
      // Same parser that CHOSE this message (ADR-0057). If it yields a roster we are
      // done — no header-shape guessing, no fall-through to a scan of other messages
      // that could resurrect a draft the user moved away from.
      const roster = extractRosterFromMessage(latestMessageWithList.content || '');
      if (roster.length >= MIN_ROSTER_SIZE && roster.length <= 35) {
        // ADR-0069 Addendum 1 (2026-09-05): deliberately NOT re-checking
        // isPlausibleRosterCount here. That check was added same-day (3d6b694) as
        // defense-in-depth against a corrupted `approved_concept_message_id` — but
        // it duplicated a decision already made, more reliably, at the point the
        // pointer was actually SET (capture/re-capture, both hardened with
        // isPlausibleRosterCandidate's snapshot-overlap signal, see above). Re-
        // litigating it here with player_count alone regressed: a legitimate large
        // roster trim (customer removes several characters purely via chat,
        // player_count never updated) got its own just-validated approved message
        // rejected as "implausible" and silently fell through to a legacy scan of
        // the wrong content (Golden Feather Awards, 2026-09-05). Trust the pointer
        // once chosen — this mirrors this function's pre-3d6b694 behavior.
        console.log(`[CharExtract] Roster from approved message: ${roster.length} characters: ${roster.map(c => c.name).join(', ')}`);
        return roster;
      }
      console.warn(`[CharExtract] Approved message parsed to ${roster.length} characters (need ${MIN_ROSTER_SIZE}-35) — falling through to legacy scan`);
      // Don't leave latestMessageWithList pointed at a message we just decided
      // isn't a real roster, or the header/secondary passes below would just
      // re-parse the same wrong message instead of scanning the rest of the
      // conversation for the real one.
      latestMessageWithList = null;
    } else {
      console.warn(`[CharExtract] approved_concept_message_id ${approvedMessageId} not found in messages, falling back to latest`);
    }
  }

  // Fallback for conversations with no usable snapshot: latest message that parses
  // into a cast. Same predicate as the snapshot chooser, so the two cannot disagree.
  if (!latestMessageWithList) {
    latestMessageWithList = findLatestConceptMessage(messages, playerCount);
  }

  const charMap = new Map<string, ExtractedCharacter>();

  if (latestMessageWithList) {
    const content = latestMessageWithList.content || '';
    const headerMatch = content.match(sectionHeaderRegex);

    if (headerMatch) {
      console.log(`[CharExtract] Using header from latest list: "${headerMatch[0].trim()}"`);
      const afterHeader = content.substring(headerMatch.index! + headerMatch[0].length);
      const lines = afterHeader.split('\n');
      let foundCharsInSection = false;

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        const charMatch = trimmed.match(characterLineRegex);
        if (charMatch) {
          // Replace inner double quotes with single quotes to prevent JSON parsing
          // errors in downstream Make.com scenarios that use string interpolation
          const name = (charMatch[1] || charMatch[2]).trim().replace(/"/g, "'");
          const description = charMatch[3].trim().replace(/"/g, "'");
          if (!isPlaceholderCharacterName(name)) charMap.set(name.toLowerCase(), { name, description });
          foundCharsInSection = true;
        } else if (foundCharsInSection) {
          // Allow non-matching lines (subheadings, dividers, category labels)
          // between character entries — only stop at a new ## section header
          // that isn't another character list header
          if (/^#{2,3}\s+/.test(trimmed) && !sectionHeaderRegex.test(trimmed)) {
            break;
          }
          // Otherwise skip and keep looking for more numbered characters
        }
      }
    } else {
      // The approved/found message doesn't match sectionHeaderRegex — header variant
      // not yet in CHARACTER_LIST_HEADERS. Secondary extraction will handle it.
      console.warn(`[CharExtract] Message found but sectionHeaderRegex didn't match (non-standard header). Falling through to secondary extraction.`);
    }
  }

  if (charMap.size >= 4 && charMap.size <= 35) {
    const characters = Array.from(charMap.values());
    console.log(`[CharExtract] PRIMARY regex aggregated ${characters.length} characters across messages: ${characters.map(c => c.name).join(', ')}`);
    return characters;
  } else if (charMap.size > 0) {
    console.log(`[CharExtract] Primary found ${charMap.size} characters (need 4-35), trying secondary...`);
  }

  console.log(`[CharExtract] Primary pattern insufficient, trying secondary (consecutive bold lines)...`);
  // Secondary pattern: 4+ consecutive **Name** - Description lines (no section header).
  // Iterate messages chronologically; LATER messages with a valid batch overwrite
  // earlier ones, so we normally use the most recent character list. But a later
  // message can match this same numbered/bold/dash shape without being a roster
  // at all (e.g. a "here are 4 direction options" reply) — an unconditional
  // overwrite would let that displace a real earlier roster found in the same
  // scan. Track a plausibility-checked overwrite candidate separately and prefer
  // it; only fall back to the plain "latest wins" candidate if no batch in the
  // whole conversation is plausible against player_count.
  const boldCharRegex = /^\*\*(.+?)\*\*(?:\s*\*?\([^)]*\)\*?)?\s*[-–—:]\s*(.+)/;
  let secondaryMap = new Map<string, ExtractedCharacter>();
  let secondaryMapPlausible = new Map<string, ExtractedCharacter>();

  for (const msg of assistantMessages) {
    const content = msg.content || '';
    const lines = content.split('\n');
    const batch: ExtractedCharacter[] = [];
    const messageMap = new Map<string, ExtractedCharacter>();

    for (const line of lines) {
      const trimmed = line.trim();
      // Match both "N. **Name** - Desc" and "**Name** - Desc"
      const numberedMatch = trimmed.match(characterLineRegex);
      const boldMatch = trimmed.match(boldCharRegex);

      if (numberedMatch) {
        const name = (numberedMatch[1] || numberedMatch[2]).trim().replace(/"/g, "'");
        const description = numberedMatch[3].trim().replace(/"/g, "'");
        if (!isPlaceholderCharacterName(name)) batch.push({ name, description });
      } else if (boldMatch) {
        const name = boldMatch[1].trim().replace(/"/g, "'");
        if (!isPlaceholderCharacterName(name)) batch.push({ name, description: boldMatch[2].trim().replace(/"/g, "'") });
      } else if (batch.length > 0 && trimmed !== '') {
        // Non-matching non-empty line — flush batch if 4+
        if (batch.length >= 4) {
          for (const c of batch) {
            messageMap.set(c.name.toLowerCase(), c);
          }
        }
        batch.length = 0;
      }
    }

    // Flush remaining batch from this message
    if (batch.length >= 4) {
      for (const c of batch) {
        messageMap.set(c.name.toLowerCase(), c);
      }
    }

    // If this message had a valid batch, REPLACE secondaryMap (overwrite older)
    if (messageMap.size >= 4) {
      secondaryMap = messageMap;
      if (isPlausibleRosterCount(messageMap.size, playerCount)) {
        secondaryMapPlausible = messageMap;
      }
    }
  }

  if (secondaryMapPlausible.size >= 4) {
    secondaryMap = secondaryMapPlausible;
  }

  if (secondaryMap.size >= 4 && secondaryMap.size <= 35) {
    const characters = Array.from(secondaryMap.values());
    console.log(`[CharExtract] SECONDARY regex aggregated ${characters.length} characters`);
    return characters;
  }

  console.log(`[CharExtract] Both regex patterns failed — no characters extracted`);
  return null;
}

// Fallback extraction: Claude API (only called if regex finds nothing)
async function extractCharactersWithClaude(
  messages: any[],
  playerCount: number | null
): Promise<ExtractedCharacter[] | null> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    console.warn("No ANTHROPIC_API_KEY set, skipping Claude fallback extraction");
    return null;
  }

  // Only send assistant messages that contain bold text (character names).
  //
  // ADR-0069: budget from the MOST RECENT message backward, not head-truncate the
  // naive concatenation. "Death At The Blackthorn Wedding" (2026-08-07): with
  // ~38,000+ chars of draft history preceding the customer's actual final 10-player
  // revision, the old `relevantContent.substring(0, 8000)` cut off long before her
  // real final message was reached at all - the fallback silently extracted from
  // stale earlier drafts instead. Dropping OLDER drafts first when the budget is
  // tight means the most recent (most likely approved/final) content always survives.
  //
  // ADR-0118: pure recency has its own failure mode - a real roster message can
  // itself get starved out by several SHORTER, LATER, non-roster replies (e.g.
  // narrowing down a murder-method detail) that structurally happen to contain
  // bold text too and simply eat the budget first. Guarantee the best plausible
  // roster message (same structural+player_count check used everywhere else in
  // this file) survives regardless of the recency window, and only spend the
  // remaining budget on trailing context after that.
  const bestRosterMessage = findLatestConceptMessage(messages, playerCount);

  const relevantMessages = (messages as any[])
    .filter((m: any) =>
      (m.role === 'assistant' || m.is_ai) &&
      (m.content || '').includes('**') &&
      m.id !== bestRosterMessage?.id)
    .sort((a: any, b: any) =>
      new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime());

  const CONTENT_BUDGET = 8000;
  let usedChars = 0;
  const kept: string[] = [];

  if (bestRosterMessage?.content) {
    const rosterContent: string = bestRosterMessage.content;
    kept.push(rosterContent.substring(0, CONTENT_BUDGET));
    usedChars = Math.min(rosterContent.length, CONTENT_BUDGET);
  }

  if (relevantMessages.length === 0 && kept.length === 0) return null;

  const trailing: string[] = [];
  for (let i = relevantMessages.length - 1; i >= 0; i--) {
    const content: string = relevantMessages[i].content || '';
    if (usedChars + content.length > CONTENT_BUDGET) {
      if (trailing.length === 0 && kept.length === 0) {
        // Even the single most recent message alone exceeds the budget - keep it,
        // truncated, rather than send nothing.
        trailing.unshift(content.substring(0, CONTENT_BUDGET));
      }
      break;
    }
    trailing.unshift(content);
    usedChars += content.length;
  }
  const relevantContent = [...kept, ...trailing].join('\n\n---\n\n');

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2000,
        temperature: 0,
        system: "You are a strict JSON extraction tool. Output ONLY a valid JSON array of objects with 'name' and 'description' fields. Extract the playable character names and descriptions. Never continue the story. Never output anything except the JSON array. CRITICAL: only include a character if their name is explicitly present in the provided content. The 'expected count' is a hint about how many characters SHOULD be findable, not a target to hit - if the content only names fewer than that, output only those. NEVER invent, guess, or fabricate an additional character to make the count match.",
        messages: [{
          role: "user",
          content: `Extract ALL playable character names and their one-line descriptions from this mystery content. Output ONLY a JSON array like: [{"name":"Character Name","description":"Their description"}]\n\nExpected count: ${playerCount || 'unknown'} (a hint, not a requirement - if you can only find fewer names explicitly stated in the content below, output only those; do not invent characters to reach this number)\n\n${relevantContent}`
        }],
      }),
    });

    if (!response.ok) {
      console.error(`Claude extraction API returned ${response.status}`);
      return null;
    }

    const result = await response.json();
    const text = result.content?.[0]?.text || '';

    // Extract JSON array from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]) as ExtractedCharacter[];
    if (Array.isArray(parsed) && parsed.length >= 4 && parsed.every(c => c.name && c.description)) {
      // Sanitize names and descriptions to prevent JSON issues in Make.com string interpolation
      for (const c of parsed) {
        c.name = c.name.replace(/"/g, "'");
        c.description = c.description.replace(/"/g, "'");
      }
      console.log(`Claude fallback extracted ${parsed.length} characters`);
      return parsed;
    }
  } catch (error) {
    console.error("Claude fallback extraction failed:", error);
  }

  return null;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body to get conversation ID
    const { conversationId, testMode = false } = await req.json();

    if (!conversationId) {
      throw new Error("Conversation ID is required");
    }

    console.log(`Processing webhook for conversation: ${conversationId}, testMode: ${testMode}`);

    // Retrieve conversation data with user_id and messages
    const { data: conversation, error: conversationError } = await supabase
      .from("conversations")
      .select("*, messages!fk_messages_conversation_id(*), user_id, title, theme, player_count, script_type, mystery_style, mystery_type, has_accomplice, approved_concept_message_id")
      .eq("id", conversationId)
      .single();

    if (conversationError) {
      console.error("Error fetching conversation:", conversationError);
      throw new Error(`Failed to fetch conversation: ${conversationError.message}`);
    }

    if (!conversation) {
      throw new Error("Conversation not found");
    }

    console.log(`Found conversation with ${conversation.messages?.length || 0} messages`);

    // Payment gate (ADR-0033): generation is the expensive step (Make.com + AI),
    // and generated content alone unlocks the package tabs in MysteryView — so an
    // unauthenticated call with a conversation UUID was a free-package hole. The
    // function has verify_jwt disabled, so the gate lives here: only paid
    // conversations generate. Internal/recovery callers can bypass by sending the
    // service-role key as the bearer token.
    const authHeader = req.headers.get("Authorization") || "";
    const isServiceCall = supabaseKey.length > 0 && authHeader === `Bearer ${supabaseKey}`;
    if (!conversation.is_paid && !isServiceCall) {
      console.warn(`[PaymentGate] Rejected generation for unpaid conversation ${conversationId}`);
      await supabase.from("generation_attempts").insert({
        conversation_id: conversationId, is_service_call: isServiceCall, outcome: "rejected_payment",
      });
      return new Response(
        JSON.stringify({ success: false, error: "Payment required before package generation" }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // GENERATION GUARD (ADR-0104): closes the post-purchase free-regeneration
    // hole. Until now, the ONLY thing stopping a completed/in-progress package
    // from being regenerated was the CLIENT-SIDE check in generateCompletePackage()
    // (mysteryPackageService.ts) -- a plain read-then-branch, not atomic, and
    // irrelevant to anyone calling this edge function directly (verify_jwt is
    // disabled here; only is_paid was ever checked server-side). A customer
    // holding their conversationId could re-trigger the full paid Make.com +
    // Claude pipeline indefinitely, for free, forever.
    //
    // Service-role callers (isServiceCall, above) bypass both the rate limit
    // and the claim below entirely -- this only closes the free self-serve
    // path, not the recovery tooling used for legitimate remediation (e.g.
    // Lyn's/Lydia's rebuilds, ADR-0098).
    if (!isServiceCall) {
      // Rate limit: independent of generation status, defense in depth in
      // case claim_package_for_generation itself has a bug. Generous enough
      // not to block a real double-click retry or a "generate, see an error,
      // try again" cycle.
      //
      // ADR-0104 Addendum (2026-08-23): only count outcome="claimed" attempts
      // -- i.e. calls that actually won the atomic claim and kicked off a real
      // (billable) generation run. Multi-tab/refresh races produce 409
      // "rejected_status" responses that cost nothing and represent the SAME
      // underlying attempt as whichever call won the claim, not a new one --
      // counting them let 2-3 harmless race losses alone exhaust the whole
      // budget before a single real attempt ran (see incident: conversation
      // 1c87bdb3, 2026-08-22, esj@salgados.net -- 3 near-simultaneous 409s
      // from what was almost certainly two tabs burned the limit in 22s, then
      // 28 follow-up manual retries over 13min all hit 429 with zero real
      // attempts ever having run).
      const RATE_LIMIT_WINDOW_MINUTES = 60;
      const RATE_LIMIT_MAX_ATTEMPTS = 3;
      const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60_000).toISOString();
      const { count: recentAttempts } = await supabase
        .from("generation_attempts")
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", conversationId)
        .eq("is_service_call", false)
        .eq("outcome", "claimed")
        .gte("attempted_at", windowStart);

      if ((recentAttempts ?? 0) >= RATE_LIMIT_MAX_ATTEMPTS) {
        console.warn(`[GenerationGuard] Rate limit hit for conversation ${conversationId}: ${recentAttempts} real attempts in the last ${RATE_LIMIT_WINDOW_MINUTES}min`);
        await supabase.from("generation_attempts").insert({
          conversation_id: conversationId, is_service_call: false, outcome: "rejected_rate_limit",
        });
        return new Response(
          JSON.stringify({ success: false, error: "Too many generation attempts for this mystery. Please contact support if you need help.", reason: "rate_limited" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Atomic claim: mirrors claim_package_for_remediation (20260802) and the
      // lost-ack-hardened claim in adapt-mystery-apply (ADR-0098) -- a
      // conditional UPDATE ... RETURNING under a row lock, so two concurrent
      // callers (two tabs, a double-click, or a direct API call racing the
      // UI) serialize instead of both passing a read-then-branch check.
      const { data: claimed, error: claimErr } = await supabase
        .rpc("claim_package_for_generation", { _conversation_id: conversationId, _ttl_minutes: 20 });
      if (claimErr) {
        console.error(`[GenerationGuard] Claim RPC failed for ${conversationId}: ${claimErr.message}`);
        throw new Error(`Generation claim failed: ${claimErr.message}`);
      }

      if (!claimed) {
        console.warn(`[GenerationGuard] Rejected duplicate generation for ${conversationId}: already completed or in progress`);
        await supabase.from("generation_attempts").insert({
          conversation_id: conversationId, is_service_call: false, outcome: "rejected_status",
        });
        return new Response(
          JSON.stringify({ success: false, error: "This mystery has already been generated or is currently generating.", reason: "already_generated" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await supabase.from("generation_attempts").insert({
        conversation_id: conversationId, is_service_call: false, outcome: "claimed",
      });
    } else {
      await supabase.from("generation_attempts").insert({
        conversation_id: conversationId, is_service_call: true, outcome: "claimed",
      });
    }

    // claim_package_for_generation only returns a boolean (did the claim succeed),
    // never the row's id -- so until now Make.com had no choice but to re-derive
    // the package id itself (a supabase:searchRows on conversation_id, module 46
    // in the Parent blueprint). For a brand-new package that search can race the
    // INSERT the claim above just committed: Staša's order (2026-08-30) lost that
    // race, leaving every downstream write in that Make.com run with an empty
    // package_id -- the evidence-images call 400'd loudly, and two "early save"
    // upserts with a blank id silently INSERTed orphan mystery_packages rows
    // instead of updating the real one. Passing the real id through explicitly
    // removes the race instead of papering over it.
    const { data: packageRow } = await supabase
      .from("mystery_packages")
      .select("id")
      .eq("conversation_id", conversationId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const packageId = packageRow?.id ?? null;

    // Snapshot the approved concept message at generation time. The original
    // chat-creation path (MysteryChatCreator) wrote this column, but the live
    // /mystery/chat path doesn't — so for every real customer the column was
    // null and the parent had to rely on theme+messages, which led to confused
    // outputs when the chat-defined concept drifted from the form-selected theme
    // (e.g. theme="Family Reunion" but chat pivoted to "circus" → parent merged
    // them into a schizophrenic lake-house-with-circus-names mystery).
    //
    // Capturing the id here ensures the latest assistant message that actually
    // proposes a cast becomes the single source of truth — both for our local
    // extraction and for the parent webhook's prompt (which receives this as
    // approvedConceptMessageId).
    //
    // ADR-0057: selection is by PARSE, not by header wording. This used to test a
    // hardcoded header allow-list (Character List|Characters|Cast of Characters|...).
    // A customer asked for players-as-investigators, the AI renamed its section
    // "## Suspect List", the allow-list stopped matching her revised drafts, and
    // "latest match" silently fell back to her FIRST draft — so she paid for and
    // received an entirely different mystery. The value written was non-null, so the
    // downstream null-check never rescued it and nothing errored. Header text is model
    // output and will keep drifting; `extractRosterFromMessage` is the same parser that
    // will later read this message, so chooser and reader cannot disagree.
    if (!conversation.approved_concept_message_id && conversation.messages) {
      const candidate = findLatestConceptMessage(conversation.messages as any[], conversation.player_count);
      // Only snapshot real DB ids, not client-generated msg- placeholders
      if (candidate?.id && !String(candidate.id).startsWith('msg-') && candidate.id !== 'initial-message') {
        const { error: snapErr } = await supabase
          .from("conversations")
          .update({ approved_concept_message_id: candidate.id })
          .eq("id", conversationId);
        if (snapErr) {
          console.warn(`[ConceptSnapshot] Failed to write approved_concept_message_id: ${snapErr.message}`);
        } else {
          conversation.approved_concept_message_id = candidate.id;
          console.log(`[ConceptSnapshot] Captured approved_concept_message_id=${candidate.id} (latest message parsing into a cast, at ${candidate.created_at})`);
        }
      }
    }

    // Re-capture on roster-shape drift (ADR-0069). The block above captures the
    // snapshot ONCE; nothing previously re-evaluated it when a customer substantively
    // revised their roster afterward. "Death At The Blackthorn Wedding"
    // (cd4ca44d-d3ac-46ea-8663-6811c98fe1fc): customer approved a 12-player roster on
    // 2026-07-22, then 16 days later said "Change it to be ten players" and received a
    // revised 10-player roster as her final message - `approved_concept_message_id`
    // never moved, so `extractCharactersFromMessages` (which reads ONLY the snapshot,
    // by design per ADR-0057) kept reading the stale 12-player draft.
    //
    // Mirrors the existing player_count auto-sync's spirit, applied to the snapshot
    // pointer itself: if the latest message that independently parses into a cast
    // (same predicate that chose the snapshot originally) proposes a meaningfully
    // different roster, promote it to the new snapshot before generation reads it.
    //
    // Deliberately narrow: this only catches a later message that RESTATES a full
    // roster in a different shape. A sweep of the 46 paid conversations with a
    // snapshot set (2026-08-11) found this is the only failure shape in the data -
    // two other known incidents (Black Swan Society, Adelaide Crane) were later
    // PROSE-only revisions (setting/tone/backstory) that never restated a roster at
    // all, so no roster-comparison approach here could catch them; those are already
    // covered by ADR-0059's conversationContent widening below, which sends the
    // snapshot plus everything after it to Make.com's prose-generation prompts.
    if (conversation.approved_concept_message_id && conversation.messages) {
      const currentSnapshotMsg = (conversation.messages as any[])
        .find((m: any) => m.id === conversation.approved_concept_message_id);
      // Computed before the candidate search (not after) so it can be passed in as
      // the reference roster for isPlausibleRosterCandidate's overlap check (ADR-0069
      // Addendum 1) - a candidate sharing most of ITS names is trusted even when its
      // count fails the player_count tolerance, which is what a legitimate large
      // roster trim needs, since player_count itself can be stale at this point.
      const snapshotRoster = currentSnapshotMsg
        ? extractRosterFromMessage(currentSnapshotMsg.content || '')
        : [];
      const latestConceptMsg = findLatestConceptMessage(
        conversation.messages as any[], conversation.player_count, snapshotRoster,
      );

      if (
        currentSnapshotMsg && latestConceptMsg &&
        latestConceptMsg.id !== currentSnapshotMsg.id &&
        new Date(latestConceptMsg.created_at).getTime() > new Date(currentSnapshotMsg.created_at).getTime()
      ) {
        const latestRoster = extractRosterFromMessage(latestConceptMsg.content || '');

        if (rosterDiffersMeaningfully(snapshotRoster, latestRoster)) {
          console.warn(
            `[ConceptSnapshot] Roster drift detected: snapshot=${snapshotRoster.length} chars ` +
            `(msg ${currentSnapshotMsg.id}, ${currentSnapshotMsg.created_at}), latest=${latestRoster.length} ` +
            `chars (msg ${latestConceptMsg.id}, ${latestConceptMsg.created_at}). Re-capturing snapshot.`
          );
          const { error: recaptureErr } = await supabase
            .from("conversations")
            .update({ approved_concept_message_id: latestConceptMsg.id })
            .eq("id", conversationId);
          if (recaptureErr) {
            console.warn(`[ConceptSnapshot] Failed to re-capture approved_concept_message_id: ${recaptureErr.message}`);
          } else {
            conversation.approved_concept_message_id = latestConceptMsg.id;
          }
        }
      }
    }

    // Pre-generation cleanup: delete any existing `mystery_characters` rows for this
    // package before Make.com begins. Make.com upserts characters by exact name, so
    // when the AI's naming convention changes between generations (e.g. moving from
    // "Mario / Mariana" gender-variant names to just "Mario"), characters whose
    // names no longer match the new convention are orphaned — they linger in the
    // table alongside the freshly-inserted single-name versions.
    //
    // Fotini's "Multiverse" regeneration (May 19 2026): 9 old "/"-style names from
    // the prior generation stuck around as duplicates next to the 9 new single-name
    // rows, leaving the package with 26 characters instead of 17. Cleaning here on
    // every run guarantees the character set always matches the current generation.
    //
    // Safety: this is a no-op for first-time generations (no rows to delete). It
    // means a failed/aborted regeneration briefly leaves the package with zero
    // characters — but the UI already handles that case via the "We're Finalizing"
    // fallback when characters.length === 0 (see MysteryView.tsx tab-display logic).
    {
      const { data: existingPackage } = await supabase
        .from("mystery_packages")
        .select("id")
        .eq("conversation_id", conversationId)
        .maybeSingle();

      if (existingPackage?.id) {
        const { count, error: cleanupErr } = await supabase
          .from("mystery_characters")
          .delete({ count: "exact" })
          .eq("package_id", existingPackage.id);
        if (cleanupErr) {
          console.warn(`[Cleanup] Failed to delete existing characters: ${cleanupErr.message}`);
        } else if (count && count > 0) {
          console.log(`[Cleanup] Deleted ${count} existing character rows (package_id=${existingPackage.id}) before regeneration`);
        }
      }
    }

    // Extract user_id from the conversation
    const userId = conversation.user_id;

    if (!userId) {
      console.warn("Warning: No user_id found for conversation");
    }

    // Fetch user email and name from auth
    let userEmail = null;
    let userName = null;

    if (userId) {
      const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);

      if (authUser && authUser.user) {
        userEmail = authUser.user.email;
        userName = authUser.user.user_metadata?.name || authUser.user.email?.split('@')[0] || 'User';
      }
    }

    // Build conversationContent for the parent's planning prompts. When the
    // user has an approved concept message (set above or earlier), we send
    // ONLY that one message — not the full chat — so the planning prompt
    // can't latch onto an earlier draft theme that the user pivoted away from.
    //
    // Madysn's "Murder Under The Big Top" (Apr 2026) hit this exact failure:
    // her chat went lake-house family destination → circus pivot → final
    // "MURDER UNDER THE BIG TOP" concept. The full conversation was sent to
    // the parent, the master_context generation latched onto the early
    // lake-house draft, and we got a schizophrenic package with circus
    // characters but lake-house host content.
    //
    // For backwards compat with conversations where no approved message
    // exists (rare now that we auto-snapshot), fall back to full content.
    let conversationContent = "";
    if (conversation.messages && conversation.messages.length > 0) {
      const approvedId = conversation.approved_concept_message_id;
      const approvedMsg = approvedId
        ? (conversation.messages as any[]).find((m: any) => m.id === approvedId)
        : null;

      // Sanity check: if the approved snapshot is suspiciously thin compared to the rest
      // of the conversation, the user likely iterated extensively after the snapshot
      // landed (or the snapshot is a character-roster-only message). Sending only the
      // thin snapshot starves the parent's planning prompts of plot detail.
      //
      // Fotini's "Multiverse" mystery (May 19 2026): approved snapshot was a 1.8KB clean
      // character roster; the full 304-message chat (312KB) held every plot decision —
      // killer, motive, void essence poison, dimensional keystones, riddle system. Make.com
      // got the right characters and an invented plot. Fix: detect that mismatch here and
      // fall back to the full conversation.
      const fullConvoLength = (conversation.messages as any[])
        .reduce((sum: number, m: any) => sum + (m.content?.length || 0), 0);
      const snapshotTooThin = approvedMsg
        && approvedMsg.content.length < 3000
        && fullConvoLength > 30000
        && fullConvoLength > approvedMsg.content.length * 10;

      if (approvedMsg && !snapshotTooThin) {
        // ADR-0059: the approved concept message PLUS everything after it.
        //
        // The snapshot alone was the old behaviour, and it silently discarded every
        // refinement the customer made after approving the cast. Three paid packages
        // in 35 days were built from a stale concept this way:
        //   - Black Swan Society (2026-07-26): 13 later messages moved the setting to
        //     Victorian, renamed the institution off "Morehouse", added a Savannah plot
        //     thread. None reached Make.com; the delivered package still said Morehouse.
        //   - Adelaide Crane (2026-07-24): 10 later messages established Camille's
        //     illegitimacy backstory and Patricia's motive. Delivered package invented
        //     a different, incompatible backstory for both.
        //   - The Masked Betrayal (2026-07-27): the customer's "these must exonerate all
        //     but these three suspects" constraint never reached the generator.
        //
        // Why this is safe — i.e. why not just send the whole conversation: messages
        // BEFORE the snapshot may be pre-pivot drafts, which is the contamination the
        // narrow-context design exists to prevent (Madysn's "Murder Under The Big Top",
        // Apr 2026: a lake-house draft bled into a circus concept). Messages AFTER the
        // snapshot cannot be a superseded draft — the customer wrote them later, on top
        // of the cast they had already approved. So this widens context in exactly the
        // one direction that carries no contamination risk, reconciling the two failure
        // modes that were previously treated as needing opposite fixes.
        const approvedAt = new Date(approvedMsg.created_at).getTime();
        const afterSnapshot = (conversation.messages as any[])
          .filter((m: any) => new Date(m.created_at).getTime() > approvedAt)
          .sort((a: any, b: any) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        conversationContent = [
          `AI: ${approvedMsg.content}`,
          ...afterSnapshot.map((m: any) =>
            `${m.role === "assistant" ? "AI" : "User"}: ${m.content}`),
        ].join("\n\n---\n\n");

        console.log(
          `[ConversationContent] Approved concept message (id=${approvedId}, ${approvedMsg.content.length} chars) ` +
          `+ ${afterSnapshot.length} later message(s) = ${conversationContent.length} chars`,
        );
      } else {
        // Fallback: full conversation (either no snapshot, or snapshot is too thin to be trusted)
        conversationContent = (conversation.messages as any[])
          .map((msg: any) => {
            const role = msg.role === "assistant" ? "AI" : "User";
            return `${role}: ${msg.content}`;
          }).join("\n\n---\n\n");
        if (snapshotTooThin) {
          console.warn(`[ConversationContent] Approved snapshot is thin (${approvedMsg.content.length} chars) vs full conversation (${fullConvoLength} chars) — using full conversation to preserve iterative plot detail`);
        } else {
          console.log(`[ConversationContent] Sending full conversation (${conversationContent.length} chars, no approved snapshot found)`);
        }
      }
    }

    // Customer's language, resolved to a full name for the child scenario
    // (see ADR-0093 for why this must be explicit rather than inferred
    // per-call by the child scenario's own Claude calls). ADR-0112: primary
    // signal is now the conversation's own detected language, not
    // profiles.language — an account-level UI setting that can legitimately
    // diverge from what the customer actually typed in this conversation
    // (see detectConversationLanguage above). profiles.language is now only
    // the fallback for when detection is inconclusive (e.g. too little text
    // to classify, or no ANTHROPIC_API_KEY set).
    const detectedLocale = conversationContent
      ? await detectConversationLanguage(conversationContent)
      : null;

    let languageName: string;
    if (detectedLocale) {
      languageName = LANGUAGE_NAMES[detectedLocale];
      console.log(`[Language] Detected "${detectedLocale}" from conversationContent`);
    } else if (userId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("language")
        .eq("id", userId)
        .maybeSingle();
      languageName = LANGUAGE_NAMES[profile?.language ?? ""] || DEFAULT_LANGUAGE_NAME;
      console.log(`[Language] Detection inconclusive, falling back to profiles.language ("${profile?.language}") -> ${languageName}`);
    } else {
      languageName = DEFAULT_LANGUAGE_NAME;
    }

    // Extract character names before sending to Make.com.
    // Prefer the approved concept message (snapshot at purchase time) so we get
    // exactly what the user approved — not earlier draft versions with characters
    // they may have explicitly removed.
    let extractedCharacters = extractCharactersFromMessages(
      conversation.messages,
      conversation.approved_concept_message_id,
      conversation.player_count
    );
    let extractionMethod = extractedCharacters ? 'regex' : 'none';

    if (!extractedCharacters) {
      extractedCharacters = await extractCharactersWithClaude(
        conversation.messages, conversation.player_count
      );
      extractionMethod = extractedCharacters ? 'claude_fallback' : 'failed';
    }

    console.log(`Character extraction: method=${extractionMethod}, count=${extractedCharacters?.length || 0}`);

    // Cross-validate extracted count against player_count — if regex found
    // significantly fewer characters than expected, try Claude fallback
    let playerCount = conversation.player_count || 0;
    if (extractedCharacters && playerCount > 0) {
      const minExpected = playerCount - 2; // Allow for inspector + flexibility
      if (extractedCharacters.length < minExpected && extractionMethod === 'regex') {
        console.warn(`[CharExtract] WARNING: Regex found ${extractedCharacters.length} characters but player_count is ${playerCount}. Trying Claude fallback...`);
        const claudeChars = await extractCharactersWithClaude(conversation.messages, playerCount);
        if (claudeChars && claudeChars.length > extractedCharacters.length) {
          console.log(`[CharExtract] Claude fallback found ${claudeChars.length} characters (vs regex ${extractedCharacters.length}), using Claude result`);
          extractedCharacters = claudeChars;
          extractionMethod = 'claude_upgrade';
        }
      }
    }

    // Auto-sync `player_count` from the extracted character count. The form-captured
    // value is taken from the user's opening chat message and never refreshes, but
    // users routinely iterate on character count during chat (Fotini "Multiverse"
    // May 19 2026 drifted 15 → 20 → 19 → 17, while the form stayed at 15). The
    // approved concept message is the authoritative source of truth.
    //
    // This replaces the previous strict-mismatch validation that returned 400 —
    // form-value drift was being misclassified as an extraction error and turning
    // into broken generations for paying customers. Best-effort DB sync; the local
    // value drives this request regardless of whether the DB write succeeds.
    if (extractedCharacters && extractedCharacters.length > 0 && extractedCharacters.length !== playerCount) {
      const extractedCount = extractedCharacters.length;
      console.warn(`[PlayerCount] Drift detected: form=${playerCount}, extracted=${extractedCount}. Syncing player_count → ${extractedCount}.`);
      const { error: syncErr } = await supabase
        .from("conversations")
        .update({ player_count: extractedCount })
        .eq("id", conversationId);
      if (syncErr) {
        console.warn(`[PlayerCount] DB sync failed (proceeding with local value): ${syncErr.message}`);
      }
      conversation.player_count = extractedCount;
      playerCount = extractedCount;
    }

    // ENTRY GATE (ADR-0043): refuse to generate when NO characters could be extracted
    // from the conversation. This is the concept-completeness signal — the characters
    // come from the user's chat concept (extracted above), and the parent scenario
    // builds the package from them. Zero extracted characters means the concept was
    // never finished: the "Victorian mansion - 32 Players" incident fired generation
    // ~100s after the assistant was still ASKING clarifying questions, so extraction
    // returned empty, the parent flagged master_context Part 1 "incomplete_context",
    // and the pipeline shipped placeholder junk ("Character A"–"E") marked completed.
    //
    // Keyed on the FULL extraction result (multi-locale regex + Claude fallback +
    // player-count cross-validation, all above) so it never false-refuses a real
    // concept in an odd format or a non-English header. Refuse BEFORE the Make.com
    // spend. Service/recovery callers (service-role bearer) bypass so an operator can
    // force a regeneration during triage.
    if ((!extractedCharacters || extractedCharacters.length === 0) && !isServiceCall) {
      console.warn(`[ConceptGate] Refusing generation for ${conversationId}: 0 characters extracted (method=${extractionMethod}) — concept not finished`);
      const needsMoreInfoStatus = {
        status: 'needs_more_info',
        progress: 0,
        currentStep: 'We need a bit more detail before we can build your mystery',
        error: 'concept_incomplete',
        resumable: true,
      };
      // Flag the package row so the UI shows the right state and monitoring can see it.
      await supabase
        .from("mystery_packages")
        .update({ generation_status: needsMoreInfoStatus, updated_at: new Date().toISOString() })
        .eq("conversation_id", conversationId);

      // 200 with success:false (not an HTTP error) so the client can distinguish a
      // "finish your concept" outcome from a real failure and message the user kindly.
      return new Response(
        JSON.stringify({
          success: false,
          reason: 'needs_more_info',
          message: "Your mystery concept isn't finished yet. Head back to the chat, answer the remaining question(s) so we have the occasion and a character list, then generate again.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Per-character chat excerpts: for each extracted character, bundle the chat
    // messages that mention them by name. The parent scenario passes a character's
    // excerpts to its child scenario so the child has the user's specific design
    // intent for that character — not just the one-line role description.
    //
    // Why: Fotini's "Multiverse" (May 19 2026) — she designed a 10-secret
    // bribe/riddle system for Klint across many messages. The child generating
    // Klint's sheet only received his one-line description from the parent, so
    // the riddle system was invented from scratch (and lost most of the design).
    //
    // Matching: case-insensitive word-boundary on each substantive name part
    // (first name, last name, nickname >= 3 chars). Misses implicit references
    // like "the witch's apprentice" — that's why Option 2 (full conversationContent
    // forwarded to child scenarios in Make.com) is the backup safety net.
    //
    // Size cap: 30KB per character (~7.5K tokens) — Haiku 4.5 has plenty of room
    // for that plus the standard child prompt; prefer most-recent messages since
    // they hold the most refined design decisions.
    const characterExcerpts: Record<string, string[]> = {};
    if (extractedCharacters && conversation.messages) {
      const MAX_EXCERPT_BYTES_PER_CHAR = 30000;
      for (const char of extractedCharacters) {
        const nameAliases = char.name
          .split(/[\s'’"]+/)
          .map((s: string) => s.replace(/[^\p{L}\p{N}]/gu, ''))
          .filter((s: string) => s.length >= 3);

        if (nameAliases.length === 0) {
          characterExcerpts[char.name] = [];
          continue;
        }

        const aliasPattern = new RegExp(
          `\\b(?:${nameAliases.map((a: string) => a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`,
          'i'
        );

        const matches: { content: string; role: string }[] = [];
        for (const msg of conversation.messages as any[]) {
          const content = msg.content || '';
          if (aliasPattern.test(content)) {
            matches.push({
              content,
              role: msg.role === 'assistant' || msg.is_ai ? 'AI' : 'User',
            });
          }
        }

        const excerpts: string[] = [];
        let totalBytes = 0;
        for (let i = matches.length - 1; i >= 0; i--) {
          const formatted = `${matches[i].role}: ${matches[i].content}`;
          if (totalBytes + formatted.length > MAX_EXCERPT_BYTES_PER_CHAR) break;
          excerpts.unshift(formatted);
          totalBytes += formatted.length;
        }

        characterExcerpts[char.name] = excerpts;
        console.log(`[Excerpts] ${char.name}: ${excerpts.length} messages (${totalBytes} chars) from ${matches.length} total matches`);
      }
    }

    // JSON-escape strings BEFORE handing to Make.com. Make.com's raw HTTP body
    // type doesn't auto-escape computed expressions (or substring()/get()
    // results) when substituting into a JSON template — only direct field
    // references with short content survive intact. Multi-line chat carries
    // literal LF, ", and \ that break the body JSON.
    //
    // Stacy "Moonlight Social Club" (Parent v36 first run): "Bad control
    // character at position 446" — unescaped LF in joined excerpts.
    // Stacy retry (Parent v37 with IML escape chain): "Expected ',' or '}'
    // at position 569" — IML's "\"" quote-escape didn't behave as expected,
    // leaving an unescaped " inside the value that closed the JSON string.
    //
    // Fix: pre-escape here and ship via NEW fields so the body template can
    // just substitute `{{...Escaped}}` without IML wrapping. The original
    // `characterExcerpts` and `conversationContent` fields are preserved for
    // any caller that still uses the raw form (e.g. the Master Doc Claude
    // prompt which substitutes conversationContent into prose, where literal
    // LF is desired).
    function jsonEscape(s: string): string {
      return s
        .replace(/\\/g, "\\\\")
        .replace(/"/g, "\\\"")
        .replace(/\n/g, "\\n")
        .replace(/\r/g, "\\r")
        .replace(/\t/g, "\\t");
    }
    const characterExcerptsEscaped: Record<string, string> = {};
    for (const [name, msgs] of Object.entries(characterExcerpts)) {
      characterExcerptsEscaped[name] = jsonEscape(msgs.join("\n---\n"));
    }
    const conversationContentEscaped = jsonEscape(conversationContent);

    // Build individual message fields for Make.com
    const messageFields: any = {};
    conversation.messages.forEach((msg: any, index: number) => {
      const msgNum = index + 1;
      messageFields[`message_${msgNum}_role`] = msg.role;
      messageFields[`message_${msgNum}_content`] = msg.content;
    });

    const webhookPayload = {
      // Put critical fields FIRST (before ...messageFields which can be 600+ fields)
      extractedCharacters: extractedCharacters ? JSON.stringify(extractedCharacters) : "[]",
      characterExcerpts: JSON.stringify(characterExcerpts),
      characterExcerptsEscaped: JSON.stringify(characterExcerptsEscaped),
      conversationContentEscaped,
      extractionMethod,
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4000,
      userId,
      userEmail,
      userName,
      language: languageName,
      conversationId,
      packageId,
      callback_domain: testMode ? "http://localhost:5173" : "https://www.mysterymaker.party",
      callback_url: testMode ? "http://localhost:5173/api/generation-complete" : "https://www.mysterymaker.party/api/generation-complete",
      environment: testMode ? "development" : "production",
      title: conversation.title || `Mystery - ${conversation.player_count} Players`,
      playerCount: conversation.player_count || null,
      theme: conversation.theme || null,
      scriptType: conversation.script_type || 'full',
      hasAccomplice: conversation.has_accomplice || false,
      mysteryStyle: conversation.mystery_style || 'character',
      mysteryType: conversation.mystery_type || 'murder',
      testMode,
      conversationContent,
      messages: conversation.messages.map((msg: any) => ({
        role: msg.role,
        content: msg.content
      })),
      message_count: conversation.messages.length,
      // Individual message fields last (can be 600+ fields for long conversations)
      ...messageFields,
    };

    console.log(`Sending simplified payload to webhook: ${webhookUrl}`);
    console.log(`Payload size: ${JSON.stringify(webhookPayload).length} characters`);

    // Check if webhook URL is configured
    if (!webhookUrl) {
      console.warn("No webhook URL configured in the environment. Cannot send webhook.");
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "No webhook URL configured in the environment"
        }),
        { 
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json" 
          },
          status: 400
        }
      );
    }

    // Send data to webhook with detailed logging
    console.log("About to send request to webhook URL");
    const webhookResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(webhookPayload),
    });

    // Log webhook response status
    console.log(`Webhook response status: ${webhookResponse.status}`);

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text();
      console.error(`Webhook returned error: ${webhookResponse.status}`, errorText);
      throw new Error(`Webhook request failed with status ${webhookResponse.status}: ${errorText}`);
    }

    // Parse webhook response data
    let responseData;
    const contentType = webhookResponse.headers.get('content-type');
    try {
      if (contentType && contentType.includes('application/json')) {
        responseData = await webhookResponse.json();
        console.log("Webhook response data:", responseData);
      } else {
        const textResponse = await webhookResponse.text();
        console.log("Webhook text response:", textResponse);
        responseData = { rawResponse: textResponse };
      }
    } catch (error) {
      console.warn("Error parsing webhook response:", error);
      responseData = { error: "Could not parse response" };
    }

    // Update conversation to mark it as processed
    const { error: updateError } = await supabase
      .from("conversations")
      .update({
        webhook_sent: true,
        webhook_sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", conversationId);

    if (updateError) {
      console.error("Error updating conversation:", updateError);
    } else {
      console.log("Successfully marked conversation as processed");
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Webhook successfully triggered",
        webhookResponse: responseData
      }),
      { 
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json" 
        } 
      }
    );
  } catch (error) {
    // Surface the actual error message + stack to the function logs so future
    // bugs are debuggable. The May 19 2026 Fotini outage cost ~30 min of triage
    // because the previous generic "An error occurred processing your request"
    // hid a TypeError null-deref. Return the message to the caller too — the
    // frontend already strips it from user-facing UI, so this is staff-debug
    // info, not user-leaked data.
    const errMessage = error instanceof Error ? error.message : String(error);
    const errStack = error instanceof Error ? error.stack : undefined;
    console.error("[mystery-webhook-trigger] Unhandled exception:", {
      message: errMessage,
      stack: errStack,
    });

    return new Response(
      JSON.stringify({
        success: false,
        error: errMessage,
        errorType: error instanceof Error ? error.name : "Unknown",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
