// Build-time only: content/guides/*.md -> src/content/guides.generated.ts.
// Runs from predev / prebuild / prelint / pretypecheck, never at request time (the Worker has no fs).
// Format and rules: content/guides/README or the "Guides" section of README.md.

import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Marked } from "marked";
import sharp from "sharp";
import { parse as parseYaml } from "yaml";
import { rendererMtime, renderDiagram, renderPhoto } from "./figures/index.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const guidesDir = join(root, "content/guides");
const outFile = join(root, "src/content/guides.generated.ts");
const figuresSrcDir = join(root, "content/figures-src");
const figuresOutDir = join(root, "public/guides");
const thisScript = fileURLToPath(import.meta.url);

const FIGURE_ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const FIGURE_KINDS = ["diagram", "study-photo"];
const FIGURE_LICENSES = ["Own work", "CC BY 4.0", "CC BY 3.0", "CC BY 2.0", "CC0 1.0"];
const FIGURE_EXTS = ["svg", "png", "jpg", "jpeg"];
const MAX_FIGURES = 3;
// Public URLs of every webp written this run; anything else under public/guides is stale and removed.
const keptFigureFiles = new Set();

const showDrafts = process.env.GUIDES_SHOW_DRAFTS === "1";
// Staged rule: until every guide carries `inShort`, a missing one is a warning; the verifier's build sets this to 1.
const requireInShort = process.env.GUIDES_REQUIRE_INSHORT === "1";
const PRO_HEADING = "When to see a professional";
const PRO_ID = "when-to-see-a-professional";
const CALLOUT_LABELS = ["Safety:"];
const MAX_SAFETY_CALLOUTS = 2;
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const errors = [];
const warnings = [];

const escapeHtml = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const isIsoDate = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
const isNonEmpty = (v) => typeof v === "string" && v.trim().length > 0;
const isHttpUrl = (v) => {
  try {
    return ["http:", "https:"].includes(new URL(v).protocol);
  } catch {
    return false;
  }
};

function formatDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

// Layout fields added for the reading experience (quality/READING_SPEC.md section 6). Returns the normalised
// `inShort` list ([] when absent, so pages render without it) and records every problem through fail/warn.
function validateReadingFields(fm, fail, warn) {
  if (fm.reviewerRole !== undefined && fm.reviewerRole !== null && (!isNonEmpty(fm.reviewerRole) || fm.reviewerRole.length >= 60)) {
    fail(`"reviewerRole" must be null or a non-empty string under 60 characters`);
  }
  if (fm.inShort === undefined || fm.inShort === null) {
    if (requireInShort && fm.draft === false) fail(`"inShort" is required on a published guide (3 or 4 short lines, the answer first)`);
    else warn(`"inShort" is missing (3 or 4 short lines, the answer first)`);
    return [];
  }
  if (!Array.isArray(fm.inShort)) {
    fail(`"inShort" must be a list of 3 or 4 short lines`);
    return [];
  }
  const items = fm.inShort;
  if (items.length < 3 || items.length > 4) fail(`"inShort" has ${items.length} items; it must have 3 or 4`);
  let total = 0;
  items.forEach((item, i) => {
    const at = `inShort[${i}]`;
    if (!isNonEmpty(item)) return fail(`${at} must be a non-empty string`);
    total += item.trim().length;
    if (item.trim().length > 160) fail(`${at} is ${item.trim().length} characters; the limit is 160`);
    if (/\[\d+\]/.test(item)) fail(`${at} must not contain a citation like [1]; the body carries the citations`);
    if (/https?:\/\/|\]\(/.test(item)) fail(`${at} must not contain a link`);
    if (/<[^>]+>/.test(item)) fail(`${at} must not contain HTML`);
    if (/[*_`\[\]#]/.test(item)) fail(`${at} must be plain text (no Markdown characters: * _ \` [ ] #)`);
  });
  if (total > 480) fail(`"inShort" items total ${total} characters; the limit is 480`);
  return items.filter(isNonEmpty).map((t) => t.trim());
}

function splitFrontmatter(raw) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)([\s\S]*)$/.exec(raw);
  return m ? { yaml: m[1], body: m[2] } : null;
}

