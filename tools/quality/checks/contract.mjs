// A2, A3 (status + canonical), A4 against the running preview and the frozen source.
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { OTHER_PAGES, decodeEntities, htmlText } from "../lib/pages.mjs";

async function get(base, path, asBuffer = false) {
  try {
    const r = await fetch(new URL(path, base), { redirect: "manual", signal: AbortSignal.timeout(30000) });
    const ct = r.headers.get("content-type") || "";
    if (asBuffer) { await r.arrayBuffer(); return { status: r.status, ct }; }
    return { status: r.status, ct, text: await r.text() };
  } catch (e) {
    return { status: 0, ct: "", text: "", error: String(e) };
  }
}

const imgUrlsInFigures = (html) => {
  const urls = new Set();
  for (const fig of html.matchAll(/<figure[\s\S]*?<\/figure>/g)) {
    for (const tag of fig[0].matchAll(/<(img|source)\b[^>]*>/g)) {
      const t = tag[0];
      const src = /\ssrc="([^"]+)"/.exec(t)?.[1];
      if (src) urls.add(decodeEntities(src));
      const ss = /\ssrcset="([^"]+)"/i.exec(t)?.[1];
      if (ss) for (const c of decodeEntities(ss).split(",")) { const u = c.trim().split(/\s+/)[0]; if (u) urls.add(u); }
    }
  }
  return [...urls];
};

