# Art direction: Deeper Tones guide figures

**The style in one line:** calm editorial explainers: one soft, lifted subject on white, warm natural-brown skin drawn as
simple layered shapes, a single purple accent for the thing that matters, a short serif headline, and very few words.

References (see `inspiration/sources.md`): Headspace article heroes (soft overlapping forms, one focal point), Wise
(circle-disc icons, tinted panels), Humaaans (stylised warm-brown people that are never uncanny), Stripe docs and Stripe
Press (restraint, one accent), Our World in Data (caption and source line), Cleveland Clinic (cross-section convention
only). What not to do: `inspiration/OUR-v1-what-the-owner-hated/`.

Anchor figures that define the house style (copy their structure, sizes and tokens):

| Figure | Source | Type |
| --- | --- | --- |
| `samples/read-the-label.svg` | is-glow-cream-bleaching | Invented unbranded label |
| `samples/mark-depth-timeline.svg` | how-long-dark-spots-take-to-fade | Skin cross-section + timeline |
| `samples/close-shave-vs-clipper-guard.svg` | razor-bumps-dark-marks-jaw | Do / avoid comparison |

`samples/compare-340-v1-vs-new.png` shows each one next to today's version at phone width (340 px).

---

## 1. Canvas, grid and aspect ratios

- **Default canvas: 1600 × 1200 (4:3).** `viewBox="0 0 1600 1200" width="1600" height="1200"`. Use it for every diagram
  unless the content is a single short row.
- **Use 4:3 for all 13 guides.** Every current figure (labels, timelines, comparisons, cross-sections) fits it, so the
  reader sees one frame shape everywhere. 1600 × 1000 (16:10) is a reserve, allowed only if a future figure genuinely
  cannot fit 4:3; it would be the second and last ratio. 16:9 and portrait are out (16:9 is too short to read on a phone;
  portrait is too tall on desktop).
- Study photos keep their own pixels, uncropped; the page presents them in the same 4:3 plate (see READING_SPEC §4.7 and §7), so
  the reader sees one frame shape.
- **Background:** solid `#FFFFFF`, full bleed, no border and no rounded corners in the file (the page rounds the image).
- **Margins:** 96 px left and right, at least 64 px at the bottom (descenders included); the title baseline sits at
  y = 150.
- **Grid:** 12 columns across the 1408 px live area (96 → 1504), 48 px gutters. Two-panel figures use two 680 px panels
  (x 96–776 and 824–1504). Text and shapes snap to multiples of 8.
- **One focal point.** Every figure has one lifted subject (the label card, the skin slab, the pair of panels). Leave at
  least 25% of the canvas empty.
- **Every figure draws something.** The focal subject is a drawn thing: skin, a person, a hand, a product, a tool. A
  list of words in a card is not a figure, even when it is styled; if the content is a list, draw one small subject per
  item (see the step and strength recipes in §7) and keep only the noun phrases.

## 2. Type (real fonts, never a fallback)

| Role | Font (exact SVG attribute) | Size at 1600 | On a 340 px phone | Colour |
| --- | --- | --- | --- | --- |
| Title (one line, ≤ 34 characters) | `font-family="Source Serif 4 20pt" font-weight="600"`, `letter-spacing="-1"` | 88 (80–92) | ≈ 19 px | `#141414` |
| Key number / key word ("6–12 months", "years", "GLOW") | `Source Serif 4 20pt`, 600 | 64–84 | ≈ 14–18 px | `#7B2CBF` (or ink) |
| Label (panel heading, layer name, ingredient name) | `font-family="Archivo" font-weight="600"` | 58 | ≈ 12.3 px | `#141414` |
| Secondary label (description, axis, checklist) | `font-family="Archivo" font-weight="400"` | 56 | ≈ 11.9 px | `#5E5E5E`, or `#7B2CBF` when it names the accent |
| Pin numeral | Archivo 600, white, centred in a 36 px radius disc | 48 | ≈ 10 px | `#FFFFFF` on `#7B2CBF` |

- **Hard floor: 56 px** for any word (48 only for a single numeral inside a pin). Nothing smaller, ever.
- **No italics** (`font-style` never appears), no all-caps sentences and no letter-spaced uppercase labels. One
  exception: the invented product word on a drawn product (like GLOW on the jar) may be uppercase with
  `letter-spacing="4"`, because it imitates packaging, not our typography.
