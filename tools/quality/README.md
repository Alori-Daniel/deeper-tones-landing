# Quality checker (the failing test for the premium-guides loop)

```
npm run quality -- --out <dir>
```

Runs every automated line of `quality/ACCEPTANCE.md` (sections A, B2, B4, B5, C1 to C4) for every live guide, `/guides`, `/`,
`/privacy` and `/terms`, writes `<dir>/checks.json` and prints a summary table. Exit code 0 = every line PASS or WARN, 1 = at least one
FAIL, 2 = the run itself broke (for example the build failed). Takes 3.5 to 9 minutes depending on machine load (typically 4 to 5: freeze 20 s to 1 m 15 s, lint and typecheck 30 to 45 s, build 30 s to 1 m 50 s, 77 page loads 2 to 3.5 min, Lighthouse 30 to 60 s). Needs network for `next/font/google`
during the build and for the first `npm install`.

## What a run does

1. **Self-test** on synthetic pages and data (about 15 s). A "bad" page with known faults (15 px text, 1.2 line height,
   italics, two H1s, a skipped heading, 600 px block in a phone viewport, faint grey text, clipped text, an image without
   dimensions, a late layout shift, Arial) must make the matching checks FAIL; a "good" page must make them PASS; the SVG font
   analysis, aspect-ratio, caption-style, srcset and served-size checks are exercised on synthetic inputs. Each result is a
   `SELFTEST.*` line in `checks.json`. If one is FAIL the checker itself is broken: fix that before trusting anything else.
   `npm run quality -- --self-test` runs only this.
2. **Frozen copy.** `rsync` of the worktree to a temp dir (without `node_modules`, `.next`, `.open-next`, `.git`, `quality/`,
   `tools/quality/`), `node_modules` cloned into it with `cp -Rc` (APFS clone, about 15 s, no disk used). A symlink does not
   work: Turbopack refuses it ("Could not find the Next.js package"); `QUALITY_NODE_MODULES_MODE=symlink` forces it anyway.
   Everything below runs there, so edits made while a run is going cannot change its result.
3. **A1:** `npm run lint`, `npm run typecheck`, `npx opennextjs-cloudflare build` (and an "N guides built" line, N = guides marked `draft: false`), logs in
   `<dir>/logs/`.
4. **Preview:** `opennextjs-cloudflare preview` on a free port with its own inspector port, torn down (whole process group)
   at the end, also on Ctrl-C or a crash.
5. **Static and HTTP lines:** A2, A3 (status, canonical), A4, B2, B4 file widths.
6. **Browser lines** (Playwright + Chromium, 375, 768 and 1280 px; each page is read like a reader: wait for fonts, sit at
   the top, scroll to the bottom, back to the top): C1, C2, C3, A3 overflow, B4 served sizes, B5, C4 lazy-loading.
7. **Lighthouse** (mobile defaults, performance and accessibility) on two guides, JSON saved.
8. **Evidence.**

## Lines

