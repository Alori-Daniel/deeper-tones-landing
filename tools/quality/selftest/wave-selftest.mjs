// Self-test for the wave lines WA1 to WA4: a synthetic good guide must PASS every line, and a guide broken in exactly one
// way must make exactly the matching line FAIL (or WARN, for 403 and 429 sources). No real network: the links and
// sources are served by a local server.
import { createServer } from "node:http";
import { stringify } from "yaml";
import { classifyStatus, makeUrlChecker, waBuildLines, waLinkLines, waSourceLines } from "../checks/wave.mjs";
import { Checks } from "../lib/util.mjs";

const SLUG = "melasma-sample";
const SENTENCES = [
  "Dark patches on the cheeks and forehead are common and are often called melasma.",
  "They tend to look symmetrical, which is a pattern worth describing rather than a diagnosis.",
  "Sun and heat can darken the same patch again, so shade and a hat help.",
  "A gentle routine with few products is easier for the skin to settle with.",
  "Patience matters because even tone comes back slowly over months, not days.",
  "Ask a pharmacist or a doctor before starting anything strong, especially in pregnancy.",
  "Write down what you use and when, so a professional can see the whole picture.",
  "Skin that stings, burns or swells after a product needs a pause and some advice.",
];

// About `words` words of calm paragraphs, with the given extras spliced in. `cites` are placed one per paragraph.
function makeBody({ words = 1000, safety = 1, cites = [1, 2, 3], pro = "last", extra = "", longParagraph = false, bold = false, longHeading = false, link = "/guides/exists" } = {}) {
  const parts = [`A short answer first, with a link to [another guide](${link}). ${SENTENCES[0]} [${cites[0] ?? 1}]`, ""];
  let n = 0, i = 0;
  const total = () => parts.join("\n").split(/\s+/).filter(Boolean).length;
  while (total() < words - 40) {
    if (i % 5 === 0) parts.push(`## Part ${Math.floor(i / 5) + 1}`, "");
    const c = cites[(i + 1) % Math.max(cites.length, 1)];
    parts.push(`${SENTENCES[n % 8]} ${SENTENCES[(n + 3) % 8]} ${SENTENCES[(n + 5) % 8]}${c ? ` [${c}]` : ""}`, "");
    n++; i++;
  }
  for (let s = 0; s < safety; s++) parts.push(`> **Safety:** If you are pregnant or breastfeeding, ask a doctor before using any treatment. [${cites[0] ?? 1}]`, "");
  if (longParagraph) parts.push("One. Two. Three. Four. Five. Six.", "");
  if (bold) parts.push("A **first bold** and a **second bold** phrase.", "");
  if (longHeading) parts.push(`## ${"A very long heading that goes on and on and on past sixty characters".padEnd(70, "x")}`, "");
  if (extra) parts.push(extra, "");
  if (pro === "last") parts.push(`## When to see a professional`, "", `Go to a doctor if the patch changes or bleeds. [${cites[0] ?? 1}]`);
  else if (pro === "middle") parts.push(`## When to see a professional`, "", "See a doctor if it changes.", "", "## One more section", "", "Closing words.");
  return parts.join("\n");
}

const goodFm = (o = {}) => ({
  title: "Melasma on Dark Skin: What Helps and What Does Not",
  description: "Melasma on dark skin: what the patches are, how they differ from other dark marks, what helps, what makes them worse, and a calm, honest timeline.",
  slug: SLUG,
  primaryQuery: "melasma on dark skin",
  secondaryQueries: ["melasma treatment", "melasma vs dark marks", "does melasma go away"],
  published: "2026-11-12",
  updated: "2026-11-12",
  draft: true,
  reviewedBy: null,
  reviewerRole: null,
  inShort: ["Melasma is a pattern of symmetrical dark patches, often on the cheeks.", "Sun and heat can darken it again.", "A professional can tell it apart from other marks."],
  readingMinutes: 6,
  sources: [
    { title: "Melasma", publisher: "NHS", url: "SRC/ok", year: 2023 },
    { title: "Melasma review", publisher: "Journal", url: "SRC/redirect", year: 2019 },
    { title: "Skin and sun", publisher: "WHO", url: "SRC/ok2", year: 2022 },
  ],
  faq: [{ q: "Is it a diagnosis?", a: "No, it is a pattern." }, { q: "Does it fade?", a: "Often slowly." }, { q: "Who can help?", a: "A doctor or pharmacist." }],
  ...o,
});

