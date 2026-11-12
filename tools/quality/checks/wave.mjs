// quality/ACCEPTANCE-WAVE.md section W-A, lines WA1 to WA4 (WA5 is the ordinary B2-B5 / C1-C4 lines run on the selected
// guides with drafts shown). Every function here works on plain inputs (the guide's .md text, the build output, a URL
// checker) so the self-test can drive it with synthetic guides and a local server; nothing here touches the network
// unless it is handed a checker that does.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { Marked } from "marked";
import { parse as parseYaml } from "yaml";
import { sleep } from "../lib/util.mjs";

export const PRO_HEADING = "When to see a professional";
// The build (scripts/build-guides.mjs) uses these same expressions; keep them in step.
const CITE = /\[(\d{1,2})\](?!\(|:)/g;
const MALFORMED_CITE = /\[\d+\s*(?:,|;|-|–|—|−)\s*\d+[^\]]*\]/g;

export const splitFrontmatter = (raw) => {
  const m = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)([\s\S]*)$/.exec(raw);
  return m ? { yaml: m[1], body: m[2] } : null;
};

export function parseGuideSource(raw) {
  const parts = splitFrontmatter(raw);
  if (!parts) return { error: "missing frontmatter (the file must start with a --- block)" };
  try {
    const fm = parseYaml(parts.yaml);
    if (!fm || typeof fm !== "object") return { error: "frontmatter is empty" };
    return { fm, body: parts.body };
  } catch (e) {
    return { error: `frontmatter is not valid YAML: ${e.message}` };
  }
}

// The same count scripts/build-guides.mjs prints its "aim for 900 to 1,400" warning from: the body, split on
// whitespace. It includes headings' "##", "[n]" marks and the {{figure:id}} line, so it is the build's number.
export const bodyWords = (body) => body.split(/\s+/).filter(Boolean).length;

const wordsOf = (s) => String(s ?? "").toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
const isStr = (v) => typeof v === "string" && v.trim().length > 0;

// Slugs the wave lines run on: --only when given, else every guide file whose frontmatter says draft: true.
export function selectWaveSlugs(guidesDir, only) {
  if (only?.length) return only;
  if (!existsSync(guidesDir)) return [];
  return readdirSync(guidesDir)
    .filter((f) => f.endsWith(".md"))
    .filter((f) => parseGuideSource(readFileSync(join(guidesDir, f), "utf8")).fm?.draft === true)
    .map((f) => f.replace(/\.md$/, ""))
    .sort();
}

