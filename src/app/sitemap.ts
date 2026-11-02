import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: site.url, lastModified: "2026-10-26", changeFrequency: "weekly", priority: 1 },
    { url: `${site.url}/privacy`, lastModified: "2026-10-26", changeFrequency: "yearly", priority: 0.3 },
    { url: `${site.url}/terms`, lastModified: "2026-10-26", changeFrequency: "yearly", priority: 0.3 },
  ];
}
