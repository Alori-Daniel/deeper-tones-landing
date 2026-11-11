// Shape of one guide in the generated module (src/content/guides.generated.ts), written by
// scripts/build-guides.mjs from content/guides/*.md. Keep the two in step.

export type GuideSource = {
  title: string;
  publisher: string;
  url: string;
  year: number;
};

export type GuideFaq = { q: string; a: string };

export type GuideHeading = { id: string; text: string };

export type GuideFigure = {
  id: string;
  kind: "diagram" | "study-photo";
  /** Public path of the generated WebP (public/guides/<slug>/<id>.webp). */
  src: string;
  width: number;
  height: number;
  alt: string;
  caption: string;
  credit: string;
  license: string;
  /** Study photos only: the article the figure comes from, and the licence page. */
  sourceUrl: string | null;
  licenseUrl: string | null;
  changes: string | null;
  /** `srcset` value naming only the WebP widths the build produced. */
  srcSet: string;
  /** `sizes` value matching the layout column (see quality/READING_SPEC.md 4.7). */
  sizes: string;
  /** Diagrams only: the 800 px WebP without its title band (<id>-thumb.webp), for index and related cards. */
  thumb: string | null;
  thumbWidth: number;
  thumbHeight: number;
};

export type Guide = {
  slug: string;
  title: string;
  description: string;
  primaryQuery: string;
  secondaryQueries: string[];
  /** ISO dates (YYYY-MM-DD). */
  published: string;
  updated: string;
  /** Same dates, formatted for display at build time ("4 November 2026"). */
  publishedLabel: string;
  updatedLabel: string;
  draft: boolean;
  reviewedBy: string | null;
  /** Shown next to the reviewer's name when set; never invented. */
  reviewerRole: string | null;
  /** 3 or 4 plain lines, the answer first; empty until the content step adds them. */
  inShort: string[];
  sourceCount: number;
  readingMinutes: number;
  sources: GuideSource[];
  faq: GuideFaq[];
  /** Figures placed in the body (already rendered into `html`); listed in the Article JSON-LD. */
  figures: GuideFigure[];
  /** The `##` headings, for the table of contents. */
  headings: GuideHeading[];
  /** Sanitised HTML from the Markdown body (raw HTML in the source is escaped, never passed through). */
  html: string;
};
