# Acceptance rules: a wave of new guides

Applies to every new guide added in a wave. For Wave 2 that is `melasma-on-dark-skin` and `harmattan-skincare`. Every
live guide was held to `quality/ACCEPTANCE.md`, and a new guide must match them. This file adds the checks that only
matter for new medical writing.

Nothing reaches the owner until an independent verifier has checked every line below and left evidence in
`quality/review/wave-<n>/`. The writer never grades their own work. When unsure, the verdict is FAIL.

**The rules that bind:**
- `quality/seo-guides-contract.md`: the guide format and content rules.
- `quality/seo-figures-contract.md` and `quality/ART_DIRECTION.md`: figures.
- `quality/READING_SPEC.md`: the page.
- `/Users/mac/dev/projects/ux/deepertones_be/CONTEXT.md`: product voice and safety.

## W-A. Contract (automated; `npm run quality -- --include-drafts --only <slugs>`)
- **WA1: builds clean.** Lint, typecheck and `GUIDES_SHOW_DRAFTS=1 GUIDES_REQUIRE_INSHORT=1` build exit 0. The guide build
  prints no writing warnings (paragraph length, bold, H2 length) for the new guides.
- **WA2: frontmatter:**
  - title is 60 characters or fewer and contains the words of `primaryQuery`;
  - description is 140–160 characters;
  - slug equals the file name;
  - `draft: true`, `reviewedBy: null` and `reviewerRole: null` until the owner approves;
  - `inShort` has 3–4 items, each 160 characters or fewer, 480 in total;
  - 3–5 FAQ entries;
  - 3–6 `secondaryQueries`.
- **WA3: body:**
  - 900–1,400 words;
  - `## When to see a professional` is the last H2;
  - no more than 2 Safety callouts;
  - every `[n]` points to a listed source, and every source is cited at least once.
- **WA4: links:**
  - every internal link points to a guide that exists (200 on the preview);
  - every source URL loads (2xx or 3xx). A 403, 429 or 5xx (a site that blocks robots or is briefly down) is a WARN,
    and it counts only if the verifier opened it in a browser.
- **WA5: same bar as the live guides.** The new pages pass the `ACCEPTANCE.md` B2–B5 and C1–C4 automated lines on the
  preview, with drafts shown.

## W-B. Claims (judged; the most important section)
- **WB1: every claim is supported.** Each factual or medical sentence is SUPPORTED by the source it cites: the verifier
  opened the source and quotes the supporting line. OVERSTATED, NOT IN SOURCE or UNCITED all fail.
- **WB2: allowed sources only:**
  - WHO, FDA, NHS (including NHS Wales or Scotland), MHRA, NAFDAC, AAD or BAD, or peer-reviewed papers;
  - no brands, blogs, clinics or influencers;
  - a paper funded by a product maker is allowed only if the guide says so;
  - the year matches the source (never a guessed year).
- **WB3: honest about thin evidence.** Where only one source supports a point, or sources disagree, the guide says so plainly.

## W-C. Safety and voice (judged)
- **WC1: no lighter-skin promise.** Treatments are framed as fading marks or patches toward the reader's usual even tone,
  never toward lighter skin.
- **WC2: prescription options belong to a professional:**
  - hydroquinone, tranexamic acid tablets, triple-combination creams, steroids and peels appear only as "a dermatologist
    may suggest";
  - no dose, strength to buy or schedule.
- **WC3: pregnancy and breastfeeding cautions** wherever a treatment or active ingredient is mentioned.
- **WC4: no brands, shops or rankings.** Ingredients only.
- **WC5: red flags go to a professional:**
  - infection, bleeding cracks, spreading redness, eye symptoms;
  - a patch or mole that changes;
  - eczema that doesn't settle.
- **WC6: patterns, not diagnoses.** Calm, plain and kind; no scolding; terms explained the first time they appear.

## W-D. Figure (judged at phone width, 340 px, and at 1600 px)
- **WD1: house style.** It matches `ART_DIRECTION.md` and sits naturally next to the anchor figures (mark-depth timeline,
  azelaic fading timeline). It draws a subject, not a styled text list. It looks premium, not amateur.
- **WD2: little text.**
  - 25 words or fewer and 10 lines or fewer;
  - nothing under 56 px;
  - legible at 340 px;
  - nothing clipped or overlapping.
- **WD3: skin.** Warm natural brown, the same tone across panels. Never lighter as success. No brands.
- **WD4: accurate.**
  - every word in the figure appears in the guide with the same meaning;
  - `alt` describes the drawing as rendered;
  - the caption is 30 words or fewer.

## W-E. Page (judged from full-page screenshots at 375 and 1280 on the preview with drafts shown)
- **WE1: reads well.**
  - In short box, contents, callouts, figure frame and related cards all render;
  - the draft banner shows and no reviewer is invented;
  - no overflow;
  - it reads as calm and premium as the live guides.

## W-F. Evidence in `quality/review/wave-<n>/`
- **WF1:** `checks.json`, the checker's full output for the new guides.
- **WF2:** `claims-<slug>.md`, every claim with its source, a quote and a verdict.
- **WF3:** figures at 340 px and full size, plus page screenshots at 375 and 1280.
- **WF4:** `VERDICT.md`, PASS/FAIL for every line, each with an evidence path. Every FAIL names its owner (writer,
  figure or checker) and says exactly what to change.
