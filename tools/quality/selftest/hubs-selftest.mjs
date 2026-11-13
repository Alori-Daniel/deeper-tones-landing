// Self-test for the hub lines H1 to H6 (quality/ACCEPTANCE-HUBS.md). A synthetic site (hubs, guides, the HTML the spec
// describes) must PASS every line; each rule is then broken one way at a time and the matching line must FAIL, naming the
// fault. The pure functions of checks/hubs.mjs are driven directly; H6 uses a local server, so no network is needed.
import { createServer } from "node:http";
import { Checks } from "../lib/util.mjs";
import { hubModels } from "../lib/pages.mjs";
import { SITE_URL, expectedBreadcrumb, h1Lines, h2Line, h3AbsentLine, h3PageLine, h4Line, h4TitleLine, h5Line, h6Line, h7Line, readSitemap } from "../checks/hubs.mjs";

const esc = (s) => String(s).replaceAll("&", "&amp;").replaceAll("<", "&lt;");

// ---------- the synthetic site ----------
// alpha: 4 published -> has a page. beta: 2 published -> no page. gamma: 2 published + 1 draft -> no page (drafts never
// count toward the 3). delta: 1 guide -> no page, and no siblings.
const HUBS = [
  { slug: "alpha", name: "Alpha topics", title: "Alpha Topics for Deeper Skin", description: "Guides about the alpha topics, written in plain words, with sources, for people with deeper skin tones.", intro: "What the alpha guides cover.", guides: ["a1", "a2", "a3", "a4"] },
  { slug: "beta", name: "Beta & more", title: "Beta Topics for Deeper Skin", description: "Guides about the beta topics, written in plain words, with sources, for people with deeper skin tones.", intro: "What the beta guides cover.", guides: ["b1", "b2"] },
  { slug: "gamma", name: "Gamma", title: "Gamma Topics for Deeper Skin", description: "Guides about the gamma topics, written in plain words, with sources, for people with deeper skin tones.", intro: "What the gamma guides cover.", guides: ["g1", "g2", "g3"] },
  { slug: "delta", name: "Delta", title: "Delta Topics for Deeper Skin", description: "Guides about the delta topics, written in plain words, with sources, for people with deeper skin tones.", intro: "What the delta guides cover.", guides: ["d1"] },
];
const G = (slug, hub, updated, draft = false) => ({ slug, hub, updated, draft, title: `Title of ${slug}`, description: `About ${slug}.` });
const ALL = [G("a1", "alpha", "2026-11-01"), G("a2", "alpha", "2026-11-05"), G("a3", "alpha", "2026-11-03"), G("a4", "alpha", "2026-11-02"), G("b1", "beta", "2026-11-04"), G("b2", "beta", "2026-11-04"), G("g1", "gamma", "2026-11-01"), G("g2", "gamma", "2026-11-01"), G("g3", "gamma", "2026-11-12", true), G("d1", "delta", "2026-11-01")];
ALL[1].title = "Dark & light";
const site = ({ drafts }) => { const guides = ALL.filter((g) => drafts || !g.draft); return { drafts, guides, models: hubModels(HUBS, guides) }; };

// ---------- HTML in the shape the spec describes (same classes as the real site) ----------
const card = (g, tag, loading = "lazy") => `<a class="g-card group" data-variant="index" href="/guides/${g.slug}"><div class="g-thumb"><img src="/t.webp" width="800" height="450" alt="" loading="${loading}" decoding="async"></div><div class="g-body">${g.draft ? '<span class="g-draft">Draft</span>' : ""}<${tag} class="g-title">${esc(g.title)}</${tag}><p class="g-desc">${esc(g.description)}</p></div></a>`;
const ld = (o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, "\\u003c")}</script>`;
const crumbLd = (crumbs, abs = true) => ({ "@type": "BreadcrumbList", itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: c.path === "/" ? SITE_URL : abs ? `${SITE_URL}${c.path}` : c.path })) });
const crumbNav = (crumbs) => `<nav aria-label="Breadcrumb" class="guide-breadcrumb"><ol>${crumbs.map((c, i) => `${i ? '<li aria-hidden="true">›</li>' : ""}<li${i === crumbs.length - 1 ? ' aria-current="page"' : ""}>${i === crumbs.length - 1 ? esc(c.name) : `<a href="${c.path}">${esc(c.name)}</a>`}</li>`).join("")}</ol></nav>`;
const itemList = (guides) => ({ "@type": "ItemList", itemListElement: guides.map((g, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE_URL}/guides/${g.slug}`, name: g.title })) });
const shell = (head, body) => `<!doctype html><html><head><meta charset="utf-8">${head}</head><body><header><a href="/guides">Guides</a></header><main>${body}</main><footer><a href="/privacy">Privacy</a></footer></body></html>`;

