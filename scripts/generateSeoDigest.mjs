/**
 * Weekly SEO/GEO Digest Generator
 *
 * Reads temp-files/seo-weekly-snapshot.json and asks Claude (Opus 4.8) to turn it
 * into an emailed digest: a scoreboard, ranked insights, and — the whole point —
 * numbered, copy-paste-ready ACTION PROMPTS the user pastes into fresh chats.
 *
 * Output:
 *   - temp-files/seo-digest.html         (email body, consumed by send-seo-digest)
 *   - docs/seo-digests/<YYYY-MM-DD>.html (committed history)
 *
 * Auth: ANTHROPIC_API_KEY (env). See ADR-0018.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SNAPSHOT_PATH = join(__dirname, '../temp-files/seo-weekly-snapshot.json');
const EMAIL_OUT = join(__dirname, '../temp-files/seo-digest.html');
const HISTORY_DIR = join(__dirname, '../docs/seo-digests');

const MODEL = 'claude-opus-4-8';
const API_KEY = process.env.ANTHROPIC_API_KEY;

// --- Stable business brief (edit here when positioning changes) ----------------
const BUSINESS_BRIEF = `
SITE: mysterymaker.party — an AI tool that generates printable murder mystery party kits.
PRIMARY METRIC: qualified organic + AI-referral traffic that converts to package generations / paid.
MONEY PAGES: the generator/create flow, theme landing pages, and the blog hub (drives top-of-funnel).
PRIMARY BUYER QUERIES: "murder mystery party kit", "murder mystery generator", "murder mystery for N guests",
  "custom murder mystery party", "corporate/office murder mystery", "free murder mystery game".
LANGUAGES: 13 (en primary for this report unless a non-en query is clearly surging).
WHAT "AN ACTION" MEANS: a concrete on-page, linking, or content change shippable this week. The RIGHT
  action depends on the diagnosed lever (see LEVER DIAGNOSIS below) — an internal-link/authority push, a
  title/meta rewrite, a new/expanded page for a rising query, schema, or a blog post. Do not default to
  "title/meta rewrite"; that was the mistake three digests in a row (CHANGELOG 2026-07-27).

CANONICALIZED / CONSOLIDATED PAGES (do not recommend links or copy rewrites against these without checking):
- EN /custom-murder-mystery-party/ is rel=canonical → the homepage / (ADR-0046, 2026-07-27). GSC will keep
  reporting impressions/position for this URL for a while after the change (crawl lag), which can make it
  LOOK like a page worth linking to — it is not. If a quickWins item's rankingPage is this URL, retarget any
  "links" or "both" recommendation to the HOMEPAGE (/) instead, using the same query-matched anchor text.
  Never propose a title/meta rewrite for the custom page itself — it isn't meant to rank independently.
- Homepage title/meta is a settled decision, not an open lever: it already leads with "Custom Murder
  Mystery Party Kits in Minutes" and keeps the "| Mystery Maker" brand suffix per ADR-0024 and ADR-0046 §3
  ("no change needed or wanted"). Do not propose rewriting or A/B-testing the homepage title/meta — including
  brand-first variants — unless new evidence contradicts ADR-0046 specifically (not just a CTR-gap number,
  since the brand suffix's position within the title was already litigated there). The lever for homepage
  under-clicking on branded terms is authority/internal-links, not copy.
`.trim();

const SYSTEM_PROMPT = `
You are the weekly SEO/GEO growth analyst for mysterymaker.party. You receive a JSON snapshot of
Google Search Console (week-over-week), GA4 traffic, and AI-referral traffic (the GEO/AEO signal:
sessions from chatgpt.com, perplexity.ai, etc.). Produce a single self-contained HTML email body.

${BUSINESS_BRIEF}

LEVER DIAGNOSIS (the whole point — pick the right fix, not always copy):
Each snapshot quickWins[] item carries a diagnosed "lever" plus expectedCtr, ctrGap, and rankingPage.
Two independent axes decided it: CTR-vs-expected-for-its-position (a COPY/appeal signal) and rank band
(an AUTHORITY signal). Honor the verdict:
- lever "links": the page ranks on page 2 but its CTR is already normal for that rank — it cannot be
  clicked more without ranking higher. The action is INTERNAL LINKS / AUTHORITY, never a copy rewrite.
  Name rankingPage as the target, name 1–2 specific high-authority source pages that should link to it,
  and specify descriptive anchor text built from the target query. Do NOT propose a title/meta rewrite.
- lever "copy": the page ranks on page 1 but under-clicks for its position. Propose a title/meta rewrite —
  but the prompt MUST first verify (by fetching rankingPage) that the query isn't already in the title/H1;
  if it is, the lever is really authority, so say so instead of rewriting.
- lever "both": page 2 AND under-clicking — recommend the internal-link/authority push as the primary
  move and the copy rewrite as secondary.
- Trust ctrGap over instinct: a page-1 result with a large negative ctrGap IS a copy opportunity (copy can
  matter on page 1); a page-2 result with ctrGap near zero is NOT — it needs links.

HARD RULES:
- IGNORE obviously off-topic / spam / scraper queries (e.g. unrelated non-English prompt-injection
  strings, queries with nothing to do with murder mystery parties). Do not surface them as opportunities.
- IGNORE query-shape bot signals even when the topic is on-brand. Any quickWins/risingQueries item with
  suspiciousQueryShape: true has a literal quote character in the query text — real people essentially
  never type quote marks into a search box, and a CLUSTER of these sharing permuted quoted-phrase
  fragments (e.g. "guide to" + "murder mystery" + "x", or the same fragments suffixed "series"/"show")
  is a strong tell of scripted/bot query generation, not organic demand — confirmed 2026-08-10/11 when a cluster that
  looked like a surging, page-1, 0-click content opportunity turned out to be ~20 quote-permuted variants
  with zero clicks across every one. Do not propose a new page, section, or rewrite chasing a cluster
  dominated by suspiciousQueryShape items. If it's worth a line at all, mention it as "likely bot traffic,
  not a content opportunity" in Insights — never as an Action prompt.
- Never invent numbers. Use only what's in the snapshot. If a section has an error, say so briefly.
- Prefer 3 sharp actions over 10 vague ones. Rank by effort-to-impact (easy wins first).
- The action prompts are the product. Each must be complete and self-contained — include the exact
  target URL/query, the specific change, and the goal — so it can be pasted into a fresh Claude chat
  and executed with no extra context.
- NEVER write a literal HTML tag inside a <pre> action-prompt block (e.g. do not write <title> or
  <meta>). Say "title tag" / "meta description" in prose instead. A stray <title> in an email body
  makes clients treat the rest as document metadata and silently truncate everything after it.

OUTPUT: valid HTML for an email body (no <html>/<head>, just the body markup). Use this structure:
1. <h2>Scoreboard</h2> — a compact <table> of this week vs last week (organic clicks, impressions,
   avg position, GA4 sessions, AI-referral sessions). One sentence of plain-English "what moved and why it matters".
2. <h2>Insights</h2> — 3–6 <li> items, each a specific finding with the supporting number, ranked by traffic impact.
3. <h2>Action prompts</h2> — for each insight worth acting on, a numbered block with a copy-paste prompt
   inside a <pre style="white-space:pre-wrap;background:#f4f1ea;padding:12px;border-radius:6px;">…</pre>.
   Order easy-wins first. Title each with the effort/impact AND the lever (e.g. "1. Quick win — internal
   links to rank X" or "2. Quick win — rewrite title for Y"), matching the diagnosed lever from the snapshot.
4. <h2>Site health</h2> — ONLY if the snapshot has a "siteHealth" block. Three short lines:
   (a) Dead internal links: report siteHealth.deadInternalLinks. This should be 0. If it is 0, say so plainly
       (e.g. "Dead internal links: 0 ✓"). If it is >0, this is a REGRESSION — show the count in bold red
       (<strong style="color:#b00;">), list the top deadLinkTargets (slug × linkedFrom), and add a matching
       action prompt to publish those drafts or remove the links.
   (b) Publish queue: "siteHealth.publishedEn live, siteHealth.draftsEn drafts remaining" — note if drafts are
       draining week-over-week (you won't have last week's number; just state the current standing).
   (c) Next up by link-graph importance: list siteHealth.nextUpByImportance (slug + importance) — the posts the
       daily cron will publish next (highest-value first, per ADR-0021).
   If siteHealth is absent or errored, omit this section entirely.
Keep it skimmable. No preamble before the first <h2>. No closing sign-off.
`.trim();

// --- Date-gated reminders -------------------------------------------------------
// Self-expiring nudges injected at the top of the digest during a date window, for
// "come back and measure the effect of change X once it's had time to land" — the
// kind of follow-up that otherwise gets forgotten (scheduled routines here don't
// reliably surface to the user, but this weekly email does). Each carries a
// paste-ready prompt that re-derives from ground truth. Delete an entry once acted
// on, or let it lapse after `end` (inclusive). Dates are 'YYYY-MM-DD' (UTC).
const REMINDERS = [
  // RETIRED 2026-09-07: the ADR-0046 canonical-consolidation reminder that lived
  // here is closed out. Third ground-truth read (30/30 post-days, no longer thin)
  // confirmed the consolidation is working and still strengthening: homepage pos
  // "custom murder mystery game" 9.9→5.2, "custom murder mystery party" 14.0→5.3,
  // custom page's impressions on both terms now falling. The one loose end from
  // the 2026-08-31 read (the "game" query's custom-page impressions weren't
  // falling yet) resolved this read. Italian guardrail clean w.r.t. this ADR
  // (its separate, already-closed impression-collapse issue is unrelated and
  // predates ADR-0046 by 3 weeks). Full verdict: docs/adr/0046-en-custom-page-
  // canonical-to-homepage.md Addendum (2026-09-07). Not re-adding this reminder —
  // revisit only if the trend reverses, which would be a new incident, not a
  // continuation of this one.
  {
    // Second measurement of the Night of Mystery comparison post, published
    // 2026-07-22 in all 13 languages to intercept the buyer-intent query
    // "night of mystery reviews" (pre-publish site baseline: 21 impr/week at
    // position 9, 0 clicks — some OTHER page of ours was ranking for it).
    //
    // RESULT 2026-08-17 (first measurement, ~4 weeks post-publish, ground-truth
    // GSC/GA4 pull — full working notes: vault 00_INBOX/night-of-mystery-post-
    // measurement-2026-08-17-mystery-maker.md): negative on every axis measured,
    // though sample sizes are thin enough that this isn't yet conclusive.
    // - Ranking page for "night of mystery reviews" is STILL the old generalist
    //   page (/blog/best-murder-mystery-party-games-review/), not this post — and
    //   that old page's position for the query got WORSE after this post launched
    //   (pos ~8.9 pre-publish -> ~17.7 post-publish; 43 impr/3wk -> 7 impr/3.5wk).
    // - Halo query set (review, alternative(s), vs, worth it) never materialized:
    //   ~0 impressions in both pre- and post-publish windows.
    // - The post itself: ~1 total search impression in ~3.5 weeks, ~1 GA4 session
    //   (direct), 0 AI-referral sessions.
    // - Indexation confirmed fine (URL Inspection: submitted+indexed, no crawl
    //   issues) — ruled out as the explanation.
    // - FAQPage schema present in raw HTML, but Rich Results inspection only
    //   detects Breadcrumbs — no FAQ rich result being granted; undiagnosed
    //   whether that's a validation issue or a "too new" gate.
    // Window below re-opens ~8 weeks post-publish for a firmer read before any
    // "not worth further investment" call — 4-week numbers are too small to trust
    // alone, but the regression on the target query is a real signal, not just an
    // absence of one.
    start: '2026-09-14',
    end: '2026-09-30',
    title: 'Re-check the Night of Mystery comparison post — first read (Aug 17) was negative but thin-sample',
    body:
      'First ground-truth measurement (2026-08-17, ~4 weeks post-publish) was negative on every axis: the target query ' +
      '<strong>"night of mystery reviews"</strong> still ranks on the OLD generalist review page, not this post, and that ' +
      'old page\'s position for the query got <em>worse</em> after this post launched (pos ~8.9 → ~17.7). The halo query ' +
      'set never materialized, the post itself has ~1 total search impression and ~1 GA4 session since publish, and its ' +
      'FAQPage schema (present in source) isn\'t earning a rich result. Sample sizes are too thin (7 impressions) to call ' +
      'this final — paste the prompt below into a fresh chat now that ~8 weeks of data exist.',
    prompt: `Re-check whether the Night of Mystery comparison post is capturing its target query, now that ~8 weeks of post-publish data exist. Published 2026-07-22: /blog/night-of-mystery-vs-custom-ai-murder-mystery-kit (13 languages, FAQPage schema in source, inbound link from /blog/best-murder-mystery-games-2026 confirmed present in live content). Re-derive everything fresh from Google Search Console/GA4 — assume problems, default to flagging; do not trust this note's numbers or the 2026-08-17 first-read numbers below, they are priors only.

0. PRIOR (2026-08-17, ~4 weeks post-publish, do not trust — re-derive): ranking page for "night of mystery reviews" was still /blog/best-murder-mystery-party-games-review/, not this post; that old page's position for the query worsened post-publish (~8.9 → ~17.7, 43 impr/3wk pre → 7 impr/3.5wk post); halo query set (review, alternative(s), vs, worth it) was ~0 impressions in both windows; the post itself had ~1 total search impression and ~1 GA4 session since publish; indexation confirmed fine via URL Inspection API; FAQPage schema present in raw HTML but Rich Results inspection only detected Breadcrumbs, no FAQ rich result granted.
1. Site baseline to re-verify: which URL now ranks for "night of mystery reviews"? If still not this post, that's now a persistent relevance/cannibalization problem, not early-days noise — flag it plainly.
2. Pull query-level data for "night of mystery reviews" plus the halo set: "night of mystery review", "night of mystery alternative(s)", "night of mystery vs", "is night of mystery worth it". Compare the full 8-week post-publish window against the original ~3-week pre-2026-07-22 baseline: impressions, clicks, CTR, avg position, ranking page.
3. Pull page-level data for /blog/night-of-mystery-vs-custom-ai-murder-mystery-kit (all queries, use both the trailing-slash and non-trailing-slash URL to be safe): what's it pulling in now vs. the ~1-impression prior? Any AI-answer/LLM referral traffic (GA4 fetch-ai-referrals) attributable to it?
4. Re-check the FAQ rich result via the URL Inspection API's richResultsResult.detectedItems (not just a raw grep for the schema) — is it still absent, or has it started appearing now that the page has more crawl history?
5. Verdict: if the picture is still flat/negative at 8 weeks, treat this per the original decision framework — query volume that never materialized reads as "not worth further investment," and don't spend more effort on internal links to this specific post (it's indexed, linked, and in the sitemap already — discovery isn't the bottleneck). If it has turned around, say so plainly and identify what specifically moved.`,
  },
  {
    // Not an SEO item — riding along on this digest because it's the one
    // recurring channel that reliably reaches Jonathan (scheduled routines
    // don't). PostHog only started actually capturing production events on
    // 2026-08-22 (ADR-0102) — before that, VITE_POSTHOG_KEY was never wired
    // into the site's real GitHub Pages deploy pipeline at all, so
    // posthog.init() silently no-op'd on every page load since the
    // integration was first written 2026-04-24 (see ADR-0100, superseded).
    // Anything timestamped before 2026-08-22 does not exist in PostHog.
    //
    // Two known ground-truth dates to spot-check the method against once
    // there's enough real data (both from Jonathan directly, 2026-08-22):
    // - Raleigh, "Camp Pine Shadow" — hosted Sat 2026-08-15. Predates the
    //   fix by a week, so expect ZERO PostHog signal for this one; useful
    //   as a null-check that the method doesn't hallucinate a play date
    //   where there's no data, not as a positive example.
    // - Lyn, "The Cognitive Dissonance Incident: A Murder At The MSU
    //   Psychology Department Picnic" — she was sending links to her guests
    //   the same day the fix went live (2026-08-22), so this one's a coin
    //   flip depending on whether her guests opened pages before or after
    //   the fix's deploy time that day.
    start: '2026-10-06',
    end: '2026-10-27',
    title: 'Check whether there is enough PostHog data yet for the purchase-to-play timing analysis',
    body:
      'On <strong>2026-08-22</strong> (ADR-0102) we fixed PostHog actually capturing production events — before that, ' +
      'the tracking code existed but the live GitHub Pages deploy never had the API key wired in, so it silently did ' +
      'nothing since the integration was written back in April. It has now had 6-8 weeks to accumulate real ' +
      '<code>package_tab_viewed</code>/pageview data. Paste the prompt below into a fresh chat to check whether ' +
      'there is enough volume yet to attempt the purchase-to-play timing analysis (using character/Host Guide page ' +
      'view clustering and dwell time as a proxy for when a mystery actually gets played, vs. purchase_date).',
    prompt: `Check whether there is now enough PostHog data to attempt a "time from purchase to actual play" analysis for Mystery Maker, and if so, run a first pass.

Context (re-derive from ground truth, do not trust this note's framing alone): PostHog only started genuinely capturing production events on 2026-08-22 (ADR-0102, docs/adr/0102-posthog-key-missing-from-actual-deploy-pipeline.md) — before that date, VITE_POSTHOG_KEY was never wired into the site's actual GitHub Pages deploy pipeline (.github/workflows/deploy.yml), so posthog.init() silently no-op'd on every page load despite the client-side integration existing since 2026-04-24 (ADR-0100, superseded — its "4 months of lost history" framing was probably never real history to begin with). PostHog project id 569867 ("Mystery Maker"), events fired from src/lib/posthog.ts / src/lib/analytics.ts: \`$pageview\` (every route change) and \`package_tab_viewed\` (tab_name, conversation_id when available).

0. SAMPLE SIZE CHECK FIRST: query PostHog for the count of \`package_tab_viewed\` events with a non-null conversation_id, grouped by conversation_id, for events after 2026-08-22. How many distinct packages have ANY tab-view data at all? If it's a handful (under ~15-20), say so plainly and recommend waiting longer rather than drawing conclusions from too few packages — don't force a verdict out of thin data.
1. THE ACTUAL METHOD, if there's enough volume: for each package with tab-view events, join to Supabase's mystery_packages.purchase_date (or conversations table, check both — see the round-script-formats and payment-protection memory notes for which table is authoritative). For each package, look at the FULL set of tab-view/pageview timestamps across ALL its characters (not just one), not just the first one. The actual play-night signal is: do multiple distinct characters' pages get opened within a tight time window (e.g. same 1-3 hour block) with meaningful dwell time between events (not just a bounce), as opposed to scattered single visits over days? That clustering is the "this is when they actually sat down and played" signal, distinct from "the host poked around once right after purchase." Compute, for packages where a clear cluster exists: (purchase_date) to (start of the clustered play session) as the lag, in days.
2. SPOT-CHECK against two known ground-truth dates (both told to Jonathan directly on 2026-08-22, verify independently against the packages table rather than trusting this note):
   - Raleigh, "Camp Pine Shadow" — hosted Sat 2026-08-15, a full week BEFORE the PostHog fix. Expect ZERO PostHog data for this package. If there IS data, something is wrong with the date assumption above — flag it, don't explain it away.
   - Lyn, "The Cognitive Dissonance Incident: A Murder At The MSU Psychology Department Picnic" — guests were sent links same-day as the fix (2026-08-22). Check if there's a real, plausible clustered signal for this one; if the timing is too close to the fix's deploy time to tell, say so rather than forcing an answer.
3. Verdict: is there a usable purchase-to-play average yet, even a rough one from a small n? If under ~15-20 packages with real data, recommend re-running this same check again in another 3-4 weeks rather than publishing a number from too small a sample.`,
  },
  {
    // Found 2026-08-24 while acting on the digest's homepage-authority action
    // prompt (verification step: "confirm the H1/above-fold copy already
    // surfaces custom murder mystery party/game intent"). It doesn't: hero.title
    // i18n key = "Create Murder Mystery Parties in Minutes" — no "custom" at
    // all. hero.subtitle has "custom mysteries" but not the exact buyer phrase.
    // Only home.seo.title (the <title>/meta, locked by ADR-0024/0046) carries
    // "Custom Murder Mystery Party Kits in Minutes". The H1 itself was never
    // part of that lock — it's open territory, just never flagged before.
    // Deliberately NOT changed this session (out of scope for a links-only
    // pass) — this is a decision for Jonathan, not an automatic action.
    //
    // DECIDED 2026-08-31: leave it as-is, re-check later. Title/meta already
    // carries "custom murder mystery party" and it's working — the homepage
    // gained 5+ ranking positions on both head terms in the 5 weeks since
    // ADR-0046 without touching the H1 (see the ADR-0046 reminder's RESULT
    // above). Revisit only if that progress stalls. Reminder closed — not
    // re-showing.
    start: '2026-08-24',
    end: '2026-08-24',
    title: 'Homepage H1 does not contain "custom" — decide whether to update it',
    body:
      'Verifying the homepage-authority action prompt turned up a gap the digest assumed away: the H1 ' +
      '(<code>hero.title</code>, "Create Murder Mystery Parties in Minutes") does not contain "custom" at all, and the ' +
      'subtitle only has "custom mysteries" — not the exact "custom murder mystery party/game" buyer phrase. Only the ' +
      '<code>&lt;title&gt;</code>/meta (locked by ADR-0024/0046) carries it. The H1 itself was never part of that lock. ' +
      'Decide whether it is worth updating, or whether the meta + internal-link anchors already carry enough signal.',
    prompt: `Decide whether Mystery Maker's homepage H1 should be updated to include "custom murder mystery party/game" buyer-intent language.

Context (re-derive from ground truth, don't trust this note alone): the H1 lives at src/i18n/locales/en.json under hero.title = "Create Murder Mystery Parties in Minutes", rendered in src/components/Hero.tsx. The <title>/meta (home.seo.title/description) already carry "Custom Murder Mystery Party Kits in Minutes" and are locked per ADR-0024 and ADR-0046 §3 — do NOT propose changing those. The H1 was never part of that lock; it's a separate, open decision.

1. Pull current GSC data for "custom murder mystery game" and "custom murder mystery party" on the homepage (page-level breakdown, same method as the ADR-0046 reminder above) — what's the current position/CTR?
2. Weigh the case for changing the H1: would surfacing "custom" in the H1 plausibly help ranking/relevance on top of what the title/meta already do, or is that redundant once title/meta already lead with it? Consider whether an H1 change risks anything (brand voice, existing A/B assumptions, the "Create Murder Mystery Parties in Minutes" phrasing possibly targeting a different, broader intent than "custom").
3. If a change looks worth it, propose exact new H1 copy (a few options) rather than assuming any one direction. If not, say so plainly and close this out — don't manufacture a change for its own sake.`,
  },
  {
    // Published 2026-09-05 (de) through 2026-09-08 (zh-cn/ko/ja + the remaining
    // 8: es/fr/it/pt/nl/da/sv/fi) — a new "meta" content type, distinct from the
    // ~40-190-per-locale templated murder-mystery-specific posts. All 12 non-EN
    // locales share one slug, alternative-party-ideas-by-culture, each with
    // GENUINELY DIFFERENT hand/agent-researched content (not translations of
    // each other) positioning a custom murder mystery as one honest option
    // among real local alternatives — cross-linked via hreflang on the shared
    // slug (confirmed working: de page correctly links all 11 other locales).
    // No EN version exists by design.
    //
    // Inserted directly into Supabase (status='published') OUTSIDE the normal
    // blog_map.xlsx / pick-next-draft.mjs pipeline, since this was one-off
    // hand-vetted content, not a templated topic. That matters for this
    // check: the normal daily-publish pipeline auto-applies cross-links from
    // OTHER posts to a newly-published slug (apply-crosslinks.mjs) as part of
    // its own publish step. This post never went through that step, so as far
    // as I know it likely has ZERO inbound internal links from any of the
    // other ~190-per-locale posts — re-derive and confirm, don't assume either
    // way. If true, that's a real authority/discovery gap worth closing
    // (candidate targets: the "themed-party-ideas-for-adults" post in each
    // locale, and any escape-room/format-comparison posts, are natural
    // linking sources — but confirm via the actual cross_link_map.json /
    // content, don't just guess).
    //
    // Deploy + prerender confirmed live and correct at time of publish (all
    // 12 URLs returned HTTP 200 with correct title/meta/hreflang after
    // deploy.yml run 34276296170). IndexNow (Bing) accepted all 12 URLs same
    // day. GSC sitemap ping was attempted but failed locally on a permission
    // error (likely wrong local credential, not a live problem — see vault
    // note) — Google's own indexing timeline was never independently confirmed.
    start: '2026-09-23',
    end: '2026-10-07',
    title: 'Check indexing/early ranking on the new "alternative party ideas by culture" post series (12 locales)',
    body:
      'Twelve non-EN locale versions of a new post type (real per-culture alternative-party-format comparisons, custom ' +
      'murder mystery positioned honestly alongside local alternatives) went live 2026-09-05 to 2026-09-08, all sharing ' +
      'the slug <code>alternative-party-ideas-by-culture</code>. IndexNow (Bing) accepted all 12 URLs immediately, but ' +
      'Google indexing was never independently confirmed — GSC sitemap submission failed locally on a credential error. ' +
      'This was also inserted outside the normal publish pipeline, so it may have zero inbound internal links from other ' +
      'posts (the pipeline\'s auto-cross-linking step never ran for it). Two weeks is enough time to check indexing ' +
      'status properly; enough for early ranking signal is a stretch but worth a first look.',
    prompt: `Check indexing and any early ranking/traffic signal for the new "alternative party ideas by culture" post series, and check whether it has any inbound internal links. Re-derive everything from ground truth (Supabase, GSC, GA4, live site) — do not trust this note's dates or claims, they are priors only.

0. GROUND TRUTH ON WHAT WAS PUBLISHED: query Supabase blog_posts where slug='alternative-party-ideas-by-culture' — confirm which languages exist, their actual published_at timestamps, and status. Prior claims to verify: 12 locales (de, es, fr, it, pt, nl, da, sv, fi, ko, ja, zh-cn), published 2026-09-05 (de) to 2026-09-08 (the rest), all status='published', no 'en' row exists (by design).

1. INDEXING STATUS (primary goal — 2 weeks is enough time for this even if not for ranking): for each of the 12 locale URLs (https://www.mysterymaker.party/{lang}/blog/alternative-party-ideas-by-culture/), use the GSC URL Inspection API to check indexing status. Report how many of the 12 are indexed vs. not, and for any not indexed, what reason GSC gives (crawled-not-indexed, discovered-not-indexed, etc.).

2. INTERNAL LINKS CHECK: this post was inserted directly into Supabase, bypassing the normal daily-publish pipeline's apply-crosslinks.mjs step (which auto-links newly-published slugs from other posts per cross_link_map.json). Check whether alternative-party-ideas-by-culture actually has any inbound internal links from other blog posts in any locale — grep the live prerendered HTML of a sample of other posts per locale, or check cross_link_map.json for whether this slug appears as a link target anywhere. If it has zero or near-zero inbound internal links, flag that plainly as a likely reason for slow indexing/authority, and suggest 2-3 natural linking candidates per locale (e.g. that locale's "themed party ideas" or escape-room comparison post) rather than proposing a blanket fix.

3. EARLY SIGNAL (bonus, don't over-read into 2-3 weeks of data): pull GSC performance data (impressions/clicks/position) for each of the 12 URLs since publish. Also check GA4 for any sessions landing on these URLs, and note the traffic source (organic search, direct, referral — especially any AI-answer-engine referral pattern if that's tracked). Given the short window, frame any numbers as "too early to be conclusive" rather than a verdict — the goal here is confirming discovery is happening, not judging whether the content strategy worked.

4. VERDICT: is this series being discovered and indexed normally, or is something (missing internal links, a crawl issue, the rot-signal-style gate that gap-checks other locales) holding it back? If discovery looks fine, say so plainly and don't manufacture concern. If not, be specific about which locales and why.`,
  },
];

// Safety net: neutralise any literal HTML tags the model leaves inside <pre>
// action-prompt blocks. A stray <title>/<meta> in an email body makes many
// clients (Proton included) treat the rest as document metadata and truncate
// everything after it — this bit the 2026-07-06 send. Escaping only < and >
// (not &) fixes literal tags without double-encoding existing &lt;/&amp; entities.
function escapePreTags(html) {
  return html.replace(/<pre([^>]*)>([\s\S]*?)<\/pre>/g, (_m, attrs, inner) => {
    const safe = inner.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `<pre${attrs}>${safe}</pre>`;
  });
}

function renderReminders(today) {
  return REMINDERS
    .filter((r) => today >= r.start && today <= r.end)
    .map(
      (r) =>
        '<div style="border:1px solid #d9b310;background:#fffbe6;border-radius:6px;padding:12px 14px;margin:0 0 18px;">' +
        `<p style="margin:0 0 6px;font-weight:600;color:#7a5c00;">📌 Reminder — ${r.title}</p>` +
        `<p style="margin:0 0 10px;font-size:14px;color:#444;">${r.body}</p>` +
        `<pre style="white-space:pre-wrap;background:#f4f1ea;padding:12px;border-radius:6px;font-size:13px;margin:0;">${r.prompt}</pre>` +
        '</div>'
    )
    .join('');
}

async function main() {
  if (!API_KEY) {
    console.error('Missing ANTHROPIC_API_KEY');
    process.exit(1);
  }
  const snapshot = readFileSync(SNAPSHOT_PATH, 'utf8');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 12000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content:
            'Here is this week\'s snapshot JSON. Produce the HTML email body per your instructions.\n\n' +
            snapshot,
        },
      ],
    }),
  });

  if (!res.ok) {
    console.error(`Anthropic API ${res.status}: ${await res.text()}`);
    process.exit(1);
  }

  const data = await res.json();
  const html = (data.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();

  if (!html) {
    console.error('Empty digest from model');
    process.exit(1);
  }

  // date stamp (YYYY-MM-DD)
  const today = new Date().toISOString().split('T')[0];
  const wrapped =
    `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:680px;margin:auto;color:#222;">` +
    `<p style="color:#666;font-size:13px;">SEO/GEO digest — week ending ${today} · mysterymaker.party</p>` +
    renderReminders(today) +
    escapePreTags(html) +
    `</div>`;

  writeFileSync(EMAIL_OUT, wrapped);
  mkdirSync(HISTORY_DIR, { recursive: true });
  writeFileSync(join(HISTORY_DIR, `${today}.html`), wrapped);

  console.log(`Digest written: ${EMAIL_OUT}`);
  console.log(`History: docs/seo-digests/${today}.html`);
  console.log(`Tokens: in=${data.usage?.input_tokens} out=${data.usage?.output_tokens}`);
}

main().catch((e) => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
