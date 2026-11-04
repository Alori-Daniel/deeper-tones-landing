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
  readingMinutes: number;
  sources: GuideSource[];
  faq: GuideFaq[];
  /** The `##` headings, for the table of contents. */
  headings: GuideHeading[];
  /** Sanitised HTML from the Markdown body (raw HTML in the source is escaped, never passed through). */
  html: string;
};
