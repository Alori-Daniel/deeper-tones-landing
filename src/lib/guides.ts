import { guides } from "@/content/guides.generated";
import type { Guide } from "@/content/guide-types";

export type { Guide };

// Newest first; draft guides are only in the list when the build set GUIDES_SHOW_DRAFTS=1.
export const allGuides: readonly Guide[] = guides;

export const hasGuides = allGuides.length > 0;

export const publishedGuides = allGuides.filter((g) => !g.draft);

export function getGuide(slug: string) {
  return allGuides.find((g) => g.slug === slug);
}

const STOP = new Set(["a", "an", "and", "the", "to", "of", "for", "in", "on", "how", "do", "does", "is", "my", "with", "what", "your", "can", "i"]);

const words = (g: Guide) =>
  new Set(
    [g.primaryQuery, ...g.secondaryQueries]
      .join(" ")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 2 && !STOP.has(w)),
  );

// Up to three other guides, the ones sharing most search words first (newest wins ties).
export function relatedGuides(guide: Guide, limit = 3) {
  const mine = words(guide);
  return allGuides
    .filter((g) => g.slug !== guide.slug)
    .map((g, i) => ({ g, i, score: [...words(g)].filter((w) => mine.has(w)).length }))
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .slice(0, limit)
    .map((x) => x.g);
}

export const guidePath = (slug: string) => `/guides/${slug}`;

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// "2026-11-11" -> "11 Nov 2026" (index cards).
export function shortDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${SHORT_MONTHS[m - 1]} ${y}`;
}

// The thumbnail for cards: the first diagram's title-less thumbnail, else none (a study photo is never re-cropped).
export function guideThumb(guide: Guide) {
  const fig = guide.figures.find((f) => f.kind === "diagram" && f.thumb);
  return fig?.thumb ? { src: fig.thumb, width: fig.thumbWidth, height: fig.thumbHeight } : null;
}
