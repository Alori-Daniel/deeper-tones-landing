// Snapshots the checker compares against: study-photo credits (from git HEAD frontmatter) and canonicals.
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { parse as parseYaml } from "yaml";

const dir = (root) => join(root, "tools/quality/fixtures");
const read = (root, name) => {
  const p = join(dir(root), name);
  return existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : null;
};

export function loadFixtures(root) {
  return { studyPhotos: read(root, "study-photo-credits.json"), canonicals: read(root, "canonicals.json") };
}

// Study-photo entries as committed at HEAD (the pristine state the rule says must stay unchanged).
export function studyPhotosFromHead(root) {
  const files = execFileSync("git", ["ls-tree", "--name-only", "HEAD", "content/guides/"], { cwd: root, encoding: "utf8" })
    .split("\n").filter((f) => f.endsWith(".md") && !/\/_/.test(f));
  const out = [];
  for (const f of files) {
    const raw = execFileSync("git", ["show", `HEAD:${f}`], { cwd: root, encoding: "utf8" });
    const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(raw);
    const fm = parseYaml(m[1]);
    if (fm.draft === true) continue;
    for (const fig of fm.figures || []) {
      if (fig.kind !== "study-photo") continue;
      out.push({ slug: fm.slug, id: fig.id, credit: String(fig.credit).trim(), license: fig.license, sourceUrl: fig.sourceUrl, licenseUrl: fig.licenseUrl, changes: fig.changes ? String(fig.changes).trim() : null });
    }
  }
  return out;
}

export function writeFixtures(root, { studyPhotos, canonicals }) {
  mkdirSync(dir(root), { recursive: true });
  if (studyPhotos) writeFileSync(join(dir(root), "study-photo-credits.json"), JSON.stringify(studyPhotos, null, 2) + "\n");
  if (canonicals) writeFileSync(join(dir(root), "canonicals.json"), JSON.stringify(canonicals, null, 2) + "\n");
}
