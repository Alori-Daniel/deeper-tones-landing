// In-page evaluators. Every export is a self-contained function run inside the browser through page.evaluate,
// so nothing here may close over module scope. Selectors are generic (h1, p, figure, img, main) on purpose:
// builders change the markup and class names, the checker must keep working.

// ---------- typography (C1) ----------
export function evalTypography() {
  const vis = (el) => el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true });
  const norm = (s) => s.replace(/\s+/g, " ").trim();
  const skipTags = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "SVG", "svg"]);
  const main = document.querySelector("main") || document.body;
  // "Body text" = reading text in <main>: not navigation (card links on the index included), figures, header/footer, sources, credits, captions, meta lines.
  const quiet = "figure, nav, header, footer, summary, [id*=source i], [class*=source i], [class*=credit i], [class*=caption i], [class*=meta i], [class*=disclaimer i], [class*=breadcrumb i], a[class*=card i]";
  const textNodes = [];
  const tw = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
  for (let n = tw.nextNode(); n; n = tw.nextNode()) {
    const t = norm(n.nodeValue);
    if (!t) continue;
    const el = n.parentElement;
    if (!el || skipTags.has(el.tagName) || el.closest("svg, script, style, noscript, template") || !vis(el)) continue;
    textNodes.push({ n, el, len: t.length });
  }
  const isHeading = (el) => !!el.closest("h1,h2,h3,h4,h5,h6,[role=heading]");
  const bodyNodes = textNodes.filter((t) => !t.el.closest(quiet) && !isHeading(t.el));
  const bySize = new Map();
  for (const t of bodyNodes) {
    const px = Math.round(parseFloat(getComputedStyle(t.el).fontSize) * 100) / 100;
    bySize.set(px, (bySize.get(px) || 0) + t.len);
  }
  let bodySize = null, best = -1;
  for (const [px, w] of bySize) if (w > best) { best = w; bodySize = px; }
  const sizeHistogram = [...bySize.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([px, chars]) => ({ px, chars }));

  // line-height ratio of every paragraph/list item in the body-size group
  const group = [...new Set(bodyNodes.filter((t) => Math.round(parseFloat(getComputedStyle(t.el).fontSize) * 100) / 100 === bodySize).map((t) => t.el.closest("p, li, dd, blockquote") || t.el))];
  let minRatio = Infinity, worstLh = null;
  for (const el of group) {
    const cs = getComputedStyle(el);
    const fs = parseFloat(cs.fontSize);
    const lh = cs.lineHeight === "normal" ? 1.2 * fs : parseFloat(cs.lineHeight);
    const r = lh / fs;
    if (r < minRatio) { minRatio = r; worstLh = norm(el.textContent).slice(0, 50); }
  }

  // measure: characters per full line, median per paragraph then median overall
  const medians = [];
  for (const p of group.filter((e) => e.tagName === "P" && norm(e.textContent).length > 150)) {
    const lines = new Map();
    const w = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      const re = /\S+/g;
      let m;
      while ((m = re.exec(n.nodeValue))) {
        const r = document.createRange();
        r.setStart(n, m.index);
        r.setEnd(n, m.index + m[0].length);
        const rect = r.getClientRects()[0];
        if (!rect) continue;
        const key = Math.round(rect.top / 4);
        const L = lines.get(key) || { words: 0, chars: 0 };
        L.words += 1;
        L.chars += m[0].length;
        lines.set(key, L);
      }
    }
    const ls = [...lines.entries()].sort((a, b) => a[0] - b[0]).map(([, L]) => L.chars + L.words - 1);
    if (ls.length >= 3) {
      const full = ls.slice(0, -1).sort((a, b) => a - b);
      medians.push(full[Math.floor(full.length / 2)]);
    }
  }
  medians.sort((a, b) => a - b);
  const measure = medians.length ? medians[Math.floor(medians.length / 2)] : null;

  // headings
  const heads = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].filter(vis).map((h) => ({ level: +h.tagName[1], text: norm(h.textContent).slice(0, 60) }));
  const h1Count = heads.filter((h) => h.level === 1).length;
  const jumps = [];
  let prev = 0;
  for (const h of heads) {
    if (prev === 0 ? h.level !== 1 : h.level > prev + 1) jumps.push(`${prev ? "h" + prev : "start"} -> h${h.level} "${h.text}"`);
    prev = h.level;
  }

  // italics
  const italics = [];
  for (const t of textNodes) {
    const st = getComputedStyle(t.el).fontStyle;
    if (st === "italic" || st.startsWith("oblique")) italics.push(`${t.el.tagName.toLowerCase()}: "${norm(t.n.nodeValue).slice(0, 40)}"`);
  }
  // also the header and footer outside <main>
  const outside = [...document.querySelectorAll("header, footer, nav")].flatMap((r) => [...r.querySelectorAll("*")]).filter((e) => !main.contains(e) && vis(e) && e.childNodes.length && [...e.childNodes].some((c) => c.nodeType === 3 && c.nodeValue.trim()));
  for (const el of outside) {
    const st = getComputedStyle(el).fontStyle;
    if (st === "italic" || st.startsWith("oblique")) italics.push(`${el.tagName.toLowerCase()}: "${norm(el.textContent).slice(0, 40)}"`);
  }

  // computed font families (first family) for headings and text
  const firstFamily = (el) => getComputedStyle(el).fontFamily.split(",")[0].trim().replace(/^["']|["']$/g, "");
  const headingFamilies = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].filter(vis).filter((h) => main.contains(h)).map((h) => ({ tag: h.tagName.toLowerCase(), text: norm(h.textContent).slice(0, 40), family: firstFamily(h) }));
  const textFamilies = new Map();
  for (const t of textNodes) {
    if (isHeading(t.el)) continue;
    const f = firstFamily(t.el);
    const e = textFamilies.get(f) || { family: f, chars: 0, example: norm(t.n.nodeValue).slice(0, 40) + " <" + t.el.tagName.toLowerCase() + ">" };
    e.chars += t.len;
    textFamilies.set(f, e);
  }
  const loadedFaces = [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family.replace(/["']/g, ""));

  return {
    bodySize, sizeHistogram, minLineHeightRatio: Number.isFinite(minRatio) ? minRatio : null, worstLineHeightText: worstLh,
    measure, measureParagraphs: medians.length, h1Count, headingCount: heads.length, jumps, italics: italics.slice(0, 12), italicCount: italics.length,
    headingFamilies, textFamilies: [...textFamilies.values()], loadedFaces,
  };
}

// ---------- layout (C3) ----------
export function evalLayout() {
  const vw = window.innerWidth;
  const vis = (el) => el.checkVisibility({ checkOpacity: false, checkVisibilityCSS: true });
  const de = document.documentElement;
  const scrollW = Math.max(de.scrollWidth, document.body ? document.body.scrollWidth : 0);
  const clipsX = (el) => {
    const o = getComputedStyle(el).overflowX;
    return o === "auto" || o === "scroll" || o === "hidden" || o === "clip";
  };
  const ownText = (el) => [...el.childNodes].some((c) => c.nodeType === 3 && c.nodeValue.trim());
  const desc = (el) => `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}${el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".") : ""}`;
  const offenders = [];
  const clipped = [];
  for (const el of document.querySelectorAll("body *")) {
    if (el.closest("svg") && el.tagName.toLowerCase() !== "svg") continue;
    if (!vis(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (ownText(el) && (r.right > vw + 1 || r.left < -1)) {
      let a = el.parentElement, contained = false;
      while (a && a !== document.body && a !== de) {
        if (clipsX(a)) {
          const ar = a.getBoundingClientRect();
          if (ar.right <= vw + 1 && ar.left >= -1) { contained = true; break; }
        }
        a = a.parentElement;
      }
      if (!contained) offenders.push(`${desc(el)} [${Math.round(r.left)}..${Math.round(r.right)}] "${el.textContent.trim().slice(0, 30)}"`);
    }
    const cs = getComputedStyle(el);
    const hides = (o) => o === "hidden" || o === "clip";
    if ((hides(cs.overflowX) || hides(cs.overflowY)) && el.clientWidth > 0 && el.clientHeight > 0 && el.textContent.trim()) {
      const clamp = cs.webkitLineClamp && cs.webkitLineClamp !== "none";
      const overX = hides(cs.overflowX) && el.scrollWidth > el.clientWidth + 1;
      const overY = hides(cs.overflowY) && el.scrollHeight > el.clientHeight + 1;
      // A single line cut with a visible ellipsis is deliberate truncation (the full text is the page's H1), not clipped text.
      const ellipsis = cs.textOverflow === "ellipsis" && !overY;
      if ((overX || overY) && !clamp && !ellipsis && !(r.width <= 1 && r.height <= 1)) clipped.push(`${desc(el)} ${el.scrollWidth}x${el.scrollHeight} in ${el.clientWidth}x${el.clientHeight} "${el.textContent.trim().slice(0, 30)}"`);
    }
  }
  const imgsNoDims = [...document.querySelectorAll("img")].filter((i) => {
    const w = parseFloat(i.getAttribute("width")), h = parseFloat(i.getAttribute("height"));
    return !(w > 0 && h > 0);
  }).map((i) => (i.getAttribute("src") || i.currentSrc || "").slice(0, 80));
  return {
    vw, scrollW, docOverflow: scrollW - vw, offenders: offenders.slice(0, 10), offenderCount: offenders.length,
    clipped: clipped.slice(0, 10), clippedCount: clipped.length, imgCount: document.images.length, imgsNoDims,
  };
}

// ---------- figures (B4, B5, C4 lazy) ----------
export function evalFigures() {
  const dpr = window.devicePixelRatio;
  const vh = window.innerHeight;
  const imgs = [...document.querySelectorAll("figure img, picture img")].filter((i) => i.closest("main") || !i.closest("header, footer"));
  const out = imgs.map((img) => {
    const r = img.getBoundingClientRect();
    const fig = img.closest("figure");
    const cap = fig && fig.querySelector("figcaption");
    const cs = cap ? getComputedStyle(cap) : null;
    // The frame the reader sees: the figure's direct child that holds the image (a plate around a photo), else the
    // image itself. B5 counts these boxes, not the raw <img>.
    let frameEl = img;
    while (fig && frameEl.parentElement && frameEl.parentElement !== fig) frameEl = frameEl.parentElement;
    const fr = frameEl.getBoundingClientRect();
    return {
      src: img.getAttribute("src"), currentSrc: img.currentSrc, srcset: img.getAttribute("srcset"), sizes: img.getAttribute("sizes"),
      inPicture: !!img.closest("picture"), pictureSrcset: img.closest("picture") ? [...img.closest("picture").querySelectorAll("source")].map((s) => s.getAttribute("srcset")).join(", ") : null,
      loading: img.getAttribute("loading"), widthAttr: img.getAttribute("width"), heightAttr: img.getAttribute("height"),
      naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight, complete: img.complete,
      cssWidth: r.width, cssHeight: r.height, ratio: r.height ? r.width / r.height : null, frameRatio: fr.height ? fr.width / fr.height : null, top: r.top + window.scrollY, dpr, vh,
      alt: img.getAttribute("alt"),
      caption: cap ? { text: cap.textContent.trim().slice(0, 80), fontSize: cs.fontSize, lineHeight: cs.lineHeight, color: cs.color, marginTop: cs.marginTop, fontFamily: cs.fontFamily.split(",")[0].trim(), textAlign: cs.textAlign, fontWeight: cs.fontWeight } : null,
    };
  });
  return out;
}

// ---------- contrast (C2) ----------
// Step 1: text runs with computed colour, size and the client rects of every line.
export function evalTextRuns() {
  const vis = (el) => el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true });
  const norm = (s) => s.replace(/\s+/g, " ").trim();
  const runs = [];
  const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const parse = (c) => {
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (m) { const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; }
    return null;
  };
  for (let n = tw.nextNode(); n; n = tw.nextNode()) {
    const t = norm(n.nodeValue);
    if (!t) continue;
    const el = n.parentElement;
    if (!el || el.closest("script, style, noscript, template, svg") || !vis(el)) continue;
    const cs = getComputedStyle(el);
    // inherited opacity chain
    let op = 1;
    for (let a = el; a; a = a.parentElement) op *= parseFloat(getComputedStyle(a).opacity);
    const rgba = parse(cs.color) || [0, 0, 0, 1];
    rgba[3] *= op;
    if (rgba[3] <= 0.02) continue;
    const range = document.createRange();
    range.selectNodeContents(n);
    const rects = [...range.getClientRects()].filter((r) => r.width >= 2 && r.height >= 2).map((r) => ({ x: r.left + window.scrollX, y: r.top + window.scrollY, w: r.width, h: r.height }));
    if (!rects.length) continue;
    runs.push({
      sel: `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}${typeof el.className === "string" && el.className ? "." + el.className.trim().split(/\s+/)[0] : ""}`,
      text: t.slice(0, 40), color: rgba, size: parseFloat(cs.fontSize), weight: parseInt(cs.fontWeight) || 400, rects,
    });
  }
  return { runs, pageW: document.documentElement.scrollWidth, pageH: document.documentElement.scrollHeight };
}

export const HIDE_TEXT_CSS =
  "*,*::before,*::after,*::marker,*::placeholder{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important;text-decoration-color:transparent!important;-webkit-text-stroke:0!important;caret-color:transparent!important}";

// ---------- misc ----------
export function evalMeta() {
  const get = (sel, attr) => document.querySelector(sel)?.getAttribute(attr) ?? null;
  return {
    canonical: get('link[rel="canonical"]', "href"), ogImage: get('meta[property="og:image"]', "content"), twitterImage: get('meta[name="twitter:image"]', "content"),
    title: document.title,
  };
}

// Plain text of the page's main content for content review: every <details> opened, images as [Figure: alt] lines.
export function evalPlainText() {
  document.querySelectorAll("details").forEach((d) => (d.open = true));
  const main = (document.querySelector("main") || document.body).cloneNode(true);
  main.querySelectorAll("script, style, noscript, svg").forEach((e) => e.remove());
  main.querySelectorAll("img").forEach((img) => img.replaceWith(document.createTextNode(`\n[Figure image] ${img.getAttribute("alt") || ""}\n`)));
  const host = document.createElement("div");
  host.style.cssText = "position:absolute;left:-99999px;top:0;width:900px";
  host.appendChild(main);
  document.body.appendChild(host);
  const text = host.innerText;
  host.remove();
  return text.replace(/\n{3,}/g, "\n\n").trim();
}
