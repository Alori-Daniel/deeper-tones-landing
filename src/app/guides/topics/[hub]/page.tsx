import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Footer, Header } from "@/components/Brand";
import { DraftBanner, GuideCard } from "@/components/GuideBits";
import { allGuides, getHubModel, guidePath, hubPath, hubsWithPage } from "@/lib/guides";
import { site } from "@/lib/site";

// Only hubs with 3 or more published guides have a page; anything else, and /guides/topics itself, is a 404.
export const dynamicParams = false;

type Props = { params: Promise<{ hub: string }> };

// A preview build with drafts in it stays out of search, like /guides.
const hasDrafts = allGuides.some((g) => g.draft);

export function generateStaticParams() {
  return hubsWithPage.map((m) => ({ hub: m.hub.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const model = getHubModel((await params).hub);
  if (!model?.hasPage) return {};
  const { hub } = model;
  const path = hubPath(hub.slug);
  return {
    title: hub.title,
    description: hub.description,
    alternates: { canonical: path, languages: { en: path, "x-default": path } },
    ...(hasDrafts && { robots: { index: false, follow: false } }),
    openGraph: {
      type: "website",
      url: path,
      // A page-level openGraph replaces the root one, so restate the shared share image.
      images: ["/opengraph-image"],
      siteName: site.name,
      title: `${hub.title} | ${site.name}`,
      description: hub.description,
      locale: "en_US",
      alternateLocale: ["en_GB", "en_NG"],
    },
    twitter: { card: "summary_large_image", title: `${hub.title} | ${site.name}`, description: hub.description },
  };
}

export default async function HubPage({ params }: Props) {
  const model = getHubModel((await params).hub);
  if (!model?.hasPage) notFound();
  const { hub, visible } = model;
  const url = `${site.url}${hubPath(hub.slug)}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: hub.name,
        description: hub.description,
        url,
        inLanguage: "en",
        isPartOf: { "@id": `${site.url}/#organization` },
        mainEntity: {
          "@type": "ItemList",
          itemListElement: visible.map((g, i) => ({
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
          { "@type": "ListItem", position: 3, name: hub.name, item: url },
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
        <nav aria-label="Breadcrumb" className="guide-breadcrumb">
          <ol>
            <li>
              <Link href="/">Home</Link>
            </li>
            <li aria-hidden>›</li>
            <li>
              <Link href="/guides">Guides</Link>
            </li>
            <li aria-hidden>›</li>
            <li aria-current="page">{hub.name}</li>
          </ol>
        </nav>
        <h1 className="guides-hub-title">{hub.name}</h1>
        <p className="guides-intro">{hub.intro}</p>
        <div className="guides-grid">
          {visible.map((g, i) => (
            <GuideCard key={g.slug} guide={g} variant="index" as="h2" eager={i < 3} />
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
