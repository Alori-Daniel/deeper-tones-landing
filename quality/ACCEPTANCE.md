# Acceptance criteria: premium guides (figures, reading layout, content)

The owner judged the current guides' images "ugly" and said they "don't speak premium". They want "as much premium reading
experience to reader as possible". Today's figures (`quality/baseline/`, captured by the checker before any change) are the
what-not-to-do reference.

Nothing ships to the owner until an independent verifier has checked every line below against the current build and left
evidence in `quality/review/`. The builder never grades its own work. When unsure, the verdict is FAIL.

Scope: all 13 guides at `/guides/<slug>` and the `/guides` index. Product rules in
`/Users/mac/dev/projects/ux/deepertones_be/CONTEXT.md` (Safety, Tone) and the guide and figure formats in the shared notes folder
(`seo-guides-contract.md`, `seo-figures-contract.md`) still bind. Update those docs if the format changes.

## A. Contract (automated)
- A1. `npm run lint`, `npm run typecheck` and `npx opennextjs-cloudflare build` exit 0, and the build reports `13 guides built`.
- A2. Every guide URL, its OG image and every figure image return 200 on a local `opennextjs-cloudflare preview`.
- A3. No regressions on `/`, `/privacy` and `/terms`: 200, the same canonical, no horizontal overflow.
- A4. Constraints hold:
  - `cacheComponents` stays off, with no `"use cache"`;
  - no request-time `fs`;
  - images and content are compiled at build time;
  - figure licences and credits for the two CC BY study photos are unchanged.

## B. Figures (judged from the actual rendered WebP at phone width, about 340 px, and at desktop width)
- B1. **One recognisable, premium house style across all 13 guides**, set by `quality/ART_DIRECTION.md` and drawn from real
  references in `quality/inspiration/`: editorial health illustration, not a slide deck. That means:
  - generous whitespace and a clear focal point;
  - soft shapes or subtle gradients;
  - consistent corner radii, stroke weights, icon style and colour use.
  It must not look like default boxes and borders.
- B2. **Real fonts:** every figure renders text in the site's fonts (Source Serif 4 for titles, Archivo for text), never a
  Helvetica or Arial fallback. Checked automatically from the SVG or renderer config, and by eye.
- B3. **Legible on a phone:** at 340 px wide, every word in a figure can be read without zooming. Little text: a figure
  explains at a glance and the guide's prose carries the detail. Nothing overlaps, clips or crowds an edge.
- B4. **Sharp:** each figure source renders at least 1600 px wide (2x), and the page serves sizes that fit the viewport
  (`srcset`/`sizes`, or equivalent).
- B5. **Consistent frames:** at most two aspect ratios across all figures, and the same caption treatment everywhere.
- B6. **Skin and people:** skin is a warm, natural brown range (it doesn't have to be very dark; over-darkening hurts the
  portrayal). Never a change in skin colour shown as success: marks fade on a constant tone. No brands, logos or packshots
  except an invented, unbranded label where a guide needs one.
- B7. **Accuracy:** every word, number and timeline in a figure matches the guide text and its sources. Nothing is invented.
- B8. **Study photos** keep their credit, licence link and changes line, are shown at a sensible size, and never look
  stretched or blurry.

## C. Reading experience (judged from full-page screenshots at 375, 768 and 1280; plus automated checks)
- C1. **Typography (automated):**
  - body text at least 18 px with line-height ≥ 1.6;
  - a measure of 60–75 characters on desktop;
  - one H1 and a logical H2/H3 order;
  - no italics anywhere;
  - headings in Source Serif 4, text in Archivo.
- C2. **Contrast (automated):** every text element, captions and credit lines included, meets WCAG AA against its real
  background.
- C3. **Layout (automated):** no horizontal overflow or clipped text at 375, 768 or 1280; images have width and height; no
  layout shift (CLS < 0.05).
- C4. **Performance and accessibility (automated):** Lighthouse performance ≥ 90 and accessibility ≥ 95 on a guide page on
  mobile settings. Images are lazy-loaded below the fold, and the first image isn't oversized.
- C5. **Premium reading elements**, present, styled to the art direction and working:
  - an "In short" summary at the top (3–4 lines, the answer first);
  - a table of contents (sticky on desktop, collapsible on mobile);
  - styled callouts for safety notes and "When to see a professional";
  - a reviewer card ("Reviewed by …", date);
  - a sources section that is readable but quiet (collapsible is fine);
  - related-guide cards;
  - a reading progress indicator.
- C6. **The page feels premium** (judged): calm, spacious, consistent; one accent colour; nothing cramped, noisy or
  default-looking; the figures sit naturally in the column. The test is whether a demanding reader who found today's
  version ugly would now call it premium.

## D. Content (judged per guide; claims must not change)
- D1. **Answer first:** the opening and the "In short" box answer the reader's search in plain words.
- D2. **Scannable:** short paragraphs (≤ 4 sentences); headings a reader would ask; key lines bolded sparingly; no
  repetition between sections.
- D3. **Voice:** calm, plain and direct, per CONTEXT.md. Never a diagnosis, never a lighter-skin promise, no scolding. Terms
  are explained where they first appear.
- D4. **No new or changed claims.** Editing may restructure, shorten and clarify, but every factual claim keeps its source
  and meaning, `[n]` citations stay correct, and nothing is added without a source. The verifier diffs the old and new text
  claim by claim.

## E. Evidence the verifier must leave in `quality/review/`
- E1. `figures-contact-sheet.png`: every figure at phone width, before and after, side by side.
- E2. For each guide, page screenshots at 375 and 1280 (full page), plus one "before" pair for comparison.
- E3. `checks.json`: the checker's full machine output (every automated line, its value and PASS/FAIL).
- E4. `lighthouse-<slug>.json` for at least two guides.
- E5. `content-diff/<slug>.md`: the claim-by-claim diff for D4.
- E6. `VERDICT.md`: PASS/FAIL for every line above, each with an evidence path. Any FAIL is listed with the owner (art,
  build or content) and what to change.
