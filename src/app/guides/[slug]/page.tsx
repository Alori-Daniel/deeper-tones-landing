import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Footer, Header } from "@/components/Brand";
import { DraftBanner, GuideCard, GuideMeta } from "@/components/GuideBits";
import { CardButton } from "@/components/Sections";
import { guideImageSize } from "@/lib/guide-og";
import { allGuides, getGuide, guidePath, relatedGuides } from "@/lib/guides";
import { isLive, site } from "@/lib/site";

// Every guide is prerendered at build time; there is nothing to render on demand on Workers.
export const dynamicParams = false;

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return allGuides.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const guide = getGuide((await params).slug);
  if (!guide) return {};
  const path = guidePath(guide.slug);
  return {
    title: guide.title,
    description: guide.description,
    alternates: { canonical: path, languages: { en: path, "x-default": path } },
    // Drafts only exist in preview builds (GUIDES_SHOW_DRAFTS=1); keep them out of search.
    ...(guide.draft && { robots: { index: false, follow: false } }),
    openGraph: {
      type: "article",
      url: path,
      siteName: site.name,
      title: guide.title,
      description: guide.description,
      locale: "en_US",
    alternateLocale: ["en_GB", "en_NG"],
      publishedTime: guide.published,
      modifiedTime: guide.updated,
    },
    twitter: { card: "summary_large_image", title: guide.title, description: guide.description },
  };
}

const organization = {
  "@type": "Organization",
  "@id": `${site.url}/#organization`,
  name: site.name,
  url: site.url,
  logo: { "@type": "ImageObject", url: `${site.url}/icon.png` },
};

export default async function GuidePage({ params }: Props) {
  const guide = getGuide((await params).slug);
  if (!guide) notFound();

  const url = `${site.url}${guidePath(guide.slug)}`;
  const related = relatedGuides(guide);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "@id": `${url}#article`,
        headline: guide.title,
        description: guide.description,
        datePublished: guide.published,
        dateModified: guide.updated,
        inLanguage: "en",
        image: { "@type": "ImageObject", url: `${url}/opengraph-image`, ...guideImageSize },
        author: organization,
        publisher: organization,
        mainEntityOfPage: { "@type": "WebPage", "@id": url },
        ...(guide.reviewedBy && { reviewedBy: { "@type": "Person", name: guide.reviewedBy } }),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: site.url },
          { "@type": "ListItem", position: 2, name: "Guides", item: `${site.url}/guides` },
          { "@type": "ListItem", position: 3, name: guide.title, item: url },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: guide.faq.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
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
      <main className="mx-auto w-full max-w-[44rem] flex-1 px-5 pb-16 pt-28 sm:px-6 sm:pt-32">
        {guide.draft && <DraftBanner />}

        <nav aria-label="Breadcrumb" className="text-sm text-subtle">
          <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <li>
              <Link href="/" className="hover:text-foreground">Home</Link>
            </li>
            <li aria-hidden>›</li>
            <li>
              <Link href="/guides" className="hover:text-foreground">Guides</Link>
            </li>
            <li aria-hidden>›</li>
            <li aria-current="page" className="min-w-0 text-muted [overflow-wrap:anywhere]">{guide.title}</li>
          </ol>
        </nav>

        <article className="mt-6">
          <h1 className="font-display text-[34px] font-semibold leading-[1.1] tracking-[-0.015em] text-balance sm:text-[46px]">
            {guide.title}
          </h1>
          <GuideMeta guide={guide} />

          {guide.headings.length > 1 && (
            <nav aria-label="In this guide" className="mt-8 rounded-[14px] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
              <p className="text-sm font-medium">In this guide</p>
              <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-[15px] text-muted marker:text-subtle">
                {guide.headings.map((h) => (
                  <li key={h.id}>
                    <a href={`#${h.id}`} className="hover:text-primary hover:underline">{h.text}</a>
                  </li>
                ))}
                <li>
                  <a href="#faq" className="hover:text-primary hover:underline">Questions people ask</a>
                </li>
                <li>
                  <a href="#sources" className="hover:text-primary hover:underline">Sources</a>
                </li>
              </ol>
            </nav>
          )}

          <div className="guide-prose mt-8" dangerouslySetInnerHTML={{ __html: guide.html }} />

          <section id="faq" className="guide-prose mt-12">
            <h2>Questions people ask</h2>
            {guide.faq.map((f) => (
              <div key={f.q}>
                <h3>{f.q}</h3>
                <p>{f.a}</p>
              </div>
            ))}
          </section>

          <section id="sources" className="guide-prose mt-12">
            <h2>Sources</h2>
            <ol className="guide-sources">
              {guide.sources.map((s, i) => (
                <li key={s.url} id={`source-${i + 1}`}>
                  <a href={s.url} target="_blank" rel="noopener">{s.title}</a>
                  <span className="text-muted">
                    {" — "}
                    {s.publisher}, {s.year}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </article>

        <section className="mt-14 rounded-[20px] bg-foreground p-7 text-background sm:p-9">
          <h2 className="font-display text-[28px] font-semibold leading-[1.1] tracking-[-0.01em] sm:text-[34px]">
            Check your own shelf
          </h2>
          <p className="mt-3 max-w-[48ch] leading-relaxed text-[#afafaf]">
            Deeper Tones reads the products you already use and tells you what&apos;s helping, what&apos;s in the way
            and how to stop safely.
          </p>
          <div className="mt-6 text-foreground">
            <CardButton href="/#early-access">{isLive ? "Get the app" : "Get early access"}</CardButton>
          </div>
        </section>

        {related.length > 0 && (
          <section className="mt-14" aria-labelledby="related-guides">
            <h2 id="related-guides" className="font-display text-[26px] font-semibold tracking-[-0.01em]">
              Related guides
            </h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {related.map((g) => (
                <GuideCard key={g.slug} guide={g} />
              ))}
            </div>
          </section>
        )}

        <p className="mt-12 text-sm leading-relaxed text-subtle">
          This guide describes what can be seen and what generally helps. It is not medical advice or a diagnosis.
        </p>
      </main>
      <Footer />
    </>
  );
}
