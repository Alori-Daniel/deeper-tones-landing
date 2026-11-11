import Link from "next/link";
import { hasGuides } from "@/lib/guides";
import { isLive, site } from "@/lib/site";

export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={(size * 37) / 35} viewBox="0 0 35 37" fill="none" aria-hidden className={className}>
      <path
        d="m33.236 30.55-4.154 4.155m4.153-15.233L18.003 34.704M31.85 9.778 6.925 34.704m12.462-23.542-9.693 9.694m8.308-19.387L0 19.47M5.539 2.853 1.384 7.007"
        stroke="#9D4EDD"
        strokeWidth="2.938"
        strokeLinecap="round"
      />
    </svg>
  );
}

// `markOnlyOnPhones` is for the header: below sm only the mark shows, with the name kept for assistive tech.
export function Logo({ markOnlyOnPhones = false }: { markOnlyOnPhones?: boolean }) {
  return (
    <Link
      href="/"
      aria-label={markOnlyOnPhones ? `${site.name} home` : undefined}
      className="group flex items-center gap-2.5 whitespace-nowrap font-display text-[24px] font-semibold leading-none tracking-[-0.01em] sm:text-[26px]"
    >
      <LogoMark className="transition-transform duration-500 group-hover:rotate-[-12deg]" />
      <span className={markOnlyOnPhones ? "hidden sm:inline" : undefined}>{site.name}</span>
    </Link>
  );
}

const nav = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#your-result", label: "Your result" },
  { href: "/#step-down", label: "Step-down" },
  { href: "/#trust", label: "Trust" },
  { href: "/#faq", label: "FAQ" },
  // Only once the build has at least one guide.
  ...(hasGuides ? [{ href: "/guides", label: "Guides" }] : []),
];

// Transparent over the hero, turns to frosted glass once you scroll (pure CSS, see .site-header).
export function Header() {
  return (
    <header className="site-header fixed inset-x-0 top-0 z-50">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-6 px-5 sm:h-[72px] sm:px-8">
        <Logo markOnlyOnPhones />
        <nav aria-label="Main" className="hidden items-center gap-1 text-[14px] text-muted lg:flex">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="px-3.5 py-2 transition hover:text-foreground">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2.5">
          <a
            href={`mailto:${site.contactEmail}`}
            className="hidden h-10 items-center rounded-[10px] px-4 text-[14px] font-medium transition hover:bg-black/[0.04] sm:flex"
          >
            Contact us
          </a>
          <Link
            href="/#early-access"
            className="flex h-10 items-center gap-2 whitespace-nowrap rounded-[10px] bg-white px-4 text-[14px] font-medium shadow-[0_1px_2px_rgba(0,0,0,0.06),0_6px_18px_-8px_rgba(0,0,0,0.2)] transition hover:shadow-[0_1px_2px_rgba(0,0,0,0.06),0_10px_24px_-8px_rgba(0,0,0,0.28)]"
          >
            {isLive ? "Get the app" : "Get early access"} <span aria-hidden>↗</span>
          </Link>
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-black/[0.07]">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-12 sm:flex-row sm:items-start sm:justify-between sm:px-8">
        <div>
          <Logo />
          <p className="mt-2 text-sm text-muted">Honest skincare checks, made for deeper skin tones.</p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
          {hasGuides && <Link href="/guides" className="hover:text-foreground">Guides</Link>}
          <Link href="/privacy" className="hover:text-foreground">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-foreground">Terms</Link>
          <a href={`mailto:${site.contactEmail}`} className="hover:text-foreground">Contact</a>
        </nav>
      </div>
      <p
        aria-hidden
        className="hidden select-none whitespace-nowrap px-4 pb-5 text-center font-display text-[14vw] font-semibold leading-[1] tracking-[-0.02em] text-black/[0.06] md:block"
      >
        Deeper Tones
      </p>
      <p className="relative border-t border-black/[0.07] px-4 py-5 text-center text-sm text-muted">
        © <CopyrightYear /> {site.name}. Not medical advice. If you&apos;re worried about your skin, see a professional.
      </p>
    </footer>
  );
}

// Rendered at build time (the page is prerendered), so the year updates on the next deploy.
async function CopyrightYear() {
  return new Date().getFullYear();
}
