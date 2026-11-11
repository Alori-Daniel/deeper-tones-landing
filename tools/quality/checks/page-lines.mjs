// Turns browser measurements into check lines (C1, C2, C3, A3 overflow, B4/B5 served figures, C4 lazy/first image).
// Pure functions: the self-test feeds them measurements from synthetic pages.
import { round } from "../lib/util.mjs";

// next/font renames families to "__Source_Serif_4_a1b2c3" (and "..._Fallback_a1b2c3"); turn that back into a name.
export function normFamily(f) {
  return f.replace(/^["']|["']$/g, "").replace(/^_+/, "").replace(/_/g, " ").replace(/\s+[0-9a-f]{5,10}$/i, "").trim();
}
const isSerif = (f) => /^Source Serif 4$/i.test(normFamily(f));
const isArchivo = (f) => /^Archivo$/i.test(normFamily(f));

const at = (path, vw) => `${path} @${vw}`;
const cap = (arr, n = 8) => (arr.length > n ? [...arr.slice(0, n), `... ${arr.length - n} more`] : arr);

export function typographyLines(add, path, vw, T, { measureLine = true } = {}) {
  const tgt = at(path, vw);
  add({ id: "C1.body-size", target: tgt, measured: T.bodySize === null ? "no body text found" : `${T.bodySize}px`, threshold: ">= 18px", pass: T.bodySize !== null && T.bodySize >= 18, details: T.sizeHistogram });
  add({ id: "C1.line-height", target: tgt, measured: T.minLineHeightRatio === null ? "n/a" : `${round(T.minLineHeightRatio, 2)} (smallest body line-height / font-size)`, threshold: ">= 1.6", pass: T.minLineHeightRatio !== null && T.minLineHeightRatio >= 1.595, details: T.worstLineHeightText });
  if (vw >= 1024 && measureLine) {
    add({ id: "C1.measure", target: tgt, measured: T.measure === null ? "no paragraph of 3+ lines" : `${T.measure} characters per line (median of ${T.measureParagraphs} paragraphs)`, threshold: "60 to 75 characters", pass: T.measure !== null && T.measure >= 60 && T.measure <= 75 });
  }
  add({ id: "C1.no-italics", target: tgt, measured: T.italicCount === 0 ? "none" : `${T.italicCount} italic elements`, threshold: "none", pass: T.italicCount === 0, details: T.italics });
  if (vw >= 1024) {
    add({ id: "C1.single-h1", target: tgt, measured: `${T.h1Count} h1`, threshold: "exactly 1", pass: T.h1Count === 1 });
    add({ id: "C1.heading-order", target: tgt, measured: T.jumps.length ? `${T.jumps.length} skipped levels` : `${T.headingCount} headings in order`, threshold: "starts at h1, never skips a level", pass: T.jumps.length === 0 && T.headingCount > 0, details: T.jumps });
    const badHeads = T.headingFamilies.filter((h) => !isSerif(h.family));
    const badText = T.textFamilies.filter((t) => !isArchivo(t.family));
    const faces = T.loadedFaces.map(normFamily);
    const missingFaces = ["Source Serif 4", "Archivo"].filter((f) => !faces.some((x) => x.toLowerCase() === f.toLowerCase()));
    const problems = [
      ...badHeads.map((h) => `${h.tag} "${h.text}" uses ${normFamily(h.family)}`),
      ...badText.map((t) => `text in ${normFamily(t.family)} (${t.chars} chars, e.g. ${t.example})`),
      ...missingFaces.map((f) => `${f} is not loaded`),
    ];
    add({
      id: "C1.fonts", target: tgt,
      measured: problems.length ? `${problems.length} problems` : `${T.headingFamilies.length} headings in Source Serif 4, all text in Archivo`,
      threshold: "headings Source Serif 4, text Archivo, both faces loaded", pass: problems.length === 0 && T.headingFamilies.length > 0, details: cap(problems),
    });
  }
}

export function platformFontLines(add, path, vw, P) {
  if (!P) return;
  const share = (g, re) => {
    if (!g || !g.glyphs) return { ok: false, text: "no glyphs measured" };
    let good = 0;
    for (const [k, n] of Object.entries(g.families)) if (re.test(k) && /web font/.test(k)) good += n;
    return { ok: good / g.glyphs >= 0.97, text: `${round((good / g.glyphs) * 100, 1)}% (${Object.keys(g.families).join(", ")})` };
  };
  const h = share(P.headings, /source serif/i), t = share(P.text, /archivo/i), c = share(P.captions, /archivo/i);
  const problems = [!h.ok && `headings: ${h.text}`, !t.ok && `text: ${t.text}`, P.captions?.nodes && !c.ok && `captions: ${c.text}`].filter(Boolean);
  add({ id: "C1.fonts-rendered", target: at(path, vw), measured: problems.length ? problems.join("; ") : `headings ${h.text}, text ${t.text}`, threshold: ">= 97% of glyphs drawn with the web fonts (Source Serif 4 / Archivo), not a fallback", pass: problems.length === 0 });
}

export function layoutLines(add, path, vw, L, { idPrefix = "C3", withImages = true } = {}) {
  const tgt = at(path, vw);
  const ov = L.docOverflow > 1 || L.offenderCount > 0;
  add({
    id: idPrefix === "A3" ? "A3.no-overflow" : "C3.no-horizontal-overflow", target: tgt,
    measured: ov ? `page is ${L.scrollW}px wide in a ${L.vw}px viewport${L.offenderCount ? `, ${L.offenderCount} elements past the edge` : ""}` : "none",
    threshold: "scrollWidth <= viewport, no text past the edge", pass: !ov, details: L.offenders,
  });
  if (idPrefix === "C3") {
    add({ id: "C3.no-clipped-text", target: tgt, measured: L.clippedCount ? `${L.clippedCount} clipped` : "none", threshold: "none", pass: L.clippedCount === 0, details: L.clipped });
    if (withImages) add({ id: "C3.image-dimensions", target: tgt, measured: L.imgsNoDims.length ? `${L.imgsNoDims.length} of ${L.imgCount} images lack width/height` : `${L.imgCount} images, all with width and height`, threshold: "every img has width and height attributes", pass: L.imgsNoDims.length === 0, details: L.imgsNoDims });
  }
}

export function clsLine(add, path, vw, cls) {
  add({ id: "C3.cls", target: at(path, vw), measured: round(cls.cls, 4), threshold: "< 0.05", pass: cls.cls < 0.05 });
}

export function contrastLine(add, path, vw, C) {
  const fails = C.results.filter((r) => r.ratio < r.need - 1e-6);
  const worst = C.results.reduce((m, r) => (r.ratio - r.need < m.d ? { d: r.ratio - r.need, r } : m), { d: Infinity, r: null }).r;
  add({
    id: "C2.contrast", target: at(path, vw),
    measured: `${fails.length} of ${C.results.length} text runs below AA` + (worst ? `; worst ${round(worst.ratio, 2)}:1 (needs ${worst.need}) on "${worst.text}"` : ""),
    threshold: "WCAG AA: 4.5:1 text, 3:1 large text (>= 24px, or >= 18.66px bold)", pass: C.results.length > 0 && fails.length === 0,
    details: cap(fails.sort((a, b) => a.ratio - b.ratio).map((r) => `${round(r.ratio, 2)}:1 < ${r.need} ${r.sel} "${r.text}" ${r.size}px fg rgb(${r.fg}) on bg rgb(${r.bg})`), 14),
  });
}

// ---- figures as served ----
const parseSrcset = (s) => (s || "").split(",").map((c) => c.trim()).filter(Boolean).map((c) => { const [u, d] = c.split(/\s+/); return { url: u, w: d && d.endsWith("w") ? parseInt(d) : null }; });

export function figureServedLines(add, path, vw, dpr, figs, compiledFigures) {
  const tgt = at(path, vw);
  for (const f of figs) {
    const id = (compiledFigures || []).find((c) => (f.src || "").includes(`/${c.id}.`));
    const label = `${tgt} ${id ? id.id : f.src}`;
    const cands = parseSrcset(f.srcset).concat(parseSrcset(f.pictureSrcset));
    const responsive = (f.inPicture || (f.srcset && cands.filter((c) => c.w).length >= 2 && !!f.sizes)) && cands.length >= 2;
    // A photo whose original is narrower than 800 px has one file only (never upscaled): nothing to choose between.
    const singleFile = !!id && id.width < 800 && !!f.src && cands.length <= 1;
    if (vw <= 400) {
      add({
        id: "B4.responsive-images", target: label,
        measured: f.srcset || f.pictureSrcset ? `srcset with ${cands.length} candidates${f.sizes ? ", sizes set" : ", no sizes"}` : singleFile ? `one file, the original is ${id.width}px wide` : "no srcset",
        threshold: "srcset (2+ widths) with sizes, or picture; or one file when the original is under 800 px", pass: !!responsive || singleFile,
      });
    }
    // The file the browser downloaded, in real pixels. img.naturalWidth is not that: Chromium divides it by the pixel
    // density of a w-descriptor srcset, so it always equals the CSS width.
    const served = f.servedWidth ?? f.naturalWidth;
    const need = f.cssWidth * dpr;
    const r = need ? served / need : 0;
    const maxIntrinsic = id ? id.width : served;
    add({
      id: "B4.served-size", target: `${label} (${dpr}x screen)`, measured: `${served}px file downloaded for ${Math.round(need)}px needed (${round(r, 2)}x)`,
      threshold: "0.85x to 1.75x of the pixels needed (or the largest file we have)", pass: f.complete && r <= 1.75 && (r >= 0.85 || served >= maxIntrinsic),
    });
  }
}

export function lazyAndFirstImageLines(add, path, vw, dpr, figs, firstImg) {
  const tgt = at(path, vw);
  const below = figs.filter((f) => f.top >= f.vh);
  const notLazy = below.filter((f) => f.loading !== "lazy");
  add({ id: "C4.lazy-below-fold", target: tgt, measured: below.length ? `${below.length - notLazy.length}/${below.length} below-the-fold images are loading=lazy` : "no figure below the fold", threshold: "all lazy", pass: notLazy.length === 0, details: notLazy.map((f) => f.src) });
  if (firstImg) {
    const need = firstImg.cssWidth * dpr;
    const served = firstImg.servedWidth ?? firstImg.naturalWidth;
    const r = served / need;
    add({ id: "C4.first-image-not-oversized", target: `${tgt} ${firstImg.src}`, measured: `${served}px file downloaded for ${Math.round(need)}px needed (${round(r, 2)}x)`, threshold: "<= 1.5x the pixels needed", pass: r <= 1.5 });
  }
}

const bucket = (ratios, tol = 0.03) => {
  const out = [];
  for (const r of [...ratios].sort((a, b) => a - b)) if (!out.length || r - out[out.length - 1].max > tol) out.push({ min: r, max: r, n: 1 }); else { out[out.length - 1].max = r; out[out.length - 1].n++; }
  return out;
};

// B5, across every figure on every guide at one viewport width.
export function frameLines(add, vw, allFigs) {
  // The frame is the box around the image (the plate of a study photo), or the image itself when there is none.
  const withRatio = allFigs.filter((f) => f.frameRatio ?? f.ratio);
  const buckets = bucket(withRatio.map((f) => f.frameRatio ?? f.ratio));
  add({
    id: "B5.aspect-ratios", target: `all figures @${vw}`,
    measured: `${buckets.length} ratios: ${buckets.map((b) => `${round((b.min + b.max) / 2, 2)} (${b.n}x)`).join(", ")}`, threshold: "<= 2 distinct aspect ratios (rendered frames)", pass: withRatio.length > 0 && buckets.length <= 2,
  });
  const keyOf = (c) => JSON.stringify([c.fontSize, c.lineHeight, c.color, c.marginTop, c.fontFamily, c.textAlign, c.fontWeight]);
  const caps = allFigs.map((f) => f.caption);
  const missing = caps.filter((c) => !c).length;
  const kinds = new Map();
  for (const c of caps.filter(Boolean)) kinds.set(keyOf(c), (kinds.get(keyOf(c)) || 0) + 1);
  const describe = ([k, n]) => { const [fs, lh, col, mt, ff, ta, fw] = JSON.parse(k); return `${n}x ${fs}/${lh} ${col} mt ${mt} ${ff} ${fw} ${ta}`; };
  add({
    id: "B5.caption-style", target: `all figures @${vw}`,
    measured: missing ? `${missing} figures have no figcaption` : kinds.size === 1 ? "one caption style" : `${kinds.size} different caption styles`,
    threshold: "every figure has a figcaption with the same computed style", pass: missing === 0 && kinds.size === 1 && caps.length > 0, details: [...kinds.entries()].map(describe),
  });
}