// ---------------------------------------------------------------- WA2 (frontmatter) and WA3 (body), from the .md text
export function waSourceLines(add, { slug, raw }) {
  const target = `content/guides/${slug}.md`;
  const parsed = raw == null ? { error: "file not found" } : parseGuideSource(raw);
  if (parsed.error) {
    add({ id: "WA2.frontmatter-parses", target, measured: parsed.error, threshold: "a readable frontmatter block", pass: false });
    return;
  }
  const { fm, body } = parsed;
  const line = (id, measured, threshold, pass, details) => add({ id, target, measured, threshold, pass, details });

  // ----- WA2
  const title = isStr(fm.title) ? fm.title : "";
  line("WA2.title-length", `${title.length} characters`, "60 or fewer", title.length > 0 && title.length <= 60);
  const titleWords = new Set(wordsOf(title));
  const missing = [...new Set(wordsOf(fm.primaryQuery))].filter((w) => !titleWords.has(w));
  line("WA2.title-has-primary-query", isStr(fm.primaryQuery) ? (missing.length ? `title lacks: ${missing.join(", ")}` : `has every word of "${fm.primaryQuery}"`) : "no primaryQuery", "every word of primaryQuery is in the title", isStr(fm.primaryQuery) && isStr(title) && missing.length === 0);
  const desc = isStr(fm.description) ? fm.description : "";
  line("WA2.description-length", `${desc.length} characters`, "140 to 160", desc.length >= 140 && desc.length <= 160);
  line("WA2.slug-matches-file", `slug "${fm.slug}", file "${slug}.md"`, "equal", fm.slug === slug);
  const draftBad = [];
  if (fm.draft !== true) draftBad.push(`draft is ${JSON.stringify(fm.draft)}`);
  if (fm.reviewedBy !== null) draftBad.push(`reviewedBy is ${JSON.stringify(fm.reviewedBy)}`);
  if (fm.reviewerRole !== null) draftBad.push(`reviewerRole is ${fm.reviewerRole === undefined ? "missing" : JSON.stringify(fm.reviewerRole)}`);
  line("WA2.draft-unreviewed", draftBad.length ? draftBad.join("; ") : "draft: true, reviewedBy: null, reviewerRole: null", "draft true, reviewedBy null, reviewerRole null", draftBad.length === 0);
  const items = Array.isArray(fm.inShort) ? fm.inShort : null;
  const lens = items ? items.map((i) => (typeof i === "string" ? i.trim().length : -1)) : [];
  const total = lens.reduce((a, b) => a + Math.max(b, 0), 0);
  const inShortBad = !items ? ["inShort is not a list"] : [];
  if (items && (items.length < 3 || items.length > 4)) inShortBad.push(`${items.length} items`);
  lens.forEach((n, i) => { if (n < 1) inShortBad.push(`item ${i + 1} is not text`); else if (n > 160) inShortBad.push(`item ${i + 1} is ${n} characters`); });
  if (total > 480) inShortBad.push(`${total} characters in total`);
  line("WA2.in-short", items ? `${items.length} items, longest ${Math.max(0, ...lens)}, total ${total}` : "missing", "3 to 4 items, each 160 or fewer, 480 in total", inShortBad.length === 0, inShortBad);
  const faqN = Array.isArray(fm.faq) ? fm.faq.length : 0;
  line("WA2.faq-count", `${faqN} entries`, "3 to 5", faqN >= 3 && faqN <= 5);
  const secN = Array.isArray(fm.secondaryQueries) ? fm.secondaryQueries.length : 0;
  line("WA2.secondary-queries", `${secN} queries`, "3 to 6", secN >= 3 && secN <= 6);

  // ----- WA3
  const words = bodyWords(body);
  line("WA3.word-count", `${words} words (counted as scripts/build-guides.mjs does)`, "900 to 1,400", words >= 900 && words <= 1400);
  const h2 = [];
  let fenced = false;
  for (const l of body.split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(l)) { fenced = !fenced; continue; }
    const m = !fenced && /^##[ \t]+(.+?)[ \t#]*$/.exec(l);
    if (m) h2.push(m[1]);
  }
  line("WA3.last-h2", h2.length ? `last "##" is "${h2[h2.length - 1]}" (${h2.length} in all)` : "no ## headings", `"## ${PRO_HEADING}" is the last ##`, h2.length > 0 && h2[h2.length - 1] === PRO_HEADING && h2.filter((h) => h === PRO_HEADING).length === 1);
  const quotes = new Marked({ gfm: true }).lexer(body).filter((t) => t.type === "blockquote");
  const safety = quotes.filter((t) => /^>\s*\*\*Safety:\*\*/.test(t.raw)).length;
  line("WA3.safety-callouts", `${safety} Safety callouts${quotes.length > safety ? `, ${quotes.length - safety} other blockquotes` : ""}`, "2 or fewer (and no other blockquote)", safety <= 2 && quotes.length === safety);
  const sources = Array.isArray(fm.sources) ? fm.sources : [];
  const cited = new Set();
  const dangling = [];
  for (const m of body.matchAll(CITE)) {
    const n = Number(m[1]);
    cited.add(n);
    if (n < 1 || n > sources.length) dangling.push(`[${n}] (only ${sources.length} sources are listed)`);
  }
  const malformed = [...body.matchAll(MALFORMED_CITE)].map((m) => `${m[0]} (write each source as its own [n])`);
  const bad = [...new Set(dangling), ...malformed];
  line("WA3.citations-resolve", bad.length ? bad.join("; ") : `${cited.size} distinct [n] marks, all listed`, "every [n] points to a listed source", bad.length === 0 && cited.size > 0);
  const uncited = sources.map((_, i) => i + 1).filter((n) => !cited.has(n));
  line("WA3.sources-cited", uncited.length ? `never cited: ${uncited.map((n) => `[${n}]`).join(", ")}` : `${sources.length}/${sources.length} sources cited`, "every listed source cited at least once", sources.length > 0 && uncited.length === 0);
}

