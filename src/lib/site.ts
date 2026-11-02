// Brand, SEO and page copy in one place. Voice rules: honest, calm, plain words.
// Never promise lighter skin; say "what can be seen", not conditions.

export const site = {
  name: "Deeper Tones",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://deepertones.com",
  title: "Deeper Tones: honest skincare checks for deeper skin tones",
  description:
    "Deeper Tones checks the skincare products you already use against the skin you want, tells you honestly what's helping and what's in the way, and gives you a simple, safe routine. Coming soon to iOS and Android, Nigeria first.",
  // TODO: confirm this inbox exists before launch.
  contactEmail: "hello@deepertones.com",
  // Fill these in when the app is live; the page swaps the waitlist form for store buttons.
  appStoreUrl: "",
  playStoreUrl: "",
  keywords: [
    "skincare app",
    "skincare for dark skin",
    "melanin-rich skin",
    "skincare Nigeria",
    "product checker",
    "skincare routine app",
    "dark marks",
    "even skin tone",
  ],
};

export const isLive = Boolean(site.appStoreUrl || site.playStoreUrl);

export const steps = [
  {
    title: "Pick a goal",
    body: "Tap a goal or say it your way. We'll tell you honestly what it takes. No account needed to start.",
  },
  {
    title: "Safety check",
    body: "Pregnant, breastfeeding, had a reaction, or on prescription treatment? Tell us, and we'll leave unsafe ingredients out of everything.",
  },
  {
    title: "Scan your products",
    body: "Photograph one product or your whole shelf. No label? Describe it instead, and we'll flag anything to be careful with.",
  },
  {
    title: "Face photos, if you want",
    body: "A guided camera checks light, distance and angle, then shows what can be seen today as your day-one baseline.",
  },
  {
    title: "Get your plan",
    body: "A short morning and evening routine, what to keep, change or stop, and reminders at the times you choose.",
  },
];

// Matches the groups and descriptions in the app's result screen.
export const resultGroups = [
  { title: "Helping", body: "Working toward your goal", tone: "success" },
  { title: "Redundant", body: "Doing the same job as another", tone: "muted" },
  { title: "Blocking your goal", body: "Holding your goal back", tone: "caution" },
  { title: "Conflicting", body: "Don't work well together", tone: "caution" },
  { title: "Likely the problem", body: "What's causing trouble", tone: "danger" },
] as const;

export const trust = [
  {
    title: "Your photos stay private",
    body: "Face photos are stored privately, never used for ads, never shown to anyone unless you choose, and you can delete them any time.",
  },
  {
    title: "Nobody pays us",
    body: "Nobody pays us to recommend products, to be on a list or to rank higher. We don't sell products.",
  },
  {
    title: "Not a diagnosis",
    body: "We describe what can be seen, not conditions. When something needs a closer look, we'll tell you to see a professional.",
  },
  {
    title: "Made for deeper skin",
    body: "Built around melanin-rich skin from the start, with prices in naira and reminders on your phone.",
  },
];

export const faqs = [
  {
    q: "Is it free?",
    a: "You can check your products, see your result and follow your routine for free. There will also be an optional paid plan with extras. We'll share the details before launch, and early-access members hear first.",
  },
  {
    q: "Will it lighten my skin?",
    a: "No. No safe product changes your natural colour, and we won't suggest anything that tries. We help with goals like clearer skin, fading dark marks and a more even tone. If you're using a lightening cream now, we can help you step down off it safely.",
  },
  {
    q: "Is my face data safe?",
    a: "Face photos are optional and only taken with your clear consent. They're stored privately, never used for ads, never shown to anyone unless you choose, and you can delete them at any time.",
  },
  {
    q: "Does it work offline?",
    a: "You'll need an internet connection to scan products and get your result, because that's where the label reading and matching happens.",
  },
  {
    q: "Is this medical advice?",
    a: "No. Deeper Tones describes what can be seen and what your products are doing. It doesn't diagnose conditions. If something is painful, spreading or worrying you, please see a doctor or dermatologist.",
  },
  {
    q: "Which countries is it for?",
    a: "Nigeria first, with prices in naira and sign-in by email (WhatsApp is coming). More countries will follow.",
  },
];


