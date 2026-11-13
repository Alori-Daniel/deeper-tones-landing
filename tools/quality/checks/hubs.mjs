// quality/ACCEPTANCE-HUBS.md, lines H1 to H7 (topic hubs on /guides). Every line is a pure function over plain inputs
// (the compiled hubs and guides, the HTML of a page, the sitemap text, a status fetcher), so the self-test can drive it
// with synthetic pages. Only `hubChecks` at the bottom touches the network: it fetches the pages and calls the pure parts.
//
// Pages are read with the same loose, regex-based parsing the other checks use (contract.mjs), keyed on the markup the
// site already has: `a.g-card` for cards, `nav[aria-label="Breadcrumb"]`, `section.guide-related`, JSON-LD scripts.
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { decodeEntities, hubModels, htmlText, loadCompiledHubs } from "../lib/pages.mjs";

export const SITE_URL = "https://deepertones.com";
export const SITE_NAME = "Deeper Tones";
export const SEPARATOR_ONLY = /^[›»>/|·\\-]$/;

const trim = (s) => decodeEntities(String(s ?? "")).replace(/\s+/g, " ").trim();
export const textOf = (fragment) => htmlText(String(fragment ?? "")).trim();

// ---------- small HTML readers ----------

const attr = (tag, name) => {
  const m = new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, "i").exec(tag);
  return m ? decodeEntities(m[1] ?? m[2]) : null;
};
const hasClass = (tag, cls) => new RegExp(`\\bclass\\s*=\\s*"[^"]*\\b${cls}\\b[^"]*"`).test(tag);
const stripScripts = (html) => String(html ?? "").replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "");
const mainOf = (html) => /<main\b[^>]*>([\s\S]*?)<\/main>/i.exec(stripScripts(html))?.[1] ?? stripScripts(html);

// "/guides/x", "https://deepertones.com/guides/x/", "/guides/x#frag" -> "/guides/x" (root stays "/"; the query is kept).
export function normPath(u, siteUrl = SITE_URL) {
  if (u === null || u === undefined) return null;
  let url;
  try { url = new URL(decodeEntities(String(u)), siteUrl); } catch { return String(u); }
  const path = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, "") : "/";
  return path + url.search;
}
const isOffSite = (u, siteUrl) => { try { return /^https?:/i.test(u) && new URL(u).origin !== new URL(siteUrl).origin; } catch { return true; } };

