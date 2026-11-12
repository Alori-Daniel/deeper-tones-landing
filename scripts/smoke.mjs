// Check that a deployed site really serves: the home page, the guides index, one guide, the sitemap and the IndexNow key.
// CI runs it right after each deploy; on production a failure rolls the deploy back.
//
//   node scripts/smoke.mjs                          # https://deepertones.com
//   node scripts/smoke.mjs https://pr-14-....dev    # a preview URL
//   add --expect-build <commit sha> to also require that /build.txt (written by CI before the build) is that commit,
//   so a check answered by the previous version still at an edge cannot pass
//
// Each check is tried up to 6 times, 10 s apart, because a new version can take a few seconds to reach every edge.

import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const argv = process.argv.slice(2);
const expectIdx = argv.indexOf("--expect-build");
const expectBuild = expectIdx >= 0 ? argv.splice(expectIdx, 2)[1] : null;
if (expectIdx >= 0 && !/^[0-9a-f]{7,40}$/.test(expectBuild ?? "")) {
  console.error(`[smoke] --expect-build needs a commit sha, got "${expectBuild}"`);
  process.exit(2);
}
const base = (argv[0] ?? "https://deepertones.com").replace(/\/$/, "");
const ATTEMPTS = 6;
const WAIT_MS = 10_000;

const publicDir = join(dirname(fileURLToPath(import.meta.url)), "../public");
const key = readdirSync(publicDir).find((f) => /^[0-9a-f]{32}\.txt$/.test(f))?.replace(/\.txt$/, "");

// The guide to open is the first one linked from /guides, so the check never names a guide that was renamed or removed.
// The asset is the first script the home page loads: HTML can answer 200 while the static assets are broken.
let guidePath = null;
let assetPath = null;

const checks = [
  ...(expectBuild ? [["the new version is serving", "/build.txt", (body) => body.trim() === expectBuild]] : []),
  ["home page", "/", (body) => {
    assetPath = body.match(/src="(\/_next\/static\/[^"]+\.js)"/)?.[1] ?? null;
    return body.includes("<title") && body.includes("Deeper Tones");
  }],
  ["a static asset", () => assetPath, (body) => body.length > 0],
  ["guides index", "/guides", (body) => {
    guidePath = body.match(/href="(\/guides\/[a-z0-9-]+)"/)?.[1] ?? null;
    return guidePath !== null;
  }],
  ["one guide", () => guidePath, (body) => /<h1[\s>]/.test(body) && body.includes("When to see a professional")],
  ["sitemap", "/sitemap.xml", (body) => body.includes("<urlset") && body.includes("/guides/")],
  ["IndexNow key", key ? `/${key}.txt` : null, (body) => body.trim() === key],
];

let failed = 0;
for (const [name, pathOrFn, ok] of checks) {
  const path = typeof pathOrFn === "function" ? pathOrFn() : pathOrFn;
  if (!path) {
    console.error(`[smoke] FAIL ${name}: nothing to check (no script on the home page, no guide link, or no key file in public/)`);
    failed++;
    continue;
  }
  let last = "";
  let passed = false;
  for (let i = 1; i <= ATTEMPTS && !passed; i++) {
    try {
      const res = await fetch(base + path, { redirect: "follow", headers: { "cache-control": "no-cache" } });
      const body = await res.text();
      passed = res.ok && ok(body);
      last = `${res.status}${res.ok ? ", unexpected content" : ""}`;
    } catch (e) {
      last = e.message;
    }
    if (!passed && i < ATTEMPTS) await new Promise((r) => setTimeout(r, WAIT_MS));
  }
  console.log(`[smoke] ${passed ? "ok  " : "FAIL"} ${name}: ${base}${path}${passed ? "" : ` (${last})`}`);
  if (!passed) failed++;
}

if (failed) {
  console.error(`[smoke] ${failed} check(s) failed on ${base}`);
  process.exit(1);
}
console.log(`[smoke] all ${checks.length} checks passed on ${base}`);
