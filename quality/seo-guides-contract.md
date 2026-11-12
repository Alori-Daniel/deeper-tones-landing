# Deeper Tones guides: file format and content rules

This repo (deeper-tones-landing: Next.js 16, Tailwind v4, Cloudflare Workers via OpenNext). Product context:
`CONTEXT.md` in the deepertones_be repo (read it).

## One guide = one file: `content/guides/<slug>.md`

```markdown
---
title: "How to fade dark marks on dark skin"          # ≤ 60 characters, contains the main search phrase
description: "…"                                        # 140–160 characters, plain, says what the reader gets
slug: "fade-dark-marks-dark-skin"                       # same as the file name
primaryQuery: "how to fade dark marks on dark skin"     # the search we want to rank for
secondaryQueries: ["…", "…"]                            # 3–6 related searches the page also answers
published: "2026-11-04"
updated: "2026-11-04"
draft: true                                             # stays true until a human approves it
reviewedBy: null                                        # never invent a reviewer
reviewerRole: null                                      # optional; a human fills it ("Pharmacist"); never invented; under 60 characters
inShort:                                                # 3-4 plain lines, the answer first (see "In short" below)
  - "Dark spots on dark skin usually take 6 to 12 months to fade once the cause stops; deeper ones can take years."
  - "There is no safe overnight fix."
  - "What helps: stop the cause, wear sunscreen every day and keep the routine gentle."
readingMinutes: 6
sources:                                                # numbered in this order; cite in the body as [1], [2]
  - title: "Postinflammatory hyperpigmentation: a review"
    publisher: "Journal of Clinical and Aesthetic Dermatology"
    url: "https://…"
    year: 2010
faq:                                                    # 3–5 short Q&As (rendered on the page and as FAQPage data)
  - q: "How long do dark marks take to fade?"
    a: "…"
---

Body in Markdown. No H1 (the title is the H1). Use `##` and `###` only.
```

Body shape: a 2–3 sentence answer first (what to do, and how long it takes), then sections, then a section
`## When to see a professional`, last. 900–1,400 words. Short paragraphs, plain words, lists where they help.
Cite claims with [n] matching the `sources` order. No images, no HTML, no tables wider than 3 columns.

## Content rules (from CONTEXT.md; these are hard)

- **Patterns, never diagnoses.** Never "you have X". Name a pattern with honest uncertainty ("this is often the rebound
  that happens when you stop a steroid cream"). Describe what can be seen.
- **Never promise or praise lighter skin.** Talk about even tone, fewer dark marks, calm skin. "Lighter after" is the
  thing we exist to undo. A "fairer"/"brighter" wish gets a real, kind answer plus one plain line on what no routine
  can change (baseline colour), never a lecture.
- **Darker skin is the default** in every example. Gender-neutral; men are readers too.
- **Plain, calm, direct.** Closer to a good banking app than a beauty counter. Explain every ingredient term where it
  first appears. No scolding, no fear-mongering, no grades of the reader.
- **Every factual or medical claim traces to a source** in the list: WHO, FDA, NHS, MHRA, NAFDAC, AAD,
  British Association of Dermatologists, peer-reviewed papers (PubMed/PMC). No blogs, brands or influencers as sources.
  If you cannot source a claim, cut it.
- **We sell nothing.** Never name a brand or product to buy, never link a shop, never rank products. Talk about
  ingredients, strengths and what to look for on a label. Never name a specific brand as harmful either (legal risk):
  name ingredients (e.g. clobetasol propionate, hydroquinone, mercury compounds) instead.
- **Safety:** pregnancy and breastfeeding cautions where they apply; red-flag signs (spreading redness, pus, fever,
  severe burning, anything near the eyes, a mole that changed, skin that thins or bruises easily) go to a professional.
  Stopping a strong steroid used for a long time is said to be best done with a professional's help; never give a
  dosing schedule.
- **No weak stats.** Do not quote "77% of Nigerian women bleach" (it comes from a 1998 survey of Lagos market traders).
- **Nigeria first:** examples can mention Nigeria (naira, NAFDAC, heat and sun), but the guide must make sense in the
  UK and US too.
- The page template adds the call to action ("Check your own shelf → Get early access"); do not write one in the body.

## Reading-layout additions (enforced by scripts/build-guides.mjs; see quality/READING_SPEC.md section 6)

- **`inShort`** (the "In short" box at the top): 3 or 4 items, each plain text under 160 characters, 480 in total, no
  `[n]` citations, links, Markdown or HTML. The first item answers `primaryQuery` directly; every claim in it must be in the
  body with a citation. Missing = a build warning, or a failure on a non-draft guide when `GUIDES_REQUIRE_INSHORT=1`;
  present but malformed always fails.
- **Safety callout:** a blockquote whose first paragraph starts with the bold label `**Safety:**`
  (`> **Safety:** If you are pregnant ... [10].`). Citations stay as `[n]`. Max 2 per guide, aim for 60 words or fewer.
  Any other blockquote (or another bold label) fails the build.
- **`## When to see a professional`** must exist and be the last `##`; the build wraps it in the "professional" card.
- Writing hints that only warn: a paragraph of more than 4 sentences, more than one bold phrase in a paragraph, an H2 over
  60 characters.