- **How little text:** at most **25 words including the title**, at most **10 text lines**, no sentence longer than
  6 words. Labels are noun phrases ("Top layer", "Clippers with a guard"), not explanations. The title states the
  takeaway; the caption and the guide's prose carry the detail. Never repeat the caption inside the figure.
- **How words and lines are counted** (use this rule when building and when checking): every word in every `<text>`
  counts, the title and invented packaging words (GLOW, TONING, 2%) included; a number with its unit ("1 mm+",
  "6–12 months") counts as its words. Pin numerals inside pins do not count as words or lines, because they are part
  of the drawing. A line is one row of text: a name and its value on the same baseline (read-the-label's
  "Hydroquinone  lightening agent") is one line; a two-line label is two lines. Aim for 20 words or fewer; 25 is the
  ceiling, not the target.
- Width check: Archivo 600 at 58 px is about 0.48 em per character; a 680 px panel fits about 22 characters per line.
  Source Serif 4 600 at 88 px fits about 34 characters across 1408 px.

## 3. Palette (brand plus soft neutrals; one accent)

| Token | Hex | Use |
| --- | --- | --- |
| `ink` | `#141414` | Titles, labels |
| `muted` | `#5E5E5E` | Secondary labels, axis labels, the "avoid" icon disc |
| `accent` | `#9D4EDD` | Accent fills only (timeline bars, highlights) |
| `accent-text` | `#7B2CBF` | Accent text, pins, "do" icon disc, dimension markers |
| `tint` | `#EFE4F8` | Highlighter behind a key word, soft glow behind the focal object |
| `track` | `#F1EAF8` | Empty timeline track, label panel on a jar |
| `mist` | `#FAF7FC → #F1EAF8` (vertical gradient) | "Air" above the skin in panels |
| `hairline` | `#ECE8F0` | Dividers, placeholder text bars, card edge (2 px) |
| `object` | `#E9E2F1`, `#D9CFE5`, `#CFC3DE` | Lilac-grey products and tools (jar lid, clipper guard) |
| `axis` | `#E6E1EC` | Vertical guides on a timeline |

- **One accent: purple.** No green, amber or red anywhere (no traffic lights). "Do" is a purple disc with a white tick;
  "avoid" is a `#5E5E5E` disc with a white cross. Emphasis comes from weight, the highlighter and position.
- Text colours are only `ink`, `muted` and `accent-text`, on `#FFFFFF`, `tint` or `track` (all ≥ 4.5:1).

## 4. Skin, hair and marks

Skin is a **warm, natural brown, mid-range, not over-darkened**. It is one constant tone; only marks change.

| Token | Hex | Use |
| --- | --- | --- |
| `skin-top` → `skin-base` | `#B98058` → `#A46B46` (vertical gradient) | Default skin (top layer in a cross-section, faces, hands) |
| `skin-light` | `#C8916A` | A second person, or a lit side |
| `skin-deep` | `#8A5636` | A third person, or shade; never as the default |
| `sheen` | `#CF9A72`, 6 px stroke on the surface line | The skin's surface edge |
| `basal` | `#94603F` at 55% | Line between top and deeper layer |
| `dermis` | `#EBCBB8 → #F4E2D7` | Deeper layer in a cross-section (tissue colour, not skin colour) |
| `fibre` | `#D7AE97` at 60%, 4 px | Faint fibres in the deeper layer (3–5 strokes, never a pattern) |
| `follicle` | `#E2B9A0`, 44 px round stroke | Hair pocket |
| `hair` | `#2E1C12` (or `#3B2417`), 7–11 px, round caps | Hair |
| `mark` | `#6A3B22` at 0.6–0.85, blurred `stdDeviation` 14–16 | A mark a few shades darker, same hue as the skin |
| `deep-mark` | `#76809A` / `#66708A`, blurred 16–26 | Slate blue-grey mark deeper down |
| `reaction` | `#6E3A22` at 0.75, blurred 14 | Darker area around a bump (no red: darker skin shows it as darker) |

Rules:
- **Never show a change in skin colour as success.** Fading is shown by the mark losing opacity on the same `skin-*`
  tone. No before/after where the after is lighter, no gradient that runs from darker skin to lighter skin.
