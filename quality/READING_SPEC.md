# Reading spec: guide pages and the /guides index

Goal: a calm, spacious, premium reading experience ("closer to a good banking app than a beauty counter"). One accent
(purple), Source Serif 4 for headings, Archivo for everything else, no italics anywhere. Figures follow
`ART_DIRECTION.md`. References: Oura article meta and "Reviewed by" (`inspiration/05`), Stripe docs "On this page"
(`06`), Notion guide index (`07`), NHS answer-first lede (`08`), Our World in Data captions (`09`).

Breakpoints used below: **375** (phone, < 768), **768** (tablet, 768–1179), **1280** (desktop, ≥ 1180).

---

## 1. Tokens

| Token | Value | Notes |
| --- | --- | --- |
| Page background | `#F1F1F1` (`--background`) | Keep the faint wave pattern. |
| Card | `#FFFFFF` | In short, reviewer card, related cards, figure plates. |
| Body text | `#2A2A2A` on `#F1F1F1` (12.7:1) | |
| Strong / headings | `#141414` | |
| Muted text | `#5E5E5E` (5.7:1 on paper, 6.5:1 on white) | Meta, captions, credits, breadcrumb. |
| Accent fill | `#9D4EDD` | Progress bar, dots, rules. **Never for text** (4.1:1 on paper fails AA). |
| Accent text | `#7B2CBF` (6.3:1 on paper, 5.8:1 on `#EFE4F8`) | Links, "In short" label, callout labels. |
| Tint | `#EFE4F8` (callout safety: `#F5EEFB`) | |
| Hairline | `rgba(20,20,20,0.08)` | Dividers only; cards have no borders. |
| Lift shadow | `0 1px 2px rgba(20,20,20,.04), 0 12px 32px -16px rgba(43,22,64,.18)` | The only card shadow. |
| Radii | cards 20 px, figures 20 px, callouts 16 px, chips 999 px | |
| Spacing scale | 4, 8, 12, 16, 24, 32, 48, 64, 96 px | |

**Do not use `--subtle` (`#8C8C8C`) for any text**: it is 3.0:1 on paper. Today the breadcrumb, meta line and card meta
use it; switch them to `#5E5E5E`.

## 2. Type scale

| Element | 375 | 768 | 1280 | Font |
| --- | --- | --- | --- | --- |
| H1 (guide title) | 34/1.12 | 46/1.08 | 52/1.06 | Source Serif 4, 600, `letter-spacing:-0.015em`, `text-wrap:balance`, max 20ch |
| H2 | 27/1.2, margin-top 56 | 31/1.18, margin-top 64 | 32/1.16, margin-top 72 | Source Serif 4, 600, `-0.01em` |
| H3 | 21/1.3, margin-top 32 | 22/1.3 | 23/1.3 | Source Serif 4, 600 |
| Body | **18/1.65** | **19/1.7** | **19/1.7** | Archivo 400, `#2A2A2A` |
| In short items | 18/1.55 | 19/1.55 | 19/1.55 | Archivo 400; first item 500 |
| Callout body | 17/1.6 | 18/1.6 | 18/1.6 | Archivo 400 |
| Caption | 15/1.5 | 15/1.5 | 15/1.5 | Archivo 400, `#5E5E5E` |
| Meta, breadcrumb, credit, sources | 14–15/1.5 | 15/1.5 | 15/1.5 | Archivo 400, `#5E5E5E`. Nothing below 14 px. |
| Labels ("In short", "Safety", "On this page") | 13/1.3, weight 600, `letter-spacing:0.02em`, sentence case | same | same | Archivo, `#7B2CBF` |

- **Measure:** prose `max-width: 35rem` (560 px). Measured with Archivo at 19 px (average 8.25 px per character in
  running text) that is about **68 characters**, inside 60–75. Do not use `68ch` (Archivo's `0` is narrow, so `ch`
  units overshoot to about 78 characters). The verifier re-measures at 1280.
- Paragraph spacing: 1.1em between paragraphs; lists: 0.45em between items; H2 + p: 12 px.
- **No italics:** `*, *::before, *::after { font-style: normal }` inside the guide; `em`/`i` render as weight 500.
  Fonts are loaded upright only (`style: "normal"` in `next/font`), so a stray italic cannot be synthesised either:
  add `font-synthesis: none` on `body`.

