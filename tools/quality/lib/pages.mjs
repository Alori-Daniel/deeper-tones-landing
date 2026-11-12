// Reads the compiled guide data (src/content/guides.generated.ts, JSON after the `=`) from the frozen copy.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export function loadCompiledGuides(dir) {
  const src = readFileSync(join(dir, "src/content/guides.generated.ts"), "utf8");
  const marker = "export const guides: Guide[] = ";
  const i = src.indexOf(marker);
  if (i < 0) throw new Error("guides.generated.ts has an unexpected shape");
  return JSON.parse(src.slice(i + marker.length).replace(/;\s*$/, ""));
}

// Reads the compiled hubs (src/content/hubs.generated.ts, `export const hubs: Hub[] = ` then JSON) from the frozen copy.
// Returns null when the build did not write the module (quality/ACCEPTANCE-HUBS.md H1 reports that as a FAIL); a file
// that exists but has an unexpected shape throws, like loadCompiledGuides.
export function loadCompiledHubs(dir) {
  const p = join(dir, "src/content/hubs.generated.ts");
  if (!existsSync(p)) return null;
  const src = readFileSync(p, "utf8");
  const marker = "export const hubs: Hub[] = ";
  const i = src.indexOf(marker);
  if (i < 0) throw new Error("hubs.generated.ts has an unexpected shape");
  return JSON.parse(src.slice(i + marker.length).replace(/;\s*$/, ""));
}

export const HUB_PAGE_MIN = 3; // a hub gets its own page at /guides/topics/<slug> from this many published guides

// One entry per hub, in hubs.yaml order: the guides of this build in the hub's own order (`visible`), the published
// ones among them (`published`), and whether the hub has a page. Drafts never count toward the page threshold.
export function hubModels(hubs, guides) {
  const bySlug = new Map(guides.map((g) => [g.slug, g]));
  return (hubs ?? []).map((hub) => {
    const visible = (hub.guides ?? []).map((s) => bySlug.get(s)).filter(Boolean);
    const published = visible.filter((g) => !g.draft);
    return { hub, visible, published, hasPage: published.length >= HUB_PAGE_MIN, path: `/guides/topics/${hub.slug}` };
  });
}

export const OTHER_PAGES = ["/", "/privacy", "/terms"];

export function pageList(guides, hubs = null) {
  return [
    ...guides.map((g) => ({ path: `/guides/${g.slug}`, kind: "guide", slug: g.slug, label: g.slug })),
    { path: "/guides", kind: "index", slug: "guides-index", label: "guides-index" },
    // hub pages that must exist (3+ published guides): same page lines as the /guides index
    ...hubModels(hubs, guides).filter((m) => m.hasPage).map((m) => ({ path: m.path, kind: "hub", slug: `topic-${m.hub.slug}`, label: `topic-${m.hub.slug}` })),
    ...OTHER_PAGES.map((p) => ({ path: p, kind: "other", slug: p === "/" ? "home" : p.slice(1), label: p === "/" ? "home" : p.slice(1) })),
  ];
}

export function decodeEntities(s) {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
    .replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
}
export const htmlText = (html) => decodeEntities(html.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<style[\s\S]*?<\/style>/g, "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ");
