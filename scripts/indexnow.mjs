// Tell IndexNow search engines (Bing, Yandex, Seznam, Naver; Bing's index also feeds ChatGPT and Copilot search) which
// pages changed, so they recrawl within minutes instead of days.
//
// Run after a production deploy, never after a preview deploy:
//   node scripts/indexnow.mjs                    # pages whose sitemap <lastmod> is today or yesterday
//   node scripts/indexnow.mjs --since 2026-11-01 # pages changed on or after a date
//   node scripts/indexnow.mjs --all              # every page in the sitemap
//   add --dry-run to print the list without sending it
//
// The key is public by design: the file public/<key>.txt proves to the search engines that we own the host.

import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SITE = "https://deepertones.com";
const ENDPOINT = "https://api.indexnow.org/indexnow";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const all = args.includes("--all");
const sinceIdx = args.indexOf("--since");
const since = sinceIdx >= 0 ? args[sinceIdx + 1] : isoDaysAgo(1);
if (!/^\d{4}-\d{2}-\d{2}$/.test(since ?? "")) fail(`--since needs a date like 2026-11-01, got "${since}"`);

const publicDir = join(dirname(fileURLToPath(import.meta.url)), "../public");
const keyFiles = readdirSync(publicDir).filter((f) => /^[0-9a-f]{32}\.txt$/.test(f));
if (keyFiles.length !== 1) fail(`expected exactly one IndexNow key file (public/<32 hex>.txt), found ${keyFiles.length}`);
const key = keyFiles[0].replace(/\.txt$/, "");

// The key file must be live, or the search engines reject the submission.
const keyRes = await fetch(`${SITE}/${key}.txt`);
if (!keyRes.ok || (await keyRes.text()).trim() !== key) fail(`${SITE}/${key}.txt is not live yet; deploy first`);

const sitemap = await fetch(`${SITE}/sitemap.xml`).then((r) => {
  if (!r.ok) fail(`sitemap returned ${r.status}`);
  return r.text();
});
const entries = [...sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(([, block]) => ({
  loc: block.match(/<loc>(.*?)<\/loc>/)?.[1],
  lastmod: block.match(/<lastmod>(.*?)<\/lastmod>/)?.[1]?.slice(0, 10) ?? "",
}));
const urlList = entries.filter((e) => e.loc && (all || e.lastmod >= since)).map((e) => e.loc);

if (urlList.length === 0) {
  console.log(`[indexnow] nothing changed since ${since}; nothing sent`);
  process.exit(0);
}
console.log(`[indexnow] ${urlList.length} URL(s)${all ? "" : ` changed since ${since}`}:\n  ${urlList.join("\n  ")}`);
if (dryRun) process.exit(0);

const res = await fetch(ENDPOINT, {
  method: "POST",
  headers: { "content-type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host: new URL(SITE).host, key, keyLocation: `${SITE}/${key}.txt`, urlList }),
});
// 200 = received, 202 = received and the key is still being checked. Anything else is an error.
if (res.status !== 200 && res.status !== 202) fail(`IndexNow returned ${res.status}: ${await res.text()}`);
console.log(`[indexnow] sent (${res.status})`);

function isoDaysAgo(days) {
  return new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
}

function fail(message) {
  console.error(`[indexnow] ${message}`);
  process.exit(1);
}