## 3. Page layout

```
1280 (≥1180)                                  768                         375
┌────────────────────────────────────────┐    ┌──────────────────────┐    ┌──────────┐
│ header (existing) + 3px progress bar    │    │ header + progress    │    │ header   │
│ ┌──────┐  ┌───────────── 736 ─────────┐ │    │  ┌──── 688 ───────┐  │    │ 20 │ 335 │
│ │ TOC  │  │ breadcrumb                │ │    │  │ breadcrumb     │  │    │ breadcrumb│
│ │ 232  │  │ H1                        │ │    │  │ H1             │  │    │ H1       │
│ │sticky│  │ reviewer card             │ │    │  │ reviewer card  │  │    │ reviewer │
│ │      │  │ In short (608)            │ │    │  │ In short       │  │    │ In short │
│ │      │  │   prose 560, centred      │ │    │  │ TOC (details)  │  │    │ TOC ▸    │
│ │      │  │ figure 736                │ │    │  │ prose 560      │  │    │ prose    │
│ └──────┘  │ callouts 608              │ │    │  │ figure 688     │  │    │ figure   │
│           └───────────────────────────┘ │    │  └────────────────┘  │    │          │
└────────────────────────────────────────┘    └──────────────────────┘    └──────────┘
```

- **1280:** a centred grid `grid-template-columns: 232px 736px; column-gap: 72px` (1040 px total). The TOC rail sits
  in column 1; the article in column 2. Inside the article, text blocks (`p, ul, ol, h2, h3, .faq, .sources`) are
  `max-width: 560px; margin-inline: auto`. Figures span the full 736. In short, callouts and the reviewer card are
  608 px wide (560 + 24 px padding each side) and centred, so their text lines up with the prose.
- **768:** single column, 688 px wide (`padding-inline: 40px`), prose 560 centred, figures 688.
- **375:** single column, `padding-inline: 20px`; everything full width (335 px). Figures keep the 20 px gutters and a
  16 px radius (no edge-to-edge bleed; it looks unfinished next to rounded cards).
- Top of article: `padding-top` 112 (375) / 136 (768+), clearing the fixed header.
- No horizontal overflow at any width: long words wrap (`overflow-wrap: anywhere` on breadcrumb and titles), tables sit
  in `.table-scroll`.

## 4. Elements, in page order

### 4.1 Reading progress
A 3 px bar fixed to the very top of the viewport, `#9D4EDD`, `z-index` above the header, `aria-hidden="true"`.
CSS only, no JavaScript (the header already uses scroll-driven animation):
```css
.reading-progress { position: fixed; inset: 0 0 auto 0; height: 3px; background: #9D4EDD;
  transform-origin: 0 50%; transform: scaleX(0); z-index: 60; }
@supports (animation-timeline: scroll()) {
  .reading-progress { animation: reading-progress linear both; animation-timeline: scroll(root); }
}
@supports not (animation-timeline: scroll()) { .reading-progress { display: none; } }
@keyframes reading-progress { to { transform: scaleX(1); } }
```
It uses `transform` only, so it causes no layout shift.

### 4.2 Breadcrumb
`Guides › <title>` is enough (drop "Home" visually; keep it in BreadcrumbList JSON-LD). 15 px, `#5E5E5E`, current item
truncated to one line on 375 with an ellipsis.

### 4.3 H1, then the reviewer card
Directly under the H1 (margin-top 20), a compact white card (radius 20, lift shadow, padding 16/20), one row on 768+,
two lines on 375:

- Left: a 40 px disc in `#EFE4F8` with the reviewer's initials in Archivo 600 15 px `#7B2CBF` (no photo, no invented
  avatar).
- Text: **Reviewed by Somtochukwu Emmanuel** (Archivo 500, 16 px, `#141414`), and under it `Updated 11 November 2026 ·
  6 min read · 13 sources` (15 px, `#5E5E5E`). Add the reviewer's role only if `reviewerRole` is set (see §6); never
  invent one.
- If `reviewedBy` is null (drafts only): "Not yet reviewed" in the same place, and the draft banner stays.
- Use `<time datetime>` for the date. This replaces today's single grey meta line.

### 4.4 "In short"
A white card (radius 20, lift shadow, padding 24/24, 28/32 at 768+), margin-top 24, before any body text.

