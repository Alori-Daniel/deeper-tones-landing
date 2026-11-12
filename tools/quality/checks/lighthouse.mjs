// C4: Lighthouse (mobile settings, Lighthouse defaults) on two guides, run with Playwright's Chromium.
// `runs` (from --lighthouse-runs, default 1): how many times a page below 90 performance may be measured.
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import { existsSync } from "node:fs";
import { findCachedChromium } from "../lib/util.mjs";

export async function lighthouseChecks(checks, { base, slugs, outDir, runs = 1 }) {
  let lighthouse, chromeLauncher;
  try {
    ({ default: lighthouse } = await import("lighthouse"));
    chromeLauncher = await import("chrome-launcher");
  } catch (e) {
    for (const s of slugs) checks.add({ id: "C4.lighthouse", target: `/guides/${s}`, measured: `lighthouse not installed: ${e.message}`, threshold: "performance >= 90, accessibility >= 95", pass: false });
    return;
  }
  let chromePath = null;
  try { const p = chromium.executablePath(); if (existsSync(p)) chromePath = p; } catch {}
  chromePath = chromePath || findCachedChromium();
  if (!chromePath) {
    for (const s of slugs) checks.add({ id: "C4.lighthouse", target: `/guides/${s}`, measured: "no Chrome available", threshold: "performance >= 90, accessibility >= 95", pass: false });
    return;
  }
  mkdirSync(outDir, { recursive: true });
  for (const slug of slugs) {
    const url = `${base}/guides/${slug}`;
    // Performance is noisy on shared CI machines, so with runs > 1 a page below 90 is measured again and the best score
    // counts; a slow page still fails every run. Accessibility is not noisy and is judged on the first run.
    let best = null, first = null, done = 0, error = null;
    for (let i = 0; i < Math.max(1, runs) && !(best && best.perf >= 90); i++) {
      let chrome;
      try {
        chrome = await chromeLauncher.launch({ chromePath, chromeFlags: ["--headless=new", "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"] });
        const r = await lighthouse(url, { port: chrome.port, output: "json", logLevel: "error", onlyCategories: ["performance", "accessibility"] });
        const c = r.lhr.categories;
        const au = r.lhr.audits;
        const run = {
          report: r.report,
          perf: Math.round((c.performance.score ?? 0) * 100),
          a11y: Math.round((c.accessibility.score ?? 0) * 100),
          lcp: au["largest-contentful-paint"]?.displayValue, cls: au["cumulative-layout-shift"]?.displayValue, tbt: au["total-blocking-time"]?.displayValue,
          failedA11y: Object.values(au).filter((a) => c.accessibility.auditRefs.some((x) => x.id === a.id) && a.score !== null && a.score < 1 && a.scoreDisplayMode !== "notApplicable" && a.scoreDisplayMode !== "informative").map((a) => a.id),
        };
        done++;
        first = first ?? run;
        if (!best || run.perf > best.perf) best = run;
      } catch (e) {
        error = e;
      } finally {
        try { await chrome?.kill(); } catch {}
      }
    }
    if (!best) {
      checks.add({ id: "C4.lighthouse-performance", target: `/guides/${slug} (mobile)`, measured: `lighthouse failed: ${String(error?.message).slice(0, 200)}`, threshold: ">= 90", pass: false });
      checks.add({ id: "C4.lighthouse-accessibility", target: `/guides/${slug} (mobile)`, measured: "lighthouse failed", threshold: ">= 95", pass: false });
      continue;
    }
    writeFileSync(join(outDir, `lighthouse-${slug}.json`), best.report);
    const runsNote = done > 1 ? `, best of ${done} runs` : "";
    checks.add({ id: "C4.lighthouse-performance", target: `/guides/${slug} (mobile)`, measured: `${best.perf} (LCP ${best.lcp}, TBT ${best.tbt}, CLS ${best.cls}${runsNote})`, threshold: ">= 90", pass: best.perf >= 90 });
    checks.add({ id: "C4.lighthouse-accessibility", target: `/guides/${slug} (mobile)`, measured: first.a11y, threshold: ">= 95", pass: first.a11y >= 95, details: first.failedA11y });
  }
}
