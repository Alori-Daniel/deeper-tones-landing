# Deeper Tones guides: figures (images) format and rules

This repo (deeper-tones-landing). House style, tokens and recipes: `quality/ART_DIRECTION.md` (this file is the format;
that file is the look).
Guides: `content/guides/<slug>.md` (see seo-guides-contract.md in this folder for the guide format and content rules).

## Format

**Source files** (committed): `content/figures-src/<slug>/<id>.<svg|png|jpg|jpeg>`
- `<id>`: lowercase letters, digits and hyphens, unique within the guide.
- Diagrams are hand-written SVG. Study photos are the original downloaded image (PNG/JPG).

**Build output** (generated, gitignored): `public/guides/<slug>/<id>.webp` (1600 px wide) and `<id>-800.webp` (800 px
wide, for `srcset`), plus `<id>-thumb.webp` for every diagram: the 800 w file with the top 90 px (the title band) cut off and 20 px of white added back,
800 x 530, used by the /guides index and the related-guide cards so a card never shows a second headline. The build (`scripts/figures/index.mjs`, called from `scripts/build-guides.mjs`) renders every SVG with
**resvg** (`@resvg/resvg-js`) using the brand font files in `assets/fonts/` with system fonts switched off, so a wrong
family cannot fall back to Helvetica. Diagrams come out 1600 px wide at quality 82. Study photos skip resvg and go straight
to sharp: original pixels, never upscaled (the 800 w file only when the original is at least 800 px wide, the 1600 w file
only when it is at least 1600 px, otherwise one file at the original width). The build reads width/height and fails if a
figure in frontmatter has no source file, or if an SVG breaks a rule below.

**Frontmatter** (in the guide), max 3 figures per guide:

```yaml
figures:
  - id: label-steroid-names
    kind: diagram            # diagram | study-photo
    alt: "A cream label with clobetasol propionate and betamethasone highlighted in the ingredient list"
    caption: "Steroids hide under names ending in -sone or -solone, like these."
    credit: "Deeper Tones"   # diagrams: "Deeper Tones"; study photos: "Author A, Author B. Journal, Year"
    license: "Own work"      # diagrams: "Own work"; study photos: "CC BY 4.0" | "CC BY 3.0" | "CC BY 2.0" | "CC0 1.0"
    sourceUrl: null          # study photos: the article page the figure comes from (required)
    licenseUrl: null         # study photos: the licence URL, e.g. https://creativecommons.org/licenses/by/4.0/ (required)
    changes: null            # study photos: "Cropped" / "Cropped and labels added" if you changed it (CC BY requires saying so)
```

**Placement in the body**: a line containing only `{{figure:<id>}}`, placed right after the paragraph it illustrates.
Every figure in frontmatter must be placed exactly once.

**Rendered as** `<figure>` (a 4:3 frame for every figure; study photos sit uncropped in a white 4:3 plate) with
`<img src srcset sizes alt width height loading="lazy">`, `<figcaption>` holding the caption, then
"Credit: … · Licence: … (linked) · Changes: …" for study photos. Article JSON-LD lists the figures as `image`.

## Rules for study photos (option 1: real clinical photos from published research)

- **Licence:** only from articles whose own page states CC BY (any version) or CC0. Check the licence line on the
  article page itself (PMC shows it under "Copyright and License information"). **Never** CC BY-NC, CC BY-ND, CC BY-NC-ND,
  "free to read", or "© publisher". If unsure, don't use it. DermNet is not allowed (NC/ND).
- **Relevance:** the photo must show the guide's topic on darker skin (Fitzpatrick IV–VI) where at all possible.
- **Never lighter-as-success:** no photo whose "after" reads as lighter skin overall. Dark marks fading on a stable skin
  tone is fine; caption it as "marks faded", never "skin lightened" or "brighter skin".
- **Privacy:** prefer close crops without eyes or identifying features. Clinical photos with masked eyes are fine. Don't
  crop out a mask the authors added.
- **Honest captions:** say what it shows and how long it took, and that it is from a study ("Results vary").
- **Credit:** authors, journal, year; link the article and the licence; say if you cropped or labelled it.
- Download only the figure image (PMC figure links or the publisher's figure file).

## Rules for diagrams (option 2: our own explainers)

- Hand-written SVG, `viewBox="0 0 1600 1200"` (4:3, the default for all 13 guides) or, as the single reserve ratio,
  `0 0 1600 1000`. White `#FFFFFF` background, full bleed, no border or rounded corners in the file (the page rounds the
  image). Margins 96 px sides, 64 px bottom; the title baseline sits at y = 150. **Keep everything except the title below y = 180**:
  the card thumbnail is the figure with its top 180 px (in the 1600-wide file) removed.
- Colours: ink `#141414`, muted `#5E5E5E`, accent purple `#9D4EDD` for fills and `#7B2CBF` for purple text, tints `#EFE4F8`
  and `#F1EAF8`. **Purple only**: no verdict colours (no green, amber or red; "do" is a purple tick disc, "avoid" is a grey
  cross disc). Text is only ink, muted or `#7B2CBF`.
- Fonts (real files, set with attributes only): titles `font-family="Source Serif 4"` (or `Source Serif 4 20pt`) at
  weight 600; everything else `font-family="Archivo"`. No `<style>` element, no `style="..."` that mentions fonts,
  no italics. Files live in `assets/fonts/` (OFL licences alongside).
- Text size: **at least 56 px** in the 1600-wide canvas (so it reads at about 12 px on a 340 px phone); 48 px only for a
  single numeral inside a pin. Title 80-92 px. Little text: at most 25 words including the title and at most 10 lines,
  noun-phrase labels, no sentence over 6 words. The build fails on a viewBox other than the two above, any other font
  family, italics, or a font-size under 56 (48 for a single-character pin).
- Skin in drawings is a **warm, natural brown, mid-range, never over-darkened**: gradient `#B98058` to `#A46B46` as the
  default, `#C8916A` or `#8A5636` only for a second or third person. Never show skin becoming lighter; show marks fading
  on a constant tone. People are stylised and simple, with no drawn faces.
- Every figure draws something (skin, a hand, a person, a product, a tool); a list of words in a card is not a figure.
- Content must match the guide and its sources. No made-up numbers; timelines say "weeks" or "months" as the guide does.
- No brand names, no product packshots, no logos except the Deeper Tones mark if useful.
- Good diagram types (see ART_DIRECTION section 7): an annotated cream label (an invented, unbranded product); a "how a
  mark fades" timeline; skin layers (top-layer vs deeper marks); a "do / avoid" pair of panels drawing the same scene twice;
  steps in order as small drawings; a strength comparison of one product drawn three times.

## Per guide

1–3 figures: aim for one diagram in every guide, plus a study photo where a CC BY one genuinely fits. Better none than a
weak or wrongly licensed one.
