import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Footer, Header } from "@/components/Brand";
import { DraftBanner, GuideCard } from "@/components/GuideBits";
import { allGuides, guidePath } from "@/lib/guides";
import { site } from "@/lib/site";

const description =
  "Plain, sourced guides on dark marks, products and routines for deeper skin tones. They describe what can be seen and what generally helps.";

// A preview build with drafts in it stays out of search.
const hasDrafts = allGuides.some((g) => g.draft);

// The newest guide spans the full row (a quiet "featured" card) when that leaves no card alone in the last row of the
// 2-column (768) and 3-column (1280) grids: that holds for 7, 13, 19 ... guides.
const featureNewest = allGuides.length > 1 && (allGuides.length - 1) % 6 === 0;

export const metadata: Metadata = {
  title: "Guides",
  description,
  alternates: { canonical: "/guides", languages: { en: "/guides", "x-default": "/guides" } },
  ...(hasDrafts && { robots: { index: false, follow: false } }),
  openGraph: {
    type: "website",
    url: "/guides",
    // A page-level openGraph replaces the root one, so restate the shared share image.
    images: ["/opengraph-image"],
    siteName: site.name,
    title: `Guides | ${site.name}`,
    description,
    locale: "en_US",
    alternateLocale: ["en_GB", "en_NG"],
  },
  twitter: { card: "summary_large_image", title: `Guides | ${site.name}`, description },
};

export default function GuidesIndex() {
  // No guides in this build: the section does not exist yet.
  if (allGuides.length === 0) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: "Guides",
        description,
        url: `${site.url}/guides`,
        inLanguage: "en",
        isPartOf: { "@id": `${site.url}/#organization` },
        mainEntity: {
          "@type": "ItemList",
          itemListElement: allGuides.map((g, i) => ({
            "@type": "ListItem",
            position: i + 1,
            url: `${site.url}${guidePath(g.slug)}`,
            name: g.title,
          })),
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: site.url },
          { "@type": "ListItem", position: 2, name: "Guides", item: `${site.url}/guides` },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <Header />
      <main className="guide-page guides-index">
        {hasDrafts && <DraftBanner />}
        <h1>Guides</h1>
        <p className="guides-intro">{description}</p>
        <div className="guides-grid">
          {allGuides.map((g, i) => (
            <GuideCard key={g.slug} guide={g} variant="index" as="h2" eager={i < 3} featured={featureNewest && i === 0} />
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
