// Browser-side measurement: loading a page the way a reader does, running the evaluators, screenshots, contrast sampling.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import sharp from "sharp";
import { HIDE_TEXT_CSS, evalFigures, evalLayout, evalMeta, evalPlainText, evalTextRuns, evalTypography } from "./evals.mjs";
import { sleep } from "./util.mjs";

export const CLS_INIT = `
  window.__cls = 0; window.__clsEntries = [];
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) if (!e.hadRecentInput) { window.__cls += e.value; window.__clsEntries.push(e.value); }
    }).observe({ type: "layout-shift", buffered: true });
  } catch (e) {}
`;

export async function newPageIn(browser, vw, dpr = 1, vh = 900) {
  const context = await browser.newContext({ viewport: { width: vw, height: vh }, deviceScaleFactor: dpr, locale: "en-GB" });
  await context.addInitScript(CLS_INIT);
  const page = await context.newPage();
  return { context, page };
}

// Loads, waits for fonts, scrolls to the bottom in steps (so lazy images load and any shift happens), returns to top.
export async function loadLikeAReader(page, url) {
  const resp = await page.goto(url, { waitUntil: "load", timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
  // Sit at the top first: a shift that happens while the reader looks at the opening screen is what CLS is about,
  // and scrolling straight away would let scroll anchoring hide it.
  await sleep(1100);
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  const step = Math.max(300, Math.round((await page.evaluate(() => window.innerHeight)) * 0.9));
  for (let y = 0; y < h + step; y += step) {
    await page.evaluate((yy) => window.scrollTo({ top: yy, behavior: "instant" }), y);
    await sleep(60);
  }
  await page.waitForFunction(() => [...document.images].every((i) => i.complete), null, { timeout: 15000 }).catch(() => {});
  await sleep(500);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await sleep(300);
  return resp?.status() ?? 0;
}

export const readCls = (page) => page.evaluate(() => ({ cls: window.__cls, entries: window.__clsEntries.length }));

// Page captured as vertical chunks (a single full-page capture fails past ~16k px on long phone pages).
export async function captureChunks(page, chunkH = 3000) {
  const dims = await page.evaluate(() => ({ w: Math.ceil(document.documentElement.scrollWidth), h: Math.ceil(document.documentElement.scrollHeight) }));
  const vw = await page.evaluate(() => window.innerWidth);
  const width = Math.min(dims.w, vw) || vw;
  const chunks = [];
  for (let y = 0; y < dims.h; y += chunkH) {
    const h = Math.min(chunkH, dims.h - y);
    const buf = await page.screenshot({ fullPage: true, clip: { x: 0, y, width, height: h }, type: "png", animations: "disabled" });
    chunks.push({ y, h, buf });
  }
  return { chunks, width, height: dims.h };
}

export async function saveStitched(cap, path) {
  mkdirSync(dirname(path), { recursive: true });
  if (cap.chunks.length === 1) return writeFileSync(path, cap.chunks[0].buf);
  await sharp({ create: { width: cap.width, height: cap.height, channels: 3, background: "#ffffff" } })
    .composite(cap.chunks.map((c) => ({ input: c.buf, left: 0, top: c.y })))
    .png({ compressionLevel: 6 })
    .toFile(path);
}

// ---------- contrast ----------
const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
export const contrastRatio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

export async function contrastScan(page) {
  const { runs, pageW, pageH } = await page.evaluate(evalTextRuns);
  await page.addStyleTag({ content: HIDE_TEXT_CSS });
  await sleep(150);
  const cap = await captureChunks(page);
  const raws = [];
  for (const c of cap.chunks) {
    const { data, info } = await sharp(c.buf).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    raws.push({ y: c.y, h: info.height, w: info.width, data });
  }
  const px = (x, y) => {
    for (const r of raws) if (y >= r.y && y < r.y + r.h) { const i = ((y - r.y) * r.w + x) * 3; return [r.data[i], r.data[i + 1], r.data[i + 2]]; }
    return null;
  };
  const results = [];
  for (const run of runs) {
    const samples = [];
    for (const r of run.rects) {
      const x0 = Math.max(0, Math.floor(r.x)), x1 = Math.min(cap.width - 1, Math.ceil(r.x + r.w) - 1);
      const y0 = Math.max(0, Math.floor(r.y)), y1 = Math.min(pageH - 1, Math.ceil(r.y + r.h) - 1);
      if (x1 < x0 || y1 < y0) continue;
      const sx = Math.max(1, Math.ceil((x1 - x0 + 1) / 24)), sy = Math.max(1, Math.ceil((y1 - y0 + 1) / 6));
      for (let y = y0; y <= y1; y += sy) for (let x = x0; x <= x1; x += sx) {
        const p = px(x, y);
        if (p) samples.push(p);
      }
    }
    if (!samples.length) continue; // off-screen or clipped: nothing to sample
    const large = run.size >= 24 || (run.size >= 18.66 && run.weight >= 700);
    const need = large ? 3 : 4.5;
    // Contrast against every sampled background pixel; judge the 5th percentile so grain or a stray edge pixel
    // does not decide, but a gradient or photo that really gets too close to the text colour does.
    const a = run.color[3];
    const scored = samples.map((bg) => ({ bg, ratio: contrastRatio([0, 1, 2].map((i) => run.color[i] * a + bg[i] * (1 - a)), bg) })).sort((u, v) => u.ratio - v.ratio);
    const pick = scored[Math.floor(0.05 * (scored.length - 1))];
    const worst = pick.ratio, worstBg = pick.bg.map(Math.round);
    results.push({ sel: run.sel, text: run.text, size: run.size, weight: run.weight, need, ratio: worst, fg: run.color.slice(0, 3).map(Math.round), bg: worstBg });
  }
  return { results, pageH, pageW };
}

// ---------- fonts the browser really used (CDP) ----------
export async function platformFonts(page) {
  const cdp = await page.context().newCDPSession(page);
  try {
    await cdp.send("DOM.enable");
    await cdp.send("CSS.enable");
    const { root } = await cdp.send("DOM.getDocument", { depth: 0 });
    const groups = { headings: "main h1, main h2, main h3", text: "main p, main li", captions: "main figcaption" };
    const out = {};
    for (const [name, sel] of Object.entries(groups)) {
      const { nodeIds } = await cdp.send("DOM.querySelectorAll", { nodeId: root.nodeId, selector: sel });
      const fam = {};
      let glyphs = 0;
      for (const nodeId of nodeIds.slice(0, 14)) {
        const { fonts } = await cdp.send("CSS.getPlatformFontsForNode", { nodeId });
        for (const f of fonts) {
          const k = `${f.familyName}${f.isCustomFont ? " (web font)" : " (system)"}`;
          fam[k] = (fam[k] || 0) + f.glyphCount;
          glyphs += f.glyphCount;
        }
      }
      out[name] = { glyphs, families: fam, nodes: nodeIds.length };
    }
    return out;
  } finally {
    await cdp.detach().catch(() => {});
  }
}

// Real pixel width of each file the browser chose (currentSrc), read from the bytes. img.naturalWidth cannot be used:
// for a w-descriptor srcset Chromium reports it divided by the pixel density, i.e. equal to the CSS width.
const fileWidths = new Map();
export async function fileWidth(url) {
  if (!fileWidths.has(url)) {
    fileWidths.set(url, (async () => {
      try {
        const r = await fetch(url);
        if (!r.ok) return null;
        return (await sharp(Buffer.from(await r.arrayBuffer())).metadata()).width ?? null;
      } catch {
        return null;
      }
    })());
  }
  return fileWidths.get(url);
}
async function addServedWidths(figures) {
  for (const f of figures) f.servedWidth = f.currentSrc ? await fileWidth(f.currentSrc) : null;
  return figures;
}

export async function measure(page, { withContrast = false, withFonts = false } = {}) {
  const data = {};
  data.meta = await page.evaluate(evalMeta);
  data.typo = await page.evaluate(evalTypography);
  data.layout = await page.evaluate(evalLayout);
  data.figures = await addServedWidths(await page.evaluate(evalFigures));
  data.cls = await readCls(page);
  if (withFonts) data.platform = await platformFonts(page);
  if (withContrast) data.contrast = await contrastScan(page);
  return data;
}

export { evalPlainText };
