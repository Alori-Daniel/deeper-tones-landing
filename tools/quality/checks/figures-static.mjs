// B2 (real fonts, mechanical), B4 (file width) from the figure sources and the built WebP files.
import { existsSync, mkdtempSync, readFileSync, readdirSync, statSync, symlinkSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import sharp from "sharp";
import { analyzeSvgFonts, mutateFamilies } from "../lib/svgfonts.mjs";
import { run, round } from "../lib/util.mjs";

const FIG_EXTS = ["svg", "png", "jpg", "jpeg"];

export function sourceFor(frozen, slug, id) {
  for (const ext of FIG_EXTS) {
    const p = join(frozen, "content/figures-src", slug, `${id}.${ext}`);
    if (existsSync(p)) return p;
  }
  return null;
}

function walk(dir, depth = 4) {
  if (!existsSync(dir) || depth < 0) return [];
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p, depth - 1) : [p];
  });
}

// B2 loader: brand font files exist in the repo AND something in the figure pipeline or the SVGs loads them.
export function loaderCheck(checks, frozen) {
  const fonts = walk(join(frozen, "assets")).filter((f) => /\.(ttf|otf|woff2?)$/i.test(f));
  const has = (re) => fonts.some((f) => re.test(f.split("/").pop()));
  const archivo = has(/archivo/i);
  const serif = has(/source[-_ ]?serif/i);
  const scriptFiles = [...walk(join(frozen, "scripts")), join(frozen, "package.json")].filter((f) => existsSync(f) && /\.(mjs|js|cjs|ts|json)$/.test(f));
  const pipelineText = scriptFiles.map((f) => readFileSync(f, "utf8")).join("\n");
  const pipelineRefs = /assets\/fonts|assets\/[\w-]*\.(ttf|otf|woff2?)|FONTCONFIG|fontfile|fontFiles|font-?face|loadSystemFonts|fontDirs|\.ttf|\.otf|\.woff2?/i.test(pipelineText);
  const svgFiles = walk(join(frozen, "content/figures-src")).filter((f) => f.endsWith(".svg"));
  const embedded = svgFiles.filter((f) => /@font-face/.test(readFileSync(f, "utf8"))).length;
  const loads = pipelineRefs || (svgFiles.length > 0 && embedded === svgFiles.length);
  const missing = [!archivo && "Archivo font file under assets/", !serif && "Source Serif 4 font file under assets/", !loads && "nothing in scripts/ or the SVGs loads the font files for the figure renderer"].filter(Boolean);
  checks.add({
    id: "B2.fonts-loaded-by-renderer", target: "figure pipeline",
    measured: missing.length ? missing.join("; ") : "Archivo + Source Serif 4 files present and referenced",
    threshold: "brand font files in assets/ and loaded by the renderer or embedded in the SVGs", pass: missing.length === 0,
    details: { fontFiles: fonts.map((f) => relative(frozen, f)), pipelineRefsFonts: pipelineRefs, svgsWithEmbeddedFontFace: `${embedded}/${svgFiles.length}` },
  });
}

// B2 static: every SVG figure declares brand fonts only.
export function sourceFamilyChecks(checks, frozen, guides) {
  for (const g of guides) for (const f of g.figures) {
    const src = sourceFor(frozen, g.slug, f.id);
    if (!src || !src.endsWith(".svg")) continue;
    const a = analyzeSvgFonts(readFileSync(src, "utf8"));
    const fams = [...new Set(a.stacks.map((s) => s.join(", ")))];
    checks.add({
      id: "B2.source-font-families", target: `${g.slug}/${f.id}`,
      measured: a.textCount === 0 ? "no <text> (outlined text; check by eye)" : fams.length ? fams.join(" | ") : "none declared",
      threshold: "only Archivo / Source Serif 4 (generic serif or sans-serif after them)", pass: a.problems.length === 0, details: a.problems,
    });
  }
}