function indexHtml(s) {
  const visible = s.models.filter((m) => m.visible.length);
  const secs = visible.map((m, si) => `<section aria-labelledby="h-${m.hub.slug}"><h2 id="${m.hub.slug}">${m.hasPage ? `<a href="${m.path}">${esc(m.hub.name)}</a>` : esc(m.hub.name)}</h2><p>${esc(m.hub.intro)}</p><div class="guides-grid">${m.visible.map((g, ci) => card(g, "h3", si === 0 && ci < 3 ? "eager" : "lazy")).join("")}</div></section>`).join("");
  const all = visible.flatMap((m) => m.visible);
  return shell(ld({ "@context": "https://schema.org", "@graph": [{ "@type": "CollectionPage", mainEntity: itemList(all) }, crumbLd([{ name: "Home", path: "/" }, { name: "Guides", path: "/guides" }])] }), `<h1>Guides</h1><p class="guides-intro">Plain, sourced guides.</p>${secs}`);
}
function hubHtml(s, m) {
  const crumbs = expectedBreadcrumb({ kind: "hub", model: m });
  const head = `<title>${esc(m.hub.title)} | Deeper Tones</title><meta name="description" content="${esc(m.hub.description)}"><link rel="canonical" href="${SITE_URL}${m.path}">${s.drafts ? '<meta name="robots" content="noindex, nofollow">' : ""}${ld({ "@context": "https://schema.org", "@graph": [{ "@type": "CollectionPage", mainEntity: itemList(m.visible) }, crumbLd(crumbs)] })}`;
  return shell(head, `${crumbNav(crumbs)}<h1>${esc(m.hub.name)}</h1><p>${esc(m.hub.intro)}</p><div class="guides-grid">${m.visible.map((g) => card(g, "h2")).join("")}</div>`);
}
const relatedOf = (s, g, order) => { const m = s.models.find((x) => x.hub.guides.includes(g.slug)); const sib = m.visible.filter((x) => x.slug !== g.slug); const rest = s.guides.filter((x) => x.slug !== g.slug && !sib.includes(x)); return (order ?? [...sib, ...rest]).slice(0, 3); };
function guideHtml(s, g, { related, navCrumbs, ldCrumbs } = {}) {
  const m = s.models.find((x) => x.hub.guides.includes(g.slug));
  const crumbs = expectedBreadcrumb({ kind: "guide", guide: g, model: m });
  const rel = related ?? relatedOf(s, g);
  return shell(ld({ "@context": "https://schema.org", "@graph": [{ "@type": "Article" }, crumbLd(ldCrumbs ?? crumbs)] }), `${crumbNav(navCrumbs ?? crumbs)}<h1>${esc(g.title)}</h1><section class="guide-related" aria-labelledby="related-guides"><h2 id="related-guides">Related guides</h2><div class="related-grid">${rel.map((x) => card(x, "h3")).join("")}</div></section>`);
}
const sitemapXml = (entries) => `<?xml version="1.0"?><urlset>${entries.map(([p, d]) => `<url><loc>${SITE_URL}${p}</loc>${d ? `<lastmod>${d}</lastmod>` : ""}</url>`).join("")}</urlset>`;
const prodSitemap = (s, extra = []) => readSitemap(sitemapXml([["", "2026-10-26"], ["/guides", "2026-11-05"], ...s.guides.map((g) => [`/guides/${g.slug}`, g.updated]), ...s.models.filter((m) => m.hasPage).map((m) => [m.path, m.published.map((g) => g.updated).sort().at(-1)]), ...extra]));

