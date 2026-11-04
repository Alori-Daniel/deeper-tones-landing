import Image from "next/image";
import { faqs, isLive, resultGroups, site, steps, trust } from "@/lib/site";
import { LogoMark } from "./Brand";
import {
  FaceContent,
  GoalContent,
  HomeContent,
  PhoneFrame,
  PlanContent,
  ResultScreen,
  SafetyContent,
  ScanContent,
} from "./PhoneMockups";
import { CloudFilters, Clouds, Landscape } from "./Scene";
import { WaitlistForm } from "./WaitlistForm";

const toneText = {
  success: "text-success",
  muted: "text-muted",
  caution: "text-caution",
  danger: "text-danger",
} as const;

const toneBar = {
  success: "bg-success",
  muted: "bg-subtle",
  caution: "bg-caution",
  danger: "bg-danger",
} as const;

const d = (ms: number) => ({ "--d": `${ms}ms` }) as React.CSSProperties;

// Bracketed label, e.g. ( HOW IT WORKS ). Used for section labels and inline in big type.
function Tag({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`tag ${className}`}>
      <span className="tag-bracket">(</span>
      <span className="tag-text">{children}</span>
      <span className="tag-bracket">)</span>
    </span>
  );
}

function Display({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <h2 className={`font-display text-[40px] font-semibold leading-[1.08] tracking-[-0.015em] text-balance sm:text-[56px] lg:text-[68px] ${className}`}>
      {children}
    </h2>
  );
}

// White "card" button from the references: soft shadow, arrow.
export function CardButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="group inline-flex h-12 items-center gap-3 rounded-[10px] bg-white px-5 text-[15px] font-medium shadow-[0_1px_2px_rgba(0,0,0,0.06),0_8px_24px_-8px_rgba(0,0,0,0.18)] transition hover:shadow-[0_1px_2px_rgba(0,0,0,0.06),0_14px_30px_-10px_rgba(0,0,0,0.25)]"
    >
      {children}
      <span aria-hidden className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5">
        ↗
      </span>
    </a>
  );
}

function StoreButtons() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      {site.appStoreUrl && <CardButton href={site.appStoreUrl}>Download on the App Store</CardButton>}
      {site.playStoreUrl && <CardButton href={site.playStoreUrl}>Get it on Google Play</CardButton>}
    </div>
  );
}

function SignUp({ id }: { id: string }) {
  return isLive ? <StoreButtons /> : <WaitlistForm id={id} />;
}

// ---------------------------------------------------------------------------------------------
// Hero: the phone rises out of the clouds over a lavender field as you scroll.

