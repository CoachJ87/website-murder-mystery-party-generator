# ADR-0121: Culturally-native locale content, published outside the templated pipeline, linked via a shared slug

- **Status:** Accepted — 12 posts live
- **Date:** 2026-09-04 to 2026-09-08 (work), recorded 2026-09-09
- **Related:** ADR-0020 (deliberate per-locale content divergence under one page — the precedent this decision leans on), ADR-0021 (link-graph-importance publish ordering, the pipeline this work deliberately bypassed), ADR-0025 (cross-link target guard)

## Context

An SEO/GEO idea (originally: a Chinese-market "alternative party ideas" post positioning murder mystery as one of several genuine options) turned into a question worth answering carefully: does the site's existing automated content pipeline (`publish-daily-blog.yml`, ~2,200 templated posts queued across 13 languages, drained ~1/day by link-graph importance per ADR-0021) already cover this content type?

Checking before writing anything found a genuine gap. The pipeline translates EN-authored topics into 13 languages — it does not, and structurally cannot, originate content that requires actually knowing a market. Confirmed directly: the EN topic `themed-party-ideas-for-adults` (queued in all 13 languages) frames its "immersive" option as decade parties, a Hollywood-premiere theme, and casino night regardless of locale — literal translation, not local research. For a genuinely culturally-native post, someone has to research the actual market.

Once that gap was confirmed, four more decisions came up while building the first post (German) and then scaling to 12 locales:

1. **How do locale variants of this content get linked to each other?** A code audit (`src/pages/BlogPost.tsx`, `scripts/prerender-blog.mjs`) confirmed the site links locale variants purely by matching `slug` — `translation_of` is an unused/vestigial column, never read at runtime. hreflang tags are generated from same-slug groupings.
2. **Is it acceptable to share one slug across pages with genuinely different content per locale (not translations of each other)?** This site already made exactly this tradeoff deliberately for the corporate-vs-custom landing pages (ADR-0020): same URL/page slot, different content per locale, by design.
3. **How does new content actually get published without going through `blog_map.xlsx`?** Direct Supabase insert works, but `status='draft'` is dangerous here: `scripts/sync-blog-map.mjs` unconditionally deletes every `status='draft'` row before repopulating from `blog_map.xlsx` (confirmed by reading the script). This content lives entirely outside that spreadsheet, so a draft row would be silently wiped if that sync script (`sync-blog-map.yml`, `workflow_dispatch`-only, not scheduled) ever ran.
4. **Once the process was proven on 4 locales (de, zh-cn, ko, ja), should the remaining 8 be done one at a time or in parallel?** Jonathan's call, after 4 consecutive clean locales: parallelize via 8 background research agents, each given the same process constraints, reviewed before insertion rather than blindly trusted.

