import type { MetadataRoute } from "next";
import { hubPath, hubsWithPage, publishedGuides } from "@/lib/guides";
import { site } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: site.url, lastModified: "2026-10-26", changeFrequency: "weekly", priority: 1 },
    { url: `${site.url}/privacy`, lastModified: "2026-10-26", changeFrequency: "yearly", priority: 0.3 },
    { url: `${site.url}/terms`, lastModified: "2026-10-26", changeFrequency: "yearly", priority: 0.3 },
    // Draft guides (preview builds only) stay out of the sitemap.
    ...(publishedGuides.length > 0
      ? [
          { url: `${site.url}/guides`, lastModified: publishedGuides[0].updated, changeFrequency: "weekly" as const, priority: 0.7 },
          // A hub page exists from 3 published guides; its lastmod is the newest of them.
          ...hubsWithPage.map((m) => ({
            url: `${site.url}${hubPath(m.hub.slug)}`,
            lastModified: m.published.map((g) => g.updated).sort().at(-1),
            changeFrequency: "weekly" as const,
            priority: 0.65,
          })),
          ...publishedGuides.map((g) => ({
            url: `${site.url}/guides/${g.slug}`,
            lastModified: g.updated,
            changeFrequency: "monthly" as const,
            priority: 0.6,
          })),
        ]
      : []),
  ];
}
