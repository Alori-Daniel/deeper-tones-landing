// npm run quality -- --out <dir>
// Freezes a copy of the worktree, builds and previews it there, runs every automated line of quality/ACCEPTANCE.md
// (A, B2, B4, B5, C1-C4) and writes checks.json plus evidence. With --include-drafts it also gates a wave of draft
// guides (quality/ACCEPTANCE-WAVE.md section W-A: WA1-WA5). See tools/quality/README.md.
import { mkdirSync, rmSync, writeFileSync, createWriteStream, existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { Checks, fmtMs, launchChromium, run } from "./lib/util.mjs";
import { freeze } from "./lib/freeze.mjs";
import { startPreview, stopPreview } from "./lib/server.mjs";
import { loadCompiledGuides, pageList } from "./lib/pages.mjs";
import { loadFixtures, studyPhotosFromHead, writeFixtures } from "./lib/fixtures.mjs";
import { newPageIn, loadLikeAReader, measure, captureChunks, saveStitched, contrastScan, evalPlainText } from "./lib/browser.mjs";
import { contractChecks } from "./checks/contract.mjs";
import { loaderCheck, mutationCheck, sourceFamilyChecks, widthChecks } from "./checks/figures-static.mjs";
import { clsLine, contrastLine, figureServedLines, frameLines, lazyAndFirstImageLines, layoutLines, platformFontLines, typographyLines } from "./checks/page-lines.mjs";
import { lighthouseChecks } from "./checks/lighthouse.mjs";
import { figureEvidence } from "./checks/evidence.mjs";
import { runSelfTest } from "./selftest/selftest.mjs";
import { makeUrlChecker, selectWaveSlugs, waBuildLines, waBuiltLine, waLinkLines, waSourceLines } from "./checks/wave.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

function parseArgs(argv) {
  const a = { out: null, skipSelftest: false, selftestOnly: false, skipLighthouse: false, skipA1: false, reuse: null, keep: false, updateFixtures: false, limit: 0, concurrency: 4, skipMutation: false, includeDrafts: false, only: null };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === "--out") a.out = argv[++i];
    else if (k === "--self-test") a.selftestOnly = true;
    else if (k === "--skip-self-test") a.skipSelftest = true;
    else if (k === "--skip-lighthouse") a.skipLighthouse = true;
    else if (k === "--skip-a1") a.skipA1 = true;
    else if (k === "--skip-mutation") a.skipMutation = true;
    else if (k === "--reuse-frozen") a.reuse = resolve(argv[++i]);
    else if (k === "--keep") a.keep = true;
    else if (k === "--update-fixtures") a.updateFixtures = true;
    else if (k === "--limit") a.limit = +argv[++i];
    else if (k === "--concurrency") a.concurrency = +argv[++i];
    else if (k === "--include-drafts") a.includeDrafts = true;
    else if (k === "--only") {
      const v = argv[++i];
      a.only = (v ?? "").split(",").map((x) => x.trim()).filter(Boolean);
      if (!a.only.length || !a.only.every((x) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(x))) { console.error("--only needs guide slugs separated by commas, for example --only melasma-on-dark-skin,harmattan-skincare"); process.exit(2); }
    }
    else if (k === "--help" || k === "-h") { console.log("usage: npm run quality -- --out <dir> [--self-test] [--include-drafts] [--only <slug,slug>] [--skip-lighthouse] [--update-fixtures] [--keep] [--reuse-frozen <dir>] [--limit n]"); process.exit(0); }
    else { console.error(`unknown option ${k}`); process.exit(2); }
  }
  return a;
}

async function pool(items, n, fn) {
  const queue = [...items];
  const workers = Array.from({ length: Math.min(n, queue.length) }, async () => { while (queue.length) await fn(queue.shift()); });
  await Promise.all(workers);
}

const readOrNull = (p) => (existsSync(p) ? readFileSync(p, "utf8") : null);
const args = parseArgs(process.argv.slice(2));
const t0 = Date.now();
const stage = (m) => console.error(`[quality ${fmtMs(Date.now() - t0)}] ${m}`);
const checks = new Checks();
const timings = {};

if (!args.out && !args.selftestOnly) { console.error("missing --out <dir>"); process.exit(2); }
const outDir = args.out ? resolve(args.out) : null;
if (outDir) {
  mkdirSync(outDir, { recursive: true });
  for (const d of ["pages", "text", "figures", "logs"]) mkdirSync(join(outDir, d), { recursive: true });
}

