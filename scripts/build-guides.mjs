// Build-time only: content/guides/*.md -> src/content/guides.generated.ts.
// Runs from predev / prebuild / prelint / pretypecheck, never at request time (the Worker has no fs).
// Format and rules: content/guides/README or the "Guides" section of README.md.

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Marked } from "marked";
import { parse as parseYaml } from "yaml";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const guidesDir = join(root, "content/guides");
const outFile = join(root, "src/content/guides.generated.ts");

const showDrafts = process.env.GUIDES_SHOW_DRAFTS === "1";
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

function splitFrontmatter(raw) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)([\s\S]*)$/.exec(raw);
  return m ? { yaml: m[1], body: m[2] } : null;
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
function renderMarkdown(body, fail) {
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
        if (depth === 2) headings.push({ id, text: inner.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"') });
        return `<h${depth} id="${id}">${inner}</h${depth}>\n`;
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

  const html = marked.parse(body, { async: false });
  return { html, headings, cited };
}

function loadGuides() {
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
    const { html, headings, cited } = renderMarkdown(parts.body, fail);

    const sourceCount = Array.isArray(fm.sources) ? fm.sources.length : 0;
    for (const n of [...cited].sort((a, b) => a - b)) {
      if (n < 1 || n > sourceCount) fail(`the body cites [${n}] but "sources" has ${sourceCount} entries`);
    }
    for (let n = 1; n <= sourceCount; n++) {
      if (!cited.has(n)) warnings.push(`content/guides/${file}: source [${n}] is listed but never cited in the body`);
    }
    const words = parts.body.split(/\s+/).filter(Boolean).length;
    if (words < 700 || words > 1700) warnings.push(`content/guides/${file}: body is ${words} words (aim for 900 to 1,400)`);

    if (fm.draft === true || file.startsWith("_")) {
      if (!showDrafts) continue;
    }
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
      readingMinutes: fm.readingMinutes,
      sources: fm.sources.map(({ title, publisher, url, year }) => ({ title, publisher, url, year })),
      faq: fm.faq.map(({ q, a }) => ({ q, a })),
      headings,
      html,
    });
  }
  // Newest first.
  return guides.sort((a, b) => b.updated.localeCompare(a.updated) || b.published.localeCompare(a.published) || a.slug.localeCompare(b.slug));
}

const guides = loadGuides();

for (const w of warnings) console.warn(`[guides] warning: ${w}`);
if (errors.length > 0) {
  console.error(`\n[guides] ${errors.length} problem${errors.length === 1 ? "" : "s"} in content/guides:\n`);
  for (const e of errors) console.error(`  - ${e}`);
  console.error("");
  process.exit(1);
}

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
