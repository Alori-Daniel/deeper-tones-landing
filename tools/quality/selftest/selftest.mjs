// Self-test: the same check code run on synthetic pages and data. A "bad" page with known faults must make the
// matching checks FAIL; a "good" page must make them PASS. Each SELFTEST line is PASS when the check behaves.
import { createServer } from "node:http";
import { Checks } from "../lib/util.mjs";
import { runWaveSelfTest } from "./wave-selftest.mjs";
import { runHubsSelfTest } from "./hubs-selftest.mjs";
import { newPageIn, loadLikeAReader, measure, contrastScan, contrastRatio } from "../lib/browser.mjs";
import { analyzeSvgFonts, mutateFamilies } from "../lib/svgfonts.mjs";
import { clsLine, contrastLine, figureServedLines, frameLines, layoutLines, lazyAndFirstImageLines, normFamily, platformFontLines, typographyLines } from "../checks/page-lines.mjs";

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
const LOREM = "Dark marks left by pimples fade slowly, and the sun can darken them again, so daily sunscreen matters more than any single product. Most people see a change after several weeks, not days, and some marks take months to settle. ";

const BAD = `<!doctype html><html><head><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><title>bad</title>
<style>body{margin:0;font:15px/1.2 Arial,Helvetica,sans-serif;color:#141414;background:#fff}main{padding:12px}
.wide{width:600px;background:#eee}.faint{color:#999}.clip{width:60px;height:20px;overflow:hidden;white-space:nowrap}</style></head><body><main>
<h1>First title</h1><h1>Second title</h1><h3>Skipped a level</h3>
<p id=lead>${LOREM.repeat(6)}</p>
<p><em>An italic line that must be reported.</em></p>
<p class=faint>Faint grey caption on white, about 2.8 to 1.</p>
<div class=wide>A fixed 600 px block in a 375 px phone viewport.</div>
<div class=clip>This long sentence is clipped by its own box and cannot be read in full.</div>
<img src="/pix.png" style="width:100px;height:auto" alt="no dimensions">
<script>setTimeout(()=>{const d=document.createElement('div');d.style.cssText='height:260px;background:#ddd';d.textContent='late block';const l=document.getElementById('lead');l.parentNode.insertBefore(d,l);},700);</script>
</main></body></html>`;

const GOOD = `<!doctype html><html><head><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><title>good</title>
<style>body{margin:0;font:19px/1.7 Georgia,serif;color:#141414;background:#f1f1f1}main{max-width:30em;margin:0 auto;padding:24px 16px}
.muted{color:#5e5e5e}.trunc{width:120px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}</style></head><body><main>
<div class=trunc>A long breadcrumb title cut on purpose with an ellipsis</div>
<h1>One title</h1><h2>A section</h2><h3>A sub section</h3>
<p>${LOREM.repeat(4)}</p><p class=muted>${LOREM.repeat(2)}</p>
<img src="/pix.png" width="100" height="100" alt="with dimensions" style="width:100px;height:100px">
</main></body></html>`;

