// C4: Lighthouse (mobile settings, Lighthouse defaults) on two guides, run with Playwright's Chromium.
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import { existsSync } from "node:fs";
import { findCachedChromium } from "../lib/util.mjs";

export async function lighthouseChecks(checks, { base, slugs, outDir }) {
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
    let chrome;
    try {
      chrome = await chromeLauncher.launch({ chromePath, chromeFlags: ["--headless=new", "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"] });
      const r = await lighthouse(url, { port: chrome.port, output: "json", logLevel: "error", onlyCategories: ["performance", "accessibility"] });
      writeFileSync(join(outDir, `lighthouse-${slug}.json`), r.report);
      const c = r.lhr.categories;
      const perf = Math.round((c.performance.score ?? 0) * 100), a11y = Math.round((c.accessibility.score ?? 0) * 100);
      const au = r.lhr.audits;
      const lcp = au["largest-contentful-paint"]?.displayValue, cls = au["cumulative-layout-shift"]?.displayValue, tbt = au["total-blocking-time"]?.displayValue;
      const failedA11y = Object.values(au).filter((a) => c.accessibility.auditRefs.some((x) => x.id === a.id) && a.score !== null && a.score < 1 && a.scoreDisplayMode !== "notApplicable" && a.scoreDisplayMode !== "informative").map((a) => a.id);
      checks.add({ id: "C4.lighthouse-performance", target: `/guides/${slug} (mobile)`, measured: `${perf} (LCP ${lcp}, TBT ${tbt}, CLS ${cls})`, threshold: ">= 90", pass: perf >= 90 });
      checks.add({ id: "C4.lighthouse-accessibility", target: `/guides/${slug} (mobile)`, measured: a11y, threshold: ">= 95", pass: a11y >= 95, details: failedA11y });
    } catch (e) {
      checks.add({ id: "C4.lighthouse-performance", target: `/guides/${slug} (mobile)`, measured: `lighthouse failed: ${String(e.message).slice(0, 200)}`, threshold: ">= 90", pass: false });
      checks.add({ id: "C4.lighthouse-accessibility", target: `/guides/${slug} (mobile)`, measured: "lighthouse failed", threshold: ">= 95", pass: false });
    } finally {
      try { await chrome?.kill(); } catch {}
    }
  }
}
