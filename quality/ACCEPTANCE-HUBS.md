# Acceptance: topic hubs on /guides

Source: the SEO content plan, section "Site structure: four hubs". Guides are grouped into topic hubs so Google sees
topical depth and readers find the next page. Decided with the owner (12 Nov 2026): every hub is a section on
`/guides`; a hub also gets its own page once it has **3 or more published guides** (a one-guide page is thin content).

The hub map is `content/hubs.yaml` (one file, so adding a guide is one line there). Each line below is measured by
`npm run quality` and has a self-test case that must make it FAIL on a broken input.

## Data and build

- **H1.hub-map** (build + checker). `scripts/build-guides.mjs` reads `content/hubs.yaml` and fails the build when:
  - a guide file in `content/guides/` (draft or not, `_`-prefixed files excluded) is in no hub, or in more than one;
  - a hub lists a slug with no guide file;
  - a hub field is missing or out of bounds: `slug` (kebab-case, unique), `name`, `title` (≤ 60 chars),
    `description` (70–160 chars), `intro` (≤ 200 chars), `guides` (non-empty list).
  The build writes the hubs to a generated module (`src/content/hubs.generated.ts`, git-ignored like the guides one)
  and sets `hub` (the hub slug) on every generated guide. The checker line confirms on the compiled data that every
  built guide has a hub that exists, and reports each hub's published and visible guide counts.

A hub **has a page** when 3 or more of its guides are published (`draft: false`). Drafts shown in a preview build never
count toward the 3. A hub's **visible guides** are the guides of this build (published, plus drafts in a preview).

## /guides index

- **H2.index-sections.** `/guides` keeps its H1 and intro, then one `<section>` per hub that has at least one visible
  guide, in `hubs.yaml` order. Each section has:
  - an `h2` with the hub name and `id="<hub slug>"` (so `/guides#<hub slug>` lands on it); when the hub has a page,
    the name links to it;
  - the hub intro as a paragraph;
  - the hub's visible guides as cards, in `hubs.yaml` order, card titles as `h3`.
  Every visible guide is linked from exactly one card on the page, inside its own hub's section. The featured
  "newest guide spans the row" card is removed (sections replace it). Only the first section's first row of thumbnails
  loads eagerly; the rest are lazy. The JSON-LD `ItemList` keeps every guide, in the order shown.

## Hub pages: /guides/topics/<hub>

- **H3.hub-pages.** For each hub with a page: `GET /guides/topics/<slug>` is 200 with
  - `<title>` = hub `title` + " | Deeper Tones", meta description = hub `description`;
  - canonical `https://deepertones.com/guides/topics/<slug>`;
  - one `h1` = hub `name`, the intro, then the hub's visible guides as cards (titles `h2`) in `hubs.yaml` order, and
    nothing else in the list;
  - JSON-LD `CollectionPage` with an `ItemList` of those guides, and a `BreadcrumbList`;
  - `robots noindex` when the build shows drafts (same rule as `/guides`), and none otherwise;
  - listed in `/sitemap.xml` (lastmod = the newest `updated` among its published guides) in a production build.
  For each hub without a page: `/guides/topics/<slug>` is 404 and not in the sitemap. `/guides/topics` itself is 404.
  Hub pages use the same reading-page shell and card styles as `/guides`, and run through every page line the
  `/guides` index runs through (typography, overflow, contrast, CLS, Lighthouse).

## Guide pages

- **H4.breadcrumbs.** On every guide page and hub page the visible breadcrumb (`nav[aria-label="Breadcrumb"]`) and the
  JSON-LD `BreadcrumbList` name the same items, with the same URLs, in the same order:
  - guide in a hub with a page: Home › Guides › *hub name* (→ hub page) › *guide title*;
  - guide in a hub without a page: Home › Guides › *guide title* (as today);
  - hub page: Home › Guides › *hub name*.
- **H4.breadcrumb-title** (browser, every viewport). The current item of the visible breadcrumb shows at least 120 px
  (or all of it, when shorter): a long hub name must never squeeze the guide title away on a phone. Added after review
  measured the title at 0–17 px at 360–375 px.
- **H5.related-same-hub.** "Related guides" shows up to 3 other visible guides: first the guide's hub siblings (ranked
  by shared search words, as today), then other guides. The line passes when the related list starts with
  min(3, number of visible siblings) guides from the same hub.

## Site-wide

- **H6.internal-links.** Every `href` beginning `/guides` (or `https://deepertones.com/guides`) on every page the
  run fetched resolves to 200 (fragments ignored). Lists every broken one.

## Not in this change

- In-body links between guides, and a line requiring every published guide to have at least one in-body inbound
  link: the next PR (content edits in reviewed guides; the owner sees the exact wording).
- A page for "Men and shaving": arrives automatically when it has 3 published guides.