export async function runHubsSelfTest(checks) {
  const unit = (name, ok, detail) => checks.add({ id: `SELFTEST.${name}`, target: "synthetic", measured: detail ?? (ok ? "behaves" : "WRONG"), threshold: "as specified", pass: !!ok });
  const grab = (fn) => { const c = new Checks(); fn((l) => c.add(l)); return c.lines[0]; };
  // good(name, line): the line must PASS. bad(name, line, mention): it must FAIL and its details must mention `mention`.
  const good = (name, line) => unit(`${line.id}.${name}`, line.status === "PASS", `${line.status}: ${line.measured}`);
  const bad = (name, line, mention) => {
    const text = [line.measured, ...[].concat(line.details ?? [])].join(" | ");
    unit(`${line.id}.${name}`, line.status === "FAIL" && text.includes(mention), `${line.status} (wanted FAIL mentioning "${mention}"): ${String(line.measured).slice(0, 140)}`);
  };
  const prod = site({ drafts: false }), drafts = site({ drafts: true });
  const files = ALL.map((g) => g.slug);
  const hubsCopy = (fn) => { const h = structuredClone(HUBS); fn(h); return h; };
  const guidesOf = (s, fn) => { const g = structuredClone(s.guides); fn(g); return g; };

  // ---------- H1.hub-map
  const h1 = (o = {}) => grab((add) => h1Lines(add, { hubs: HUBS, guides: prod.guides.map((g) => ({ ...g })), fileSlugs: files, ...o }));
  good("good-map", h1());
  good("good-map-drafts-build", grab((add) => h1Lines(add, { hubs: HUBS, guides: drafts.guides, fileSlugs: files })));
  unit("H1.hub-map.reports-published-and-visible-counts", /alpha: 4 published, 4 visible, has a page/.test(h1().measured) && /gamma: 2 published, 2 visible(?!, has)/.test(h1().measured) && /gamma: 2 published, 3 visible/.test(grab((add) => h1Lines(add, { hubs: HUBS, guides: drafts.guides })).measured), h1().measured);
  bad("no-hubs-module", grab((add) => h1Lines(add, { hubs: null, guides: prod.guides })), "no hubs module: the build does not write src/content/hubs.generated.ts");
  bad("guide-hub-does-not-exist", h1({ guides: guidesOf(prod, (g) => { g[0].hub = "nope"; }) }), 'hub "nope" does not exist');
  bad("guide-has-no-hub-field", h1({ guides: guidesOf(prod, (g) => { delete g[0].hub; }) }), "no hub set");
  bad("guide-listed-in-no-hub", h1({ hubs: hubsCopy((h) => { h[0].guides = ["a1", "a2", "a3"]; }) }), "a4: listed in no hub");
  bad("guide-listed-in-two-hubs", h1({ hubs: hubsCopy((h) => { h[1].guides.push("a1"); }) }), "listed in 2 hubs");
  bad("guide-file-in-no-hub", h1({ fileSlugs: [...files, "orphan"] }), "orphan.md is in no hub");
  bad("hub-lists-slug-with-no-file", h1({ hubs: hubsCopy((h) => { h[1].guides.push("ghost"); }) }), 'lists "ghost"');
  bad("hub-title-61-chars", h1({ hubs: hubsCopy((h) => { h[0].title = "x".repeat(61); }) }), "61 characters");
  good("hub-title-60-chars", h1({ hubs: hubsCopy((h) => { h[0].title = "x".repeat(60); }) }));
  bad("hub-description-69-chars", h1({ hubs: hubsCopy((h) => { h[0].description = "x".repeat(69); }) }), "69 characters");
  bad("hub-description-161-chars", h1({ hubs: hubsCopy((h) => { h[0].description = "x".repeat(161); }) }), "161 characters");
  good("hub-description-70-and-160-chars", grab((add) => h1Lines(add, { hubs: hubsCopy((h) => { h[0].description = "x".repeat(70); h[1].description = "x".repeat(160); }), guides: prod.guides, fileSlugs: files })));
  bad("hub-intro-201-chars", h1({ hubs: hubsCopy((h) => { h[0].intro = "x".repeat(201); }) }), "201 characters");
  bad("hub-slug-not-kebab", h1({ hubs: hubsCopy((h) => { h[0].slug = "Alpha_One"; }) }), "not kebab-case");
  bad("hub-slug-duplicate", h1({ hubs: hubsCopy((h) => { h[1].slug = "alpha"; }) }), "not unique");
  bad("hub-name-missing", h1({ hubs: hubsCopy((h) => { delete h[0].name; }) }), "name is missing");
  bad("hub-guides-empty", h1({ hubs: hubsCopy((h) => { h[3].guides = []; }) }), "guides is empty");

  // ---------- H2.index-sections
  const h2 = (s = prod, html = indexHtml(s)) => grab((add) => h2Line(add, { html, models: s.models }));
  good("good-index", h2());
  good("good-index-drafts-build", h2(drafts));
  const idx = indexHtml(prod);
  bad("no-hub-data", grab((add) => h2Line(add, { html: idx, models: null })), "no hub data");
  bad("sections-out-of-order", h2(prod, idx.replace(/(<section[\s\S]*?<\/section>)(<section[\s\S]*?<\/section>)/, "$2$1")), "sections are [beta, alpha");
  bad("hub-with-guides-has-no-section", h2(prod, idx.replace(/<section aria-labelledby="h-delta">[\s\S]*?<\/section>/, "")), "sections are [alpha, beta, gamma]");
  bad("section-without-id", h2(prod, idx.replace('<h2 id="beta">', "<h2>")), "(no id)");
  bad("card-in-wrong-section", h2(prod, idx.replace(card(prod.guides[4], "h3", "lazy"), "").replace(card(prod.guides[0], "h3", "eager"), card(prod.guides[0], "h3", "eager") + card(prod.guides[4], "h3", "lazy"))), "b1");
  bad("guide-card-twice", h2(prod, idx.replace(card(prod.guides[0], "h3", "eager"), card(prod.guides[0], "h3", "eager") + card(prod.guides[0], "h3", "lazy"))), "a1");
  bad("cards-out-of-hubs-yaml-order", h2(prod, idx.replace(card(prod.guides[0], "h3", "eager") + card(prod.guides[1], "h3", "eager"), card(prod.guides[1], "h3", "eager") + card(prod.guides[0], "h3", "eager"))), "hubs.yaml order");
  bad("card-title-is-h2-not-h3", h2(prod, idx.replace(/<h3 class="g-title">Title of b1<\/h3>/, '<h2 class="g-title">Title of b1</h2>')), "expected h3");
  bad("hub-with-page-name-not-linked", h2(prod, idx.replace('<a href="/guides/topics/alpha">Alpha topics</a>', "Alpha topics")), "must link to /guides/topics/alpha");
  bad("hub-without-page-name-linked", h2(prod, idx.replace("<h2 id=\"beta\">Beta &amp; more</h2>", '<h2 id="beta"><a href="/guides/topics/beta">Beta &amp; more</a></h2>')), "the hub has no page");
  bad("featured-card-left-in", h2(prod, idx.replace('data-variant="index" href="/guides/a2"', 'data-variant="index" data-featured="true" href="/guides/a2"')), "featured");
  bad("intro-missing", h2(prod, idx.replace("<p>What the beta guides cover.</p>", "")), "intro is missing");
  bad("eager-image-below-first-row", h2(prod, idx.replace(/(href="\/guides\/b1"[\s\S]*?)loading="lazy"/, '$1loading="eager"')), "b1 thumbnail is not loading=lazy");
  bad("first-thumbnail-lazy", h2(prod, idx.replace(/(href="\/guides\/a1"[\s\S]*?)loading="eager"/, '$1loading="lazy"')), "must load eagerly");
  bad("item-list-out-of-order", h2(prod, idx.replace(`${SITE_URL}/guides/a1`, `${SITE_URL}/guides/b1`)), "ItemList");
  bad("h1-changed", h2(prod, idx.replace("<h1>Guides</h1>", "<h1>All guides</h1>")), "H1 must stay");

  // ---------- H3.hub-pages
  const alpha = prod.models[0], alphaD = drafts.models[0];
  const h3 = (html, o = {}) => grab((add) => h3PageLine(add, { model: alpha, status: 200, html, sitemap: prodSitemap(prod), hasDrafts: false, ...o }));
  const page = hubHtml(prod, alpha);
  good("good-hub-page", h3(page));
  good("good-hub-page-drafts-build", grab((add) => h3PageLine(add, { model: alphaD, status: 200, html: hubHtml(drafts, alphaD), sitemap: null, hasDrafts: true })));
  bad("hub-with-page-returns-404", h3(page, { status: 404 }), "status 404");
  bad("wrong-canonical", h3(page.replace(`${SITE_URL}/guides/topics/alpha`, `${SITE_URL}/guides/topics/alpha/`)), "canonical is");
  bad("canonical-relative", h3(page.replace(`href="${SITE_URL}/guides/topics/alpha"`, 'href="/guides/topics/alpha"')), "canonical is");
  bad("wrong-title", h3(page.replace("Alpha Topics for Deeper Skin | Deeper Tones", "Alpha Topics for Deeper Skin")), "title is");
  bad("wrong-description", h3(page.replace(/<meta name="description" content="[^"]*">/, '<meta name="description" content="Something else.">')), "meta description");
  bad("two-h1", h3(page.replace("</main>", "<h1>Another</h1></main>")), "H1 is");
  bad("card-for-another-hub", h3(page.replace("</div></main>", `${card(prod.guides[4], "h2")}</div></main>`)), "b1");
  bad("cards-out-of-order", h3(page.replace(card(prod.guides[0], "h2") + card(prod.guides[1], "h2"), card(prod.guides[1], "h2") + card(prod.guides[0], "h2"))), "cards are");
  bad("card-title-is-h3", h3(page.replace(/<h2 class="g-title">Title of a3<\/h2>/, '<h3 class="g-title">Title of a3</h3>')), "expected h2");
  bad("no-collection-page-json-ld", h3(page.replace('"CollectionPage"', '"WebPage"')), "CollectionPage");
  bad("no-breadcrumb-json-ld", h3(page.replace('"BreadcrumbList"', '"Thing"')), "BreadcrumbList");
  bad("draft-build-without-noindex", grab((add) => h3PageLine(add, { model: alphaD, status: 200, html: hubHtml(drafts, alphaD).replace(/<meta name="robots"[^>]*>/, ""), sitemap: null, hasDrafts: true })), "noindex");
  bad("production-build-with-noindex", h3(page.replace("<link", '<meta name="robots" content="noindex"><link')), "production build");
  bad("not-in-sitemap", h3(page, { sitemap: readSitemap(sitemapXml([["/guides", "2026-11-05"]])) }), "is not in /sitemap.xml");
  bad("sitemap-lastmod-not-the-newest-published", h3(page, { sitemap: readSitemap(sitemapXml([[alpha.path, "2026-11-01"]])) }), "lastmod");
  good("hub-without-page-is-404-and-not-in-sitemap", grab((add) => h3AbsentLine(add, { path: "/guides/topics/beta", status: 404, sitemap: prodSitemap(prod) })));
  bad("hub-below-3-published-has-a-page", grab((add) => h3AbsentLine(add, { path: "/guides/topics/gamma", status: 200, sitemap: prodSitemap(drafts) })), "status 200");
  bad("hub-below-3-published-in-sitemap", grab((add) => h3AbsentLine(add, { path: "/guides/topics/beta", status: 404, sitemap: prodSitemap(prod, [["/guides/topics/beta", "2026-11-04"]]) })), "is in /sitemap.xml");
  good("topics-index-404", grab((add) => h3AbsentLine(add, { path: "/guides/topics", status: 404, sitemap: prodSitemap(prod) })));
  bad("topics-index-200", grab((add) => h3AbsentLine(add, { path: "/guides/topics", status: 200, sitemap: prodSitemap(prod) })), "status 200");
  unit("H3.hub-pages.gamma-draft-does-not-count-toward-3", drafts.models[2].visible.length === 3 && drafts.models[2].published.length === 2 && !drafts.models[2].hasPage, "3 visible, 2 published, no page");

  // ---------- H4.breadcrumbs
  const a1 = prod.guides[0], b1 = prod.guides[4];
  const h4 = (g, html, s = prod) => grab((add) => h4Line(add, { path: `/guides/${g.slug}`, html, expected: expectedBreadcrumb({ kind: "guide", guide: g, model: s.models.find((m) => m.hub.guides.includes(g.slug)) }) }));
  const crumbsA1 = expectedBreadcrumb({ kind: "guide", guide: a1, model: alpha });
  const crumbsB1 = expectedBreadcrumb({ kind: "guide", guide: b1, model: prod.models[1] });
  good("guide-in-hub-with-page", h4(a1, guideHtml(prod, a1)));
  good("guide-in-hub-without-page", h4(b1, guideHtml(prod, b1)));
  good("hub-page", grab((add) => h4Line(add, { path: alpha.path, html: page, expected: expectedBreadcrumb({ kind: "hub", model: alpha }) })));
  good("relative-and-absolute-urls-are-the-same", h4(a1, guideHtml(prod, a1, { navCrumbs: crumbsA1 }).replace('href="/guides"', `href="${SITE_URL}/guides"`).replace(/("item":")https:\/\/deepertones\.com(\/[^"]+)/g, "$1$2")));
  good("last-item-may-be-text-only", h4(b1, guideHtml(prod, b1)));
  bad("no-hub-data", grab((add) => h4Line(add, { path: "/g", html: page, expected: null })), "no hub data");
  bad("visible-nav-lacks-hub-json-ld-has-it", h4(a1, guideHtml(prod, a1, { navCrumbs: crumbsA1.filter((c) => c.name !== "Alpha topics") })), "visible breadcrumb");
  bad("json-ld-lacks-hub-nav-has-it", h4(a1, guideHtml(prod, a1, { ldCrumbs: crumbsA1.filter((c) => c.name !== "Alpha topics") })), "JSON-LD breadcrumb");
  bad("guide-in-hub-with-page-has-no-hub-crumb-anywhere", h4(a1, guideHtml(prod, a1, { navCrumbs: crumbsB1.slice(0, 2).concat(crumbsA1.slice(-1)), ldCrumbs: crumbsB1.slice(0, 2).concat(crumbsA1.slice(-1)) })), "expected");
  bad("order-differs", h4(a1, guideHtml(prod, a1, { ldCrumbs: [crumbsA1[0], crumbsA1[2], crumbsA1[1], crumbsA1[3]] })), "JSON-LD breadcrumb");
  bad("url-differs", h4(a1, guideHtml(prod, a1, { ldCrumbs: crumbsA1.map((c) => (c.name === "Alpha topics" ? { ...c, path: "/guides/topics/other" } : c)) })), "expected /guides/topics/alpha");
  bad("visible-link-differs", h4(a1, guideHtml(prod, a1).replace('<a href="/guides/topics/alpha">', '<a href="/guides/alpha">')), "links to /guides/alpha");
  bad("no-home-in-visible-nav", h4(a1, guideHtml(prod, a1, { navCrumbs: crumbsA1.slice(1) })), "visible breadcrumb");
  bad("guide-without-page-hub-shows-hub-crumb", h4(b1, guideHtml(prod, b1, { navCrumbs: crumbsA1.slice(0, 3).concat(crumbsB1.slice(-1)), ldCrumbs: crumbsA1.slice(0, 3).concat(crumbsB1.slice(-1)) })), "expected");
  bad("no-breadcrumb-nav", h4(a1, guideHtml(prod, a1).replace('aria-label="Breadcrumb"', 'aria-label="Other"')), "no nav");
  bad("json-ld-url-on-another-site", h4(a1, guideHtml(prod, a1).replace(`"item":"${SITE_URL}/guides/a1"`, '"item":"https://example.com/guides/a1"')), "not on");

  // ---------- H5.related-same-hub
  const h5 = (g, related, s = prod) => grab((add) => h5Line(add, { path: `/guides/${g.slug}`, html: guideHtml(s, g, related ? { related } : {}), guide: g, models: s.models, guides: s.guides }));
  const by = (...slugs) => slugs.map((x) => ALL.find((g) => g.slug === x));
  good("three-siblings-first", h5(a1, by("a2", "a3", "a4")));
  good("siblings-then-others", h5(b1, by("b2", "a1", "a2")));
  good("no-siblings-any-three-others", h5(prod.guides.find((g) => g.slug === "d1"), by("a1", "b1", "g1")));
  good("drafts-build-sibling-counts", h5(drafts.guides.find((g) => g.slug === "g1"), by("g2", "g3", "a1"), drafts));
  bad("other-hub-guide-first", h5(a1, by("b1", "a2", "a3")), "first 3 related guides must be hub siblings");
  bad("other-hub-guide-in-third-place", h5(a1, by("a2", "a3", "b1")), "first 3 related guides must be hub siblings");
  bad("sibling-not-first-when-one-exists", h5(b1, by("a1", "b2", "a2")), "first 1 related guides must be hub siblings");
  bad("section-missing", grab((add) => h5Line(add, { path: "/guides/a1", html: guideHtml(prod, a1).replace("guide-related", "other"), guide: a1, models: prod.models, guides: prod.guides })), "no related-guides section");
  bad("guide-lists-itself", h5(a1, by("a1", "a2", "a3")), "lists itself");
  bad("fewer-than-expected", h5(a1, by("a2", "a3")), "shows 2 related guides");
  bad("no-hub-data", grab((add) => h5Line(add, { path: "/g", html: page, guide: a1, models: null, guides: prod.guides })), "no hub data");

  // ---------- H4.breadcrumb-title (numbers as the browser measures them)
  const t4 = (crumb) => grab((add) => h4TitleLine(add, { path: "/guides/a1", vw: 375, crumb }));
  good("title-cut-but-readable", t4({ width: 180, full: 420 }));
  good("short-title-shown-whole", t4({ width: 64, full: 64 }));
  bad("title-squeezed-by-hub-name", t4({ width: 15.6, full: 420 }), "16px of the current item shown");
  bad("title-squeezed-to-nothing", t4({ width: 0, full: 420 }), "0px of the current item shown");
  bad("short-title-cut", t4({ width: 40, full: 64 }), "40px of the current item shown");
  bad("no-current-item", t4(null), "no current breadcrumb item");

  // ---------- H7.inbound-links (a guide page: body, then FAQ, then sources, then related cards, as on the real site)
  const gpage = ({ body = "", faq = "", related = "" } = {}) => shell("", `${crumbNav([{ name: "Home", path: "/" }, { name: "Guides", path: "/guides" }, { name: "x", path: "/x" }])}<h1>x</h1><article><div class="guide-prose"><p>Intro.</p><figure><div class="f">fig</div></figure><p>${body}</p></div><section id="faq" class="guide-faq-section"><p>${faq}</p></section><section id="sources"><ol><li><a href="https://example.org/s">S</a></li></ol></section></article><section class="guide-related">${related}</section>`);
  const h7 = (bodies, { slug = "a1", guides = prod.guides } = {}) => grab((add) => h7Line(add, { slug, guides, pages: new Map(Object.entries(bodies).map(([k, v]) => [`/guides/${k}`, v])) }));
  const plain = Object.fromEntries(ALL.map((g) => [g.slug, gpage()]));
  good("linked-from-another-body", h7({ ...plain, b1: gpage({ body: 'See <a href="/guides/a1">a1</a>.' }) }));
  good("absolute-link-with-fragment-counts", h7({ ...plain, d1: gpage({ body: `See <a href="${SITE_URL}/guides/a1#why">a1</a>.` }) }));
  good("link-after-a-figure-still-in-body", h7({ ...plain, a2: gpage({ body: '</p><div class="note"><p>x</p></div><p><a href="/guides/a1">a1</a>' }) }));
  bad("no-inbound-link", h7(plain), "no other published guide's body links here");
  bad("only-a-related-card-links-here", h7({ ...plain, b1: gpage({ related: '<a class="g-card" href="/guides/a1">a1</a>' }) }), "no other published guide's body links here");
  bad("only-the-faq-links-here", h7({ ...plain, b1: gpage({ faq: '<a href="/guides/a1">a1</a>' }) }), "no other published guide's body links here");
  bad("only-links-to-itself", h7({ ...plain, a1: gpage({ body: '<a href="/guides/a1#faq">top</a>' }) }), "no other published guide's body links here");
  bad("only-a-draft-links-here", h7({ ...plain, g3: gpage({ body: '<a href="/guides/a1">a1</a>' }) }, { guides: drafts.guides }), "no other published guide's body links here");
  bad("a-longer-slug-is-not-a-link-here", h7({ ...plain, b1: gpage({ body: '<a href="/guides/a10">a10</a> <a href="/guides/a1-more">x</a>' }) }), "no other published guide's body links here");
  bad("page-without-a-body-is-reported", h7({ ...plain, b2: shell("", "<h1>x</h1>") }), "no guide body found on: b2");

  // ---------- H6.internal-links (a local server answers 200 for the known paths, 404 for everything else)
  const server = createServer((req, res) => { res.writeHead(["/guides", "/guides/a1", "/guides/topics/alpha"].includes(req.url) ? 200 : 404); res.end("x"); });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const fetchStatus = async (p) => { try { const r = await fetch(base + p, { redirect: "manual" }); await r.arrayBuffer(); return r.status; } catch { return 0; } };
  const run6 = async (pages) => { const c = new Checks(); await h6Line((l) => c.add(l), { pages: new Map(Object.entries(pages)), fetchStatus }); return c.lines[0]; };
  try {
    good("all-links-resolve", await run6({ "/": '<a href="/guides">g</a><a href="/guides/a1">a</a>', "/guides": `<a href="${SITE_URL}/guides/topics/alpha">hub</a><a href="/privacy">not a guides link</a><a href="/guides/a1#faq">fragment</a><a href="/guides#alpha">section</a><a href="/guidesmith">not under /guides</a>` }));
    bad("broken-link-listed", await run6({ "/guides": '<a href="/guides/a1">ok</a>', "/guides/a1": '<a href="/guides/topics/gone">hub</a>' }), "/guides/topics/gone -> 404");
    bad("broken-link-in-absolute-form", await run6({ "/guides": `<a href="${SITE_URL}/guides/missing-guide">x</a>` }), "/guides/missing-guide -> 404");
    bad("every-broken-link-is-listed", await run6({ "/guides": '<a href="/guides/x1">1</a><a href="/guides/x2">2</a>' }), "/guides/x2 -> 404");
    bad("fragment-ignored-but-target-still-checked", await run6({ "/guides": '<a href="/guides/nope#section">x</a>' }), "/guides/nope -> 404");
    bad("unreachable-host-fails", await (async () => { const c = new Checks(); await h6Line((l) => c.add(l), { pages: new Map([["/guides", '<a href="/guides/a1">x</a>']]), fetchStatus: async () => 0 }); return c.lines[0]; })(), "-> 0");
  } finally {
    server.close();
  }
}