- Label: "In short" (the label style in §2), as a `<p>`, not a heading, so the H2 order stays clean. The section has
  `aria-label="In short"`.
- 3–4 items from `inShort` (§6), each a line with an 8 px `#9D4EDD` dot. The first item is the direct answer, weight
  500. No citations or links inside (the claims are cited in the body).
- No border, no left rule, no icon. It must read as the calm summary, not an alert.

### 4.5 Table of contents
- **1280:** "On this page" rail in column 1, `position: sticky; top: 112px`, max-height `calc(100vh - 144px)` with its
  own scroll. Items: every H2, then "Questions people ask" and "Sources". 15/1.45 Archivo, `#5E5E5E`, 10 px between items,
  no numbers, no bullets. Current section: `#141414`, weight 500, with a 2 px `#9D4EDD` bar on its left. The active state
  is a small progressive-enhancement client component (IntersectionObserver over the H2 ids, under 1 KB). Without
  JavaScript the list still works as plain links.
- **375 and 768:** a `<details>` right after In short, closed by default. Summary: "On this page" + "· 7 sections" in
  muted, a chevron that rotates, 48 px tall tap target, white card radius 16. Open: the same list, 16 px, 12 px apart.
- Smooth scroll is on (`scroll-behavior: smooth`, disabled under `prefers-reduced-motion`); `scroll-padding-top` 96 px
  so headings do not hide under the header.

### 4.6 Body prose
Markdown rendered as today. Links `#7B2CBF`, 1 px underline, offset 0.18em; hover thickens to 2 px. Citations `[n]`
are 0.8em, no underline, `#7B2CBF`, linking to `#source-n`. Bold is weight 600 `#141414`. Lists: 6 px `#9D4EDD`
round markers for `ul`; numbers in `#5E5E5E` for `ol`.

### 4.7 Figures
```html
<figure class="guide-figure">
  <img src="/guides/<slug>/<id>.webp"
       srcset="/guides/<slug>/<id>-800.webp 800w, /guides/<slug>/<id>.webp 1600w"
       sizes="(min-width: 1180px) 736px, (min-width: 768px) 688px, calc(100vw - 40px)"
       width="1600" height="1200" alt="…" loading="lazy" decoding="async">
  <figcaption>…<span class="guide-figure-credit">…</span></figcaption>
</figure>
```
- Diagrams: the image itself is the white plate: `border-radius: 20px` (16 at 375), lift shadow, `width: 100%;
  height: auto`. Margin 40 px above, 32 px below the caption (48/40 on 768+).
- **Study photos:** the same 4:3 white plate (`aspect-ratio: 4 / 3; display: grid; place-items: center;
  padding: 16px`), the photo inside at its own ratio (`object-fit: contain`, `max-width: min(100%, <natural width>px)`,
  radius 12). Never cropped by CSS, never stretched, never upscaled beyond its natural width. One `srcset` entry per
  size the build actually made; no 1600w if the original is smaller.
- Caption: 15/1.5 `#5E5E5E`, max-width 560 px, aligned with the prose (centred column), 12 px under the image. Study
  photo credit on its own line: `Credit: <authors, journal, year> · Licence: <CC BY 4.0> · Changes: <…>`, 14 px,
  `#5E5E5E`, links underlined. Keep all three parts exactly as the frontmatter says.
- **Study photo size cap (sharpness, B8):** CSS width at most **0.6 × the photo's natural width**, so a 2× screen still
  gets about 1.2 device pixels per image pixel. The 617 px Dakar photo shows at most 370 px wide in its plate; the
  1600 px ochronosis photo is capped by the column instead. The plate stays 4:3 around it.
- `loading="lazy"` on every guide figure (none is in the first viewport: H1, reviewer card and In short come first).
  `width`/`height` always set, so CLS stays 0.

### 4.8 Callouts
Two kinds only, both from the content contract (§6):

- **Safety** (`<aside class="callout callout-safety" role="note">`): background `#F5EEFB`, radius 16, padding 20/24, no
  border. A 24 px `#7B2CBF` disc with a white "!" (2.5 px stroke) beside the label "Safety" (label style, §2). Body
  Archivo 18/1.6 `#141414`; citations allowed. Width 608 centred (full width on 375). Margin 32 px above and below.
