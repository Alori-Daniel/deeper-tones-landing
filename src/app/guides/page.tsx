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
      <main className="mx-auto w-full max-w-4xl flex-1 px-5 pb-16 pt-28 sm:px-6 sm:pt-32">
        {hasDrafts && <DraftBanner />}
        <h1 className="font-display text-[38px] font-semibold leading-[1.1] tracking-[-0.015em] sm:text-[52px]">Guides</h1>
        <p className="mt-3 max-w-[56ch] text-lg leading-relaxed text-muted">{description}</p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {allGuides.map((g) => (
            <GuideCard key={g.slug} guide={g} />
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
