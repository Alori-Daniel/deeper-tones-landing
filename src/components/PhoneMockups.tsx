// App screens recreated in HTML/CSS with the app's styles and copy. Illustrative data only.

import Image from "next/image";

const toneDot = {
  success: "bg-success",
  muted: "bg-subtle",
  caution: "bg-caution",
  danger: "bg-danger",
} as const;

// Layers stacked behind the screen give the phone real thickness when it turns.
const SLICES = Array.from({ length: 10 }, (_, i) => i + 1);

// A 3D phone. With a numeric `tilt`, Motion turns it (--rx/--ry) from where it sits in the
// viewport plus the cursor, around that resting yaw. With `tilt={null}` the surrounding scene
// drives --rx/--ry itself. `extras` render inside the phone's 3D space (e.g. floating chips).
// The screen is always the dark app UI, whatever the page theme.
export function PhoneFrame({
  children,
  className = "",
  tilt = 0,
  extras,
}: {
  children: React.ReactNode;
  className?: string;
  tilt?: number | null;
  extras?: React.ReactNode;
}) {
  return (
    <div
      data-tilt={tilt ?? undefined}
      className={`phone-3d relative w-[280px] shrink-0 ${className}`}
      style={tilt === null ? undefined : ({ "--ry": tilt } as React.CSSProperties)}
    >
      <div className="phone-3d-body relative">
        {SLICES.map((z) => (
          <span key={z} aria-hidden className="phone-3d-slice" style={{ "--z": `${-z}px` } as React.CSSProperties} />
        ))}
        <span aria-hidden className="phone-3d-btn left-[-3px] top-[120px] h-7" />
        <span aria-hidden className="phone-3d-btn left-[-3px] top-[165px] h-12" />
        <span aria-hidden className="phone-3d-btn right-[-3px] top-[150px] h-16" />
        <div className="app-dark relative rounded-[44px] border-[1.5px] border-[#9a9aa0] bg-[#050505] p-2.5">
          <div className="relative h-[570px] overflow-hidden rounded-[34px] bg-background">
            <div className="absolute left-1/2 top-2.5 z-10 h-6 w-24 -translate-x-1/2 rounded-full bg-black" />
            <div className="flex h-11 items-end justify-between px-6 pb-1 text-[11px] font-semibold">
              <span>9:41</span>
              <span className="tracking-widest">●●●</span>
            </div>
            <div className="px-4 pt-3">{children}</div>
          </div>
        </div>
        <span aria-hidden className="phone-3d-glare" />
        {extras}
      </div>
    </div>
  );
}

// Home screen, shown on the hero phone.
export function HomeContent() {
  return (
    <>
      <div className="flex items-center justify-between">
        <div className="relative h-8 w-8 overflow-hidden rounded-full">
          <Image src="/onboardimg.png" alt="" fill sizes="32px" className="photo-lift scale-[2.4] object-cover object-[50%_16%]" />
        </div>
        <span className="grid h-8 w-8 place-items-center rounded-full bg-card text-[13px] text-muted">⌕</span>
      </div>
      <h3 className="mt-5 text-[23px] font-bold leading-[1.12]">
        Here&apos;s what your shelf is <span className="text-primary">really</span> doing.
      </h3>
      <div className="mt-4 rounded-2xl border border-border bg-card p-3.5">
        <div className="flex items-baseline justify-between text-[11px] text-muted">
          <span>Your shelf</span>
          <span className="text-[13px] font-bold text-foreground">4 of 7 in the way</span>
        </div>
        <div className="mt-2.5 flex h-1.5 gap-0.5">
          {["bg-success", "bg-success", "bg-success", "bg-subtle", "bg-caution", "bg-caution", "bg-danger"].map((c, i) => (
            <span key={i} className={`flex-1 rounded-full ${c}`} />
          ))}
        </div>
      </div>
      <p className="mt-4 text-[13px] font-semibold">Today</p>
      <div className="mt-2 flex items-center gap-3 rounded-2xl border border-border bg-card p-2.5">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl">
          <Image src="/onboardimg.png" alt="" fill sizes="56px" className="photo-lift scale-[1.8] object-cover object-[50%_18%]" />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold">Face check-in</p>
          <p className="text-[11px] leading-snug text-muted">Same light, same angle as day one.</p>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-3 rounded-2xl border border-border bg-card p-2.5">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-primary-tint text-xl text-primary">▢</span>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold">Scan a product</p>
          <p className="text-[11px] leading-snug text-muted">Label or barcode, we&apos;ll check it.</p>
        </div>
      </div>
    </>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] uppercase tracking-[0.18em] text-muted">{children}</p>;
}