// Guide cards: every `<a class="... g-card ...">`, with its link, its heading, its image's loading attribute and flags.
export function readCards(html, siteUrl = SITE_URL) {
  const out = [];
  for (const m of String(html ?? "").matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    if (!hasClass(m[1], "g-card")) continue;
    const href = attr(m[1], "href");
    const heading = /<(h[1-6])\b[^>]*>([\s\S]*?)<\/\1>/i.exec(m[2]);
    const img = /<img\b[^>]*>/i.exec(m[2]);
    const path = normPath(href, siteUrl);
    out.push({ href, path, slug: /^\/guides\/([^/?#]+)$/.exec(path ?? "")?.[1] ?? null, tag: heading?.[1].toLowerCase() ?? null, title: heading ? textOf(heading[2]) : null, img: img ? { loading: attr(img[0], "loading") } : null, featured: attr(m[1], "data-featured") === "true", index: m.index, end: m.index + m[0].length });
  }
  return out;
}
const withoutCards = (html) => {
  let out = "", at = 0;
  for (const c of readCards(html)) { out += html.slice(at, c.index); at = c.end; }
  return out + html.slice(at);
};
const firstParagraph = (html) => { const m = /<p\b[^>]*>([\s\S]*?)<\/p>/i.exec(withoutCards(html)); return m ? textOf(m[1]) : null; };

// Every JSON-LD node on the page (a top-level object, an array, or the members of an @graph).
export function readJsonLd(html) {
  const nodes = [], errors = [];
  for (const m of String(html ?? "").matchAll(/<script\b[^>]*type\s*=\s*"application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) {
    let data;
    try { data = JSON.parse(m[1]); } catch (e) { errors.push(String(e.message)); continue; }
    const walk = (n) => { if (Array.isArray(n)) n.forEach(walk); else if (n && typeof n === "object") { if (n["@graph"]) walk(n["@graph"]); else nodes.push(n); } };
    walk(data);
  }
  const ofType = (t) => nodes.filter((n) => [].concat(n["@type"] ?? []).includes(t));
  return { nodes, errors, ofType };
}
const itemListUrls = (list) => (list?.itemListElement ?? []).slice().sort((a, b) => (a.position ?? 0) - (b.position ?? 0)).map((e) => e.url ?? e.item?.["@id"] ?? e.item ?? null);

const metaContent = (html, key, value) => {
  for (const m of stripScripts(html).matchAll(/<meta\b[^>]*>/gi)) if (attr(m[0], key) === value) return attr(m[0], "content");
  return null;
};
const canonicalOf = (html) => { for (const m of stripScripts(html).matchAll(/<link\b[^>]*>/gi)) if (attr(m[0], "rel") === "canonical") return attr(m[0], "href"); return null; };
const titleOf = (html) => { const m = /<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(html ?? ""); return m ? trim(m[1].replace(/<[^>]+>/g, "")) : null; };
const robotsOf = (html) => metaContent(html, "name", "robots");

// ---------- sitemap ----------

export function readSitemap(xml) {
  const out = new Map();
  for (const m of String(xml ?? "").matchAll(/<url>([\s\S]*?)<\/url>/gi)) {
    const loc = /<loc>([\s\S]*?)<\/loc>/i.exec(m[1])?.[1];
    if (loc) out.set(trim(loc), trim(/<lastmod>([\s\S]*?)<\/lastmod>/i.exec(m[1])?.[1] ?? "") || null);
  }
  return out;
}
const newest = (dates) => dates.slice().sort().at(-1) ?? null;

// ---------- the hub a guide belongs to, from hubs.yaml order (not from the `hub` field the build wrote) ----------

const modelOfGuide = (models, slug) => models.find((m) => m.hub.guides?.includes(slug)) ?? null;

// The breadcrumb the spec asks for, as [{ name, path }].
export function expectedBreadcrumb({ kind, guide, model }) {
  const home = { name: "Home", path: "/" }, guides = { name: "Guides", path: "/guides" };
  if (kind === "hub") return [home, guides, { name: model.hub.name, path: model.path }];
  return [home, guides, ...(model?.hasPage ? [{ name: model.hub.name, path: model.path }] : []), { name: guide.title, path: `/guides/${guide.slug}` }];
}

const pr = (v) => (v === null || v === undefined ? "none" : String(v));
const list = (xs, n = 6) => (xs.length > n ? [...xs.slice(0, n), `... and ${xs.length - n} more`] : xs);
const NO_HUB_DATA = "no hub data (H1 failed: the build did not write the hubs module), so this line cannot be judged";

// ============================================================================================================
// H1.hub-map: the compiled hubs and the `hub` of every built guide.
// ============================================================================================================
export function h1Lines(add, { hubs, guides, fileSlugs = null, error = null }) {
  const id = "H1.hub-map", threshold = "every built guide in exactly one existing hub; hub fields in bounds";
  if (!hubs) {
    add({ id, target: "src/content/hubs.generated.ts", measured: error ?? "no hubs module: the build does not write src/content/hubs.generated.ts", threshold, pass: false });
    return;
  }
  const problems = [];
  const seen = new Set();
  for (const h of hubs) {
    const who = `hub ${pr(h.slug)}`;
    if (typeof h.slug !== "string" || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(h.slug)) problems.push(`${who}: slug is not kebab-case`);
    else if (seen.has(h.slug)) problems.push(`${who}: slug is not unique`);
    else seen.add(h.slug);
    if (typeof h.name !== "string" || !h.name.trim()) problems.push(`${who}: name is missing`);
    if (typeof h.title !== "string" || !h.title.trim()) problems.push(`${who}: title is missing`);
    else if (h.title.length > 60) problems.push(`${who}: title is ${h.title.length} characters (60 at most)`);
    if (typeof h.description !== "string") problems.push(`${who}: description is missing`);
    else if (h.description.length < 70 || h.description.length > 160) problems.push(`${who}: description is ${h.description.length} characters (70 to 160)`);
    if (typeof h.intro !== "string" || !h.intro.trim()) problems.push(`${who}: intro is missing`);
    else if (h.intro.length > 200) problems.push(`${who}: intro is ${h.intro.length} characters (200 at most)`);
    if (!Array.isArray(h.guides) || h.guides.length === 0) problems.push(`${who}: guides is empty`);
  }
  const hubBySlug = new Map(hubs.map((h) => [h.slug, h]));
  for (const g of guides) {
    const inLists = hubs.filter((h) => h.guides?.includes(g.slug));
    if (typeof g.hub !== "string" || !g.hub) problems.push(`guide ${g.slug}: no hub set`);
    else if (!hubBySlug.has(g.hub)) problems.push(`guide ${g.slug}: hub "${g.hub}" does not exist`);
    else if (!hubBySlug.get(g.hub).guides?.includes(g.slug)) problems.push(`guide ${g.slug}: hub "${g.hub}" does not list it`);
    if (inLists.length === 0) problems.push(`guide ${g.slug}: listed in no hub`);
    if (inLists.length > 1) problems.push(`guide ${g.slug}: listed in ${inLists.length} hubs (${inLists.map((h) => h.slug).join(", ")})`);
  }
  if (fileSlugs) {
    const listed = new Set(hubs.flatMap((h) => h.guides ?? []));
    for (const s of fileSlugs) if (!listed.has(s)) problems.push(`content/guides/${s}.md is in no hub`);
    for (const h of hubs) for (const s of h.guides ?? []) if (!fileSlugs.includes(s)) problems.push(`hub ${h.slug} lists "${s}", which has no guide file`);
  }
  const counts = hubModels(hubs, guides).map((m) => `${m.hub.slug}: ${m.published.length} published, ${m.visible.length} visible${m.hasPage ? ", has a page" : ""}`);
  add({ id, target: "src/content/hubs.generated.ts", measured: problems.length ? `${problems.length} problem(s): ${problems.slice(0, 3).join("; ")}` : `${hubs.length} hubs, ${guides.length} guides: ${counts.join(" | ")}`, threshold, pass: problems.length === 0, details: problems.length ? [...problems, ...counts] : counts });
}

// ============================================================================================================
// H2.index-sections: /guides is one <section> per hub with a visible guide, in order, with the right cards.
// ============================================================================================================
export function h2Line(add, { html, models, siteUrl = SITE_URL }) {
  const id = "H2.index-sections", target = "/guides", threshold = "one section per hub in hubs.yaml order, each guide once in its hub's section";
  if (!models) return add({ id, target, measured: NO_HUB_DATA, threshold, pass: false });
  if (!html) return add({ id, target, measured: "no HTML (page did not load)", threshold, pass: false });
  const problems = [];
  const main = mainOf(html);
  const h1s = [...main.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => textOf(m[1]));
  if (h1s.length !== 1 || h1s[0] !== "Guides") problems.push(`the H1 must stay "Guides" (found ${h1s.length ? h1s.map((t) => `"${t}"`).join(", ") : "none"})`);

  const sections = [...main.matchAll(/<section\b([^>]*)>([\s\S]*?)<\/section>/gi)]
    .map((m) => ({ attrs: m[1], html: m[2], index: m.index }))
    .filter((s) => /<h2\b/i.test(s.html) || readCards(s.html).length > 0);
  const expected = models.filter((m) => m.visible.length > 0);
  const gotIds = sections.map((s) => attr(/<h2\b[^>]*>/i.exec(s.html)?.[0] ?? "", "id") ?? "(no id)");
  const wantIds = expected.map((m) => m.hub.slug);
  if (gotIds.join(",") !== wantIds.join(",")) problems.push(`sections are [${gotIds.join(", ")}], expected [${wantIds.join(", ")}] (hubs.yaml order, hubs with a visible guide)`);

  const firstSectionAt = sections[0]?.index ?? main.length;
  const beforeSections = main.slice(0, firstSectionAt);
  if (!/<p\b/i.test(withoutCards(beforeSections))) problems.push("the intro paragraph under the H1 is missing");

  const shown = [];
  sections.forEach((s, si) => {
    const m = expected.find((e) => e.hub.slug === gotIds[si]);
    const where = `section ${si + 1} (${gotIds[si]})`;
    const cards = readCards(s.html, siteUrl);
    shown.push(...cards);
    if (!m) return problems.push(`${where}: not a hub with a visible guide`);
    const h2 = /<h2\b([^>]*)>([\s\S]*?)<\/h2>/i.exec(s.html);
    if (!h2) problems.push(`${where}: no h2`);
    else {
      if (textOf(h2[2]) !== m.hub.name) problems.push(`${where}: h2 says "${textOf(h2[2])}", expected "${m.hub.name}"`);
      const links = [...h2[2].matchAll(/<a\b[^>]*>/gi)].map((a) => normPath(attr(a[0], "href"), siteUrl));
      if (m.hasPage && !links.includes(m.path)) problems.push(`${where}: the name must link to ${m.path} (the hub has a page)`);
      if (!m.hasPage && links.length) problems.push(`${where}: the name links to ${links.join(", ")} but the hub has no page`);
    }
    const intro = firstParagraph(s.html.replace(/<h2\b[\s\S]*?<\/h2>/i, ""));
    if (intro !== m.hub.intro) problems.push(`${where}: intro is ${intro === null ? "missing" : `"${intro.slice(0, 60)}"`}, expected the hub intro`);
    const got = cards.map((c) => c.slug), want = m.visible.map((g) => g.slug);
    if (got.join(",") !== want.join(",")) problems.push(`${where}: cards are [${got.join(", ")}], expected [${want.join(", ")}] (hubs.yaml order)`);
    for (const c of cards) {
      if (c.tag !== "h3") problems.push(`${where}: card ${c.slug} has its title in ${c.tag ?? "no heading"}, expected h3`);
      const g = m.visible.find((x) => x.slug === c.slug);
      if (g && c.title !== g.title) problems.push(`${where}: card ${c.slug} title is "${c.title}"`);
      if (c.featured) problems.push(`${where}: card ${c.slug} is still a featured (full-row) card`);
    }
    // eager: only the first section's first row (at most 3 thumbnails); the first one must not be lazy
    cards.forEach((c, ci) => {
      if (!c.img) return;
      const mayBeEager = si === 0 && ci < 3;
      if (!mayBeEager && c.img.loading !== "lazy") problems.push(`${where}: card ${c.slug} thumbnail is not loading=lazy`);
      if (si === 0 && ci === 0 && c.img.loading === "lazy") problems.push(`${where}: the first thumbnail on the page must load eagerly`);
    });
  });

  const counts = new Map();
  for (const c of shown) counts.set(c.slug, (counts.get(c.slug) ?? 0) + 1);
  for (const m of expected) for (const g of m.visible) if ((counts.get(g.slug) ?? 0) !== 1) problems.push(`guide ${g.slug} is on ${counts.get(g.slug) ?? 0} cards, expected exactly 1`);
  const known = new Set(models.flatMap((m) => m.visible.map((g) => g.slug)));
  for (const s of counts.keys()) if (!known.has(s)) problems.push(`card for ${s}, which is not a visible guide`);
  if (readCards(main, siteUrl).length !== shown.length) problems.push("some cards are outside the hub sections");

  const ld = readJsonLd(html);
  const list = ld.ofType("CollectionPage").map((n) => n.mainEntity).find((e) => [].concat(e?.["@type"] ?? []).includes("ItemList")) ?? ld.ofType("ItemList")[0];
  const urls = itemListUrls(list).map((u) => normPath(u, siteUrl));
  const wantUrls = expected.flatMap((m) => m.visible.map((g) => `/guides/${g.slug}`));
  if (!list) problems.push("no JSON-LD ItemList");
  else if (urls.join(",") !== wantUrls.join(",")) problems.push(`JSON-LD ItemList is [${urls.map((u) => u?.replace("/guides/", "")).join(", ")}], expected every guide in the order shown`);

  add({ id, target, measured: problems.length ? `${problems.length} problem(s): ${problems.slice(0, 2).join("; ")}` : `${sections.length} sections, ${shown.length} cards, each guide once in its own hub`, threshold, pass: problems.length === 0, details: problems });
}

// ============================================================================================================
// H3.hub-pages: /guides/topics/<slug> for a hub with a page; 404 for a hub without one and for /guides/topics.
// ============================================================================================================
export function h3PageLine(add, { model, status, html, sitemap, hasDrafts, siteUrl = SITE_URL, siteName = SITE_NAME }) {
  const id = "H3.hub-pages", target = model.path, threshold = "200, title, description, canonical, H1, cards, JSON-LD, robots, sitemap as specified";
  if (status !== 200) return add({ id, target, measured: `status ${status}`, threshold, pass: false, details: ["a hub with 3+ published guides must have a page"] });
  const h = model.hub, problems = [];
  const t = titleOf(html);
  if (t !== `${h.title} | ${siteName}`) problems.push(`title is "${t}", expected "${h.title} | ${siteName}"`);
  const d = metaContent(html, "name", "description");
  if (d !== h.description) problems.push(`meta description is ${d === null ? "missing" : `"${d.slice(0, 60)}"`}, expected the hub description`);
  const c = canonicalOf(html);
  if (c !== `${siteUrl}${model.path}`) problems.push(`canonical is ${pr(c)}, expected ${siteUrl}${model.path}`);
  const main = mainOf(html);
  const h1s = [...main.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => textOf(m[1]));
  if (h1s.length !== 1 || h1s[0] !== h.name) problems.push(`H1 is [${h1s.join(" | ")}], expected exactly one: "${h.name}"`);
  const intro = firstParagraph(main);
  if (intro !== h.intro) problems.push(`first paragraph is ${intro === null ? "missing" : `"${intro.slice(0, 60)}"`}, expected the hub intro`);
  const cards = readCards(main, siteUrl);
  const got = cards.map((x) => x.slug), want = model.visible.map((g) => g.slug);
  if (got.join(",") !== want.join(",")) problems.push(`cards are [${got.join(", ")}], expected [${want.join(", ")}] (visible guides, hubs.yaml order, nothing else)`);
  for (const x of cards) if (x.tag !== "h2") problems.push(`card ${x.slug} has its title in ${x.tag ?? "no heading"}, expected h2`);
  const ld = readJsonLd(html);
  const page = ld.ofType("CollectionPage")[0];
  const list = (page && [].concat(page.mainEntity?.["@type"] ?? []).includes("ItemList") ? page.mainEntity : null) ?? ld.ofType("ItemList")[0];
  if (!page) problems.push("no JSON-LD CollectionPage");
  const urls = itemListUrls(list).map((u) => normPath(u, siteUrl));
  if (!list) problems.push("no JSON-LD ItemList");
  else if (urls.join(",") !== want.map((s) => `/guides/${s}`).join(",")) problems.push(`JSON-LD ItemList is [${urls.join(", ")}], expected the cards above`);
  if (ld.ofType("BreadcrumbList").length === 0) problems.push("no JSON-LD BreadcrumbList");
  const robots = robotsOf(html), noindex = /noindex/i.test(robots ?? "");
  if (hasDrafts && !noindex) problems.push("this build shows drafts, so the page needs robots noindex (it has none)");
  if (!hasDrafts && noindex) problems.push(`robots is "${robots}" on a production build; there must be none`);
  let sitemapNote = "sitemap not judged (drafts build: hub pages are noindex)";
  if (!hasDrafts) {
    const loc = `${siteUrl}${model.path}`;
    const want = newest(model.published.map((g) => g.updated));
    if (!sitemap) { problems.push("could not read /sitemap.xml"); sitemapNote = "sitemap unreadable"; }
    else if (!sitemap.has(loc)) problems.push(`${loc} is not in /sitemap.xml`);
    else if ((sitemap.get(loc) ?? "").slice(0, 10) !== want) problems.push(`sitemap lastmod is ${pr(sitemap.get(loc))}, expected ${want} (newest updated among its published guides)`);
    sitemapNote = "in the sitemap";
  }
  add({ id, target, measured: problems.length ? `${problems.length} problem(s): ${problems.slice(0, 2).join("; ")}` : `200, ${cards.length} cards, ${hasDrafts ? "noindex" : "indexable"}, ${sitemapNote}`, threshold, pass: problems.length === 0, details: problems });
}

// A hub without a page (or /guides/topics itself): 404, and not in the sitemap.
export function h3AbsentLine(add, { path, status, sitemap, siteUrl = SITE_URL }) {
  const problems = [];
  if (status !== 404) problems.push(`status ${status}, expected 404`);
  if (sitemap && sitemap.has(`${siteUrl}${path}`)) problems.push(`${siteUrl}${path} is in /sitemap.xml`);
  add({ id: "H3.hub-pages", target: path, measured: problems.length ? problems.join("; ") : "404 and not in the sitemap", threshold: "404, not in /sitemap.xml", pass: problems.length === 0, details: problems });
}

// ============================================================================================================
// H4.breadcrumbs: the visible breadcrumb and the JSON-LD BreadcrumbList name the same items, URLs and order.
// ============================================================================================================
export function readVisibleBreadcrumb(html, siteUrl = SITE_URL) {
  const nav = [...stripScripts(html).matchAll(/<nav\b([^>]*)>([\s\S]*?)<\/nav>/gi)].find((m) => attr(m[1], "aria-label") === "Breadcrumb");
  if (!nav) return null;
  const items = [];
  for (const li of nav[2].matchAll(/<li\b([^>]*)>([\s\S]*?)<\/li>/gi)) {
    const name = textOf(li[2]);
    if (/\baria-hidden\b/.test(li[1]) || !name || SEPARATOR_ONLY.test(name)) continue;
    const a = /<a\b[^>]*>/i.exec(li[2]);
    items.push({ name, path: a ? normPath(attr(a[0], "href"), siteUrl) : null, raw: a ? attr(a[0], "href") : null });
  }
  return items;
}
export function readJsonLdBreadcrumb(html, siteUrl = SITE_URL) {
  const bl = readJsonLd(html).ofType("BreadcrumbList")[0];
  if (!bl) return null;
  return (bl.itemListElement ?? []).slice().sort((a, b) => (a.position ?? 0) - (b.position ?? 0)).map((e) => {
    const raw = typeof e.item === "string" ? e.item : e.item?.["@id"] ?? e.url ?? null;
    return { name: trim(e.name ?? e.item?.name ?? ""), path: raw ? normPath(raw, siteUrl) : null, raw };
  });
}
export function h4Line(add, { path, html, expected, siteUrl = SITE_URL }) {
  const id = "H4.breadcrumbs", threshold = "visible breadcrumb = JSON-LD BreadcrumbList = the spec's trail (names, URLs, order)";
  if (!expected) return add({ id, target: path, measured: NO_HUB_DATA, threshold, pass: false });
  if (!html) return add({ id, target: path, measured: "no HTML (page did not load)", threshold, pass: false });
  const problems = [];
  const vis = readVisibleBreadcrumb(html, siteUrl), ld = readJsonLdBreadcrumb(html, siteUrl);
  const want = expected.map((e) => e.name).join(" > ");
  const fmt = (xs) => xs.map((x) => x.name).join(" > ");
  if (!vis) problems.push('no nav[aria-label="Breadcrumb"] on the page');
  if (!ld) problems.push("no JSON-LD BreadcrumbList on the page");
  if (vis) {
    if (fmt(vis) !== want) problems.push(`visible breadcrumb is "${fmt(vis)}", expected "${want}"`);
    else vis.forEach((v, i) => {
      const last = i === vis.length - 1;
      if (v.path === null && !last) problems.push(`visible item "${v.name}" has no link`);
      if (v.path !== null && v.path !== expected[i].path) problems.push(`visible item "${v.name}" links to ${v.path}, expected ${expected[i].path}`);
    });
  }
  if (ld) {
    if (fmt(ld) !== want) problems.push(`JSON-LD breadcrumb is "${fmt(ld)}", expected "${want}"`);
    else ld.forEach((v, i) => {
      if (v.path === null) problems.push(`JSON-LD item "${v.name}" has no URL`);
      else if (v.path !== expected[i].path) problems.push(`JSON-LD item "${v.name}" has URL ${v.path}, expected ${expected[i].path}`);
      if (v.raw && isOffSite(v.raw, siteUrl)) problems.push(`JSON-LD item "${v.name}" URL ${v.raw} is not on ${siteUrl}`);
    });
  }
  if (vis && ld && fmt(vis) !== fmt(ld)) problems.push(`visible "${fmt(vis)}" and JSON-LD "${fmt(ld)}" name different items`);
  add({ id, target: path, measured: problems.length ? `${problems.length} problem(s): ${problems.slice(0, 2).join("; ")}` : want, threshold, pass: problems.length === 0, details: problems });
}

// ============================================================================================================
// H5.related-same-hub: the related list starts with min(3, visible siblings) guides of the same hub.
// ============================================================================================================
// H4.breadcrumb-title (measured in the browser): the current item of the visible breadcrumb stays readable. READING_SPEC 4.2
// cuts it to one line with an ellipsis; it must never be squeezed away by the items before it (a long hub name on a phone).
export const BREADCRUMB_TITLE_MIN_PX = 120;
// Runs in the page (page.evaluate): width shown and full width of the current breadcrumb item, or null when there is none.
export const readBreadcrumbTitle = () => {
  const li = document.querySelector('nav[aria-label="Breadcrumb"] li[aria-current]');
  return li ? { width: li.getBoundingClientRect().width, full: li.scrollWidth } : null;
};
export function h4TitleLine(add, { path, vw, crumb }) {
  const need = crumb ? Math.min(BREADCRUMB_TITLE_MIN_PX, crumb.full) : null;
  add({
    id: "H4.breadcrumb-title", target: `${path} @${vw}`,
    measured: crumb ? `${Math.round(crumb.width)}px of the current item shown (full ${Math.round(crumb.full)}px)` : "no current breadcrumb item",
    threshold: `>= ${BREADCRUMB_TITLE_MIN_PX}px shown, or the whole item when it is shorter`,
    pass: !!crumb && crumb.width + 0.5 >= need,
  });
}

export function h5Line(add, { path, html, guide, models, guides, siteUrl = SITE_URL, limit = 3 }) {
  const id = "H5.related-same-hub", threshold = `starts with min(${limit}, visible siblings) guides of the same hub`;
  if (!models) return add({ id, target: path, measured: NO_HUB_DATA, threshold, pass: false });
  if (!html) return add({ id, target: path, measured: "no HTML (page did not load)", threshold, pass: false });
  const m = modelOfGuide(models, guide.slug);
  if (!m) return add({ id, target: path, measured: `${guide.slug} is in no hub`, threshold, pass: false });
  const siblings = m.visible.map((g) => g.slug).filter((s) => s !== guide.slug);
  const others = guides.filter((g) => g.slug !== guide.slug);
  const k = Math.min(limit, siblings.length);
  const sect = [...stripScripts(html).matchAll(/<section\b([^>]*)>([\s\S]*?)<\/section>/gi)].find((s) => hasClass(s[1], "guide-related"));
  const got = sect ? readCards(sect[2], siteUrl).map((c) => c.slug) : [];
  const problems = [];
  if (!sect && others.length > 0) problems.push("no related-guides section (section.guide-related)");
  const head = got.slice(0, k);
  if (head.length < k || head.some((s) => !siblings.includes(s))) problems.push(`the first ${k} related guides must be hub siblings [${siblings.join(", ")}], got [${got.join(", ")}]`);
  if (got.includes(guide.slug)) problems.push("the guide lists itself");
  if (new Set(got).size !== got.length) problems.push("a guide is listed twice");
  for (const s of got) if (!guides.some((g) => g.slug === s)) problems.push(`${s} is not a visible guide`);
  if (got.length !== Math.min(limit, others.length)) problems.push(`shows ${got.length} related guides, expected ${Math.min(limit, others.length)}`);
  add({ id, target: path, measured: problems.length ? `${problems.length} problem(s): ${problems.slice(0, 2).join("; ")}` : `[${got.join(", ")}] starts with ${k} of ${siblings.length} sibling(s)`, threshold, pass: problems.length === 0, details: problems });
}

// ============================================================================================================
// H6.internal-links: every /guides href on every fetched page answers 200 (fragment ignored).
// ============================================================================================================
export function collectGuideLinks(html, siteUrl = SITE_URL) {
  const out = [];
  for (const m of stripScripts(html).matchAll(/\shref\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)) {
    const raw = decodeEntities(m[1] ?? m[2]).trim();
    const abs = raw.startsWith(`${siteUrl}/`) || raw === siteUrl ? raw.slice(siteUrl.length) || "/" : raw;
    if (!/^\/guides(?=$|[/?#])/.test(abs)) continue;
    out.push(normPath(abs.split("#")[0], siteUrl));
  }
  return out;
}
export async function h6Line(add, { pages, fetchStatus, siteUrl = SITE_URL, concurrency = 6 }) {
  const from = new Map();
  for (const [page, html] of pages) if (html) for (const p of collectGuideLinks(html, siteUrl)) { const s = from.get(p) ?? new Set(); s.add(page); from.set(p, s); }
  const paths = [...from.keys()], broken = [];
  const queue = [...paths];
  await Promise.all(Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    while (queue.length) { const p = queue.shift(); const s = await fetchStatus(p); if (s !== 200) broken.push(`${p} -> ${s} (linked from ${list([...from.get(p)], 3).join(", ")})`); }
  }));
  broken.sort();
  add({ id: "H6.internal-links", target: `${pages.size} pages`, measured: broken.length ? `${broken.length} of ${paths.length} /guides links broken: ${broken.slice(0, 3).join("; ")}` : `${paths.length} unique /guides links, all 200`, threshold: "every /guides href answers 200", pass: broken.length === 0 && paths.length > 0, details: broken });
}

// ============================================================================================================
// H7.inbound-links: every published guide is linked from the body of at least one other published guide. The body is
// the guide's own text (`div.guide-prose` up to the FAQ), so links from cards, related guides and breadcrumbs do not
// count, and neither do links from drafts (they are not on the live site) or from the guide itself.
// ============================================================================================================
export function guideBody(html) {
  const s = stripScripts(html);
  const at = s.search(/<div\b[^>]*\bclass\s*=\s*"[^"]*\bguide-prose\b/i);
  if (at < 0) return null;
  const rest = s.slice(at);
  const end = rest.search(/<section\b[^>]*\bid\s*=\s*"faq"|<\/article>/i);
  return end < 0 ? rest : rest.slice(0, end);
}
export function h7Line(add, { slug, guides, pages, siteUrl = SITE_URL }) {
  const path = `/guides/${slug}`;
  const sources = guides.filter((g) => !g.draft && g.slug !== slug);
  const noBody = [], from = [];
  for (const g of sources) {
    const body = guideBody(pages.get(`/guides/${g.slug}`));
    if (body === null) { noBody.push(g.slug); continue; }
    if (collectGuideLinks(body, siteUrl).includes(path)) from.push(g.slug);
  }
  const details = noBody.length ? [`no guide body found on: ${list(noBody).join(", ")}`] : [];
  add({
    id: "H7.inbound-links",
    target: path,
    measured: from.length ? `linked from ${from.length} other guide bod${from.length === 1 ? "y" : "ies"}: ${list(from, 4).join(", ")}` : `no other published guide's body links here (${sources.length - noBody.length} bodies read)`,
    threshold: ">= 1 in-body link from another published guide",
    pass: from.length > 0,
    details,
  });
}

// ============================================================================================================
// The thin network wrapper run.mjs calls after contractChecks.
// ============================================================================================================
async function get(base, path) {
  try {
    const r = await fetch(new URL(path, base), { redirect: "manual", signal: AbortSignal.timeout(30000) });
    return { status: r.status, text: await r.text() };
  } catch (e) {
    return { status: 0, text: "", error: String(e) };
  }
}

// guides: every built guide (hub lines are site-wide, like A4; --only does not narrow them). htmlStore is filled by
// contractChecks; pages it lacks are fetched here (and added to it, so later steps see them).
export async function hubChecks(checks, { base, frozen, guides, htmlStore }) {
  const add = (l) => checks.add(l);
  let hubs = null, error = null;
  try { hubs = loadCompiledHubs(frozen); } catch (e) { error = `hubs module unreadable: ${e.message}`; }
  const gdir = join(frozen, "content/guides");
  const fileSlugs = existsSync(gdir) ? readdirSync(gdir).filter((f) => f.endsWith(".md") && !f.startsWith("_")).map((f) => f.slice(0, -3)) : null;
  const hasDrafts = guides.some((g) => g.draft);

  const pages = new Map(htmlStore);
  const need = async (p) => { if (!pages.get(p)) { const r = await get(base, p); pages.set(p, r.status === 200 ? r.text : ""); } return pages.get(p); };
  for (const g of guides) await need(`/guides/${g.slug}`);
  await need("/guides");

  h1Lines(add, { hubs, guides, fileSlugs, error });
  const models = hubs ? hubModels(hubs, guides) : null;

  if (models) {
    const sm = await get(base, "/sitemap.xml");
    const sitemap = sm.status === 200 ? readSitemap(sm.text) : null;
    h2Line(add, { html: pages.get("/guides"), models });
    for (const m of models) {
      if (m.hasPage) { const r = await get(base, m.path); h3PageLine(add, { model: m, status: r.status, html: r.text, sitemap, hasDrafts }); pages.set(m.path, r.status === 200 ? r.text : ""); }
      else h3AbsentLine(add, { path: m.path, status: (await get(base, m.path)).status, sitemap });
    }
    h3AbsentLine(add, { path: "/guides/topics", status: (await get(base, "/guides/topics")).status, sitemap });
    for (const g of guides) h4Line(add, { path: `/guides/${g.slug}`, html: pages.get(`/guides/${g.slug}`), expected: expectedBreadcrumb({ kind: "guide", guide: g, model: modelOfGuide(models, g.slug) ?? { hasPage: false } }) });
    for (const m of models.filter((x) => x.hasPage)) h4Line(add, { path: m.path, html: pages.get(m.path), expected: expectedBreadcrumb({ kind: "hub", model: m }) });
    for (const g of guides) h5Line(add, { path: `/guides/${g.slug}`, html: pages.get(`/guides/${g.slug}`), guide: g, models, guides });
  } else {
    for (const [id, target] of [["H2.index-sections", "/guides"], ["H3.hub-pages", "/guides/topics/*"], ["H4.breadcrumbs", "guide and hub pages"], ["H5.related-same-hub", "guide pages"]]) {
      add({ id, target, measured: NO_HUB_DATA, threshold: "see quality/ACCEPTANCE-HUBS.md", pass: false });
    }
  }
  for (const g of guides.filter((x) => !x.draft)) h7Line(add, { slug: g.slug, guides, pages });
  await h6Line(add, { pages, fetchStatus: async (p) => (await get(base, p)).status });
  for (const [p, html] of pages) if (!htmlStore.has(p)) htmlStore.set(p, html);
}