- **When to see a professional** (the last H2 section, wrapped by the build): a white card, radius 20, lift shadow,
  padding 28/32 (24/20 on 375). The H2 stays a real H2 (keeps its id and TOC entry) with a 32 px `#EFE4F8` disc holding
  a `#7B2CBF` plus sign to its left. List items use the purple dot markers; the closing paragraph is `#5E5E5E`.

Both read as calm and normal (CONTEXT.md: escalation is "a normal state, not an error"): no red, no amber, no capitals.

### 4.9 Questions people ask
H2 "Questions people ask", then one `<details>` per FAQ inside a white card (radius 20), separated by hairlines. Summary =
the question in Source Serif 4 600, 19 px, with a rotating chevron (48 px tap target); answer 18/1.65 Archivo. All
closed by default; the FAQPage JSON-LD is unchanged.

### 4.10 Sources (readable but quiet)
H2 "Sources", then an ordered list, **always open** (not collapsible: `[n]` links must land on `#source-n` in every
browser, and a closed `<details>` breaks that jump). Quiet styling: 15/1.55 Archivo, numbers in `#5E5E5E` tabular
figures, title as a `#7B2CBF` link with no underline until hover, then `Publisher, year` in `#5E5E5E` on the same line.
14 px between items. `:target` highlight: a 2 s `#EFE4F8` background fade on the targeted source.

### 4.11 Call to action
Keep today's dark "Check your own shelf" card (it is part of the template, not the body), radius 20, after Sources.

### 4.12 Related guides
H2 "Related guides" (Source Serif 4, 26/32 px), then 3 cards: one column on 375; on 768 and 1280 (the 736 px article
column) two cards side by side and the third below them spanning the row as a horizontal card (thumbnail left, 40%).

Card: white, radius 20, lift shadow, overflow hidden. Thumbnail on top, **4:3**, the guide's first `diagram` figure at
800w (`<img width="800" height="600" loading="lazy" sizes="(min-width: 768px) 344px, calc(100vw - 40px)">`); fallback
the first figure of any kind; if a guide has none, the card has no image area (never a request-time image). Body
padding 20: title Source Serif 4 600 20/1.25 `#141414` (hover `#7B2CBF`), then `6 min read` 14 px `#5E5E5E`. No
description on related cards (keeps them calm).

### 4.13 Footer note
"This guide describes what can be seen and what generally helps. It is not medical advice or a diagnosis." 15 px
`#5E5E5E` (not `--subtle`).

## 5. The /guides index

- Top: keep today's H1 ("Guides") and description copy; restyle only: H1 Source Serif 4 at the H1 scale, description
  19/1.6 `#5E5E5E`, max 560 px, 48 px above the list.
- **375:** a list of rows, each a white card radius 20 (padding 16): text left (title Source Serif 4 600 19/1.25, then
  `6 min read · Updated 11 Nov 2026` 14 px muted), 4:3 thumbnail right at 104 × 78 px, radius 12.
- **768:** two-column grid of cards (thumbnail on top, 4:3, then title 21 px, 2-line description 15 px muted clamped,
  meta 14 px). Gap 24.
- **1280:** three-column grid inside a 1040 px container, same cards. The newest guide may span two columns with the
  thumbnail on the left (a quiet "featured" row); nothing else differs.
- Thumbnails come from the build output (first diagram, 800w). `width`/`height` set; lazy below the first row.

## 6. CONTENT CONTRACT (shared by the content editor and the layout builder)

The guide format in `seo-guides-contract.md` stays, with these additions. The build (`scripts/build-guides.mjs`)
enforces every **fail** rule; **warn** rules print a warning.

### 6.1 Frontmatter

```yaml
inShort:                                  # required when draft: false
  - "Dark spots on dark skin fade slowly: usually 6 to 12 months once the cause stops, and deeper ones can take years."
  - "There is no safe overnight fix."
  - "What helps: stop the cause, wear sunscreen every day and keep the routine gentle."
reviewerRole: null                        # optional; a human fills it ("Pharmacist", …); never invented
```