function Title({ children }: { children: React.ReactNode }) {
  return <h3 className="mt-2 text-[22px] font-bold leading-[1.15]">{children}</h3>;
}

function Cta({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 flex h-12 items-center justify-center gap-2 rounded-[20px] bg-primary text-[14px] font-semibold text-white">
      {children} <span aria-hidden>→</span>
    </div>
  );
}

export function GoalContent() {
  const goals = ["Clearer skin", "Fade dark marks", "A more even tone", "Calm irritation", "Fewer breakouts", "Step down off a cream"];
  return (
    <>
      <Label>Step 1 of 5</Label>
      <Title>What would you like your skin to do?</Title>
      <ul className="mt-5 flex flex-wrap gap-1.5">
        {goals.map((g, i) => (
          <li
            key={g}
            className={`rounded-full border px-2.5 py-1.5 text-[11px] ${
              i === 1 ? "border-primary bg-primary-tint font-semibold text-foreground" : "border-border bg-card text-muted"
            }`}
          >
            {i === 1 && <span className="mr-1 text-primary">✓</span>}
            {g}
          </li>
        ))}
      </ul>
      <div className="mt-5 rounded-2xl border border-border bg-card p-3.5">
        <p className="text-[11px] text-subtle">Or say it your way</p>
        <p className="mt-1 text-[13px]">
          The marks from old spots on my cheeks<span className="caret">|</span>
        </p>
      </div>
      <div className="mt-4 rounded-2xl border border-primary/30 bg-primary-tint/60 p-3.5">
        <p className="text-[12px] font-semibold">Honestly</p>
        <p className="mt-1 text-[11px] leading-snug text-muted">
          Dark marks fade slowly. Expect weeks, not days, with daily sunscreen.
        </p>
      </div>
      <Cta>Continue</Cta>
    </>
  );
}

