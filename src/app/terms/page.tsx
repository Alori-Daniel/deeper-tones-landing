import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/LegalPage";
import { site } from "@/lib/site";

const description =
  "The terms for using the Deeper Tones app and website.";

export const metadata: Metadata = {
  title: "Terms",
  description,
  alternates: { canonical: "/terms", languages: { "en-NG": "/terms", "x-default": "/terms" } },
  openGraph: {
    type: "website",
    url: "/terms",
    siteName: site.name,
    title: `Terms | ${site.name}`,
    description,
    locale: "en_NG",
    // Setting openGraph here drops the root image the page would otherwise inherit.
    images: ["/opengraph-image"],
  },
};

// Plain-language draft based on how the app works. Have it reviewed by a lawyer before launch.
export default function TermsPage() {
  return (
    <LegalPage title="Terms" updated="26 October 2026">
      <p>
        These terms cover your use of the Deeper Tones app and this website. By using them, you agree to these
        terms and our <Link href="/privacy">Privacy Policy</Link>.
      </p>

      <h2>What Deeper Tones is</h2>
      <p>
        Deeper Tones helps you understand how the skincare products you use fit the goal you set, and gives you a
        simple routine to follow. It is general information, not medical advice. It doesn&apos;t diagnose,
        treat or cure any condition.
      </p>

      <h2>Your health comes first</h2>
      <ul>
        <li>Patch-test new products and stop using anything that causes pain, burning or a reaction.</li>
        <li>See a doctor or dermatologist if something is painful, spreading or worrying you.</li>
        <li>Answer the safety questions honestly so we can leave out ingredients that aren&apos;t safe for you.</li>
        <li>
          Step-down schedules are checked by a qualified person, but your skin is your own. Stop and seek help if
          things get worse instead of better.
        </li>
      </ul>

      <h2>Your account</h2>
      <p>
        You sign in with a one-time code sent to your WhatsApp number or email. Keep access to that number or
        inbox secure, and don&apos;t use someone else&apos;s.
      </p>

      <h2>Product information</h2>
      <p>
        We read labels and match products to our catalogue as carefully as we can, but labels can be unclear and
        products change. Always check the label yourself. Nobody pays us to recommend products or to appear in
        our results.
      </p>

      <h2>Paid features</h2>
      <p>
        The core of Deeper Tones is free. We plan to offer an optional paid plan with extra features. Prices and
        terms will be shown clearly before you pay.
      </p>

      <h2>Fair use</h2>
      <p>
        Please don&apos;t misuse the app, upload photos of other people without their permission, or try to
        interfere with how the service works.
      </p>

      <h2>Changes and contact</h2>
      <p>
        We may update these terms as the app grows and will tell you about important changes. Questions? Email{" "}
        <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>.
      </p>
    </LegalPage>
  );
}