// ---------------------------------------------------------------- WA1 (the build), from the step results and output
// steps: { lint: {code}, typecheck: {code}, build: {code} } (missing = not run); out: combined output or null.
const COVERED_ELSEWHERE = [/is listed but never cited/, /body is \d+ words/, /"inShort" is missing/]; // WA3 and WA2 judge these
export function waBuildLines(add, { slugs, steps, out, env }) {
  const names = ["lint", "typecheck", "build"];
  const notRun = names.filter((n) => !steps?.[n]);
  const failedSteps = names.filter((n) => steps?.[n] && steps[n].code !== 0);
  add({
    id: "WA1.lint-typecheck-build",
    target: `${env} npm run lint, typecheck, opennextjs-cloudflare build`,
    measured: names.map((n) => (steps?.[n] ? `${n} exit ${steps[n].code}` : `${n} not run`)).join(", "),
    threshold: "all three exit 0",
    pass: notRun.length === 0 && failedSteps.length === 0,
    details: notRun.length ? ["a step was skipped (--skip-a1 or --reuse-frozen without a saved run); WA1 needs all three"] : undefined,
  });
  for (const slug of slugs) {
    const target = `content/guides/${slug}.md`;
    if (out == null) {
      add({ id: "WA1.no-writing-warnings", target, measured: "no build output to read", threshold: "no [guides] warnings", pass: false });
      continue;
    }
    const prefix = `[guides] warning: content/guides/${slug}.md: `;
    const all = [...new Set(out.split("\n").filter((l) => l.startsWith(prefix)).map((l) => l.slice(prefix.length).trim()))];
    const mine = all.filter((w) => !COVERED_ELSEWHERE.some((re) => re.test(w)));
    add({
      id: "WA1.no-writing-warnings", target,
      measured: mine.length ? `${mine.length} warning${mine.length === 1 ? "" : "s"}` : "none",
      threshold: "no writing warnings (paragraph length, bold, H2 length, Safety callout length)",
      pass: mine.length === 0, details: mine,
    });
  }
}

export function waBuiltLine(add, { slug, built, includeDrafts }) {
  add({
    id: "WA1.guide-built", target: `/guides/${slug}`,
    measured: built ? "in the build" : "not in the build",
    threshold: "built",
    pass: built,
    details: built ? undefined : [includeDrafts ? "the build rejected this guide or the file is missing; see logs/build.log" : "this guide is a draft and --include-drafts was not given"],
  });
}

// ---------------------------------------------------------------- WA4 (links)
export const internalLinks = (raw) => {
  const parsed = parseGuideSource(raw);
  if (parsed.error) return [];
  const texts = [parsed.body, ...(Array.isArray(parsed.fm.faq) ? parsed.fm.faq.map((f) => String(f?.a ?? "")) : [])];
  const paths = new Set();
  for (const t of texts) {
    for (const m of t.matchAll(/\]\(\s*<?((?:https?:\/\/(?:www\.)?deepertones\.com)?\/[^)\s>]*)/g)) {
      const p = m[1].replace(/^https?:\/\/(?:www\.)?deepertones\.com/, "").split("#")[0].split("?")[0] || "/";
      paths.add(p);
    }
  }
  return [...paths];
};

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