const asMd = (fm, body, base) => `---\n${stringify(fm).replaceAll("SRC/", `${base}/src/`)}---\n${body}\n`;

export async function runWaveSelfTest(checks) {
  const server = createServer((req, res) => {
    const u = req.url;
    const send = (code, headers = {}) => { res.writeHead(code, headers); res.end("x"); };
    if (u === "/guides/exists" || u === "/src/ok" || u === "/src/ok2") return send(200);
    if (u === "/src/redirect") return send(301, { location: "/src/ok" });
    if (u === "/src/redirect-dead") return send(301, { location: "/src/gone" });
    if (u === "/src/forbidden") return send(403);
    if (u === "/src/ratelimit") return send(429);
    if (u === "/src/boom") return send(500);
    return send(404);
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const deadBase = `http://127.0.0.1:1`; // nothing listens here: a network error

  const unit = (name, ok, detail) => checks.add({ id: `SELFTEST.${name}`, target: "synthetic", measured: detail ?? (ok ? "behaves" : "WRONG"), threshold: "as specified", pass: !!ok });
  const internalStatus = async (u) => { try { const r = await fetch(u, { redirect: "manual" }); await r.arrayBuffer(); return r.status; } catch { return 0; } };

  // Runs every wave line the way run.mjs does, on one synthetic guide. Returns the lines.
  const runAll = async ({ fm = goodFm(), body = makeBody(), steps, out = "", fileSlug = SLUG, sourceBase = base } = {}) => {
    const c = new Checks();
    const add = (l) => c.add(l);
    const raw = asMd(fm, body, sourceBase);
    waSourceLines(add, { slug: fileSlug, raw });
    waBuildLines(add, { slugs: [fileSlug], steps: steps ?? { lint: { code: 0 }, typecheck: { code: 0 }, build: { code: 0 } }, out, env: "GUIDES_SHOW_DRAFTS=1" });
    await waLinkLines(add, { slug: fileSlug, raw, base, checkUrl: makeUrlChecker({ retryDelayMs: 5, timeoutMs: 5000 }), internalStatus });
    return c.lines;
  };
  const one = (lines, id) => lines.find((l) => l.id === id);
  // `breaks(name, lines, id)`: the named line is FAIL and every other wave line still passes.
  const breaks = (name, lines, id, want = "FAIL") => {
    const l = one(lines, id);
    const others = lines.filter((x) => x.id !== id && x.status === "FAIL").map((x) => x.id);
    unit(`${id}.${name}`, l?.status === want && others.length === 0, `${id} is ${l?.status ?? "MISSING"} (wanted ${want})${others.length ? `; also FAIL: ${others.join(", ")}` : ""}${l ? `; ${l.measured}` : ""}`);
  };

  try {
    // ---------- good guide: every line passes
    const good = await runAll();
    const bad = good.filter((l) => l.status !== "PASS");
    unit("WA.good-guide-passes-every-line", bad.length === 0 && good.length >= 17, `${good.length} lines${bad.length ? `, not PASS: ${bad.map((l) => `${l.id} (${l.status}: ${l.measured})`).join("; ")}` : ", all PASS"}`);

    // ---------- WA2
    breaks("title-61-chars", await runAll({ fm: goodFm({ title: "Melasma on Dark Skin: What Helps and What Does Not, Said Slowly" }) }), "WA2.title-length");
    breaks("title-lacks-query-word", await runAll({ fm: goodFm({ title: "Dark Patches on the Face: What Helps" }) }), "WA2.title-has-primary-query");
    breaks("description-139", await runAll({ fm: goodFm({ description: "x".repeat(139) }) }), "WA2.description-length");
    breaks("description-161", await runAll({ fm: goodFm({ description: "x".repeat(161) }) }), "WA2.description-length");
    breaks("slug-differs-from-file", await runAll({ fm: goodFm({ slug: "other-slug" }) }), "WA2.slug-matches-file");
    breaks("draft-false", await runAll({ fm: goodFm({ draft: false }) }), "WA2.draft-unreviewed");
    breaks("reviewer-invented", await runAll({ fm: goodFm({ reviewedBy: "Dr A. Person" }) }), "WA2.draft-unreviewed");
    breaks("reviewer-role-invented", await runAll({ fm: goodFm({ reviewerRole: "Pharmacist" }) }), "WA2.draft-unreviewed");
    breaks("in-short-2-items", await runAll({ fm: goodFm({ inShort: ["One.", "Two."] }) }), "WA2.in-short");
    breaks("in-short-5-items", await runAll({ fm: goodFm({ inShort: ["a", "b", "c", "d", "e"] }) }), "WA2.in-short");
    breaks("in-short-item-161", await runAll({ fm: goodFm({ inShort: ["x".repeat(161), "b", "c"] }) }), "WA2.in-short");
    breaks("in-short-total-over-480", await runAll({ fm: goodFm({ inShort: ["x".repeat(150), "y".repeat(150), "z".repeat(150), "w".repeat(40)] }) }), "WA2.in-short");
    breaks("faq-2", await runAll({ fm: goodFm({ faq: [{ q: "a?", a: "b" }, { q: "c?", a: "d" }] }) }), "WA2.faq-count");
    breaks("faq-6", await runAll({ fm: goodFm({ faq: Array.from({ length: 6 }, (_, i) => ({ q: `q${i}?`, a: "a" })) }) }), "WA2.faq-count");
    breaks("secondary-2", await runAll({ fm: goodFm({ secondaryQueries: ["a", "b"] }) }), "WA2.secondary-queries");
    breaks("secondary-7", await runAll({ fm: goodFm({ secondaryQueries: ["a", "b", "c", "d", "e", "f", "g"] }) }), "WA2.secondary-queries");

    // ---------- WA3
    breaks("body-500-words", await runAll({ body: makeBody({ words: 500 }) }), "WA3.word-count");
    breaks("body-1600-words", await runAll({ body: makeBody({ words: 1600 }) }), "WA3.word-count");
    breaks("professional-not-last", await runAll({ body: makeBody({ pro: "middle" }) }), "WA3.last-h2");
    breaks("professional-missing", await runAll({ body: makeBody({ pro: "none" }) }), "WA3.last-h2");
    breaks("three-safety-callouts", await runAll({ body: makeBody({ safety: 3 }) }), "WA3.safety-callouts");
    breaks("cite-without-source", await runAll({ body: makeBody({ cites: [1, 2, 3, 9] }) }), "WA3.citations-resolve");
    breaks("cite-written-as-list", await runAll({ body: makeBody({ extra: "Both papers agree [1, 2]." }) }), "WA3.citations-resolve");
    breaks("source-never-cited", await runAll({ body: makeBody({ cites: [1, 2] }) }), "WA3.sources-cited");

    // ---------- WA1
    const okSteps = { lint: { code: 0 }, typecheck: { code: 0 }, build: { code: 0 } };
    const warnLine = (m, slug = SLUG) => `[guides] warning: content/guides/${slug}.md: ${m}`;
    breaks("lint-exit-1", await runAll({ steps: { ...okSteps, lint: { code: 1 } } }), "WA1.lint-typecheck-build");
    breaks("typecheck-exit-2", await runAll({ steps: { ...okSteps, typecheck: { code: 2 } } }), "WA1.lint-typecheck-build");
    breaks("build-exit-1", await runAll({ steps: { ...okSteps, build: { code: 1 } } }), "WA1.lint-typecheck-build");
    breaks("step-not-run", await runAll({ steps: { build: { code: 0 } } }), "WA1.lint-typecheck-build");
    breaks("long-paragraph-warning", await runAll({ out: warnLine('a paragraph has 6 sentences (keep to 4): "One. Two..."') }), "WA1.no-writing-warnings");
    breaks("bold-warning", await runAll({ out: warnLine('a paragraph has more than one bold phrase: "A first bold..."') }), "WA1.no-writing-warnings");
    breaks("h2-length-warning", await runAll({ out: warnLine('the heading "A very long heading..." is over 60 characters') }), "WA1.no-writing-warnings");
    breaks("no-build-output", await runAll({ out: null }), "WA1.no-writing-warnings");
    // a warning about another guide, or one WA2/WA3 already judge, is not a WA1 failure here
    unit("WA1.other-guides-warnings-ignored", one(await runAll({ out: warnLine("a paragraph has 6 sentences", "some-other-guide") }), "WA1.no-writing-warnings")?.status === "PASS");
    unit("WA1.warnings-judged-by-wa3-ignored", one(await runAll({ out: warnLine("source [2] is listed but never cited in the body") }), "WA1.no-writing-warnings")?.status === "PASS");

    // ---------- WA4
    breaks("internal-link-404", await runAll({ body: makeBody({ link: "/guides/missing-guide" }) }), "WA4.internal-links");
    breaks("source-404", await runAll({ fm: goodFm({ sources: [...goodFm().sources.slice(0, 2), { title: "Gone", publisher: "WHO", url: "SRC/gone", year: 2020 }] }) }), "WA4.source-urls");
    breaks("source-500", await runAll({ fm: goodFm({ sources: [...goodFm().sources.slice(0, 2), { title: "Broken", publisher: "WHO", url: "SRC/boom", year: 2020 }] }) }), "WA4.source-urls");
    breaks("source-redirects-to-404", await runAll({ fm: goodFm({ sources: [...goodFm().sources.slice(0, 2), { title: "Moved", publisher: "WHO", url: "SRC/redirect-dead", year: 2020 }] }) }), "WA4.source-urls");
    {
      const lines = await runAll({ fm: goodFm({ sources: [...goodFm().sources.slice(0, 2), { title: "Down", publisher: "WHO", url: "http://127.0.0.1:1/x", year: 2020 }] }) });
      breaks("source-unreachable", lines, "WA4.source-urls");
    }
    unit("WA4.source-301-to-200-passes", one(await runAll(), "WA4.source-urls")?.status === "PASS", "SRC/redirect (301 to a 200 page) is in the good guide's sources");
    for (const [name, path] of [["403", "forbidden"], ["429", "ratelimit"]]) {
      const lines = await runAll({ fm: goodFm({ sources: [...goodFm().sources.slice(0, 2), { title: "Blocks robots", publisher: "Journal", url: `SRC/${path}`, year: 2020 }] }) });
      const l = one(lines, "WA4.source-urls");
      unit(`WA4.source-${name}-is-warn-not-fail.lists-the-url`, l?.status === "WARN" && (l.details ?? []).some((d) => d.startsWith("WARN") && d.includes(`/src/${path}`)) && lines.every((x) => x.status !== "FAIL"), `${l?.status}; ${(l?.details ?? []).join(" | ")}`);
    }
    {
      // a hard failure next to a 403 is still a FAIL, and the 403 URL is still listed
      const lines = await runAll({ fm: goodFm({ sources: [{ title: "Gone", publisher: "WHO", url: "SRC/gone", year: 2020 }, { title: "Blocks", publisher: "WHO", url: "SRC/forbidden", year: 2020 }, ...goodFm().sources.slice(0, 1)] }) });
      const l = one(lines, "WA4.source-urls");
      unit("WA4.fail-wins-over-warn", l?.status === "FAIL" && l.details.some((d) => d.startsWith("FAIL")) && l.details.some((d) => d.startsWith("WARN")), `${l?.status}; ${(l?.details ?? []).join(" | ")}`);
    }
    unit("WA4.classify-status", ["200:ok", "204:ok", "301:ok", "399:ok", "403:warn", "429:warn", "404:fail", "410:fail", "500:fail", "0:fail", "401:fail"].every((p) => { const [s, w] = p.split(":"); return classifyStatus(+s) === w; }));
    {
      const lines = await runAll({ sourceBase: deadBase });
      const l = one(lines, "WA4.source-urls");
      unit("WA4.every-source-unreachable-fails", l?.status === "FAIL", l?.measured);
    }
  } finally {
    server.close();
  }
}