let frozen = null, preview = null, browser = null;
const cleanup = async () => {
  try { stopPreview(preview); } catch {}
  try { await browser?.close(); } catch {}
  if (frozen && !args.keep && !args.reuse) try { rmSync(frozen, { recursive: true, force: true }); } catch {}
};
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, async () => { await cleanup(); process.exit(130); });
process.on("uncaughtException", async (e) => { console.error(e); await cleanup(); process.exit(1); });

try {
  browser = await launchChromium(chromium);

  // ---------- self-test: the checks must be able to fail ----------
  if (!args.skipSelftest || args.selftestOnly) {
    stage("self-test on synthetic pages");
    const st = new Checks();
    await runSelfTest(browser, st);
    checks.addAll(st.lines);
    const bad = st.lines.filter((l) => l.status === "FAIL");
    stage(`self-test: ${st.lines.length - bad.length}/${st.lines.length} behave as expected`);
    if (args.selftestOnly) {
      for (const l of st.lines) console.log(`${l.status}  ${l.id}  ${l.target}  ${l.measured}`);
      await cleanup();
      process.exit(bad.length ? 1 : 0);
    }
    if (bad.length) console.error("[quality] WARNING: the self-test failed, so the checker itself is broken:\n" + bad.map((b) => `  ${b.id} ${b.target}: ${b.measured}`).join("\n"));
  }

  // ---------- fixtures ----------
  if (args.updateFixtures) {
    writeFixtures(repoRoot, { studyPhotos: studyPhotosFromHead(repoRoot) });
    stage("wrote tools/quality/fixtures/study-photo-credits.json from git HEAD");
  }
  const fixtures = loadFixtures(repoRoot);

  // ---------- frozen copy, A1 ----------
  if (args.reuse) frozen = args.reuse;
  else {
    stage("freezing a copy of the worktree");
    frozen = await freeze(repoRoot);
  }
  stage(`frozen copy: ${frozen}`);
  const logs = (n) => createWriteStream(join(outDir, "logs", `${n}.log`));
  // --include-drafts: lint, typecheck and build all regenerate src/content/guides.generated.ts (prelint, pretypecheck,
  // prebuild), so all three get the draft switches; the build then includes drafts and a malformed inShort fails it.
  const draftEnv = args.includeDrafts ? { GUIDES_SHOW_DRAFTS: "1", GUIDES_REQUIRE_INSHORT: "1" } : {};
  const draftEnvLabel = args.includeDrafts ? "GUIDES_SHOW_DRAFTS=1 GUIDES_REQUIRE_INSHORT=1" : "";
  const stepsFile = join(frozen, ".quality-steps.json"); // lets --reuse-frozen judge WA1 from the run that built the copy
  const stepResults = {};
  let stepOut = "";
  let buildFailed = false;
  const guideFiles = existsSync(join(frozen, "content/guides")) ? readdirSync(join(frozen, "content/guides")).filter((f) => f.endsWith(".md")) : [];
  // The live set is every guide marked `draft: false` (scratch files starting with "_" never build without drafts).
  // With drafts shown, the build holds every file in content/guides (live + drafts).
  const liveGuides = guideFiles.filter((f) => !f.startsWith("_") && /^draft:\s*false\s*$/m.test(readFileSync(join(frozen, "content/guides", f), "utf8")));
  const expectedGuides = args.includeDrafts ? guideFiles.length : liveGuides.length;
  const waveSlugs = args.includeDrafts ? selectWaveSlugs(join(frozen, "content/guides"), args.only) : [];
  if (!args.reuse) {
    const steps = [["lint", ["npm", "run", "lint"]], ["typecheck", ["npm", "run", "typecheck"]], ["build", ["npx", "opennextjs-cloudflare", "build"]]];
    // W-A static lines come from the .md files alone, so they are recorded even when the build below fails.
    for (const slug of waveSlugs) waSourceLines((l) => checks.add(l), { slug, raw: readOrNull(join(frozen, "content/guides", `${slug}.md`)) });
    for (const [name, cmd] of steps) {
      if (args.skipA1 && name !== "build") continue;
      stage(`A1: ${draftEnvLabel} ${cmd.join(" ")}`.replace("  ", " "));
      const l = logs(name);
      const r = await run(cmd[0], cmd.slice(1), { cwd: frozen, log: l, env: draftEnv });
      l.end();
      timings[name] = r.ms;
      stepResults[name] = { code: r.code };
      stepOut += r.out + "\n";
      checks.add({ id: `A1.${name}`, target: cmd.join(" "), measured: `exit ${r.code} in ${fmtMs(r.ms)}`, threshold: "exit 0", pass: r.code === 0, details: r.code === 0 ? undefined : r.out.slice(-800) });
      if (name === "build") {
        const m = /\[guides\] (\d+) guides? built/.exec(r.out);
        checks.add({ id: "A1.guides-built", target: "build output", measured: m ? `${m[1]} guides built` : "no '[guides] N guides built' line", threshold: `${expectedGuides} guides built${args.includeDrafts ? " (every file in content/guides, drafts shown)" : ""}`, pass: !!m && +m[1] === expectedGuides });
        if (r.code !== 0) buildFailed = true;
      }
      if (r.code !== 0 && name !== "build" && args.includeDrafts) stage(`A1: ${name} failed; continuing so every wave line is recorded`);
    }
    writeFileSync(stepsFile, JSON.stringify({ steps: stepResults, out: stepOut }));
    if (args.includeDrafts) {
      waBuildLines((l) => checks.add(l), { slugs: waveSlugs, steps: stepResults, out: stepOut, env: draftEnvLabel });
    }
    if (buildFailed) throw new Error("the build failed; nothing to preview. See logs/build.log");
  } else if (args.includeDrafts) {
    for (const slug of waveSlugs) waSourceLines((l) => checks.add(l), { slug, raw: readOrNull(join(frozen, "content/guides", `${slug}.md`)) });
    const saved = existsSync(stepsFile) ? JSON.parse(readFileSync(stepsFile, "utf8")) : null;
    waBuildLines((l) => checks.add(l), { slugs: waveSlugs, steps: saved?.steps, out: saved?.out ?? null, env: draftEnvLabel });
  }
  if (!existsSync(join(frozen, ".open-next/worker.js"))) throw new Error("no .open-next build in the frozen copy");

  const guides = loadCompiledGuides(frozen);
  const pages = pageList(guides);
  // --only keeps the per-guide lines to the named guides (site-wide lines still run); --limit then takes the first n of those.
  const selected = args.only ? guides.filter((g) => args.only.includes(g.slug)) : guides;
  const useGuides = args.limit ? selected.slice(0, args.limit) : selected;
  if (args.includeDrafts) for (const slug of waveSlugs) waBuiltLine((l) => checks.add(l), { slug, built: guides.some((g) => g.slug === slug), includeDrafts: true });
  else if (args.only) for (const slug of args.only) if (!guides.some((g) => g.slug === slug)) waBuiltLine((l) => checks.add(l), { slug, built: false, includeDrafts: false });
  if (args.only && useGuides.length === 0) throw new Error(`none of the --only guides is in the build (${args.only.join(", ")}); see the WA1.guide-built lines`);

  stage("starting preview");
  preview = await startPreview(frozen, join(outDir, "logs", "preview.log"));
  const base = preview.base;
  stage(`preview at ${base}`);

  // ---------- static + HTTP lines ----------
  const htmlStore = new Map();
  const info = await contractChecks(checks, { base, frozen, guides: useGuides, allGuides: guides, fixtures, htmlStore });
  if (args.updateFixtures) writeFixtures(repoRoot, { canonicals: info.canonicals });
  stage("B2/B4 static checks on the figure sources and WebP files");
  loaderCheck(checks, frozen);
  sourceFamilyChecks(checks, frozen, useGuides);
  await widthChecks(checks, frozen, useGuides);
  if (!args.skipMutation) await mutationCheck(checks, frozen, useGuides, draftEnv);

  // ---------- browser lines ----------
  const VPS = [375, 768, 1280];
  const figsAll = { 375: [], 1280: [] };
  const textByGuide = new Map();
  const jobs = [];
  for (const p of pages.filter((p) => p.kind !== "guide" || useGuides.some((g) => g.slug === p.slug))) for (const vw of VPS) jobs.push({ kind: "full", p, vw });
  for (const g of useGuides) for (const vw of [375, 1280]) jobs.push({ kind: "figures", p: pages.find((p) => p.slug === g.slug), vw, g });
  const add = (l) => checks.add(l);
  const at = (path, vw) => `${path} @${vw}`;
  let done = 0;
  stage(`measuring ${jobs.length} page loads in the browser`);
  await pool(jobs, args.concurrency, async (job) => {
    const { p, vw } = job;
    const dpr = job.kind === "figures" ? 2 : 1;
    const { context, page } = await newPageIn(browser, vw, dpr, vw <= 400 ? 812 : 900);
    try {
      const status = await loadLikeAReader(page, base + p.path);
      if (status !== 200) add({ id: "C3.page-loads", target: at(p.path, vw), measured: `status ${status}`, threshold: "200", pass: false });
      if (job.kind === "figures") {
        const m = await measure(page);
        figureServedLines(add, p.path, vw, dpr, m.figures, job.g.figures);
        if (vw === 375) lazyAndFirstImageLines(add, p.path, vw, dpr, m.figures, m.figures[0] || null);
        figsAll[vw].push(...m.figures);
        return;
      }
      const isReading = p.kind === "guide" || p.kind === "index";
      const m = await measure(page, { withFonts: isReading && vw === 1280 });
      if (isReading) {
        typographyLines(add, p.path, vw, m.typo, { measureLine: p.kind === "guide" });
        layoutLines(add, p.path, vw, m.layout);
        clsLine(add, p.path, vw, m.cls);
        if (vw === 1280) platformFontLines(add, p.path, vw, m.platform);
        const cap = await captureChunks(page);
        await saveStitched(cap, join(outDir, "pages", `${p.slug}-${vw}.png`));
        if (vw === 1280 && p.kind === "guide") textByGuide.set(p.slug, await page.evaluate(evalPlainText));
        if (vw !== 768) { const c = await contrastScan(page); contrastLine(add, p.path, vw, c); }
      } else {
        layoutLines(add, p.path, vw, m.layout, { idPrefix: "A3" });
        add({ id: "C1.no-italics", target: at(p.path, vw), measured: m.typo.italicCount ? `${m.typo.italicCount} italic elements` : "none", threshold: "none", pass: m.typo.italicCount === 0, details: m.typo.italics });
      }
    } catch (e) {
      add({ id: "C3.page-measured", target: at(p.path, vw), measured: `error: ${String(e.message).slice(0, 200)}`, threshold: "page measured", pass: false });
    } finally {
      await context.close();
      done++;
      if (done % 10 === 0) stage(`  ${done}/${jobs.length} page loads done`);
    }
  });
  frameLines(add, 375, figsAll[375]);
  frameLines(add, 1280, figsAll[1280]);

  for (const [slug, text] of textByGuide) writeFileSync(join(outDir, "text", `${slug}.txt`), text + "\n");

  // ---------- WA4: links (internal on the preview, every source URL) ----------
  if (args.includeDrafts) {
    stage(`WA4: internal links and source URLs of ${waveSlugs.length} guide(s)`);
    const checkUrl = makeUrlChecker();
    const internalStatus = async (u) => { try { const r = await fetch(u, { redirect: "manual", signal: AbortSignal.timeout(30000) }); await r.arrayBuffer(); return r.status; } catch { return 0; } };
    for (const slug of waveSlugs) await waLinkLines((l) => checks.add(l), { slug, raw: readOrNull(join(frozen, "content/guides", `${slug}.md`)), base, checkUrl, internalStatus });
  }

  // ---------- Lighthouse ----------
  if (!args.skipLighthouse) {
    stage("Lighthouse (mobile) on two guides");
    const slugs = args.only ? useGuides.slice(0, 2).map((g) => g.slug) : ["check-cream-steroids-mercury-hydroquinone", "sunscreen-for-dark-skin"].filter((s) => guides.some((g) => g.slug === s));
    await lighthouseChecks(checks, { base, slugs: slugs.length ? slugs : guides.slice(0, 2).map((g) => g.slug), outDir });
  }

  // ---------- evidence ----------
  stage("figure evidence and contact sheets");
  const nFigs = await figureEvidence({ frozen, guides: useGuides, outDir, browser });
  stage(`${nFigs} figures rendered`);

  // ---------- output ----------
  checks.lines.sort((a, b) => a.id.localeCompare(b.id) || a.target.localeCompare(b.target, undefined, { numeric: true }));
  const total = Date.now() - t0;
  const failed = checks.failed.filter((l) => !l.id.startsWith("SELFTEST"));
  const summary = { generatedAt: new Date().toISOString(), command: `npm run quality -- ${process.argv.slice(2).join(" ")}`, durationMs: total, stageMs: timings, baseUrlNote: "preview of a frozen copy of the worktree, torn down after the run", includeDrafts: args.includeDrafts, only: args.only, waveGuides: waveSlugs, lines: checks.lines.length, pass: checks.lines.length - checks.failed.length - checks.warned.length, warn: checks.warned.length, fail: checks.failed.length, failedIds: [...new Set(failed.map((l) => l.id))] };
  writeFileSync(join(outDir, "checks.json"), JSON.stringify({ summary, lines: checks.lines }, null, 2) + "\n");
  printSummary(checks.lines, summary);
  await cleanup();
  process.exit(checks.failed.length ? 1 : 0);
} catch (e) {
  console.error(`[quality] FATAL: ${e.stack || e}`);
  const early = checks.failed.filter((l) => !l.id.startsWith("SELFTEST"));
  if (early.length) console.error(`[quality] FAIL lines recorded before the stop:\n` + early.map((l) => `  ${l.id}  ${l.target}  ${String(l.measured).slice(0, 160)}`).join("\n"));
  if (outDir) writeFileSync(join(outDir, "checks.json"), JSON.stringify({ summary: { fatal: String(e.message), lines: checks.lines.length }, lines: checks.lines }, null, 2) + "\n");
  await cleanup();
  process.exit(2);
}

