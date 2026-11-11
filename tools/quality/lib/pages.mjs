// Reads the compiled guide data (src/content/guides.generated.ts, JSON after the `=`) from the frozen copy.
import { readFileSync } from "node:fs";
import { join } from "node:path";

export function loadCompiledGuides(dir) {
  const src = readFileSync(join(dir, "src/content/guides.generated.ts"), "utf8");
  const marker = "export const guides: Guide[] = ";
  const i = src.indexOf(marker);
  if (i < 0) throw new Error("guides.generated.ts has an unexpected shape");
  return JSON.parse(src.slice(i + marker.length).replace(/;\s*$/, ""));
}

export const OTHER_PAGES = ["/", "/privacy", "/terms"];

export function pageList(guides) {
  return [
    ...guides.map((g) => ({ path: `/guides/${g.slug}`, kind: "guide", slug: g.slug, label: g.slug })),
    { path: "/guides", kind: "index", slug: "guides-index", label: "guides-index" },
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