- People are **stylised, never uncanny**: simple rounded silhouettes (head, neck, shoulders), profile or three-quarter,
  no drawn eyes, nostrils or lips beyond a single soft line if needed; hair as one dark shape; clothing in `object` tints.
  Use `skin-base` by default; add `skin-light` / `skin-deep` only to show more than one person. Gender-neutral by default.
- Prefer cross-sections, hands, a jaw line or products over full faces. If a face is needed, follow Humaaans' reduction.

## 5. Shape language

- **Radii:** cards and panels 40; skin slab corners 44; small tags and highlighters 20; placeholder bars and tracks
  fully rounded (radius = height / 2); jar body 72. No sharp corners anywhere.
- **Strokes:** 5 px for leader lines and dimension markers (round caps); 6 px for icons inside discs; 2 px hairline for a
  card edge. No outlines around coloured shapes; shapes are fills.
- **Shadow (the only one):** lift for the focal object:
  `<feDropShadow dx="0" dy="14–16" stdDeviation="20–22" flood-color="#2B1640" flood-opacity="0.09–0.10"/>`, with a filter
  region at least `x="-10%" y="-20%" width="120%" height="150%"` (resvg clips blurs to the filter region; too small a
  region shows a hard edge).
- **Gradients:** vertical, subtle (≤ 8% lightness shift): skin, dermis, mist, jar body. One radial `tint` glow behind a
  product. Nothing glossy, no 3D bevels.
- **Pins:** 36 px radius `#7B2CBF` disc with a white numeral; a 5 px `#7B2CBF` line to the thing it marks (add a 9 px
  white line underneath where it crosses a dark area). Repeat the same pin next to its label so the eye links them.

## 6. Icons

- 64 px circle discs (radius 30–36): `#7B2CBF` for do / check, `#5E5E5E` for avoid. White glyph, 6 px stroke, round caps
  and joins. Glyphs: tick (`l 10 10 l 19 -20`), cross, a numeral. No emoji, no filled pictograms, no brand icons.
- Product and tool shapes (jar, clipper guard, tube) are drawn in `object` tints, never in skin colours, never with a logo.

## 7. Recipes

**Invented, unbranded label** (`samples/read-the-label.svg`)
- Front: a wide, short jar (`object` lid with white ridges, `#FFFFFF → #ECE6F2` body, `track` label panel) with one
  invented word in Source Serif ("GLOW") and one claim in Archivo muted. No logo, no maker name, no real product's shape.
- Back: the lifted white card (radius 40, lift shadow, 2 px `hairline` edge). Ordinary ingredients are **placeholder bars**
  (`hairline`, 22 px tall, rounded), never invented words. Only the names the guide teaches appear as text: name in
  Archivo 600 on a `tint` highlighter (radius 20, 16–24 px padding), then what it is in `accent-text`. Registration
  details are a checklist: purple tick disc + Archivo 400 label + placeholder bar for the value.

**Timeline** (`samples/mark-depth-timeline.svg`)
- Rows, not a chart: pin + label + description on the left (x 96–700); a shared axis on the right (x 760–1504).
- Track: 28 px tall, `track` colour, fully rounded. The answer is the filled segment in `accent` with its value above it
  in Source Serif `accent-text`. Open-ended ("years") fades out with a horizontal gradient to transparent.
- 2–3 axis ticks only, in plain words ("now", "6 months", "1 year"), Archivo 56 muted, with faint `axis` guides.
- Words for time match the guide exactly (no invented numbers; "weeks" or "months" if that is all the guide says).

**Do / avoid comparison** (`samples/close-shave-vs-clipper-guard.svg`)
- Two 680 px panels. Above each: icon disc + label (Archivo 58/600) and one muted line (Archivo 56). Avoid on the left,
  do on the right.
- The panels are lifted `mist` cards (radius 40) holding the same scene drawn twice, changing only the one thing the
  guide is about. Every do / avoid figure uses this recipe, never two columns of bullet text. Examples in
  use: a close shave vs clippers with a guard (razor bumps); two fingertips squeezing a pimple vs the same pimple left
  alone (dark spots); a person kneeling on a hard floor vs on a cushion (dark knees). The skin is the same tone in both
  panels; only the action, tool or surface changes.
