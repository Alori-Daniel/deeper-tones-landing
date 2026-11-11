// Build-time figure renderer: SVG (house style, quality/ART_DIRECTION.md) -> WebP at 1600 px and 800 px,
// drawn with the real brand fonts via resvg (system fonts off, so a wrong family cannot fall back to Helvetica).
// Study photos skip resvg: they go straight to sharp, never upscaled.
//
// Source SVGs declare `font-family="Source Serif 4"` and `font-family="Archivo"` (the names the checker and the
// guides contract use). The Source Serif file's own family name is "Source Serif 4 20pt", so it is substituted
// right before rendering.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";
import sharp from "sharp";

const here = dirname(fileURLToPath(import.meta.url));
const fontDir = join(here, "../../assets/fonts");
const fontFiles = readdirSync(fontDir)
  .filter((f) => f.endsWith(".ttf"))
  .sort()
  .map((f) => join(fontDir, f));

export const FIGURE_WIDTHS = [800, 1600];
const QUALITY = 82;
const ALLOWED_VIEWBOXES = ["0 0 1600 1200", "0 0 1600 1000"];
// SVG family name -> the family name inside the font file.
const FAMILY_ALIASES = { "Source Serif 4": "Source Serif 4 20pt" };
const FORBIDDEN_FAMILY = /^(helvetica|arial|times|georgia|verdana|system-ui|ui-|-apple-system|blinkmacsystemfont|segoe)/i;
const GENERIC_FIRST = /^(serif|sans-serif|monospace|cursive|fantasy)$/i;

// mtime of everything that changes how a figure is drawn (used by the caller's "is the output fresh" test).
export function rendererMtime() {
  const files = [join(here, "index.mjs"), ...fontFiles];
  return Math.max(...files.map((f) => statSync(f).mtimeMs));
}

function firstFamily(value) {
  return value.split(",")[0].trim().replace(/^["']|["']$/g, "");
}

// Hard rules from ART_DIRECTION §9. Returns a list of problems (empty = fine). An unknown family name that is not
// plainly a system font is allowed through (it falls back to the default family), so the checker's font mutation
// test can still build; the checker's B2 lines catch it statically.
export function validateSvg(svg) {
  const problems = [];
  const vb = /viewBox="([^"]+)"/.exec(svg)?.[1]?.trim().replace(/\s+/g, " ");
  if (!ALLOWED_VIEWBOXES.includes(vb ?? "")) problems.push(`viewBox is "${vb}"; it must be ${ALLOWED_VIEWBOXES.map((v) => `"${v}"`).join(" or ")}`);
  if (/<style[\s>]/i.test(svg)) problems.push("a <style> element is not allowed (fonts are set with attributes only)");
  for (const m of svg.matchAll(/\sstyle\s*=\s*"([^"]*)"/gi)) if (/font/i.test(m[1])) problems.push(`a style="..." attribute mentions font: ${m[1].slice(0, 60)}`);
  if (/font-style/i.test(svg)) problems.push("font-style is not allowed (no italics)");
  for (const m of svg.matchAll(/font-family\s*=\s*"([^"]*)"/gi)) {
    const first = firstFamily(m[1]);
    if (FORBIDDEN_FAMILY.test(first) || GENERIC_FIRST.test(first)) problems.push(`font-family "${m[1]}" is not a brand font`);
  }
  if (!/<text[\s>]/.test(svg)) problems.push("no <text>: figures must keep live text in the brand fonts");
  // font-size floor: 56 px, or 48 px for a single-character pin numeral
  for (const m of svg.matchAll(/<text\b([^>]*)>([^<]*)<\/text>/g)) {
    const attrs = m[1];
    const size = Number(/font-size="([\d.]+)"/.exec(attrs)?.[1]);
    const inherited = !Number.isFinite(size);
    if (inherited) continue; // size set on a parent <g>; checked below
    const text = m[2].trim();
    if (size < 56 && !(size >= 48 && text.length <= 2)) problems.push(`font-size ${size} on "${text.slice(0, 20)}" is below 56`);
  }
  for (const m of svg.matchAll(/<g\b([^>]*font-size="([\d.]+)"[^>]*)>/g)) {
    if (Number(m[2]) < 48) problems.push(`group font-size ${m[2]} is below 48`);
  }
  return problems;
}

function substituteFamilies(svg) {
  return svg.replace(/font-family="([^"]*)"/g, (_, value) => {
    const names = value.split(",").map((n) => n.trim().replace(/^["']|["']$/g, ""));
    const mapped = names.map((n) => FAMILY_ALIASES[n] ?? n);
    return `font-family="${mapped.join(", ")}"`;
  });
}

export function renderPng(svg) {
  return new Resvg(substituteFamilies(svg), {
    fitTo: { mode: "width", value: 1600 },
    font: { fontFiles, loadSystemFonts: false, defaultFontFamily: "Archivo" },
    background: "#FFFFFF",
  })
    .render()
    .asPng();
}

// Renders one SVG source to <outBase>.webp (1600 w) and <outBase>-800.webp. Returns { width, height, files }.
export async function renderDiagram(svgPath, outBase) {
  const raw = readFileSync(svgPath, "utf8");
  const problems = validateSvg(raw);
  if (problems.length) throw new Error(`${svgPath}:\n  - ${problems.join("\n  - ")}`);
  const png = renderPng(raw);
  const files = [];
  const full = await sharp(png).webp({ quality: QUALITY }).toFile(`${outBase}.webp`);
  files.push(`${outBase}.webp`);
  await sharp(png).resize({ width: 800 }).webp({ quality: QUALITY }).toFile(`${outBase}-800.webp`);
  files.push(`${outBase}-800.webp`);
  return { width: full.width, height: full.height, files };
}

// Study photos: original pixels, never upscaled. <id>.webp is the largest we can make (max 1600 w);
// <id>-800.webp only when the original is at least 800 px wide.
export async function renderPhoto(srcPath, outBase) {
  const meta = await sharp(srcPath).rotate().metadata();
  const files = [];
  const base = () => sharp(srcPath).rotate();
  const main = await base().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: QUALITY }).toFile(`${outBase}.webp`);
  files.push(`${outBase}.webp`);
  if ((meta.width ?? 0) >= 800 && main.width > 800) {
    await base().resize({ width: 800 }).webp({ quality: QUALITY }).toFile(`${outBase}-800.webp`);
    files.push(`${outBase}-800.webp`);
  }
  return { width: main.width, height: main.height, files };
}