export function Hero() {
  return (
    <section data-pin className="hero relative h-[190vh]">
      <CloudFilters />
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <Landscape />
        <Clouds layer="back" className="hero-cloud-back absolute inset-x-[-10%] bottom-[14%] h-[34%]" />

        <div className="hero-copy relative mx-auto h-full max-w-6xl border-x border-black/[0.07] px-5 pt-24 sm:px-8 sm:pt-28 lg:pt-32">
          <h1 className="text-center font-display text-[28px] min-[375px]:text-[32px] sm:text-[clamp(36px,5.6vw,84px)] font-semibold leading-[1.08] tracking-[-0.015em]">
            <span className="line-mask block">
              <span className="line-in block" style={d(150)}>
                Find out what your
              </span>
            </span>
            <span className="line-mask block">
              <span className="line-in block" style={d(260)}>
                skincare is <span className="text-primary">really</span> doing.
              </span>
            </span>
          </h1>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:mt-0">
            <div className="hero-in max-w-[19rem] lg:absolute lg:left-8 lg:top-[45%]" style={d(500)}>
              <p className="text-[15px] leading-relaxed text-muted">
                Point your camera at your shelf. We&apos;ll tell you honestly what&apos;s helping, what&apos;s in the way,
                and build a routine for deeper skin.
              </p>
              <div className="mt-6">
                <CardButton href="#early-access">{isLive ? "Get the app" : "Get early access"}</CardButton>
              </div>
            </div>
            <div
              className="hero-in hidden max-w-[15rem] text-right sm:block sm:justify-self-end lg:absolute lg:right-8 lg:top-[45%]"
              style={d(620)}
            >
              <LogoMark size={22} className="ml-auto" />
              <p className="mt-3 text-[15px] leading-snug">
                Made for melanin-rich skin.
                <span className="text-muted"> Nigeria first, then the UK and US. Join early access wherever you are.</span>
              </p>
            </div>
          </div>
        </div>

        <div className="hero-phone absolute bottom-0 left-1/2">
          <PhoneFrame tilt={null}>
            <HomeContent />
          </PhoneFrame>
        </div>

        {/* White mist so the phone dissolves into the cloud bank instead of showing through gaps. */}
        <div aria-hidden className="hero-mist absolute inset-x-0 bottom-0 h-[14%] sm:h-[26%] bg-gradient-to-t from-white via-white/85 to-transparent" />
        <Clouds layer="mid" className="hero-cloud-mid absolute inset-x-[-10%] bottom-[-14%] h-[24%] sm:bottom-[-6%] sm:h-[32%]" />
        <Clouds layer="front" className="hero-cloud-front absolute inset-x-[-10%] bottom-[-24%] h-[26%] sm:bottom-[-16%] sm:h-[34%]" />
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------------------------
// Manifesto: one plain statement, with the three promises as chips underneath.

const promises = ["Honestly", "Every label", "No sponsors"];

export function Manifesto() {
  return (
    <section className="relative px-5 py-28 sm:px-8 sm:py-44">
      <div data-reveal className="mx-auto max-w-4xl text-center">
        <h2 className="font-display text-[34px] font-semibold leading-[1.1] tracking-[-0.015em] sm:text-[52px] lg:text-[64px] text-balance">
          We check what&apos;s on your shelf against the skin you want.
        </h2>
        <ul className="mt-8 flex flex-wrap justify-center gap-2">
          {promises.map((t) => (
            <li
              key={t}
              className="rounded-full border border-black/[0.12] bg-white/70 px-3.5 py-1.5 text-[12px] font-medium uppercase tracking-[0.1em]"
            >
              {t}
            </li>
          ))}
        </ul>
      </div>
      <div data-reveal className="mx-auto mt-12 max-w-md text-center">
        <p className="text-[17px] leading-relaxed text-muted">
          Two serums doing the same job. An acid cancelling out your treatment. A &quot;toning&quot; cream thinning your
          skin. Deeper Tones shows you which, and what to do instead.
        </p>
        <a href="#how-it-works" className="mt-7 inline-block text-xl font-medium underline decoration-1 underline-offset-[6px]">
          See how it works
        </a>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------------------------
// Zones: a staggered strip of crops, each read separately.

const zones = [
  { name: "Full face", note: "Your day-one baseline", origin: "50% 34%", scale: 1.25, box: [50, 34], lift: "lg:mt-16", speed: 0.04 },
  { name: "Forehead", note: "Texture", origin: "54% 22%", scale: 2, box: [54, 22], lift: "lg:mt-28", speed: -0.03 },
  { name: "Cheeks", note: "Uneven tone", origin: "63% 40%", scale: 2, box: [63, 40], lift: "lg:mt-0", speed: 0.07 },
  { name: "Jawline", note: "Dark marks", origin: "53% 50%", scale: 2, box: [53, 50], lift: "lg:mt-20", speed: -0.02 },
];

export function Zones() {
  return (
    <section className="relative overflow-hidden border-t border-black/[0.07]">
      <div className="mx-auto max-w-6xl px-5 py-28 sm:px-8 sm:py-36">
        <div className="grid items-end gap-8 lg:grid-cols-[1.2fr_1fr]">
          <div data-reveal>
            <Tag>Face photos, if you want</Tag>
            <Display className="mt-6">
              Read zone <span className="text-primary">by zone.</span>
            </Display>
          </div>
          <p data-reveal className="max-w-sm text-[15px] leading-relaxed text-muted lg:justify-self-end" style={d(120)}>
            A guided camera checks light, distance and angle, then shows what can be seen today. We describe, we don&apos;t
            diagnose. Photos stay private and you can delete them any time.
          </p>
        </div>

        {/* Phones: one row of equal cards you swipe through (the next one peeks); sm+: the grid.
            The scroller is a focusable region so keyboard users can arrow through it. */}
        <div
          role="region"
          aria-label="Face zones"
          tabIndex={0}
          className="-mx-5 mt-12 snap-x snap-mandatory overflow-x-auto px-5 pb-2 outline-offset-[-3px] [scrollbar-width:none] focus-visible:outline-2 focus-visible:outline-primary sm:mx-0 sm:mt-16 sm:overflow-visible sm:px-0 sm:pb-0 [&::-webkit-scrollbar]:hidden"
        >
        <ul className="flex gap-3 sm:grid sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          {zones.map((z, i) => (
            <li key={z.name} className={`w-[68%] shrink-0 snap-start scroll-ml-5 sm:w-auto sm:shrink ${z.lift}`} data-speed={z.speed}>
              <div data-reveal className="zone-card group relative aspect-[3/4] overflow-hidden rounded-[14px] bg-[#1b1512]" style={d(i * 90)}>
                <Image
                  src="/onboardimg.png"
                  alt={`${z.name}, close up`}
                  fill
                  sizes="(min-width: 1024px) 270px, (min-width: 640px) 50vw, 68vw"
                  className="photo-lift object-cover object-top"
                  style={{ transformOrigin: z.origin, scale: z.scale }}
                />
                <span className="zone-box" style={{ left: `${z.box[0]}%`, top: `${z.box[1]}%` }} />
              </div>
              <div className="mt-3 flex items-baseline justify-between gap-3 text-[13px]">
                <span className="shrink-0 whitespace-nowrap font-medium">{z.name}</span>
                <span className="min-w-0 text-right text-muted">{z.note}</span>
              </div>
            </li>
          ))}
        </ul>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------------------------
// Product check: the phone turns while its findings lift off the screen in 3D.

const chips = [
  { name: "Vitamin C serum", group: "Helping", tone: "success", x: -168, y: 96, z: 150, start: 0.12 },
  { name: "\"Toning\" body cream", group: "Likely the problem", tone: "danger", x: 196, y: 210, z: 190, start: 0.22 },
  { name: "Two niacinamide serums", group: "Redundant", tone: "muted", x: -196, y: 330, z: 110, start: 0.32 },
  { name: "AHA + retinol, same night", group: "Conflicting", tone: "caution", x: 176, y: 448, z: 160, start: 0.42 },
] as const;

export function ProductCheck() {
  return (
    <section data-pin className="explode relative h-[260vh] border-t border-black/[0.07]">
      <div className="sticky top-0 flex h-[100svh] items-center overflow-hidden">
        <div aria-hidden className="watermark absolute inset-x-0 top-1/2 hidden -translate-y-1/2 text-center font-display text-[20vw] font-semibold leading-none md:block">
          Your shelf
        </div>
        <div className="relative mx-auto grid w-full max-w-6xl items-center gap-10 px-5 sm:px-8 lg:grid-cols-[1fr_auto_1fr]">
          <div>
            <Tag>Product check</Tag>
            <Display className="mt-6">
              Every label, <span className="text-primary">read.</span>
            </Display>
            <p className="mt-6 max-w-xs text-[15px] leading-relaxed text-muted">
              Photograph one product or your whole shelf. No label? Describe it, and we&apos;ll flag anything to be careful
              with.
            </p>
            <p className="mt-4 max-w-xs text-[13px] text-subtle">Every product lands in one of five groups.</p>
          </div>

          <div className="explode-stage justify-self-center">
            <PhoneFrame
              tilt={null}
              extras={chips.map((c) => (
                <div
                  key={c.name}
                  className="chip"
                  style={
                    {
                      "--x": `${c.x}px`,
                      "--zt": `${c.z}px`,
                      "--start": c.start,
                      top: `${c.y}px`,
                    } as React.CSSProperties
                  }
                >
                  <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${toneBar[c.tone]}`} />
                  <span>
                    <span className="block text-[13px] font-medium leading-tight">{c.name}</span>
                    <span className={`block text-[12px] ${toneText[c.tone]}`}>{c.group}</span>
                  </span>
                </div>
              ))}
            >
              <ScanContent />
            </PhoneFrame>
          </div>

          <div aria-hidden className="hidden lg:block" />
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------------------------
// How it works: vertical scroll drives a horizontal track of 3D phones on desktop.

const stepScreens = [GoalContent, SafetyContent, ScanContent, FaceContent, PlanContent];

export function HowItWorks() {
  return (
    <section id="how-it-works" data-pin className="steps-pin relative border-t border-black/[0.07] lg:h-[480vh]">
      <div className="flex flex-col lg:sticky lg:top-0 lg:h-[100svh] lg:overflow-hidden">
        <div
          aria-hidden
          className="watermark pointer-events-none absolute inset-x-0 top-[14%] hidden text-center font-display text-[16vw] font-semibold leading-none lg:block"
        >
          How it works
        </div>
        <div className="relative mx-auto flex w-full max-w-6xl items-end justify-between gap-6 px-5 pt-24 sm:px-8 lg:pt-28">
          <div>
            <Tag>How it works</Tag>
            <Display className="mt-6 lg:text-[60px]">
              Five steps, <span className="text-primary">no account</span> to start.
            </Display>
          </div>
          <div className="hidden w-40 pb-4 lg:block">
            <div className="h-px bg-black/10">
              <div className="steps-progress h-px bg-foreground" />
            </div>
          </div>
        </div>

        <ol
          data-track
          className="steps-track relative mt-8 flex flex-col gap-14 px-5 pb-14 sm:mt-14 sm:gap-24 sm:px-8 sm:pb-24 lg:mt-auto lg:w-max lg:flex-row lg:gap-0 lg:px-[max(2rem,calc((100vw_-_72rem)/2_+_2rem))] lg:pb-8"
        >
          {steps.map((s, i) => {
            const Screen = stepScreens[i];
            return (
              <li
                key={s.title}
                className="grid items-center gap-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-10 lg:w-[min(76vw,960px)] lg:pr-24"
                style={{ "--i": i } as React.CSSProperties}
              >
                <div>
                  <p className="font-display text-[44px] font-semibold leading-none tracking-[-0.01em] text-primary sm:text-[88px] lg:text-[112px]">0{i + 1}</p>
                  <h3 className="mt-3 font-display text-[28px] font-semibold leading-[1.1] tracking-[-0.01em] sm:mt-6 sm:text-[38px]">{s.title}</h3>
                  <p className="mt-4 max-w-sm text-[16px] leading-relaxed text-muted">{s.body}</p>
                </div>
                <div className="step-phone h-[620px] justify-self-center lg:h-[500px]">
                  <PhoneFrame tilt={-6} className="origin-top lg:scale-[0.82]">
                    <div className="h-[500px]">
                      <Screen />
                    </div>
                  </PhoneFrame>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------------------------

export function YourResult() {
  const shelf = ["success", "success", "success", "muted", "caution", "caution", "danger"] as (keyof typeof toneBar)[];
  const counts = [3, 1, 2, 1, 1];
  return (
    <section id="your-result" className="relative overflow-hidden border-t border-black/[0.07] bg-white">
      <div className="mx-auto grid max-w-6xl items-center gap-16 px-5 py-28 sm:px-8 sm:py-36 lg:grid-cols-[1.15fr_1fr]">
        <div>
          <div data-reveal>
            <Tag>Your result</Tag>
            <Display className="mt-6">
              Sorted, <span className="text-primary">honestly.</span>
            </Display>
            <p className="mt-6 max-w-md text-[16px] leading-relaxed text-muted">
              See how many of your products are working toward your goal and how many are getting in the way, grouped so
              you know what to keep, change or stop.
            </p>
          </div>

          <div data-reveal className="shelf mt-14" style={d(120)}>
            <div className="flex items-baseline justify-between text-[13px]">
              <p className="text-muted">Example shelf, 7 products</p>
              <p className="text-muted">
                <span className="font-semibold text-foreground" data-count="4">
                  4
                </span>{" "}
                in the way
              </p>
            </div>
            <div className="mt-4 flex h-1.5 gap-1">
              {shelf.map((t, i) => (
                <span key={i} className={`shelf-seg h-full flex-1 rounded-full ${toneBar[t]}`} style={d(250 + i * 70)} />
              ))}
            </div>
            <ul className="mt-8 border-t border-black/[0.08]">
              {resultGroups.map((g, i) => (
                <li key={g.title} className="flex items-center gap-4 border-b border-black/[0.08] py-4">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${toneBar[g.tone]}`} />
                  <h3 className={`w-44 shrink-0 font-medium ${toneText[g.tone]}`}>{g.title}</h3>
                  <p className="hidden flex-1 text-[14px] text-muted sm:block">{g.body}</p>
                  <span className="ml-auto font-display text-2xl font-semibold tabular-nums" data-count={counts[i]}>
                    {counts[i]}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="flex justify-center" data-speed="-0.1">
          <ResultScreen tilt={12} />
        </div>
      </div>
    </section>
  );
}

// One compact nudge right after the result, while the payoff is fresh.
export function MidCta() {
  return (
    <section className="border-t border-black/[0.07]">
      <div
        data-reveal
        className="mx-auto flex max-w-6xl flex-col items-center gap-5 px-5 py-14 text-center sm:flex-row sm:justify-between sm:px-8 sm:py-16 sm:text-left"
      >
        <p className="max-w-md font-display text-[24px] font-semibold leading-[1.15] tracking-[-0.01em] sm:text-[30px]">
          Ready to see what your own shelf is doing?
        </p>
        <CardButton href="/#early-access">{isLive ? "Get the app" : "Get early access"}</CardButton>
      </div>
    </section>
  );
}

export function StepDown() {
  const weeks = [
    { label: "Weeks 1–2", body: "Every other night", w: "100%" },
    { label: "Weeks 3–4", body: "Twice a week", w: "66%" },
    { label: "Week 5", body: "Once a week", w: "33%" },
    { label: "Week 6", body: "Stop", w: "4%" },
  ];
  return (
    <section id="step-down" className="border-t border-black/[0.07]">
      <div className="mx-auto grid max-w-6xl gap-16 px-5 py-28 sm:px-8 sm:py-36 lg:grid-cols-2">
        <div data-reveal>
          <Tag>Step-down, safely</Tag>
          <Display className="mt-6">
            A process, <span className="text-primary">not a day.</span>
          </Display>
          <p className="mt-6 max-w-md text-[16px] leading-relaxed text-muted">
            Stopping a strong cream suddenly can make skin flare. If something on your shelf is too strong, your plan
            reduces it gradually, so the rough days are expected, not a surprise.
          </p>
          <p className="mt-8 text-[14px] text-muted">
            <span className="text-success">✓</span> Every schedule is checked by a qualified person before you see it.
          </p>
        </div>
        <ul data-reveal className="stepdown self-end border-t border-black/[0.08]" style={d(150)}>
          {weeks.map((w, i) => (
            <li
              key={w.label}
              className="grid grid-cols-[100px_1fr] items-center gap-x-6 gap-y-2 border-b border-black/[0.08] py-6 sm:grid-cols-[110px_1fr_130px]"
            >
              <span className="font-display text-xl font-semibold leading-tight">{w.label}</span>
              <span className="h-9 rounded-[6px] bg-black/[0.04]">
                <span
                  className="stepdown-bar block h-full rounded-[6px] bg-primary"
                  style={{ "--w": w.w, "--d": `${300 + i * 150}ms` } as React.CSSProperties}
                />
              </span>
              <span className="col-span-2 text-[15px] text-muted sm:col-span-1 sm:text-right">{w.body}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function Trust() {
  return (
    <section id="trust" className="border-t border-black/[0.07]">
      <div className="mx-auto max-w-6xl px-5 py-28 text-center sm:px-8 sm:py-40">
        <Tag>Why you can trust it</Tag>
        <blockquote
          data-reveal
          className="mx-auto mt-8 max-w-5xl font-display text-[clamp(30px,5vw,68px)] font-semibold leading-[1.1] tracking-[-0.015em]"
        >
          No safe product changes your natural colour,{" "}
          <span className="text-primary">and we won&apos;t suggest anything that tries.</span>
        </blockquote>
        <ul className="mt-24 grid gap-px overflow-hidden rounded-[14px] border border-black/[0.08] bg-black/[0.08] text-left sm:grid-cols-2 lg:grid-cols-4">
          {trust.map((t, i) => (
            <li key={t.title} data-reveal className="bg-background p-7" style={d(i * 90)}>
              <h3 className="font-display text-[24px] font-semibold leading-tight">{t.title}</h3>
              <p className="mt-3 text-[14px] leading-relaxed text-muted">{t.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function Faq() {
  return (
    <section id="faq" className="border-t border-black/[0.07]">
      <div className="mx-auto grid max-w-6xl gap-12 px-5 py-28 sm:px-8 sm:py-36 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <Tag>FAQ</Tag>
          <Display className="mt-6">
            Asked, <span className="text-primary">answered.</span>
          </Display>
          <p className="mt-6 text-muted">
            Something else?{" "}
            <a href={`mailto:${site.contactEmail}`} className="text-foreground underline underline-offset-4">
              Email us
            </a>
          </p>
        </div>
        <div className="border-t border-black/[0.08]">
          {faqs.map((f) => (
            <details key={f.q} className="faq group border-b border-black/[0.08] py-6">
              <summary className="flex cursor-pointer items-center justify-between gap-4 text-[19px] font-medium">
                <h3>{f.q}</h3>
                <span className="text-2xl font-light text-muted transition duration-300 group-open:rotate-45">+</span>
              </summary>
              <p className="max-w-xl pt-3 text-[15px] leading-relaxed text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

// Closing scene: back to the lavender field, clouds rolling in under the form.
export function FinalCta() {
  return (
    <section id="early-access" className="relative isolate overflow-hidden">
      <Landscape />
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_55%_45%_at_50%_50%,rgb(241_241_241/0.92),rgb(241_241_241/0.5)_55%,transparent_80%)]" />
      <div className="relative mx-auto flex min-h-[100svh] max-w-6xl flex-col items-center justify-center border-x border-black/[0.07] px-5 pb-56 pt-28 text-center sm:px-8">
        <Tag>Early access</Tag>
        <h2 data-reveal className="mt-8 font-display text-[clamp(38px,6.4vw,96px)] font-semibold leading-[1.08] tracking-[-0.015em]">
          Calm skin starts with
          <br className="hidden sm:block" />{" "}
          knowing <span className="text-primary">your shelf.</span>
        </h2>
        <p data-reveal className="mt-6 max-w-md text-[16px] text-muted" style={d(120)}>
          {isLive
            ? "Download Deeper Tones and check your products in a few minutes."
            : "Join early access and we'll let you know the moment Deeper Tones is ready."}
        </p>
        <div data-reveal className="mt-9 flex w-full justify-center" style={d(200)}>
          <SignUp id="footer" />
        </div>
      </div>
      <Clouds layer="mid" className="absolute inset-x-[-10%] bottom-[-8%] h-[30%]" />
      <Clouds layer="front" className="absolute inset-x-[-10%] bottom-[-18%] h-[32%]" />
    </section>
  );
}