- Labels are the guide's own phrases ("Kneel on a cushion", "Picking or squeezing"), never a paraphrase that changes
  the advice. Advice words follow the guide exactly: if the guide says "do not use it without a prescriber's advice",
  the figure says "get advice", not a new instruction. Measurements use a purple dimension marker (5 px, end ticks) and a purple Archivo 600 value.

**Skin cross-section** (both skin samples)
- A slab whose top edge is the skin surface (gentle wave, `sheen` line), `skin-top → skin-base` top layer about 120 px
  deep, `basal` line, `dermis` below with 3–5 `fibre` strokes; a hair in its follicle for recognition. Marks are blurred
  ellipses inside the layer they belong to. Not to scale; say so in the caption, not in the figure.

**Steps in order** (`fade-dark-marks-dark-skin/four-steps-in-order.svg`)
- A row of four lifted `mist` discs (radius 150, centres 340 px apart) joined by a 14 px `track` line, each holding
  one small drawing of the step (a product set aside with the avoid disc, a spot on a skin slab, a sunscreen bottle and
  the sun, a dropper with one `accent` drop). A pin sits on each disc's upper left.
- Under each disc: the step as a two-line noun phrase, Archivo 58/600, centred. One extra line in `accent-text` only
  where the guide gives a time ("about 12 weeks").

**Strength comparison** (`niacinamide-for-black-skin/strength-card.svg`)
- The same product drawn three times, identical in size, with only the number on its label changing (Source Serif
  600, 72). The strength the guide points to gets the radial `tint` glow and its number in `accent-text`; nothing is
  coloured as a verdict. Under each: one Archivo 58/600 line and, if the guide needs a qualifier, one muted line.

**Name finder** (`check-cream-steroids-mercury-hydroquinone/names-to-look-for.svg`)
- A lifted label card of placeholder bars with a magnifying glass (lilac-grey ring and handle, white glass) over it.
  Inside the lens the names the guide teaches are enlarged (Archivo 64/600) on `tint` highlighters; a 5 px
  `accent-text` leader runs from each to what it is, in Archivo 56 `accent-text`. Use it when the guide teaches names
  to spot; use the invented label recipe when the front and back of one product are the point.

## 8. Caption style (set by the page, not drawn in the figure)