| id | what it measures | threshold |
| --- | --- | --- |
| A1.lint, A1.typecheck, A1.build, A1.guides-built | exit codes; "N guides built" | 0; live guide count |
| A2.guide-url, A2.og-image, A2.figure-images | status of each guide, its OG image, every figure and every srcset candidate | 200 and an image type |
| A3.status, A3.canonical, A3.no-overflow | `/`, `/privacy`, `/terms`: status, canonical equals `fixtures/canonicals.json`, no horizontal overflow at 3 widths | |
| A4.cache-components-off, A4.no-use-cache | `next.config.ts`, grep of `src/` | |
| A4.no-request-fs | every file that imports fs is a metadata-image route (opengraph, twitter, icon) or is used by one, and every guide's image routes are prerendered in `.next/server` | |
| A4.figures-compiled-at-build | every figure file is in `.open-next/assets` | |
| A4.study-photo-credits, A4.study-photo-credits-rendered | credit, licence, URLs, changes of the CC BY photos equal `fixtures/study-photo-credits.json` (taken from git HEAD) and are shown on the page | |
| B2.source-font-families | each figure SVG declares only Archivo / Source Serif 4 (a generic serif or sans-serif may follow; Helvetica, Arial and anything else fail; text with no family fails) | |
| B2.fonts-loaded-by-renderer | Archivo and Source Serif 4 font files exist under `assets/` and `scripts/` (or `@font-face` in every SVG) loads them | |
| B2.renderer-resolves-fonts | mutation test: rebuild the figures with the repo's own pipeline after renaming every `font-family` to a font that does not exist; if the WebP does not change (under 0.10% of pixels differ) the declared font was never used, so a rename-only fix is caught | |
| B4.source-width | built WebP at least 1600 px wide (a photo whose original is narrower must keep its full original width) | 1600 |
| B4.responsive-images | `<img srcset sizes>` (2+ widths) or `<picture>` at 375 | |
| B4.served-size | at 2x screens, the served file is 0.85x to 1.75x of the pixels needed (or the largest file we have) | |
| B5.aspect-ratios | rendered frame ratios across all figures, at 375 and 1280 | at most 2 |
| B5.caption-style | every figure has a `figcaption`, all with the same computed style | |
| C1.body-size, C1.line-height | the dominant reading text in `<main>` (not nav, card links on the index, figures, header, footer, sources, credits, meta) | 18 px, 1.6 |
| C1.measure | characters per rendered line (median of full lines), guides at 1280 | 60 to 75 |
| C1.single-h1, C1.heading-order | one visible H1, starts at H1, never skips a level | |
| C1.no-italics | no visible text with italic or oblique computed style (also header and footer) on all pages | |
| C1.fonts, C1.fonts-rendered | headings use Source Serif 4, text Archivo (next/font names normalised; both faces loaded); and the fonts the browser actually drew (CDP `getPlatformFontsForNode`) are the web fonts | |
| C2.contrast | every text run against the pixels really behind it (text made transparent, screenshot, sample; 5th percentile) | AA: 4.5, large 3 |
| C3.no-horizontal-overflow, C3.no-clipped-text, C3.image-dimensions, C3.cls | page width, overflow:hidden boxes cutting text, `img` width and height attributes, layout-shift total | CLS < 0.05 |
| C4.lighthouse-performance, C4.lighthouse-accessibility | Lighthouse 13, mobile, on two guides | 90, 95 |
| C4.lazy-below-fold, C4.first-image-not-oversized | below-the-fold figures `loading=lazy`; first image at most 1.5x the pixels needed at 375 @2x | |

C1, C2 and C3 run on the live guides and `/guides` (C1 no-italics and overflow on `/`, `/privacy`, `/terms` too).
Selectors are generic (`main`, `h1`, `p`, `figure img`, `figcaption`) so a redesign does not break the checker. Lines B2 to B5
that are about the picture itself (B1, B3, B6, B7, B8) and C5, C6, D are judged by the verifier; this tool only supplies the
evidence.

## Output

```
<dir>/checks.json                 { summary, lines: [{ id, section, target, measured, threshold, status, details? }] }
<dir>/pages/<slug>-{375,768,1280}.png   full-page screenshots (guides and /guides, 1x)
<dir>/figures/<slug>__<id>__{340,full}.png
<dir>/figures-contact-sheet.png         every figure at 340 px, labelled
<dir>/figures-contact-sheet-full.png    every figure at full size (800 px wide tiles)
<dir>/text/<slug>.txt                   the guide's text as plain text (details opened, images as "[Figure image] alt")
<dir>/lighthouse-<slug>.json
<dir>/logs/{lint,typecheck,build,preview}.log
```

## Options

`--self-test` (only the self-test), `--skip-self-test`, `--skip-lighthouse`, `--skip-mutation`, `--skip-a1`,
`--limit <n>` (first n guides, for quick iteration), `--reuse-frozen <dir>` (reuse an existing frozen copy and its build, do
not delete it), `--keep` (keep the frozen copy), `--concurrency <n>`, `--update-fixtures`, and the two wave flags below.

## Gating a wave of draft guides (`--include-drafts`, `--only`)

```
npm run quality -- --include-drafts --only melasma-on-dark-skin,harmattan-skincare --out quality/review/wave-2/checks
```

- `--include-drafts` builds the frozen copy with `GUIDES_SHOW_DRAFTS=1 GUIDES_REQUIRE_INSHORT=1` (on lint, typecheck and
  build, since each of them regenerates the guide data), so draft guides are built, previewed and measured like live ones.
  `A1.guides-built` then expects every file in `content/guides` (13 live plus the drafts) instead of 13. It also turns on the
  wave lines WA1 to WA4 below. Without the flag nothing about a normal run changes.
- `--only <slug,slug>` keeps the per-guide lines (A2, A4 figures and photo credits, B2 to B5, C1 to C4, and the wave lines)
  to those guides. Site-wide lines still run: `/guides`, `/`, `/privacy`, `/terms`, the study-photo snapshot, the prerendered
  image routes. A slug that is not in the build is a FAIL (`WA1.guide-built`, or exit 2 if none of them is). Lighthouse then
  runs on the first two selected guides, and the figure evidence covers only the selected guides.