// A checker for source URLs: GET (many publishers refuse HEAD), redirects followed so a 301 to a dead page is caught,
// the body is never read, one retry on a network error or a 5xx, results cached so a URL shared by two guides loads once.
export function makeUrlChecker({ timeoutMs = 25_000, retryDelayMs = 1500, fetchImpl = fetch } = {}) {
  const cache = new Map();
  const probe = async (url) => {
    let last = { status: 0, note: "no answer" };
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const r = await fetchImpl(url, { redirect: "follow", headers: { "user-agent": UA, accept: "text/html,application/pdf,*/*;q=0.8", "accept-language": "en" }, signal: AbortSignal.timeout(timeoutMs) });
        try { await r.body?.cancel(); } catch {}
        last = { status: r.status, note: r.redirected ? `after redirect to ${r.url}` : "" };
        if (r.status < 500) return last;
      } catch (e) {
        last = { status: 0, note: String(e.name === "TimeoutError" ? "timed out" : e.cause?.code || e.message).slice(0, 80) };
      }
      if (attempt === 0) await sleep(retryDelayMs);
    }
    return last;
  };
  return (url) => { if (!cache.has(url)) cache.set(url, probe(url)); return cache.get(url); };
}

// 403/429 usually mean the site blocks robots, and 5xx a site that is briefly down: WARN, open it in a browser.
// A page that is gone (404, 410, other 4xx) or no answer at all (status 0: DNS, refused, timeout) is a FAIL.
export const classifyStatus = (s) => (s >= 200 && s < 400 ? "ok" : s === 403 || s === 429 || (s >= 500 && s < 600) ? "warn" : "fail");

async function pool(items, n, fn) {
  const q = [...items];
  await Promise.all(Array.from({ length: Math.min(n, q.length) }, async () => { while (q.length) await fn(q.shift()); }));
}

// base: the preview (or a synthetic server in the self-test). internalStatus(url) -> status without following redirects.
export async function waLinkLines(add, { slug, raw, base, checkUrl, internalStatus }) {
  const target = `content/guides/${slug}.md`;
  const parsed = raw == null ? { error: "file not found" } : parseGuideSource(raw);
  if (parsed.error) {
    add({ id: "WA4.internal-links", target, measured: parsed.error, threshold: "200 for each", pass: false });
    add({ id: "WA4.source-urls", target, measured: parsed.error, threshold: "2xx or 3xx for each", pass: false });
    return;
  }
  // internal links: must answer 200 on the preview
  const paths = internalLinks(raw);
  const badLinks = [];
  await pool(paths, 4, async (p) => { const s = await internalStatus(new URL(p, base).toString()); if (s !== 200) badLinks.push(`${p} -> ${s}`); });
  add({
    id: "WA4.internal-links", target,
    measured: paths.length ? `${paths.length - badLinks.length}/${paths.length} answer 200` : "no internal links in the body",
    threshold: "every internal link answers 200 on the preview", pass: badLinks.length === 0, details: badLinks.sort(),
  });
  // source URLs: 2xx or 3xx; 403, 429 and 5xx are WARN (the site may be blocking robots or briefly down; open the URL in a browser)
  const urls = (Array.isArray(parsed.fm.sources) ? parsed.fm.sources : []).map((s) => s?.url).filter(isStr);
  const bad = [], warn = [];
  await pool([...new Set(urls)], 5, async (u) => {
    const r = await checkUrl(u);
    const c = classifyStatus(r.status);
    const text = `${u} -> ${r.status || "no answer"}${r.note ? ` (${r.note})` : ""}`;
    if (c === "fail") bad.push(text); else if (c === "warn") warn.push(text);
  });
  const nOk = urls.length - bad.length - warn.length;
  add({
    id: "WA4.source-urls", target,
    measured: `${nOk}/${urls.length} load${warn.length ? `, ${warn.length} WARN (403/429/5xx)` : ""}${bad.length ? `, ${bad.length} FAIL` : ""}`,
    threshold: "every source URL answers 2xx or 3xx (403/429/5xx are WARN: open the URL in a browser)",
    pass: urls.length > 0 && bad.length === 0, warn: warn.length > 0,
    details: [...bad.sort().map((t) => `FAIL ${t}`), ...warn.sort().map((t) => `WARN ${t}`)],
  });
}
