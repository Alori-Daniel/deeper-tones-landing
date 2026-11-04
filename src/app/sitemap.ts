import type { MetadataRoute } from "next";
import { publishedGuides } from "@/lib/guides";
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
