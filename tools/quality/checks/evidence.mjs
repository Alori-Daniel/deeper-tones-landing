// Figure evidence: every WebP at 340 px and at full size as PNG, plus labelled contact sheets.
import { mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

export async function figureEvidence({ frozen, guides, outDir, browser }) {
  const figDir = join(outDir, "figures");
  mkdirSync(figDir, { recursive: true });
  const items = [];
  for (const g of guides) for (const f of g.figures) {
    const webp = join(frozen, "public/guides", g.slug, `${f.id}.webp`);
    if (!existsSync(webp)) continue;
    const meta = await sharp(webp).metadata();
    const small = await sharp(webp).resize({ width: 340 }).png().toBuffer();
    const full = await sharp(webp).png().toBuffer();
    await sharp(small).toFile(join(figDir, `${g.slug}__${f.id}__340.png`));
    await sharp(full).toFile(join(figDir, `${g.slug}__${f.id}__full.png`));
    items.push({ slug: g.slug, id: f.id, kind: f.kind, w: meta.width, h: meta.height, small: small.toString("base64"), full });
  }
  const sheet = async (name, cols, tileW, pick, title) => {
    const tiles = [];
    for (const it of items) {
      const buf = pick(it);
      const b64 = Buffer.isBuffer(buf) ? buf.toString("base64") : buf;
      tiles.push(`<figure><img src="data:image/png;base64,${b64}"><figcaption><b>${esc(it.slug)}</b><br>${esc(it.id)} (${it.kind}), file ${it.w} x ${it.h}</figcaption></figure>`);
    }
    const html = `<html><body style="margin:0;background:#fff;font:13px/1.35 -apple-system,Helvetica,Arial,sans-serif;color:#222">
      <h1 style="margin:16px 20px 4px;font-size:18px">${esc(title)}</h1>
      <div style="display:grid;grid-template-columns:repeat(${cols},${tileW}px);gap:22px;padding:16px 20px 28px">${tiles.join("")}</div>
      <style>figure{margin:0}img{display:block;width:${tileW}px;height:auto;outline:1px solid #ddd}figcaption{margin-top:6px}</style></body></html>`;
    const ctx = await browser.newContext({ viewport: { width: cols * tileW + (cols - 1) * 22 + 40, height: 800 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.setContent(html, { waitUntil: "load" });
    await page.screenshot({ path: join(outDir, name), fullPage: true });
    await ctx.close();
  };
  if (items.length) {
    await sheet("figures-contact-sheet.png", 4, 340, (it) => it.small, "Every figure at phone width (340 px), as served");
    await sheet("figures-contact-sheet-full.png", 2, 800, (it) => it.full, "Every figure at full size (scaled to 800 px wide when larger)");
  }
  return items.length;
}