export async function runSelfTest(browser, checks) {
  const server = createServer((req, res) => {
    if (req.url === "/pix.png") { res.writeHead(200, { "content-type": "image/png" }); return res.end(PNG); }
    res.writeHead(200, { "content-type": "text/html" });
    res.end(req.url.startsWith("/good") ? GOOD : BAD);
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const results = { bad: [], good: [] };
  try {
    for (const which of ["bad", "good"]) {
      for (const vw of [375, 1280]) {
        const { context, page } = await newPageIn(browser, vw, 1, 812);
        await loadLikeAReader(page, `${base}/${which}`);
        const m = await measure(page, { withFonts: vw === 1280 });
        const lines = new Checks();
        const add = (l) => lines.add(l);
        typographyLines(add, `/${which}`, vw, m.typo);
        layoutLines(add, `/${which}`, vw, m.layout);
        clsLine(add, `/${which}`, vw, m.cls);
        platformFontLines(add, `/${which}`, vw, m.platform);
        const c = await contrastScan(page);
        contrastLine(add, `/${which}`, vw, c);
        results[which].push(...lines.lines.map((l) => ({ ...l, vw })));
        await context.close();
      }
    }
  } finally {
    server.close();
  }
  const status = (which, id, vw) => results[which].find((l) => l.id === id && (vw ? l.vw === vw : true));
  const expect = (name, got, want, detail) => checks.add({ id: `SELFTEST.${name}`, target: "synthetic", measured: `${got.status === want ? "" : "UNEXPECTED: "}${detail ?? ""}${got.status} (wanted ${want})`.trim(), threshold: `${want} on known ${want === "FAIL" ? "faults" : "good input"}`, pass: got.status === want });
  const must = (which, id, want, vw) => {
    const l = status(which, id, vw);
    expect(`${id}${vw ? "@" + vw : ""}.${which}`, l || { status: "MISSING" }, want, l ? `${l.measured}; ` : "");
  };
  // bad page: every known fault is reported
  must("bad", "C1.body-size", "FAIL", 375);
  must("bad", "C1.line-height", "FAIL", 375);
  must("bad", "C1.measure", "FAIL", 1280);
  must("bad", "C1.no-italics", "FAIL", 375);
  must("bad", "C1.single-h1", "FAIL", 1280);
  must("bad", "C1.heading-order", "FAIL", 1280);
  must("bad", "C1.fonts", "FAIL", 1280);
  must("bad", "C1.fonts-rendered", "FAIL", 1280);
  must("bad", "C2.contrast", "FAIL", 375);
  must("bad", "C3.no-horizontal-overflow", "FAIL", 375);
  must("bad", "C3.no-clipped-text", "FAIL", 375);
  must("bad", "C3.image-dimensions", "FAIL", 375);
  must("bad", "C3.cls", "FAIL", 375);
  // good page: the same checks pass, so they are not simply always red
  for (const [id, vw] of [["C1.body-size", 375], ["C1.line-height", 375], ["C1.measure", 1280], ["C1.no-italics", 375], ["C1.single-h1", 1280], ["C1.heading-order", 1280], ["C2.contrast", 375], ["C2.contrast", 1280], ["C3.no-horizontal-overflow", 375], ["C3.no-clipped-text", 375], ["C3.image-dimensions", 375], ["C3.cls", 375]]) must("good", id, "PASS", vw);

  // unit checks on synthetic data
  const unit = (name, ok, detail) => checks.add({ id: `SELFTEST.${name}`, target: "synthetic", measured: detail ?? (ok ? "behaves" : "WRONG"), threshold: "as specified", pass: !!ok });
  const svg = (fam, extra = "") => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675" ${fam ? `font-family="${fam}"` : ""}><text x="1" y="2" ${extra}>Hi</text></svg>`;
  unit("B2.helvetica-svg-fails", analyzeSvgFonts(svg("Helvetica, Arial, sans-serif")).problems.length > 0);
  unit("B2.no-family-svg-fails", analyzeSvgFonts(svg(null)).problems.length > 0);
  unit("B2.other-font-svg-fails", analyzeSvgFonts(svg("Inter, sans-serif")).problems.length > 0);
  unit("B2.arial-after-archivo-fails", analyzeSvgFonts(svg("Archivo, Arial")).problems.length > 0);
  unit("B2.archivo-svg-passes", analyzeSvgFonts(svg("Archivo, sans-serif")).problems.length === 0);
  unit("B2.serif-title-passes", analyzeSvgFonts(svg("Archivo", 'font-family="&apos;Source Serif 4&apos;, serif"')).problems.length === 0 || analyzeSvgFonts(svg("Archivo", "font-family='Source Serif 4, serif'")).problems.length === 0);
  unit("B2.css-family-svg-passes", analyzeSvgFonts(`<svg><style>text{font-family:'Archivo',sans-serif}</style><text>Hi</text></svg>`).problems.length === 0);
  unit("B2.mutation-rewrites-all-families", !/Archivo|Helvetica|Source Serif/.test(mutateFamilies(`<svg font-family="Archivo"><style>.a{font-family:'Source Serif 4',serif}</style><text style="font-family:Helvetica">x</text></svg>`)));
  {
    const m = mutateFamilies(`<svg><style>@font-face{font-family:Archivo;src:url(data:font/woff2;base64,AAAA)}text{font-family:Archivo}</style><text>x</text></svg>`);
    unit("B2.mutation-keeps-font-face", /@font-face\{font-family:Archivo;/.test(m) && /text\{font-family:Zz Nonexistent Font\}/.test(m));
  }
  unit("C1.next-font-names-normalise", normFamily("__Archivo_a1b2c3") === "Archivo" && normFamily('"__Source_Serif_4_9f8e7d"') === "Source Serif 4" && normFamily("__Archivo_Fallback_a1b2c3") !== "Archivo" && normFamily("Arial") !== "Archivo");
  unit("C2.wcag-ratio-math", Math.abs(contrastRatio([255, 255, 255], [118, 118, 118]) - 4.54) < 0.02 && contrastRatio([255, 255, 255], [119, 119, 119]) < 4.5);

  const grab = (fn) => { const c = new Checks(); fn((l) => c.add(l)); return c.lines; };
  const fig = (ratio, cap = {}) => ({ ratio, caption: { fontSize: "14px", lineHeight: "21px", color: "rgb(94,94,94)", marginTop: "8px", fontFamily: "Archivo", textAlign: "left", fontWeight: "400", ...cap } });
  unit("B5.three-ratios-fail", grab((a) => frameLines(a, 1280, [fig(1.78), fig(1.5), fig(2.05)])).find((l) => l.id === "B5.aspect-ratios").status === "FAIL");
  // A study photo sits in a 4:3 plate: the frame ratio counts, not the picture inside it.
  unit("B5.frame-ratio-counts", grab((a) => frameLines(a, 1280, [{ ...fig(1.33), frameRatio: 1.33 }, { ...fig(2.05), frameRatio: 1.33 }, { ...fig(1.06), frameRatio: 1.33 }])).find((l) => l.id === "B5.aspect-ratios").status === "PASS");
  unit("B5.two-ratios-pass", grab((a) => frameLines(a, 1280, [fig(1.78), fig(1.77), fig(1.5)])).find((l) => l.id === "B5.aspect-ratios").status === "PASS");
  unit("B5.caption-styles-differ-fail", grab((a) => frameLines(a, 1280, [fig(1.5), fig(1.5, { fontSize: "16px" })])).find((l) => l.id === "B5.caption-style").status === "FAIL");
  unit("B5.caption-styles-same-pass", grab((a) => frameLines(a, 1280, [fig(1.5), fig(1.5)])).find((l) => l.id === "B5.caption-style").status === "PASS");
  const img = (o) => ({ src: "/guides/s/a.webp", srcset: null, sizes: null, inPicture: false, pictureSrcset: null, naturalWidth: 1600, cssWidth: 340, complete: true, loading: "lazy", top: 3000, vh: 812, ...o });
  const served = (o, vw = 375) => grab((a) => figureServedLines(a, "/guides/s", vw, 2, [img(o)], [{ id: "a", width: 1600 }]));
  unit("B4.no-srcset-fails", served({}).find((l) => l.id === "B4.responsive-images").status === "FAIL");
  unit("B4.srcset-with-sizes-passes", served({ srcset: "/a-640.webp 640w, /a-1280.webp 1280w, /a.webp 1600w", sizes: "(min-width: 768px) 704px, 92vw", naturalWidth: 800 }).find((l) => l.id === "B4.responsive-images").status === "PASS");
  unit("B4.single-file-small-original-passes", grab((a) => figureServedLines(a, "/guides/s", 375, 2, [img({ naturalWidth: 335, servedWidth: 617, cssWidth: 335 })], [{ id: "a", width: 617 }])).find((l) => l.id === "B4.responsive-images").status === "PASS");
  unit("B4.single-file-large-original-fails", served({ servedWidth: 1600 }).find((l) => l.id === "B4.responsive-images").status === "FAIL");
  // naturalWidth is density-corrected by Chromium (equals the CSS width), so the checker must trust the downloaded file.
  unit("B4.density-corrected-natural-width-ignored", served({ naturalWidth: 340, servedWidth: 1600 }).find((l) => l.id === "B4.served-size").status === "FAIL");
  unit("B4.served-width-fits-passes", served({ naturalWidth: 340, servedWidth: 800 }).find((l) => l.id === "B4.served-size").status === "PASS");
  unit("C4.first-image-uses-served-width", grab((a) => lazyAndFirstImageLines(a, "/g", 375, 2, [img({})], img({ naturalWidth: 340, servedWidth: 1600 }))).find((l) => l.id === "C4.first-image-not-oversized").status === "FAIL");
  unit("B4.oversized-file-fails", served({}).find((l) => l.id === "B4.served-size").status === "FAIL");
  unit("B4.fitting-file-passes", served({ naturalWidth: 800 }).find((l) => l.id === "B4.served-size").status === "PASS");
  unit("C4.eager-below-fold-fails", grab((a) => lazyAndFirstImageLines(a, "/g", 375, 2, [img({ loading: null })], null)).find((l) => l.id === "C4.lazy-below-fold").status === "FAIL");
  unit("C4.oversized-first-image-fails", grab((a) => lazyAndFirstImageLines(a, "/g", 375, 2, [img({})], img({}))).find((l) => l.id === "C4.first-image-not-oversized").status === "FAIL");
  // wave lines WA1 to WA4 (quality/ACCEPTANCE-WAVE.md section W-A): see wave-selftest.mjs
  await runWaveSelfTest(checks);
  // hub lines H1 to H6 (quality/ACCEPTANCE-HUBS.md): see hubs-selftest.mjs
  await runHubsSelfTest(checks);
}