A cross-cutting empirical finding, not a design decision but worth recording because it corrects a planning assumption made at the start: the original two-bucket model ("genuine novelty" locales like Germany vs. "already-saturated" locales like China) was wrong almost everywhere it was tested. Every one of the 12 locales researched already had *some* established commercial murder-mystery presence (Netherlands since 1987, Finland since 2008, Sweden since 2004, France traced to 1930s Paris, Italy's own 1995 innovation, Denmark, Portugal, Spain, plus Korea's "originated the genre but has the smallest market of its regional peers" story and Japan's real 2026 industry pullback tied to a "scripts can only be played once" structural problem). The durable differentiator across all 12 posts turned out to be fixed/generic scripts (bought kits or booked actors) vs. custom-generated per-group ones — not "introducing an unfamiliar concept."

## Decision

Adopt this as the repeatable pattern for future culturally-native locale content (as distinct from the templated pipeline's output):

1. **Research natively per locale** — WebSearch in the target language, current year. No assumed framing bucket ("novelty" vs. "mainstream") going in; verify what the market's actual relationship with murder mystery games is before writing a word.
2. **Dedup-check `blog_posts` for that locale before drafting** — confirm no existing post (templated or otherwise) already covers the angle.
3. **Share one slug across every locale in a given "meta" series**, even though the content is NOT a translation between locales — this is what makes the site's existing slug-based hreflang mechanism cross-link them, and it's the same tradeoff ADR-0020 already accepted for the corporate/custom landing pages. Series slug for this batch: `alternative-party-ideas-by-culture`.
4. **Publish directly via Supabase insert with `status='published'`**, never `'draft'`, for this class of content — `sync-blog-map.mjs` will wipe draft rows that live outside `blog_map.xlsx`. Direct-to-published is safe here specifically because each post is hand-vetted (dedup-checked, fact-checked, sensitive-topic-checked) before insertion, unlike the templated pipeline's drafts which need the review gate.
5. **Manually run the post-publish steps the normal pipeline would have automated**: `gh workflow run deploy.yml` (the site is client-rendered; unprerendered pages are invisible to crawlers) and `scripts/submit-indexnow.mjs --slug=<slug>`. Verified end-to-end: all 12 URLs return HTTP 200 with correct title/meta/hreflang post-deploy.
6. **Do not fabricate statistics.** Only cite directional/qualitative claims corroborated across multiple independent sources; downgrade to qualitative language when a specific number can't be verified. Handle any real-person/company story (e.g. Japan's 2026 industry pullback, which involved a named public figure's business failure and specific debt figures) by using the structural market insight and omitting names/financial specifics — citing market dynamics is legitimate, using someone's public financial failure as a sales hook is not.

## Consequences

**Positive:**
- Fills a content gap the templated pipeline structurally cannot address on its own, without requiring changes to that pipeline.
- No new site infrastructure needed — the shared-slug/hreflang mechanism already existed and just needed to be pointed at deliberately-divergent content.
- Corrected a real planning mistake (the novelty/saturated bucket model) before it could shape a larger rollout; the corrected model (fixed-script vs. custom-generated is the durable differentiator, not novelty) is now the default assumption for any future locale in this series.

**Negative:**
- **This content has zero inbound internal links right now.** Bypassing the normal pipeline also bypassed its automatic `apply-crosslinks.mjs` step, which only runs as part of a pipeline-driven publish. Not yet fixed — tracked via a dated reminder in `scripts/generateSeoDigest.mjs` (window 2026-09-23 to 2026-10-07) to check indexing status and identify natural linking candidates per locale.
- hreflang technically asserts translation-equivalence between pages that are legitimately different content per locale. This is the same tradeoff ADR-0020 already made, not a new risk, but it's now a *repeatable pattern* rather than a single landing-page exception — worth naming explicitly so a future session doesn't rediscover the tradeoff from scratch.
- GSC sitemap submission (`submit-sitemap-gsc.mjs`) failed when run locally on a permission error — likely a stale/wrong local credential (same class of issue as a previously-documented `GSC_SERVICE_ACCOUNT_JSON` project mismatch), not chased further since IndexNow + organic crawl already cover discovery and the automated pipeline's own GSC step uses the correct CI secret.

**Neutral:**
- No EN version exists for this series, by design — it's specifically the locale-native content the EN-sourced templated pipeline can't produce, so there's no natural "anchor" language for it.

## Key files

- `blog_posts` table (Supabase project `mhfikaomkmqcndqfohbp`): 12 rows, slug `alternative-party-ideas-by-culture`, languages de/es/fr/it/pt/nl/da/sv/fi/ko/ja/zh-cn, all `status='published'`
- `scripts/generateSeoDigest.mjs` — `REMINDERS` array, indexing/internal-link follow-up entry (window 2026-09-23 to 2026-10-07)
- `src/pages/BlogPost.tsx`, `scripts/prerender-blog.mjs` — the pre-existing slug-based hreflang mechanism this pattern relies on (unchanged, just newly relied upon this way)
- `scripts/sync-blog-map.mjs` — the script whose `status='draft'` wipe behavior ruled out inserting this content as draft

## Discussion

Three points were debated in the course of this work, worth preserving:

**Shared slug vs. a unique slug per locale.** A unique slug per locale would have been "more honest" in the sense that each page's content is genuinely distinct, but it would have required either manual hreflang wiring (new code) or accepted that these pages simply don't cross-link at all. Reusing the existing slug-based mechanism cost nothing to build and matches a pattern the site already uses deliberately elsewhere (ADR-0020). Chose shared slug.

**Draft-for-review vs. publish-immediately.** The first post (German) was inserted as `status='draft'` specifically for human review before going live, given it was a new, unreviewed content type. After four consecutive locales (de, zh-cn, ko, ja) came back clean under the same research/fact-check discipline, Jonathan explicitly moved the process to publish-immediately for the rest — the review gate was adding latency without adding safety once the process itself was validated. This is a process decision, not a one-time exception: future locales in this series should default to publish-immediately unless something about a specific locale's research raises a flag worth a second look before it goes live.

**Sequential vs. parallel research for the remaining 8 locales.** The first 4 were done one at a time in the main conversation, each fact-checked and shown before publishing. For the remaining 8 (es, fr, it, pt, nl, da, sv, fi), Jonathan explicitly asked to parallelize — 8 background research agents ran concurrently, each given the identical process constraints (native-language research, no assumed bucket, no fabricated statistics, careful handling of sensitive real-person/company stories) proven on the first 4. Each agent's output was still reviewed for quality and safety before insertion; parallelizing changed the research/drafting step's wall-clock cost, not the verification step.