export function SafetyContent() {
  const items = [
    { t: "Pregnant or breastfeeding", on: false },
    { t: "Had a reaction recently", on: true },
    { t: "On prescription treatment", on: false },
    { t: "Using a strong cream", on: true },
  ];
  return (
    <>
      <Label>Step 2 of 5</Label>
      <Title>A quick safety check</Title>
      <p className="mt-2 text-[12px] leading-snug text-muted">We&apos;ll leave unsafe ingredients out of everything.</p>
      <ul className="mt-4 space-y-2">
        {items.map((it) => (
          <li key={it.t} className="flex items-center justify-between rounded-2xl border border-border bg-card px-3.5 py-3">
            <span className="text-[13px]">{it.t}</span>
            <span className={`relative h-6 w-10 rounded-full transition ${it.on ? "bg-primary" : "bg-border"}`}>
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${it.on ? "left-[18px]" : "left-0.5"}`} />
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-4 flex items-center gap-2 text-[11px] text-success">
        <span aria-hidden>●</span> 14 ingredients will be left out
      </p>
      <Cta>Continue</Cta>
    </>
  );
}

export function ScanContent() {
  return (
    <>
      <Label>Step 3 of 5</Label>
      <Title>Scan your products</Title>
      <div className="relative mt-4 h-[230px] overflow-hidden rounded-2xl border border-border bg-card">
        <div className="absolute left-1/2 top-1/2 h-[150px] w-[74px] -translate-x-1/2 -translate-y-1/2 rounded-[18px_18px_12px_12px] border border-white/15 bg-[#2a2530]">
          <div className="mx-auto mt-3 h-4 w-8 rounded bg-white/15" />
          <div className="mx-3 mt-5 space-y-1.5">
            <div className="h-1.5 rounded bg-white/30" />
            <div className="h-1.5 w-2/3 rounded bg-white/20" />
            <div className="h-1.5 rounded bg-white/15" />
            <div className="h-1.5 w-1/2 rounded bg-white/15" />
          </div>
        </div>
        {["left-5 top-5 border-l-2 border-t-2", "right-5 top-5 border-r-2 border-t-2", "bottom-5 left-5 border-b-2 border-l-2", "bottom-5 right-5 border-b-2 border-r-2"].map((c) => (
          <span key={c} className={`absolute h-6 w-6 rounded-[4px] border-primary ${c}`} />
        ))}
        <div className="scan-laser absolute inset-x-6 h-px bg-primary" />
      </div>
      <ul className="mt-3 space-y-2 text-[12px]">
        <li className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2.5">
          <span>Vitamin C serum</span>
          <span className="text-success">Read ✓</span>
        </li>
        <li className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2.5">
          <span>&quot;Toning&quot; body cream</span>
          <span className="text-caution">Careful</span>
        </li>
      </ul>
      <p className="mt-3 text-center text-[11px] text-subtle">No label? Describe it instead.</p>
    </>
  );
}

export function FaceContent() {
  const checks = ["Light", "Distance", "Angle"];
  return (
    <>
      <Label>Step 4 of 5 · optional</Label>
      <Title>Your day-one baseline</Title>
      <div className="relative mt-4 grid h-[270px] place-items-center overflow-hidden rounded-2xl border border-border bg-black">
        <Image
          src="/onboardimg.png"
          alt=""
          fill
          sizes="250px"
          className="photo-lift scale-[1.6] object-cover object-[50%_14%]"
        />
        <div className="face-guide relative h-[190px] w-[140px] rounded-[50%] border-2 border-white/80" />
        <div className="absolute bottom-3 left-3 right-3 flex justify-between">
          {checks.map((c) => (
            <span key={c} className="rounded-md bg-black/70 px-2 py-1 text-[10px] text-success">
              ✓ {c}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-3 rounded-2xl border border-border bg-card p-3.5">
        <p className="text-[12px] font-semibold">What we can see</p>
        <p className="mt-1 text-[11px] leading-snug text-muted">Some uneven tone across the cheeks. Not a diagnosis.</p>
      </div>
      <p className="mt-3 text-center text-[11px] text-subtle">Stored privately. Delete any time.</p>
    </>
  );
}

const resultRows = [
  { title: "Helping", body: "Working toward your goal", count: 3, tone: "success" },
  { title: "Redundant", body: "Doing the same job as another", count: 1, tone: "muted" },
  { title: "Blocking your goal", body: "Holding your goal back", count: 2, tone: "caution" },
  { title: "Conflicting", body: "Don't work well together", count: 1, tone: "caution" },
  { title: "Likely the problem", body: "What's causing trouble", count: 1, tone: "danger" },
] as const;

export function ResultScreen({ className, tilt }: { className?: string; tilt?: number }) {
  return (
    <PhoneFrame className={className} tilt={tilt}>
      <Label>Your result</Label>
      <Title>4 of your 7 products are getting in the way of clear skin.</Title>
      <ul className="mt-4 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
        {resultRows.map((r) => (
          <li key={r.title} className="flex items-center gap-3 px-3.5 py-3">
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${toneDot[r.tone]}`} />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold leading-tight">{r.title}</p>
              <p className="truncate text-[11px] text-muted">{r.body}</p>
            </div>
            <span className="text-[15px] font-bold">{r.count}</span>
          </li>
        ))}
      </ul>
      <div className="mt-3 rounded-2xl border border-border bg-card p-3.5">
        <p className="text-[12px] font-semibold">What we can see</p>
        <p className="mt-1 text-[11px] leading-snug text-muted">
          Some uneven tone across the cheeks and a few dark marks along the jaw.
        </p>
      </div>
      <Cta>See my plan</Cta>
    </PhoneFrame>
  );
}

export function PlanContent() {
  const steps = ["Gentle cleanser", "Niacinamide serum", "Moisturiser", "Sunscreen SPF 50"];
  return (
    <>
      <Label>Today</Label>
      <Title>Morning routine</Title>
      <ol className="mt-4 space-y-2">
        {steps.map((s, i) => (
          <li key={s} className="flex items-center gap-3 rounded-2xl border border-border bg-card px-3.5 py-3">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-primary-tint text-[11px] font-bold text-primary">
              {i + 1}
            </span>
            <span className="text-[13px]">{s}</span>
          </li>
        ))}
      </ol>
      <div className="mt-4 rounded-2xl border border-caution/30 bg-caution/10 p-3.5">
        <p className="text-[12px] font-semibold text-caution">Step-down: week 2 of 6</p>
        <p className="mt-1 text-[11px] leading-snug text-muted">
          Use your strong cream every other night. Some dryness this week is expected.
        </p>
      </div>
      <div className="relative mt-4 flex h-14 items-center rounded-[20px] bg-card p-1.5">
        <span className="slide-knob grid h-11 w-11 place-items-center rounded-2xl bg-primary text-white">→</span>
        <span className="flex-1 pr-11 text-center text-[13px] text-muted">Slide to finish</span>
      </div>
    </>
  );
}

export function PlanScreen({ className, tilt }: { className?: string; tilt?: number }) {
  return (
    <PhoneFrame className={className} tilt={tilt}>
      <PlanContent />
    </PhoneFrame>
  );
}