// Validates the optional `figures` list and returns the normalised entries (empty when there are none).
function validateFigures(fm, slug, fail) {
  if (fm.figures === undefined || fm.figures === null) return [];
  if (!Array.isArray(fm.figures)) {
    fail(`"figures" must be a list`);
    return Object.assign([], { invalid: true });
  }
  if (fm.figures.length > MAX_FIGURES) fail(`"figures" has ${fm.figures.length} entries; the limit is ${MAX_FIGURES} per guide`);
  const out = [];
  const seen = new Set();
  out.invalid = false;
  fm.figures.forEach((f, i) => {
    const at = `figures[${i}]${f && typeof f.id === "string" ? ` (${f.id})` : ""}`;
    if (!f || typeof f !== "object") {
      out.invalid = true;
      return fail(`${at} must be an object`);
    }
    let ok = true;
    const bad = (msg) => {
      ok = false;
      out.invalid = true;
      fail(`${at}: ${msg}`);
    };
    if (!isNonEmpty(f.id) || !FIGURE_ID.test(f.id)) bad(`"id" must be lowercase letters, digits and hyphens (like "label-steroid-names")`);
    else if (seen.has(f.id)) bad(`"id" is used twice in this guide`);
    else seen.add(f.id);
    if (!FIGURE_KINDS.includes(f.kind)) bad(`"kind" must be one of: ${FIGURE_KINDS.join(", ")}`);
    for (const key of ["alt", "caption", "credit"]) if (!isNonEmpty(f[key])) bad(`"${key}" is required (a non-empty string)`);
    if (!FIGURE_LICENSES.includes(f.license)) bad(`"license" must be one of: ${FIGURE_LICENSES.map((l) => `"${l}"`).join(", ")}`);
    if (f.kind === "diagram" && FIGURE_LICENSES.includes(f.license) && f.license !== "Own work") bad(`a diagram must have license "Own work"`);
    if (f.kind === "study-photo") {
      if (f.license === "Own work") bad(`a study photo cannot be "Own work"; use the licence the article states`);
      for (const key of ["sourceUrl", "licenseUrl"]) {
        if (!isNonEmpty(f[key]) || !/^https:\/\//i.test(f[key]) || !isHttpUrl(f[key])) bad(`a study photo needs "${key}" as an https link`);
      }
    }
    if (f.changes !== undefined && f.changes !== null && !isNonEmpty(f.changes)) bad(`"changes" must be null or a short sentence`);
    if (!ok) return;

    const srcs = FIGURE_EXTS.map((ext) => join(figuresSrcDir, slug, `${f.id}.${ext}`)).filter(existsSync);
    if (srcs.length === 0) return bad(`no source file; add content/figures-src/${slug}/${f.id}.(${FIGURE_EXTS.join("|")})`);
    if (srcs.length > 1) return bad(`more than one source file for this id in content/figures-src/${slug}/; keep one`);
    out.push({
      id: f.id,
      kind: f.kind,
      alt: f.alt.trim(),
      caption: f.caption.trim(),
      credit: f.credit.trim(),
      license: f.license,
      sourceUrl: f.kind === "study-photo" ? f.sourceUrl : null,
      licenseUrl: f.kind === "study-photo" ? f.licenseUrl : null,
      changes: isNonEmpty(f.changes) ? f.changes.trim() : null,
      srcFile: srcs[0],
    });
  });
  return out;
}

// Source image -> public/guides/<slug>/<id>.webp (1600 w) and <id>-800.webp. SVG diagrams are drawn by scripts/figures
// with the brand fonts; study photos keep their own pixels and are never upscaled. Returns the size of the main file.
// Skipped when the output is already newer than the source, this script and the figure renderer.
async function buildFigureImage(slug, fig, write) {
  const outBase = join(figuresOutDir, slug, fig.id);
  const outPath = `${outBase}.webp`;
  if (!write) return { width: 1, height: 1 };
  keptFigureFiles.add(outPath);
  keptFigureFiles.add(`${outBase}-800.webp`);
  const newest = Math.max(statSync(fig.srcFile).mtimeMs, statSync(thisScript).mtimeMs, rendererMtime());
  const isFresh = existsSync(outPath) && statSync(outPath).mtimeMs > newest;
  if (isFresh) {
    const { width, height } = await sharp(outPath).metadata();
    if (width && height) return { width, height };
  }
  mkdirSync(dirname(outPath), { recursive: true });
  const { width, height } = fig.srcFile.endsWith(".svg")
    ? await renderDiagram(fig.srcFile, outBase)
    : await renderPhoto(fig.srcFile, outBase);
  return { width, height };
}

// Removes webp files (and empty folders) under public/guides that this run did not produce.
function pruneFigureOutput() {
  if (!existsSync(figuresOutDir)) return;
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(p);
        if (readdirSync(p).length === 0) rmSync(p, { recursive: true });
      } else if (!keptFigureFiles.has(p)) {
        rmSync(p);
      }
    }
  };
  walk(figuresOutDir);
}