// B2 mutation: build the figures again with every font-family renamed to a font that does not exist, using the
// repo's own pipeline. If the WebP files come out the same, the renderer is not using the declared fonts at all.
export async function mutationCheck(checks, frozen, guides) {
  const dir = mkdtempSync(join(tmpdir(), "dt-quality-mut-"));
  try {
    const ex = ["node_modules", ".next", ".open-next", ".wrangler", ".git", "public/guides", "src/content/guides.generated.ts"].flatMap((e) => ["--exclude", e]);
    const r = await run("rsync", ["-a", ...ex, `${frozen}/`, `${dir}/`]);
    if (r.code !== 0) throw new Error(r.out);
    symlinkSync(join(frozen, "node_modules"), join(dir, "node_modules"), "dir");
    const svgs = walk(join(dir, "content/figures-src")).filter((f) => f.endsWith(".svg"));
    for (const f of svgs) writeFileSync(f, mutateFamilies(readFileSync(f, "utf8")));
    const b = await run("node", ["scripts/build-guides.mjs"], { cwd: dir });
    if (b.code !== 0) {
      checks.add({ id: "B2.renderer-resolves-fonts", target: "figure pipeline", measured: "mutated build failed", threshold: "pipeline runs", pass: false, details: b.out.slice(-600) });
      return;
    }
    for (const g of guides) for (const f of g.figures) {
      const src = sourceFor(frozen, g.slug, f.id);
      if (!src || !src.endsWith(".svg")) continue;
      const a = analyzeSvgFonts(readFileSync(src, "utf8"));
      const orig = join(frozen, "public/guides", g.slug, `${f.id}.webp`);
      const mut = join(dir, "public/guides", g.slug, `${f.id}.webp`);
      const raw = async (p) => sharp(p).resize({ width: 800 }).greyscale().raw().toBuffer({ resolveWithObject: true });
      const [A, B] = [await raw(orig), await raw(mut)];
      let differ = 0;
      const n = Math.min(A.data.length, B.data.length);
      for (let i = 0; i < n; i++) if (Math.abs(A.data[i] - B.data[i]) > 24) differ++;
      const frac = differ / n;
      checks.add({
        id: "B2.renderer-resolves-fonts", target: `${g.slug}/${f.id}`,
        measured: a.textCount === 0 ? "no <text> to render" : `${round(frac * 100, 2)}% of pixels change when the declared font is renamed`,
        threshold: ">= 0.10% (the declared font is really used; unchanged output means a fallback font)", pass: a.textCount === 0 || frac >= 0.001,
      });
    }
  } catch (e) {
    checks.add({ id: "B2.renderer-resolves-fonts", target: "figure pipeline", measured: `error: ${e.message}`, threshold: "mutation test runs", pass: false });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// B4: each figure's WebP is at least 1600 px wide (a photo whose original is narrower cannot be upscaled: it must
// keep its full original width, and the line says so).
export async function widthChecks(checks, frozen, guides) {
  for (const g of guides) for (const f of g.figures) {
    const webp = join(frozen, "public/guides", g.slug, `${f.id}.webp`);
    const src = sourceFor(frozen, g.slug, f.id);
    if (!existsSync(webp)) { checks.add({ id: "B4.source-width", target: `${g.slug}/${f.id}`, measured: "no WebP", threshold: ">= 1600 px", pass: false }); continue; }
    const w = (await sharp(webp).metadata()).width;
    let srcW = null;
    if (src && !src.endsWith(".svg")) srcW = (await sharp(src).metadata()).width;
    const need = srcW ? Math.min(1600, srcW) : 1600;
    checks.add({
      id: "B4.source-width", target: `${g.slug}/${f.id}`,
      measured: `${w}px${srcW ? ` (original photo ${srcW}px)` : ""}`,
      threshold: srcW && srcW < 1600 ? `>= ${need}px (the original photo's full width; it cannot be upscaled)` : ">= 1600px",
      pass: w >= need,
    });
  }
}