function printSummary(lines, summary) {
  const groups = new Map();
  for (const l of lines) { const g = groups.get(l.id) || []; g.push(l); groups.set(l.id, g); }
  const rows = [["ID", "PASS", "STATUS", "WORST / EXAMPLE"]];
  const st = lines.filter((l) => l.id.startsWith("SELFTEST."));
  for (const [id, ls] of [...groups].sort((a, b) => a[0].localeCompare(b[0]))) {
    if (id.startsWith("SELFTEST.")) continue;
    const fails = ls.filter((l) => l.status === "FAIL");
    const warns = ls.filter((l) => l.status === "WARN");
    const ex = fails[0] || warns[0] || ls[0];
    rows.push([id, `${ls.length - fails.length}/${ls.length}`, fails.length ? "FAIL" : warns.length ? "WARN" : "PASS", `${ex.target}: ${String(ex.measured).slice(0, 90)}`]);
  }
  if (st.length) rows.push(["SELFTEST.* (checker proves it can fail)", `${st.filter((l) => l.status === "PASS").length}/${st.length}`, st.some((l) => l.status === "FAIL") ? "FAIL" : "PASS", "synthetic pages and data behave as expected"]);
  const w = rows[0].map((_, i) => Math.min(i === 3 ? 140 : 40, Math.max(...rows.map((r) => String(r[i]).length))));
  console.log("");
  for (const r of rows) console.log(r.map((c, i) => String(c).padEnd(w[i]).slice(0, i === 3 ? 160 : w[i] + 4)).join("  "));
  console.log("");
  const failLines = lines.filter((l) => l.status === "FAIL" && !l.id.startsWith("SELFTEST."));
  if (failLines.length) {
    console.log(`FAIL lines (${failLines.length}):`);
    for (const l of failLines) console.log(`  ${l.id}  ${l.target}  ${String(l.measured).slice(0, 200)}`);
    console.log("");
  }
  const warnLines = lines.filter((l) => l.status === "WARN");
  if (warnLines.length) {
    console.log(`WARN lines (${warnLines.length}), each needs a human look:`);
    for (const l of warnLines) for (const d of (Array.isArray(l.details) ? l.details : [l.details]).filter((x) => String(x).startsWith("WARN"))) console.log(`  ${l.id}  ${l.target}  ${d}`);
    console.log("");
  }
  console.log(`${summary.pass}/${summary.lines} lines PASS, ${summary.warn} WARN, ${summary.fail} FAIL, in ${fmtMs(summary.durationMs)}. Result: ${summary.fail ? "RED" : "GREEN"}. checks.json: ${join(outDir, "checks.json")}`);
}