export async function contractChecks(checks, { base, frozen, guides, fixtures, htmlStore }) {
  // ----- A2: guide URL, OG image, every figure image (incl. every srcset candidate) -----
  for (const g of guides) {
    const path = `/guides/${g.slug}`;
    const r = await get(base, path);
    htmlStore.set(path, r.text);
    checks.add({ id: "A2.guide-url", target: path, measured: r.status, threshold: "200", pass: r.status === 200 });
    const og = /<meta[^>]+property="og:image"[^>]+content="([^"]+)"/.exec(r.text)?.[1] || /<meta[^>]+content="([^"]+)"[^>]+property="og:image"/.exec(r.text)?.[1];
    let ogStatus = null, ogCt = null;
    if (og) { const u = new URL(decodeEntities(og)); const rr = await get(base, u.pathname + u.search, true); ogStatus = rr.status; ogCt = rr.ct; }
    checks.add({ id: "A2.og-image", target: path, measured: og ? `${ogStatus} ${ogCt}` : "no og:image meta", threshold: "200 image/*", pass: !!og && ogStatus === 200 && /^image\//.test(ogCt) });
    const figUrls = [...new Set([...g.figures.map((f) => f.src), ...imgUrlsInFigures(r.text)])];
    const bad = [];
    for (const u of figUrls) {
      const url = new URL(u, base);
      const rr = await get(base, url.pathname + url.search, true);
      if (rr.status !== 200 || !/^image\//.test(rr.ct)) bad.push(`${u} -> ${rr.status} ${rr.ct}`);
    }
    checks.add({ id: "A2.figure-images", target: path, measured: `${figUrls.length - bad.length}/${figUrls.length} ok`, threshold: "all 200 image/*", pass: figUrls.length > 0 && bad.length === 0, details: bad });
  }
  const idx = await get(base, "/guides");
  htmlStore.set("/guides", idx.text);
  checks.add({ id: "A2.guide-url", target: "/guides", measured: idx.status, threshold: "200", pass: idx.status === 200 });

  // ----- A3: status + canonical on /, /privacy, /terms (overflow is measured in the browser step) -----
  const canon = {};
  for (const p of OTHER_PAGES) {
    const r = await get(base, p);
    htmlStore.set(p, r.text);
    checks.add({ id: "A3.status", target: p, measured: r.status, threshold: "200", pass: r.status === 200 });
    const c = /<link[^>]+rel="canonical"[^>]+href="([^"]+)"/.exec(r.text)?.[1] || /<link[^>]+href="([^"]+)"[^>]+rel="canonical"/.exec(r.text)?.[1] || null;
    canon[p] = c ? decodeEntities(c) : null;
    const expected = fixtures.canonicals?.[p];
    checks.add({
      id: "A3.canonical", target: p, measured: canon[p], threshold: expected ? `equals recorded ${expected}` : "recorded (no fixture yet)",
      pass: expected ? canon[p] === expected : !!canon[p],
    });
  }
  const guidesCanon = {};
  for (const p of ["/guides", ...guides.map((g) => `/guides/${g.slug}`)]) {
    const t = htmlStore.get(p) || "";
    const c = /<link[^>]+rel="canonical"[^>]+href="([^"]+)"/.exec(t)?.[1];
    guidesCanon[p] = c ? decodeEntities(c) : null;
  }

  // ----- A4 -----
  const cfg = existsSync(join(frozen, "next.config.ts")) ? readFileSync(join(frozen, "next.config.ts"), "utf8") : "";
  const cacheOn = /(cacheComponents|partialPrefetching)\s*:\s*true/.test(cfg);
  checks.add({ id: "A4.cache-components-off", target: "next.config.ts", measured: cacheOn ? "on" : "off", threshold: "off", pass: !cacheOn });

  const srcFiles = walk(join(frozen, "src")).filter((f) => /\.(ts|tsx|js|jsx|mjs)$/.test(f) && !f.endsWith("guides.generated.ts"));
  const useCache = [], fsFiles = [];
  const text = new Map(srcFiles.map((f) => [f, readFileSync(f, "utf8")]));
  for (const [f, t] of text) {
    const rel = relative(frozen, f);
    if (/["']use cache(: \w+)?["']/.test(t)) useCache.push(rel);
    if (/from\s+["'](node:)?fs(\/promises)?["']|require\(\s*["'](node:)?fs(\/promises)?["']\s*\)|\bimport\(\s*["'](node:)?fs/.test(t)) fsFiles.push(f);
  }
  checks.add({ id: "A4.no-use-cache", target: "src/**", measured: useCache.length ? useCache.join(", ") : "none", threshold: "none", pass: useCache.length === 0 });
  // fs may only be used by metadata image routes that are prerendered at build (opengraph-image, twitter-image,
  // icon files) or by helpers imported only by those. Everything else would read files at request time.
  const isImageRoute = (f) => /(^|\/)(opengraph-image|twitter-image|icon|apple-icon)\.(tsx?|jsx?)$/.test(f);
  const importersOf = (f) => {
    const base = f.split("/").pop().replace(/\.(tsx?|jsx?|mjs)$/, "");
    return [...text].filter(([g, t]) => g !== f && new RegExp(`from\\s+["'][^"']*\\/${base}["']`).test(t)).map(([g]) => g);
  };
  // A file that touches fs is acceptable when a metadata image route uses it (so it runs at build, where the image is
  // prerendered). A page that only imports a constant from it does not make it request-time code.
  const reachesOnlyImageRoutes = (f) => isImageRoute(f) || importersOf(f).some(isImageRoute);
  const badFs = fsFiles.filter((f) => !reachesOnlyImageRoutes(f)).map((f) => relative(frozen, f));
  const notPrerendered = [];
  for (const g of guides) for (const n of ["opengraph-image", "twitter-image"]) if (!existsSync(join(frozen, ".next/server/app/guides", g.slug, `${n}.body`))) notPrerendered.push(`${g.slug}/${n}`);
  checks.add({
    id: "A4.no-request-fs", target: "src/** and the build",
    measured: badFs.length || notPrerendered.length ? [...badFs.map((f) => `${f} reads files outside a metadata image route`), ...notPrerendered.map((n) => `${n} is not prerendered`)].join("; ") : `fs only in ${fsFiles.length} build-time image files, all image routes prerendered`,
    threshold: "fs only in code used by prerendered metadata-image routes", pass: badFs.length === 0 && notPrerendered.length === 0,
  });

  const assetsDir = join(frozen, ".open-next/assets");
  const missing = [];
  for (const g of guides) for (const f of g.figures) if (!existsSync(join(assetsDir, f.src))) missing.push(f.src);
  const totalFigs = guides.reduce((n, g) => n + g.figures.length, 0);
  checks.add({ id: "A4.figures-compiled-at-build", target: ".open-next/assets", measured: `${totalFigs - missing.length}/${totalFigs} figure files in the build output`, threshold: "all", pass: missing.length === 0, details: missing });

  // study-photo credits and licences: compiled data and the rendered HTML must match the snapshot
  const photos = [];
  for (const g of guides) for (const f of g.figures) if (f.kind === "study-photo") photos.push({ slug: g.slug, id: f.id, credit: f.credit, license: f.license, sourceUrl: f.sourceUrl, licenseUrl: f.licenseUrl, changes: f.changes });
  const key = (p) => `${p.slug}/${p.id}`;
  const snap = fixtures.studyPhotos;
  if (snap) {
    const diffs = [];
    const have = new Map(photos.map((p) => [key(p), p]));
    for (const s of snap) {
      const p = have.get(key(s));
      if (!p) { diffs.push(`${key(s)} is missing`); continue; }
      for (const k of ["credit", "license", "sourceUrl", "licenseUrl", "changes"]) if (p[k] !== s[k]) diffs.push(`${key(s)}.${k}: "${s[k]}" -> "${p[k]}"`);
    }
    for (const p of photos) if (!snap.some((s) => key(s) === key(p))) diffs.push(`${key(p)} is new (not in the snapshot)`);
    checks.add({ id: "A4.study-photo-credits", target: "compiled data", measured: diffs.length ? `${diffs.length} differences` : `${photos.length} entries unchanged`, threshold: "identical to fixtures/study-photo-credits.json", pass: diffs.length === 0, details: diffs });
  } else {
    checks.add({ id: "A4.study-photo-credits", target: "compiled data", measured: `${photos.length} entries, no fixture`, threshold: "fixtures/study-photo-credits.json", pass: false, details: ["run with --update-fixtures on the pristine tree first"] });
  }
  const renderMiss = [];
  for (const p of photos) {
    const html = htmlStore.get(`/guides/${p.slug}`) || "";
    const text = htmlText(html);
    if (!html.includes(`href="${p.licenseUrl}"`)) renderMiss.push(`${key(p)}: licence link missing`);
    if (!html.includes(`href="${p.sourceUrl}"`)) renderMiss.push(`${key(p)}: source/credit link missing`);
    if (!text.includes(p.credit)) renderMiss.push(`${key(p)}: credit text missing`);
    if (!text.includes(p.license)) renderMiss.push(`${key(p)}: licence name missing`);
    if (p.changes && !text.includes(p.changes)) renderMiss.push(`${key(p)}: changes line missing`);
  }
  checks.add({ id: "A4.study-photo-credits-rendered", target: "guide pages", measured: renderMiss.length ? `${renderMiss.length} missing` : `${photos.length} photo entries show credit, licence and changes`, threshold: "credit, licence link, changes shown", pass: renderMiss.length === 0 && photos.length > 0, details: renderMiss });

  return { canonicals: canon, guideCanonicals: guidesCanon, studyPhotos: photos };
}

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}
