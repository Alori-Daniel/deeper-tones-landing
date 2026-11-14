import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Footer, Header } from "@/components/Brand";
import { DraftBanner, GuideCard, InShort, ReviewerCard, TocDetails } from "@/components/GuideBits";
import { GuideTocRail } from "@/components/GuideTocRail";
import { CardButton } from "@/components/Sections";
import { guideImageSize } from "@/lib/guide-og";
import { allGuides, getGuide, getHubModel, guidePath, hubPath, relatedGuides } from "@/lib/guides";
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
  // The hub joins the trail only when it has a page of its own.
  const hubModel = getHubModel(guide.hub);
  const hubCrumb = hubModel?.hasPage ? { name: hubModel.hub.name, path: hubPath(hubModel.hub.slug) } : null;

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
        image: [
          { "@type": "ImageObject", url: `${url}/opengraph-image`, ...guideImageSize },
          ...guide.figures.map((f) => ({
            "@type": "ImageObject",
            url: `${site.url}${f.src}`,
            width: f.width,
            height: f.height,
            caption: f.caption,
            ...(f.kind === "study-photo" && { creditText: f.credit, license: f.licenseUrl }),
          })),
        ],
        author: organization,
        publisher: organization,
        mainEntityOfPage: { "@type": "WebPage", "@id": url },
        ...(guide.reviewedBy && {
          reviewedBy: { "@type": "Person", name: guide.reviewedBy, ...(guide.reviewerRole && { jobTitle: guide.reviewerRole }) },
        }),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: site.url },
          { "@type": "ListItem", position: 2, name: "Guides", item: `${site.url}/guides` },
          ...(hubCrumb ? [{ "@type": "ListItem", position: 3, name: hubCrumb.name, item: `${site.url}${hubCrumb.path}` }] : []),
          { "@type": "ListItem", position: hubCrumb ? 4 : 3, name: guide.title, item: url },
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

  const toc = [
    ...guide.headings,
    { id: "faq", text: "Questions people ask" },
    { id: "sources", text: "Sources" },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <div className="reading-progress" aria-hidden="true" />
      <Header />
      <main className="guide-page guide-main">
        <GuideTocRail items={toc} />

        <div className="guide-col">
          <div className="guide-head">
            {guide.draft && <DraftBanner />}

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
                {hubCrumb && (
                  <>
                    <li>
                      <Link href={hubCrumb.path}>{hubCrumb.name}</Link>
                    </li>
                    <li aria-hidden>›</li>
                  </>
                )}
                <li aria-current="page">{guide.title}</li>
              </ol>
            </nav>

            <h1 className="guide-title">{guide.title}</h1>
          </div>
          <div className="guide-head">
            <ReviewerCard guide={guide} />
          </div>
          <InShort items={guide.inShort} />
          <TocDetails items={toc} />

          <article>
            <div className="guide-prose" dangerouslySetInnerHTML={{ __html: guide.html }} />

            <section id="faq" className="guide-faq-section" aria-labelledby="faq-title">
              <h2 id="faq-title" className="guide-section-title">Questions people ask</h2>
              <div className="guide-faq">
                {guide.faq.map((f) => (
                  <details key={f.q}>
                    <summary className="chevron">
                      <h3>{f.q}</h3>
                    </summary>
                    <div className="guide-faq-answer">
                      <p>{f.a}</p>
                    </div>
                  </details>
                ))}
              </div>
            </section>

            <section id="sources" className="guide-sources-section" aria-labelledby="sources-title">
              <h2 id="sources-title" className="guide-section-title">Sources</h2>
              <ol className="guide-sources">
                {guide.sources.map((s, i) => (
                  <li key={s.url} id={`source-${i + 1}`}>
                    <a href={s.url} target="_blank" rel="noopener">{s.title}</a>
                    {". "}
                    {s.publisher}, {s.year}
                  </li>
                ))}
              </ol>
            </section>
          </article>

          <section className="guide-cta">
            <h2 className="font-display text-[28px] font-semibold leading-[1.1] tracking-[-0.01em] sm:text-[34px]">
              Check your own shelf
            </h2>
            <p className="mt-3 max-w-[48ch] text-[18px] leading-relaxed text-[#cfcfcf]">
              Deeper Tones reads the products you already use and tells you what&apos;s helping, what&apos;s in the way
              and how to stop safely.
            </p>
            <div className="mt-6 text-foreground">
              <CardButton href="/#early-access">{isLive ? "Get the app" : "Get early access"}</CardButton>
            </div>
          </section>

          {related.length > 0 && (
            <section className="guide-related" aria-labelledby="related-guides">
              <h2 id="related-guides" className="font-display text-[26px] font-semibold leading-[1.2] tracking-[-0.01em] text-[#141414]">
                Related guides
              </h2>
              <div className="related-grid">
                {related.map((g) => (
                  <GuideCard key={g.slug} guide={g} />
                ))}
              </div>
            </section>
          )}

          <p className="guide-footnote">
            This guide describes what can be seen and what generally helps. It is not medical advice or a diagnosis.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
