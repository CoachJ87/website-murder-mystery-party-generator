# 0046 — Consolidate EN "custom murder mystery" intent onto the homepage via rel=canonical

- **Status:** Accepted
- **Date:** 2026-07-27

## Context

GSC (page-level, 28-day window ending 2026-07-26, re-derived from ground truth,
not from a prior session's numbers) shows the homepage `/` and the EN
`/custom-murder-mystery-party/` page competing for the same head terms — and the
homepage winning decisively:

| Query | Homepage `/` | EN `/custom…/` |
|---|---|---|
| custom murder mystery **game** | **pos 9.6**, 180 impr, 6 clk | pos 50.5, 73 impr, 0 clk |
| custom murder mystery **party** | **pos 13.9**, 157 impr, 0 clk | pos 66.7, 106 impr, 0 clk |
| custom murder mystery | **pos 3.6**, 14 impr, 3 clk (21% CTR) | pos 23, 2 impr, 0 clk |

The EN custom page's **entire** 90-day footprint across all 22 queries it surfaces
for is **343 impressions and 1 click**. It ranks 50–66 for its own head terms and
otherwise appears only as a *secondary* listing on generator/branded queries the
homepage already owns ("murder mystery maker", "mystery maker", "murder mystery
generator"). It has no independent SEO equity to protect.

Two of our own commits had been optimizing **both** pages for the identical intent,
working against each other:

- `2b500c6` — *"lead homepage title/meta with 'Custom' not 'Printable'"* — moved the
  homepage title off ADR-0024's branded "Printable Murder Mystery Kits" onto
  **"Custom Murder Mystery Party Kits in Minutes | Mystery Maker"** (brand kept as
  suffix). This is why the homepage ranks 9–14 for the custom head terms. It means
  **ADR-0024's premise that the homepage title is branded-only is now stale** — the
  homepage already leads with the custom terms and still earns the branded rank via
  the suffix.
- `4552cb4` — same 2026-07-27 session, ~2h later — stuffed the *custom page's*
  H1/title/intro with the **same two phrases**, trying to pull *it* onto page 1.

So the site was splitting one intent across two URLs; the homepage wins and the
custom page dilutes the signal while landing buyers one click further from the
generator (`/mystery/create`).

## Decision

Consolidate the EN "custom murder mystery party/game" intent onto the homepage,
which already ranks and converts for it.

1. **`rel=canonical` from EN `/custom-murder-mystery-party/` → the homepage `/`**,
   EN-only. The page stays live (its CTA funnel to `/mystery/create` is unaffected);
   `rel=canonical` hands EN's ranking signals to the winner instead of splitting them.
   `og:url` continues to point at the page's own URL (correct for social shares of
   the page); only `rel=canonical` consolidates.
2. **Undo `4552cb4`'s keyword-stuffing** in `en.json customParty.*` (EN only): revert
   `seo.title`, `seo.description`, `hero.h1`, `hero.intro`, and `midCta` to their
   immediate pre-`4552cb4` values, removing the awkward double exact-match phrasing so
   the two pages stop signalling the same intent for human readers too. With the
   canonical in place this is secondary (Google consolidates regardless of copy), but
   it ends the awkward H1 and keeps the two pages from re-competing if the canonical
   is ever removed.
3. **Homepage title untouched** — it already leads with the custom terms and keeps the
   `| Mystery Maker` brand suffix; no change needed or wanted (respects the intent of
   ADR-0024's brand-suffix rule).

### hreflang handling — deliberate minimal-blast-radius choice

EN `/custom` is `x-default` and the hub of the 13-language hreflang cluster. A
cross-page canonical technically conflicts with hreflang membership (a canonicalized
URL should not be in an hreflang set). The clean-in-theory fix — repoint the `en` and
`x-default` alternates to the homepage everywhere — would require **editing the tags
emitted on the 12 non-EN pages**, which risks the load-bearing Italian corporate
ranking (~pos 3, ADR-0020/0040) during re-crawl and violates the EN-only constraint.

We deliberately **leave hreflang emission untouched**. Reciprocity is preserved (every
page still lists every other, EN included); only EN's *canonical* differs, which Google
resolves per-URL: EN `/custom` consolidates to the homepage while the 12 non-EN pages
remain canonical and independently clustered. The worst case is a cosmetic
"canonical points to a different URL" note on the single EN entry in GSC's
International Targeting report — it does not deindex or derank the non-EN pages, whose
canonicals are self-referential and unchanged. Protecting the non-EN cluster dominates
a cosmetic hreflang note on one URL.

## Rationale

- **Ranks better:** homepage, by 40–53 positions on every head term. Not close.
- **Converts better:** the homepage *is* the generator — one click to `/mystery/create`,
  matching the same-session-buying sales signal. The custom page is an extra hop.
- **Cost of the reverse (strengthen the custom page):** enormous and pointless —
  dragging a 50th-place, zero-authority, client-rendered page up to overtake a page-1
  winner, to land buyers one click further from checkout.
- **Canonical, not 301:** keeps the page live for its `/mystery/create` funnel and any
  direct/nav traffic, and is far less risky to the hreflang cluster than a redirect.

## Alternatives considered

- **Re-angle the EN custom page to a distinct long-tail** (keep it an independent
  ranking page): rejected — the page has ~no authority to rank anything, and its
  strongest candidate long-tails ("make/create your own murder mystery") are terms the
  homepage *also* holds (pos 42–48), so re-angling risks just moving the cannibalization
  to a new term rather than resolving it.
- **301 redirect EN `/custom` → homepage:** rejected for now — kills the page and its
  `/mystery/create` landing funnel, hardest to reverse, and the largest hreflang-cluster
  surgery. Canonical achieves the consolidation with the page still live.
- **Add homepage body copy targeting the head terms:** unnecessary — the homepage title
  (`2b500c6`) already targets them and the homepage already wins; more on-page repetition
  adds nothing.
- **Repoint `en`/`x-default` hreflang to the homepage everywhere** (fully consistent
  hreflang): rejected — requires editing the 12 non-EN pages' emitted tags, risking the
  Italian ~pos-3 ranking and breaking the EN-only constraint, for a cosmetic gain.

## Consequences

- EN `/custom-murder-mystery-party/` now declares the homepage as its canonical; Google
  should consolidate its (minimal) equity to the homepage over the next few crawls.
- The EN page's copy is de-stuffed (pre-`4552cb4` wording); non-EN `customParty` blocks
  and the homepage title are unchanged.
- ~~A cosmetic canonical/hreflang mismatch on the single EN `/custom` URL is accepted and
  documented; monitor GSC International Targeting only if the non-EN cluster shows
  movement.~~ **Superseded by a follow-up hardening (same day):** the mismatch was not
  merely cosmetic — a page that canonicalizes elsewhere is not self-canonical, and a
  non-self-canonical member can get an entire hreflang cluster's return-tags discounted,
  which would put the corporate locales (Italian ~pos 3) at risk. So the EN `/custom` URL
  is no longer advertised as a member of the hreflang cluster: `en` is dropped from the
  emitted `rel=alternate` set (on every language variant) and `x-default` now points to
  the homepage. Every remaining cluster member is self-canonical, removing the ambiguity
  rather than monitoring for it.
- **This is reversible** (remove the `canonicalLang === "en"` branch) but has indexing
  consequences; it was shipped only after explicit approval (Jonathan, 2026-07-27).
- **Monitor:** homepage position on "custom murder mystery game/party" against the
  ~9.6 / ~13.9 baseline, and the Italian corporate query against its ~pos-3 baseline,
  over the next 3–4 weeks. If the homepage doesn't improve or the custom page's
  impressions don't fall, revisit (escalate to 301) — or if the non-EN cluster wobbles,
  reconsider the hreflang handling.

## Discussion

The load-bearing move was re-deriving the numbers from GSC rather than trusting the
prior session's framing, which surfaced two facts that reshaped the fix: the homepage
title had *already* been re-led with "Custom" (`2b500c6`), so "consolidate onto the
homepage" was half-done and the remaining work was purely to stop the custom page from
competing; and the custom page earns 1 click / 90 days, so there was no equity worth
preserving by re-angling it. The second real call was hreflang: the theoretically
correct cross-cluster canonical fights hreflang, but the only fully-consistent fix
touches the 12 non-EN pages and endangers a proven ranking — so we accept a cosmetic
mismatch on one EN URL as the correct trade for protecting the non-EN cluster, exactly
the EN-only constraint the brief set.

## Key files

- [src/pages/CustomMurderMysteryParty.tsx](../../src/pages/CustomMurderMysteryParty.tsx)
  — EN `rel=canonical` → homepage; `og:url` → page's own URL; hreflang untouched.
- [src/i18n/locales/en.json](../../src/i18n/locales/en.json) — `customParty.seo.*`,
  `hero.h1/intro`, `midCta` reverted to pre-`4552cb4` (de-stuffed). EN only.
- `index.html` / `home.seo.*` — **unchanged**; homepage title already targets the terms.

## Links

- Related: [ADR-0024](0024-static-homepage-seo-source-of-truth.md) (homepage SEO source
  of truth — its branded-title premise is now stale, see `2b500c6`),
  [ADR-0020](0020-localized-static-landing-pages.md) /
  [ADR-0040](0040-both-landing-angles-per-language.md) (localized landing angles — the
  non-EN cluster this change deliberately protects).
- (vault copy) [[01_Projects/Mystery-Maker]]

## Addendum (2026-09-07) — monitoring closed: consolidation confirmed, no escalation needed

Third and final ground-truth re-measurement (`node scripts/backfillSeoHistory.mjs
jul2026_custom_page_canonicalization`, 30/30 post-days — the first two reads,
2026-08-14 and 2026-08-31, were thin windows). Trend across all three reads,
page-level (dimensions=['page'], filtered per query):

| | Baseline (28d ending 07-26) | 08-31 read | 09-07 read (this one) |
|---|---|---|---|
| "custom murder mystery game" — homepage pos | 9.9 | 6.5 | **5.2** |
| "…game" — custom page impressions | 79 | 80 (flagged "not falling yet") | **48 (now falling)** |
| "custom murder mystery party" — homepage pos | 14.0 | 6.8 | **5.3** |
| "…party" — custom page impressions | 122 | 58 | **30** |

The one open item from the 08-31 read — the "game" query's custom-page impressions
weren't falling yet, so that term's consolidation looked mixed — has resolved: both
head terms are now consolidating cleanly (homepage position improving, custom page's
impressions on both terms declining) and both are within one spot of page-1's top 5.

**Verdict:** consolidation happened and is still strengthening three reads in a row.
The homepage's remaining gap to top-5 is authority, not copy, exactly as this ADR
originally diagnosed — no title/meta/H1 rewrite is warranted (H1 decision already
closed 2026-08-31, see CHANGELOG). **No escalation to a 301 is warranted** — reverse
this call only if the trend reverses, which it has not done across three consecutive
reads spanning six weeks.

**Guardrail:** the Italian corporate query (ADR-0020/0040, baseline ~pos 3) remains
unaffected by this ADR specifically — no hreflang-cluster fallout. Its own,
separately-tracked regression (impression collapse starting 2026-07-14, three weeks
before this ADR shipped) has worsened to a flat zero impressions/day since; see
`00_INBOX/italian-corporate-query-impression-collapse-2026-08-31-mystery-maker.md`
(updated same date as this addendum) — unrelated to this ADR, not root-caused yet.

**Action taken alongside this measurement:** the weekly digest's linked action item 2
("1-2 contextual internal links to the homepage from high-authority posts") was
already satisfied by prior sessions (`free-murder-mystery-games-printable` and
`ai-murder-mystery-generator-complete-guide` both already link to `/`); this session
added 2 more from posts that had none (`murder-mystery-party-character-ideas`,
`murder-mystery-party-clue-ideas`) — see CHANGELOG 2026-09-07.

The self-expiring reminder in `scripts/generateSeoDigest.mjs` REMINDERS is retired as
of this addendum (monitoring window closed, not superseded).
