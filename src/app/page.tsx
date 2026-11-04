import type { Metadata } from "next";
import { Footer, Header } from "@/components/Brand";
import { Motion } from "@/components/Motion";
import {
  Faq,
  FinalCta,
  Hero,
  HowItWorks,
  Manifesto,
  MidCta,
  ProductCheck,
  StepDown,
  Trust,
  YourResult,
  Zones,
} from "@/components/Sections";
import { faqs, site } from "@/lib/site";

// Nigeria first; UK and US variants come later.
export const metadata: Metadata = {
  alternates: { canonical: "/", languages: { "en-NG": "/", "x-default": "/" } },
  // A page's openGraph replaces the layout's whole object, so the shared fields are repeated here.
  openGraph: {
    type: "website",
    url: "/",
    siteName: site.name,
    title: site.title,
    description: site.description,
    locale: "en_NG",
  },
};

// Structured data: the app, the organisation and the FAQ (for rich results).
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${site.url}/#organization`,
      name: site.name,
      url: site.url,
      logo: `${site.url}/icon.png`,
      email: site.contactEmail,
    },
    {
      "@type": "MobileApplication",
      name: site.name,
      description: site.description,
      operatingSystem: "iOS, Android",
      applicationCategory: "HealthApplication",
      publisher: { "@id": `${site.url}/#organization` },
      countriesSupported: "NG",
    },
    {
      "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ],
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <Header />
      <main className="flex-1">
        <Hero />
        <Manifesto />
        <Zones />
        <ProductCheck />
        <HowItWorks />
        <YourResult />
        <MidCta />
        <StepDown />
        <Trust />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
      <Motion />
    </>
  );
}