- The figure file holds **no caption, credit or "Deeper Tones" mark**. The page adds them under the image.
- Caption: 1–2 plain sentences, ≤ 30 words. First sentence = what the figure shows; second = the honest limit ("Results
  vary.", "Simple illustration, not to scale.", "This label is invented.").
- Study photos add one credit line: `Credit: <authors, journal, year> · Licence: <CC BY x.0> · Changes: <…>` with links.

## 9. Rendering: how figures are built with the real fonts

**Renderer: `@resvg/resvg-js`** (add as a devDependency), not sharp's librsvg and not Satori.
- Why: resvg renders hand-written SVG faithfully (gradients, masks, clip paths, `feGaussianBlur`, `feDropShadow` all
  checked in this repo), takes explicit font files, and can switch off system fonts so a wrong family fails loudly
  instead of falling back to Helvetica. Satori would force figures into JSX/flexbox and drops most SVG filters; sharp
  (librsvg) only sees fonts installed on the build machine, which is how v1 ended up in Helvetica.
- Fonts (OFL; `OFL.txt` must travel with them): move from `quality/samples/fonts/` to **`assets/fonts/`**:
  `Archivo-Regular.ttf`, `Archivo-Medium.ttf`, `Archivo-SemiBold.ttf` (Google Fonts static instances, family
  **`Archivo`**) and `SourceSerif4-Text-SemiBold.ttf` (Google Fonts static instance at opsz 20, wght 600, family
  **`Source Serif 4 20pt`**). The family strings are exact: `font-family="Source Serif 4"` does **not** match and would
  silently fall back.
- Build step (in `scripts/build-guides.mjs`, replacing `sharp(svg, { density })`):
  ```js
  const r = new Resvg(svgText, {
    fitTo: { mode: "width", value: 1600 },
    font: { fontFiles: [/* assets/fonts/*.ttf */], loadSystemFonts: false, defaultFontFamily: "Archivo" },
  });
  const png = r.render().asPng();          // 1600 × 1200 (or 1600 × 1000)
  await sharp(png).webp({ quality: 82 }).toFile(".../<id>.webp");          // 1600w
  await sharp(png).resize({ width: 800 }).webp({ quality: 82 }).toFile(".../<id>-800.webp"); // 800w for srcset
  ```
- The build must **fail** when an SVG: uses a `font-family` other than `Archivo` or `Source Serif 4 20pt`; has
  `font-style="italic"`; has a viewBox other than `0 0 1600 1200` (or the reserve `0 0 1600 1000`); or contains a
  `font-size` below 56 (48 allowed only on a single-character pin numeral). Fonts must be set with **attributes only**:
  the build also fails on any `<style>` element and on any `style="…"` attribute that mentions `font`, so the checks
  cannot be bypassed. `quality/samples/render.mjs` shows the font and italics checks (attributes only; the build adds
  the `<style>`/`style=` and size checks).
- Study photos skip resvg and go straight to sharp as today (never upscaled; keep the original pixels).

## 10. Checklist before a figure ships

1. Rendered with resvg + brand fonts; looked at at 1600 px and at 340 px next to `samples/compare-340-v1-vs-new.png`.
2. ≤ 25 words, ≤ 10 lines, nothing under 56 px, inside the margins (96 px sides, 64 px bottom), nothing overlapping.
3. Only purple as accent; text only in ink, muted or `#7B2CBF`.
4. Skin in the `skin-*` range; marks fade on a constant tone; nothing lighter shown as better.
5. Every word, number and time span appears in the guide text (or its sources) with the same meaning.
6. The guide's `alt` and `caption` describe the new drawing (update them when the drawing changes).

## 11. Anchor figures: words used and where they come from (for the content editor)

Every word in the three samples is from the guide. When these replace today's files, update each figure's `alt` (and the
caption where noted) so they describe the new drawing.

**is-glow-cream-bleaching / read-the-label** — words: "Read the back, not the front"; front "GLOW", "fast action" (the
invented claim already in today's figure); back "Ingredients", "Hydroquinone — lightening agent" (guide: "a
skin-lightening chemical"), "Clobetasol propionate — steroid" (guide: steroid names include clobetasol propionate),
"Calomel — mercury" (guide: mercury can appear as calomel), "NAFDAC No.", "Batch, expiry", "Maker, country" (guide: a
batch identifier, the manufacturer's name and country, dates, a NAFDAC number). Today's in-figure note "Mercury: stop
using it. Steroid, used long: get advice to stop." is dropped from the drawing.
- Proposed alt: "An invented cream jar labelled GLOW, fast action, beside its back label. In the ingredient list,
  hydroquinone is marked as a lightening agent, clobetasol propionate as a steroid and calomel as mercury. Below, a
  checklist: NAFDAC number, batch and expiry, maker and country."
- Proposed caption: "The front of a jar cannot show what is inside. Read the ingredient list and check the number,
  batch, maker and dates. If you see a mercury name, stop using it. This label is invented." (adds the guide's own
  mercury line back as text; 30 words)

**how-long-dark-spots-take-to-fade / mark-depth-timeline** — words: "Deeper marks take longer to fade"; "Top layer", "a
few shades darker", "6–12 months"; "Deeper", "slate blue or grey", "years"; axis "now", "6 months", "1 year" (guide:
"usually fades within 6 to 12 months"; deeper marks "often look slate blue or grey, and fading can take years").
- Proposed alt: "A cross-section of warm brown skin. Marker 1 is a darker brown mark in the top layer; marker 2 is a slate
  blue-grey mark deeper down. Below, a timeline: the top-layer mark usually fades in 6 to 12 months, the deeper mark can
  take years."
- Caption: keep today's ("Where the colour sits changes how long it takes to fade. Only the marks fade; your skin colour
  stays your own.").

**razor-bumps-dark-marks-jaw / close-shave-vs-clipper-guard** — words: "Close shaves can trap curly hair"; "Shaved very
close", "Tip curls back in"; "Clippers with a guard", "Tip more likely stays out", "1 mm+" (guide: "use clippers
with a guard and leave at least 1 mm of hair"; the cut tip "can curl ... and push into the skin").
- Proposed alt: "Two skin cross-sections. Left, shaved very close: the hair's sharp tip curls back into the skin and a
  darker bump forms where it enters. Right, clippers with a guard: at least 1 mm of hair is left and the tip points away
  from the skin."
- Caption: keep today's.
