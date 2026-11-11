import type { Metadata, Viewport } from "next";
import { Archivo, Source_Serif_4 } from "next/font/google";
import { site } from "@/lib/site";
import "./globals.css";

// Two families: Source Serif 4 (variable weight, upright only) for headlines and the phone mockups,
// and Archivo for text and UI.
const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  style: "normal",
});

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
});

// Search-engine verification and analytics are switched on by build-time env vars (see .env.example).
const googleVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;
const bingVerification = process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION;
const cfBeaconToken = process.env.NEXT_PUBLIC_CF_BEACON_TOKEN;

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: site.title,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  keywords: site.keywords,
  applicationName: site.name,
  openGraph: {
    type: "website",
    siteName: site.name,
    title: site.title,
    description: site.description,
    locale: "en_US",
    alternateLocale: ["en_GB", "en_NG"],
  },
  twitter: {
    card: "summary_large_image",
    title: site.title,
    description: site.description,
  },
  robots: { index: true, follow: true },
  ...((googleVerification || bingVerification) && {
    verification: {
      ...(googleVerification && { google: googleVerification }),
      ...(bingVerification && { other: { "msvalidate.01": bingVerification } }),
    },
  }),
  // Smart App Banner on iOS Safari once the app is in the App Store.
  ...(site.appStoreUrl && {
    itunes: { appId: site.appStoreUrl.match(/id(\d+)/)?.[1] ?? "" },
  }),
};

export const viewport: Viewport = {
  themeColor: "#f1f1f1",
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sourceSerif.variable} ${archivo.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">{children}
        {cfBeaconToken && (
          <script
            defer
            src="https://static.cloudflareinsights.com/beacon.min.js"
            data-cf-beacon={JSON.stringify({ token: cfBeaconToken })}
          />
        )}
      </body>
    </html>
  );
}
