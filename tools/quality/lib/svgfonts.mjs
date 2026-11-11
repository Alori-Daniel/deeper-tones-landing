// Static analysis of an SVG's font declarations (B2). No XML library: a small tag tokenizer is enough.

const ALLOWED_FIRST = [/^archivo$/i, /^source serif( 4)?$/i];
const ALLOWED_ANY = [...ALLOWED_FIRST, /^(sans-serif|serif)$/i];

export function splitStack(value) {
  const names = [];
  let cur = "", q = null;
  for (const ch of value) {
    if (q) { if (ch === q) q = null; else cur += ch; }
    else if (ch === '"' || ch === "'") q = ch;
    else if (ch === ",") { names.push(cur.trim()); cur = ""; }
    else cur += ch;
  }
  if (cur.trim()) names.push(cur.trim());
  return names.filter(Boolean);
}

export function stackProblems(names) {
  const p = [];
  if (!names.length) return ["empty font-family"];
  if (!ALLOWED_FIRST.some((r) => r.test(names[0]))) p.push(`first family is "${names[0]}", not Archivo or Source Serif 4`);
  for (const n of names) if (!ALLOWED_ANY.some((r) => r.test(n))) p.push(`"${n}" is not a brand font (Helvetica, Arial and system fonts are not allowed)`);
  return [...new Set(p)];
}

// Returns { textCount, stacks: string[][], problems: string[], fontFaces }
export function analyzeSvgFonts(svg) {
  const problems = [];
  const stacks = [];
  const css = [...svg.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join("\n");
  const fontFaces = (css.match(/@font-face/g) || []).length;
  const cssNoFace = css.replace(/@font-face\s*{[^}]*}/g, "");
  for (const m of cssNoFace.matchAll(/font-family\s*:\s*([^;}]+)/gi)) stacks.push(splitStack(m[1]));
  const cssDeclares = stacks.length > 0;

  // walk tags to resolve the family each <text> inherits from attributes / style attributes of its ancestors
  const stack = [];
  let textCount = 0, unresolved = 0;
  const famOf = (attrs) => {
    const a = /font-family\s*=\s*"([^"]*)"/i.exec(attrs) || /font-family\s*=\s*'([^']*)'/i.exec(attrs);
    if (a) return splitStack(a[1]);
    const s = /style\s*=\s*"([^"]*)"/i.exec(attrs);
    if (s) { const m = /font-family\s*:\s*([^;]+)/i.exec(s[1]); if (m) return splitStack(m[1]); }
    return null;
  };
  for (const m of svg.matchAll(/<\/?([a-zA-Z][\w:.-]*)([^>]*?)(\/?)>/g)) {
    const closing = m[0].startsWith("</");
    const name = m[1].toLowerCase();
    const selfClose = m[3] === "/";
    if (closing) { stack.pop(); continue; }
    const fam = famOf(m[2]);
    if (fam) stacks.push(fam);
    if (name === "text") {
      textCount++;
      const eff = fam || [...stack].reverse().map((s) => s.fam).find(Boolean);
      if (!eff && !cssDeclares) unresolved++;
    }
    if (!selfClose) stack.push({ name, fam });
  }
  if (textCount > 0 && stacks.length === 0) problems.push(`${textCount} <text> elements declare no font-family, so they use the renderer's default font`);
  else if (unresolved > 0) problems.push(`${unresolved} of ${textCount} <text> elements inherit no declared font-family`);
  const seen = new Set();
  for (const s of stacks) {
    const key = s.join(",");
    if (seen.has(key)) continue;
    seen.add(key);
    for (const pr of stackProblems(s)) problems.push(`font-family "${s.join(", ")}": ${pr}`);
  }
  return { textCount, stacks, problems, fontFaces };
}

// Rewrites every font-family declaration to a family that does not exist (for the pipeline mutation test).
// @font-face blocks are left alone, so an embedded font still resolves under its own name and only the usages change.
export function mutateFamilies(svg) {
  const faces = [];
  const stripped = svg.replace(/@font-face\s*{[^}]*}/g, (m) => {
    faces.push(m);
    return `@@FONTFACE${faces.length - 1}@@`;
  });
  return stripped
    .replace(/font-family\s*=\s*"[^"]*"/gi, 'font-family="Zz Nonexistent Font"')
    .replace(/font-family\s*=\s*'[^']*'/gi, 'font-family="Zz Nonexistent Font"')
    .replace(/(font-family\s*:\s*)([^;}"]+)/gi, "$1Zz Nonexistent Font")
    .replace(/@@FONTFACE(\d+)@@/g, (_, i) => faces[+i]);
}