// Card thumbnails (index and related cards) are the diagram without its title: the card already shows the guide's title,
// so a thumbnail that carries its own headline would read as two. Every diagram keeps its title above y = 180 on the
// 1600 px canvas (title baseline 150 plus descenders, ART_DIRECTION section 1), so the thumbnail is the 800 w file minus
// that band, with 20 px of white put back on top so the first label does not touch the card edge: 800 x 530 for the
// 1600 x 1200 canvas. Study photos get none (a crop of a CC BY photo would need its own credit line).
const THUMB_TITLE_BAND = 180 / 1600; // of the image width
const THUMB_TOP_PAD = 20 / 800; // of the image width
async function buildThumb(slug, fig, srcPath) {
  const outPath = join(figuresOutDir, slug, `${fig.id}-thumb.webp`);
  keptFigureFiles.add(outPath);
  const newest = Math.max(statSync(srcPath).mtimeMs, statSync(thisScript).mtimeMs);
  if (!(existsSync(outPath) && statSync(outPath).mtimeMs > newest)) {
    const { width, height } = await sharp(srcPath).metadata();
    const top = Math.round(width * THUMB_TITLE_BAND);
    await sharp(srcPath)
      .extract({ left: 0, top, width, height: height - top })
      .extend({ top: Math.round(width * THUMB_TOP_PAD), background: "#ffffff" })
      .webp({ quality: 84 })
      .toFile(outPath);
  }
  const m = await sharp(outPath).metadata();
  return { url: `/guides/${slug}/${fig.id}-thumb.webp`, width: m.width, height: m.height };
}

// Which WebP files exist for a figure (<id>-800.webp and <id>.webp, written by the figure builder) and how wide they
// really are. The srcset only names files that exist, so a guide never points at an image that was not built.
async function figureVariants(slug, fig, write) {
  const url = (f) => `/guides/${slug}/${f}`;
  const main = `${fig.id}.webp`;
  const entries = [];
  if (write) {
    for (const f of [`${fig.id}-800.webp`, main]) {
      const p = join(figuresOutDir, slug, f);
      if (!existsSync(p)) continue;
      keptFigureFiles.add(p);
      const { width, height } = await sharp(p).metadata();
      if (width && height && !entries.some((e) => e.width === width)) entries.push({ url: url(f), width, height });
    }
  }
  if (entries.length === 0) entries.push({ url: url(main), width: fig.width, height: fig.height });
  entries.sort((a, b) => a.width - b.width);
  const largest = entries[entries.length - 1].width;
  const nearest800 = entries.reduce((best, e) => (Math.abs(e.width - 800) < Math.abs(best.width - 800) ? e : best));
  const thumb =
    write && fig.kind === "diagram"
      ? await buildThumb(slug, fig, join(figuresOutDir, slug, nearest800.url.split("/").pop()))
      : null;
  // Layout widths (quality/READING_SPEC.md 4.7). A study photo sits in a padded plate and is never shown wider than
  // 0.6 x its natural width, so it keeps about 1.2 image pixels per device pixel on a 2x screen.
  const sizes =
    fig.kind === "study-photo"
      ? (() => {
          const cap = `${Math.floor(largest * 0.6)}px`;
          return `(min-width: 1180px) min(704px, ${cap}), (min-width: 768px) min(656px, ${cap}), min(calc(100vw - 72px), ${cap})`;
        })()
      : "(min-width: 1180px) 736px, (min-width: 768px) 688px, calc(100vw - 40px)";
  return {
    srcSet: entries.map((e) => `${e.url} ${e.width}w`).join(", "),
    sizes,
    thumb: thumb ? thumb.url : null,
    thumbWidth: thumb ? thumb.width : 0,
    thumbHeight: thumb ? thumb.height : 0,
    naturalWidth: largest,
  };
}