- `inShort`: **staged.** Until all 13 guides carry it, a missing `inShort` is a **warning**; with
  `GUIDES_REQUIRE_INSHORT=1` (set once the content step is done, and in the verifier's build) it **fails** on a
  non-draft guide. A present but malformed `inShort` always **fails**: not a list, fewer than 3 or more than 4 items, any item empty,
  any item over **160 characters**, or the items together over **480 characters**. **Fail** if an item contains `[n]`,
  a link, Markdown (`*`, `_`, `` ` ``, `[`, `]`, `#`) or HTML. The first item must answer `primaryQuery` directly.
  Every claim in it must already be in the body with a citation (the verifier checks; the build cannot).
- `reviewerRole`: **fail** if present and not `null` or a non-empty string under 60 characters.
- Generated `Guide` type gains `inShort: string[]`, `reviewerRole: string | null`, `sourceCount: number`, and each
  figure gains `srcSet: string` (and `thumb: string` for the 800w file).

### 6.2 Callouts in the body

A Markdown blockquote whose first paragraph **starts with a bold label** becomes a callout:

```markdown
> **Safety:** If you are pregnant, planning a pregnancy or breastfeeding, ask a pharmacist or doctor before adding any
> active ingredient. NHS medicines guidance says topical retinoids are not to be used in pregnancy [10].
```

- Allowed labels: exactly `Safety:` (one only, for now). It renders as `<aside class="callout callout-safety"
  role="note">` with the visible label "Safety" and the rest as the body. Citations inside stay as `[n]`.
- **fail** on any blockquote that does not start with `**Safety:**` (plain quotes are not used in guides), on an unknown
  label (for example `**Note:**`), on an empty body, or on more than **2** Safety callouts in one guide. **warn** if a
  callout body is over 60 words.
- "When to see a professional" is **not** a blockquote. It stays the section `## When to see a professional`, which
  must exist and be the **last** `##` in the body (**fail** otherwise). The build wraps that section, from its H2 to
  the end of the body, in `<section class="callout-pro" aria-labelledby="when-to-see-a-professional">`.

### 6.3 Figures

- As in `seo-figures-contract.md`, with the house style in `quality/ART_DIRECTION.md`. **fail** if a diagram SVG uses a
  font other than `Archivo` / `Source Serif 4 20pt`, has `font-style="italic"`, a viewBox other than `0 0 1600 1200` or
  `0 0 1600 1000`, or a `font-size` under 56 (48 only for a single-character pin numeral).
- The build writes `<id>.webp` (1600 w) and `<id>-800.webp`, and emits `srcset`/`sizes` as in §4.7. Study photos:
  emit the 800w file only if the original is at least 800 px wide and the 1600w file only if it is at least 1600 px;
  otherwise one file at the original width (never upscaled).
- `{{figure:id}}` placement rules are unchanged.
- Update `seo-figures-contract.md`: the font line (now the brand fonts via resvg, not Helvetica), the canvas (1600 × 1200
  or 1600 × 1000), the minimum text size (56 at 1600, not 28 at 1200), no verdict colours (purple only), and skin as a
  warm natural brown range (`#B98058 → #A46B46`, not the deep `#5a3a29` set).

### 6.4 Writing rules the build helps with (warn only)

- A paragraph with more than 4 sentences.
- More than one bold phrase in a paragraph (list lead-ins like `- **Hydroquinone:** …` are fine).
- An H2 longer than 60 characters.

## 7. Acceptance hooks (what the verifier will measure)

- **B5 (frames) counts the rendered `<figure>` frame, not the file:** diagrams are 1600 × 1200 (4:3) files; study photos
  keep their own pixels (617 × 583 and 1600 × 780) and sit in a 4:3 white plate, uncropped and never recomposited (adding
  a mat to the file would be a change under CC BY). So the page shows one frame shape.

- Body `font-size` ≥ 18 px and `line-height` ≥ 1.6 at all widths; prose line length 60–75 characters at 1280.
- One H1; H2/H3 in order; no `font-style: italic` computed anywhere; headings compute to Source Serif 4, text to Archivo.
- Every text element ≥ 4.5:1 (captions, credits, meta, TOC, sources included).
- No horizontal overflow at 375/768/1280; every `img` has `width`/`height`; CLS < 0.05; figures lazy; first figure
  served at ≤ 800w on a 375 phone.
- Present and working: progress bar, In short, TOC (sticky at 1280, collapsible below), Safety callout styling (where a
  guide has one), professional section card, reviewer card, quiet sources, related cards with thumbnails.