- The wave lines run on the `--only` guides, or, with `--include-drafts` alone, on every guide whose frontmatter says
  `draft: true`. They are the automated part of `quality/ACCEPTANCE-WAVE.md` section W-A; the claims, safety, figure and page
  lines (W-B to W-E) stay with the verifier.

| id | what it measures | threshold |
| --- | --- | --- |
| WA1.lint-typecheck-build | exit codes of lint, typecheck and the build with the draft switches on (a step that did not run counts as a FAIL) | all 0 |
| WA1.no-writing-warnings | `[guides] warning:` lines the build prints for the guide: paragraph over 4 sentences, more than one bold phrase in a paragraph, H2 over 60 characters, Safety callout over 60 words. (A never-cited source, a word count outside 700 to 1,700 and a missing `inShort` also warn, but WA3 and WA2 judge those) | none |
| WA1.guide-built | the guide is in the build (a build that rejects a guide fails as a whole; see `logs/build.log`) | built |
| WA2.title-length, WA2.title-has-primary-query | title length; every word of `primaryQuery` (case and punctuation ignored) appears in the title | 60 or fewer; all words |
| WA2.description-length, WA2.slug-matches-file | description length; `slug` equals the file name | 140 to 160; equal |
| WA2.draft-unreviewed | `draft: true`, `reviewedBy: null`, `reviewerRole: null` (the key must be there) | exact |
| WA2.in-short, WA2.faq-count, WA2.secondary-queries | `inShort` items (each 160 or fewer, 480 in total); FAQ entries; `secondaryQueries` | 3 to 4; 3 to 5; 3 to 6 |
| WA3.word-count | body words, counted exactly as `scripts/build-guides.mjs` does (whitespace split of the body, so `##`, `[n]` and the `{{figure:id}}` line count) | 900 to 1,400 |
| WA3.last-h2 | `## When to see a professional` is the last `##` and appears once | exact |
| WA3.safety-callouts | blockquotes that open with `**Safety:**`; any other blockquote also fails | 2 or fewer |
| WA3.citations-resolve, WA3.sources-cited | every `[n]` in the body points to a listed source (a `[1, 2]` style mark is reported); every listed source is cited at least once | all |
| WA4.internal-links | every Markdown link to a path on this site (body and FAQ answers; `https://deepertones.com/...` counts) answers 200 on the preview, redirects not followed | 200 |
| WA4.source-urls | every source URL, fetched with GET and a browser-like User-Agent, redirects followed (a 301 to a dead page fails), one retry on a network error or 5xx, each URL once per run | 2xx or 3xx |

`WA4.source-urls` treats a final 403 or 429 as **WARN**, not FAIL: the site may be blocking robots. A WARN line has
`status: "WARN"` in `checks.json`, never changes the exit code, and the URLs are listed in `details` (and in the printed
summary) so a person can open them in a browser. WA2 and WA3 are computed from the `.md` file in the frozen copy, before the
build, so they are recorded even when the build fails. WA5 is simply the B2 to B5 and C1 to C4 lines above, run on the
selected guides with drafts shown.

Self-test (`SELFTEST.WA*`): a synthetic good guide passes every wave line; each rule is broken one way at a time (title 61
characters, description 139 and 161, a reviewer filled in, 2 and 5 `inShort` items, 500 and 1,600 words, the professional
section not last, 3 Safety callouts, `[9]` with 3 sources, a never-cited source, lint, typecheck and build exit codes,
each writing warning, a dead internal link, source 404, 500, a redirect to a 404, an unreachable host) and only the matching
line may fail. 403 and 429 sources must give WARN, and a 404 next to a 403 must still FAIL. Links and sources are served by
a local server, so the self-test needs no network.

## Fixtures

`fixtures/study-photo-credits.json` (from git HEAD frontmatter) and `fixtures/canonicals.json` (from the preview) are the
"unchanged" reference for A3 and A4. They were written once with `--update-fixtures` on the pristine tree. Do not regenerate
them after content work starts; if a credit really must change, change the fixture in the same commit and say why.

## Known limits

- `A4.no-request-fs` passes an fs-using file when a metadata image route uses it and the image routes are prerendered; a page that imported and called the fs function itself would not be caught. A tighter test would require every page in the page list to appear in `.next/prerender-manifest.json`.

- The browser is Playwright's Chromium (the newest cached revision if Playwright's own is not installed); Lighthouse drives the
  same binary.
- Screenshots are 1x to keep long phone pages manageable; judge sharpness from `figures/*__full.png`.
- C2 skips text with no sampled pixels (off-screen) and text that is fully transparent; text over images is judged by its
  worst 5% of pixels.