function figureHtml(slug, fig) {
  const src = `/guides/${slug}/${fig.id}.webp`;
  const img =
    `<img src="${src}" srcset="${escapeHtml(fig.srcSet)}" sizes="${escapeHtml(fig.sizes)}" alt="${escapeHtml(fig.alt)}" ` +
    `width="${fig.width}" height="${fig.height}" loading="lazy" decoding="async">`;
  if (fig.kind !== "study-photo") {
    return `<figure class="guide-figure">${img}<figcaption>${escapeHtml(fig.caption)}</figcaption></figure>\n`;
  }
  const parts = [
    `Credit: <a href="${escapeHtml(fig.sourceUrl)}" target="_blank" rel="noopener">${escapeHtml(fig.credit)}</a>`,
    `Licence: <a href="${escapeHtml(fig.licenseUrl)}" target="_blank" rel="noopener">${escapeHtml(fig.license)}</a>`,
  ];
  if (fig.changes) parts.push(`Changes: ${escapeHtml(fig.changes)}`);
  const style = `--photo-max:${Math.floor(fig.naturalWidth * 0.6)}px;--photo-ratio:${fig.width}/${fig.height}`;
  return (
    `<figure class="guide-figure guide-figure-photo"><div class="guide-figure-plate" style="${style}">${img}</div>` +
    `<figcaption>${escapeHtml(fig.caption)}<span class="guide-figure-credit">${parts.join(" · ")}</span></figcaption></figure>\n`
  );
}

function validate(fm, slugFromFile, fail) {
  for (const key of ["title", "description", "slug", "primaryQuery", "published", "updated"]) {
    if (!isNonEmpty(fm[key])) fail(`"${key}" is required (a non-empty string)`);
  }
  if (isNonEmpty(fm.title) && fm.title.length > 60) fail(`"title" is ${fm.title.length} characters; the limit is 60`);
  if (isNonEmpty(fm.description) && (fm.description.length < 120 || fm.description.length > 170)) {
    fail(`"description" is ${fm.description.length} characters; it must be 120 to 170`);
  }
  if (isNonEmpty(fm.slug) && fm.slug !== slugFromFile) fail(`"slug" is "${fm.slug}" but the file name is "${slugFromFile}.md"; they must match`);
  if (isNonEmpty(fm.slug) && !/^_?[a-z0-9]+(-[a-z0-9]+)*$/.test(fm.slug)) fail(`"slug" must be lowercase words joined by hyphens`);
  if (!Array.isArray(fm.secondaryQueries) || !fm.secondaryQueries.every(isNonEmpty)) fail(`"secondaryQueries" must be a list of strings`);
  for (const key of ["published", "updated"]) {
    if (fm[key] !== undefined && !isIsoDate(fm[key])) fail(`"${key}" must be a quoted date like "2026-11-04"`);
  }
  if (isIsoDate(fm.published) && isIsoDate(fm.updated) && fm.updated < fm.published) fail(`"updated" is before "published"`);
  if (typeof fm.draft !== "boolean") fail(`"draft" is required and must be true or false`);
  if (fm.reviewedBy !== null && !isNonEmpty(fm.reviewedBy)) fail(`"reviewedBy" must be null or a name`);
  if (!Number.isInteger(fm.readingMinutes) || fm.readingMinutes < 1) fail(`"readingMinutes" must be a whole number of minutes`);

  if (!Array.isArray(fm.sources) || fm.sources.length === 0) {
    fail(`"sources" must be a non-empty list`);
  } else {
    fm.sources.forEach((s, i) => {
      const at = `sources[${i}] (cited as [${i + 1}])`;
      if (!s || typeof s !== "object") return fail(`${at} must be an object`);
      for (const key of ["title", "publisher"]) if (!isNonEmpty(s[key])) fail(`${at}: "${key}" is required`);
      if (!isNonEmpty(s.url) || !isHttpUrl(s.url)) fail(`${at}: "url" must be an http(s) link`);
      if (!Number.isInteger(s.year)) fail(`${at}: "year" must be a number`);
    });
  }

  if (!Array.isArray(fm.faq) || fm.faq.length === 0) {
    fail(`"faq" must be a non-empty list of { q, a }`);
  } else {
    fm.faq.forEach((f, i) => {
      if (!f || !isNonEmpty(f.q) || !isNonEmpty(f.a)) fail(`faq[${i}] needs both "q" and "a" as non-empty strings`);
    });
  }
}

