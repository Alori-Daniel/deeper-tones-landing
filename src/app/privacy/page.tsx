import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { site } from "@/lib/site";

const description =
  "How Deeper Tones collects, uses and protects your information, including face photos.";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description,
  alternates: { canonical: "/privacy", languages: { en: "/privacy", "x-default": "/privacy" } },
  openGraph: {
    type: "website",
    url: "/privacy",
    siteName: site.name,
    title: `Privacy Policy | ${site.name}`,
    description,
    locale: "en_US",
    alternateLocale: ["en_GB", "en_NG"],
    // Setting openGraph here drops the root image the page would otherwise inherit.
    images: ["/opengraph-image"],
  },
};

// Plain-language draft based on how the app works. Have it reviewed by a lawyer before launch.
export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="26 October 2026">
      <p>
        This policy explains what information Deeper Tones collects, why, and the choices you have. We&apos;ve
        written it in plain words. If anything is unclear, email us at{" "}
        <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Your goal and safety answers</strong>, such as whether you&apos;re pregnant, breastfeeding, have
          had a reaction, or use prescription treatment. We use these to leave unsafe ingredients out of your plan.
        </li>
        <li>
          <strong>Photos of your products</strong> and any descriptions you type, so we can read labels and match
          products.
        </li>
        <li>
          <strong>Face photos, only if you choose to take them.</strong> These are optional and need your clear
          consent first.
        </li>
        <li>
          <strong>Your contact details</strong>: a WhatsApp number or email address, used to sign you in with a
          one-time code and to send reminders you ask for.
        </li>
        <li>
          <strong>Your routine and progress</strong>, such as reminder times, completed routines and notes about how
          your skin feels.
        </li>
        <li>
          <strong>Early-access sign-ups</strong> on this website: your email address, so we can tell you when the
          app is ready.
        </li>
      </ul>

      <h2>Face photos</h2>
      <p>
        Face photos are stored privately. They&apos;re never used for ads and never shown to anyone unless you
        choose. To show what can be seen on your skin, photos are analysed by our skin-analysis provider, Perfect
        Corp, on our behalf. You can delete your photos at any time in the app.
      </p>

      <h2>What we don&apos;t do</h2>
      <ul>
        <li>We don&apos;t sell your information.</li>
        <li>We don&apos;t sell products, and nobody pays us to recommend them.</li>
        <li>We don&apos;t use your face photos for advertising.</li>
      </ul>

      <h2>Who we share it with</h2>
      <p>
        We use a small number of service providers to run Deeper Tones, for example for hosting, skin analysis,
        sending codes and reminders, and email. They only process your information to provide their service to us.
        We may also share information if the law requires it.
      </p>

      <h2>Keeping and deleting your information</h2>
      <p>
        We keep your information while you use Deeper Tones. You can delete face photos at any time, and you can
        ask us to delete your account and data by emailing{" "}
        <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>. You can unsubscribe from early-access
        emails using the link in any email.
      </p>

      <h2>Your rights</h2>
      <p>
        Depending on where you live, including under Nigeria&apos;s data protection law, you may have the right to
        access, correct, delete or move your information, and to withdraw consent. Email us and we&apos;ll help.
      </p>

      <h2>Not medical advice</h2>
      <p>
        Deeper Tones describes what can be seen and what your products are doing. It doesn&apos;t diagnose
        conditions. If you&apos;re worried about your skin, please see a professional.
      </p>

      <h2>Changes</h2>
      <p>If we make important changes to this policy, we&apos;ll tell you in the app or by email.</p>
    </LegalPage>
  );
}