// Markdown -> HTML. Raw HTML in the source is escaped, images are rejected, links are limited to safe
// schemes, `[n]` becomes a link to the numbered source, and `##` headings get ids for the contents list.
function renderMarkdown(body, slug, figures, fail, warn, figuresValid) {
  let safetyCount = 0;
  const figureById = new Map(figures.map((f) => [f.id, f]));
  const placed = new Map();
  const headings = [];
  const usedIds = new Set();
  const cited = new Set();

  const slugify = (text) => {
    const base = text.toLowerCase().replace(/&[a-z#0-9]+;/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "section";
    let id = base;
    for (let n = 2; usedIds.has(id); n++) id = `${base}-${n}`;
    usedIds.add(id);
    return id;
  };

  const marked = new Marked({
    gfm: true,
    extensions: [
      {
        // A line holding only {{figure:<id>}} places that figure from the frontmatter.
        name: "figure",
        level: "block",
        start: (src) => src.search(/^\{\{figure:/m),
        tokenizer(src) {
          const m = /^\{\{figure:([^}\n]*)\}\}[ \t]*(?:\n|$)/.exec(src);
          return m ? { type: "figure", raw: m[0], id: m[1].trim() } : undefined;
        },
        renderer(token) {
          const fig = figureById.get(token.id);
          if (!fig) {
            if (figuresValid) fail(`"{{figure:${token.id}}}" has no matching entry in "figures"`);
            return "";
          }
          placed.set(token.id, (placed.get(token.id) ?? 0) + 1);
          return figureHtml(slug, fig);
        },
      },
      {
        name: "cite",
        level: "inline",
        start: (src) => src.indexOf("["),
        tokenizer(src) {
          const m = /^\[(\d{1,2})\](?!\(|:)/.exec(src);
          return m ? { type: "cite", raw: m[0], n: Number(m[1]) } : undefined;
        },
        renderer(token) {
          cited.add(token.n);
          return `<a class="cite" href="#source-${token.n}" aria-label="Source ${token.n}">[${token.n}]</a>`;
        },
      },
    ],
    walkTokens(token) {
      if (token.type === "image") fail(`images are not allowed in guides (found "${token.raw.slice(0, 40)}")`);
      if (token.type === "paragraph") {
        const plain = token.raw.replace(/\[\d+\]/g, "").replace(/\b(e\.g|i\.e|vs|etc)\./gi, "$1").replace(/\d\.\d/g, "0");
        const sentences = (plain.match(/[.!?]+(\s|$)/g) ?? []).length;
        if (sentences > 4) warn(`a paragraph has ${sentences} sentences (keep to 4): "${token.raw.slice(0, 50).trim()}..."`);
        if (token.tokens.filter((t) => t.type === "strong").length > 1) warn(`a paragraph has more than one bold phrase: "${token.raw.slice(0, 50).trim()}..."`);
      }
    },
    renderer: {
      html: ({ text }) => escapeHtml(text),
      heading({ tokens, depth }) {
        const inner = this.parser.parseInline(tokens);
        if (depth === 1) {
          fail(`the body must not contain an H1 ("# ..."); the title is the H1`);
          return "";
        }
        if (depth > 3) fail(`only "##" and "###" headings are allowed (found depth ${depth})`);
        const id = slugify(inner.replace(/<[^>]+>/g, ""));
        const plainHeading = inner.replace(/<[^>]+>/g, "").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
        if (depth === 2 && plainHeading.length > 60) warn(`the heading "${plainHeading.slice(0, 40)}..." is over 60 characters`);
        if (depth === 2) headings.push({ id, text: inner.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"') });
        return `<h${depth} id="${id}">${inner}</h${depth}>\n`;
      },
      // A blockquote is a callout: it must start with a bold label from CALLOUT_LABELS (only "**Safety:**" for now).
      blockquote({ tokens }) {
        const first = tokens[0];
        const lead = first && first.type === "paragraph" ? first.tokens[0] : null;
        if (!lead || lead.type !== "strong") {
          fail(`a blockquote must start with a bold label such as "> **Safety:** ..." (plain quotes are not used in guides)`);
          return "";
        }
        const label = lead.text.trim();
        if (!CALLOUT_LABELS.includes(label)) {
          fail(`unknown callout label "**${label}**"; the allowed labels are ${CALLOUT_LABELS.map((l) => `"**${l}**"`).join(", ")}`);
          return "";
        }
        safetyCount++;
        const rest = first.tokens.slice(1).map((t, i) => (i === 0 && t.type === "text" ? { ...t, raw: t.raw.replace(/^\s+/, ""), text: t.text.replace(/^\s+/, "") } : t));
        const firstHtml = rest.length ? this.parser.parseInline(rest).trim() : "";
        const restHtml = this.parser.parse(tokens.slice(1));
        if (!firstHtml && !restHtml.trim()) {
          fail(`the "**${label}**" callout has no text after the label`);
          return "";
        }
        const words = `${firstHtml} ${restHtml}`.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
        if (words > 60) warn(`the Safety callout is ${words} words (aim for 60 or fewer)`);
        const icon =
          '<span class="callout-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="24" height="24" focusable="false"><circle cx="12" cy="12" r="12" fill="#7B2CBF"/><path d="M12 6.6v6.4M12 17.1v.1" stroke="#fff" stroke-width="2.5" stroke-linecap="round" fill="none"/></svg></span>';
        return (
          `<aside class="callout callout-safety" role="note"><p class="callout-label">${icon}<span>Safety</span></p>` +
          `<div class="callout-body">${firstHtml ? `<p>${firstHtml}</p>` : ""}${restHtml}</div></aside>\n`
        );
      },
      link({ href, title, tokens }) {
        const inner = this.parser.parseInline(tokens);
        if (!/^(https?:\/\/|mailto:|\/|#)/i.test(href)) {
          fail(`unsafe or unsupported link "${href}"`);
          return inner;
        }
        const external = /^https?:\/\//i.test(href);
        const t = title ? ` title="${escapeHtml(title)}"` : "";
        const rel = external ? ' target="_blank" rel="noopener"' : "";
        return `<a href="${escapeHtml(href)}"${t}${rel}>${inner}</a>`;
      },
      table(token) {
        const header = token.header.map((c) => `<th>${this.parser.parseInline(c.tokens)}</th>`).join("");
        const rows = token.rows
          .map((r) => `<tr>${r.map((c) => `<td>${this.parser.parseInline(c.tokens)}</td>`).join("")}</tr>`)
          .join("");
        return `<div class="table-scroll"><table><thead><tr>${header}</tr></thead><tbody>${rows}</tbody></table></div>\n`;
      },
    },
  });

  let html = marked.parse(body, { async: false });
  if (html.includes("{{figure:")) fail(`a "{{figure:<id>}}" marker must sit alone on its own line, with a blank line before and after`);
  for (const f of figuresValid ? figures : []) {
    const n = placed.get(f.id) ?? 0;
    if (n === 0) fail(`figure "${f.id}" is in "figures" but never placed; add a line {{figure:${f.id}}} to the body`);
    if (n > 1) fail(`figure "${f.id}" is placed ${n} times; each figure goes in exactly once`);
  }
  if (safetyCount > MAX_SAFETY_CALLOUTS) fail(`${safetyCount} Safety callouts; the limit is ${MAX_SAFETY_CALLOUTS} per guide`);

  // "When to see a professional" must be the last `##`; the build wraps it, to the end of the body, in a card section.
  const proAt = headings.findIndex((h) => h.text === PRO_HEADING);
  if (proAt === -1) fail(`the body needs a "## ${PRO_HEADING}" section, as the last "##"`);
  else if (proAt !== headings.length - 1) fail(`"## ${PRO_HEADING}" must be the last "##" in the body`);
  else if (headings[proAt].id !== PRO_ID) fail(`the "${PRO_HEADING}" heading got the id "${headings[proAt].id}" instead of "${PRO_ID}"; keep one such heading`);
  else {
    const marker = `<h2 id="${PRO_ID}">`;
    const at = html.lastIndexOf(marker);
    if (at !== -1) html = `${html.slice(0, at)}<section class="callout-pro" aria-labelledby="${PRO_ID}">\n${html.slice(at)}</section>\n`;
  }
  return { html, headings, cited };
}

async function loadGuides() {
  if (!existsSync(guidesDir)) return [];
  const files = readdirSync(guidesDir)
    .filter((f) => f.endsWith(".md"))
    // `_`-prefixed files are scratch/samples: only built when previewing drafts.
    .filter((f) => showDrafts || !f.startsWith("_"))
    .sort();

  const guides = [];
  for (const file of files) {
    const slug = basename(file, ".md");
    const fail = (msg) => errors.push(`content/guides/${file}: ${msg}`);
    const warn = (msg) => warnings.push(`content/guides/${file}: ${msg}`);
    const parts = splitFrontmatter(readFileSync(join(guidesDir, file), "utf8"));
    if (!parts) {
      fail("missing frontmatter (the file must start with a --- block)");
      continue;
    }
    let fm;
    try {
      fm = parseYaml(parts.yaml);
    } catch (e) {
      fail(`frontmatter is not valid YAML: ${e.message}`);
      continue;
    }
    if (!fm || typeof fm !== "object") {
      fail("frontmatter is empty");
      continue;
    }

    validate(fm, slug, fail);
    const inShort = validateReadingFields(fm, fail, warn);
    const figures = validateFigures(fm, slug, fail);
    // Images are only built for guides that go into this build (drafts are skipped unless previewing them).
    const included = showDrafts || (fm.draft !== true && !file.startsWith("_"));
    for (const fig of figures) {
      Object.assign(fig, await buildFigureImage(slug, fig, included && !errors.length));
      Object.assign(fig, await figureVariants(slug, fig, included && !errors.length));
    }
    const { html, headings, cited } = renderMarkdown(parts.body, slug, figures, fail, warn, !figures.invalid);

    const sourceCount = Array.isArray(fm.sources) ? fm.sources.length : 0;
    for (const n of [...cited].sort((a, b) => a - b)) {
      if (n < 1 || n > sourceCount) fail(`the body cites [${n}] but "sources" has ${sourceCount} entries`);
    }
    for (let n = 1; n <= sourceCount; n++) {
      if (!cited.has(n)) warnings.push(`content/guides/${file}: source [${n}] is listed but never cited in the body`);
    }
    const words = parts.body.split(/\s+/).filter(Boolean).length;
    if (words < 700 || words > 1700) warnings.push(`content/guides/${file}: body is ${words} words (aim for 900 to 1,400)`);

    if (!included) continue;
    if (errors.some((e) => e.startsWith(`content/guides/${file}:`))) continue;

    guides.push({
      slug,
      title: fm.title,
      description: fm.description,
      primaryQuery: fm.primaryQuery,
      secondaryQueries: fm.secondaryQueries,
      published: fm.published,
      updated: fm.updated,
      publishedLabel: formatDate(fm.published),
      updatedLabel: formatDate(fm.updated),
      draft: fm.draft === true || file.startsWith("_"),
      reviewedBy: fm.reviewedBy,
      reviewerRole: isNonEmpty(fm.reviewerRole) ? fm.reviewerRole.trim() : null,
      inShort,
      sourceCount,
      readingMinutes: fm.readingMinutes,
      sources: fm.sources.map(({ title, publisher, url, year }) => ({ title, publisher, url, year })),
      faq: fm.faq.map(({ q, a }) => ({ q, a })),
      figures: figures.map((fig) => ({
        id: fig.id,
        kind: fig.kind,
        src: `/guides/${slug}/${fig.id}.webp`,
        width: fig.width,
        height: fig.height,
        alt: fig.alt,
        caption: fig.caption,
        credit: fig.credit,
        license: fig.license,
        sourceUrl: fig.sourceUrl,
        licenseUrl: fig.licenseUrl,
        changes: fig.changes,
        srcSet: fig.srcSet,
        sizes: fig.sizes,
        thumb: fig.thumb,
        thumbWidth: fig.thumbWidth,
        thumbHeight: fig.thumbHeight,
      })),
      headings,
      html,
    });
  }
  // Newest first.
  return guides.sort((a, b) => b.updated.localeCompare(a.updated) || b.published.localeCompare(a.published) || a.slug.localeCompare(b.slug));
}

const guides = await loadGuides();

for (const w of warnings) console.warn(`[guides] warning: ${w}`);
if (errors.length > 0) {
  console.error(`\n[guides] ${errors.length} problem${errors.length === 1 ? "" : "s"} in content/guides:\n`);
  for (const e of errors) console.error(`  - ${e}`);
  console.error("");
  process.exit(1);
}

pruneFigureOutput();

mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(
  outFile,
  `// Generated by scripts/build-guides.mjs from content/guides/*.md. Do not edit; it is gitignored.\n` +
    `import type { Guide } from "./guide-types";\n\n` +
    `export const guides: Guide[] = ${JSON.stringify(guides, null, 2)};\n`,
);
const drafts = guides.filter((g) => g.draft).length;
console.log(
  `[guides] ${guides.length} guide${guides.length === 1 ? "" : "s"} built` +
    (showDrafts ? ` (GUIDES_SHOW_DRAFTS=1, ${drafts} draft${drafts === 1 ? "" : "s"} included)` : ""),
);
