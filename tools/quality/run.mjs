// npm run quality -- --out <dir>
// Freezes a copy of the worktree, builds and previews it there, runs every automated line of quality/ACCEPTANCE.md
// (A, B2, B4, B5, C1-C4) and writes checks.json plus evidence. See tools/quality/README.md.
import { mkdirSync, rmSync, writeFileSync, createWriteStream, existsSync } from "node:fs";
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

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

function parseArgs(argv) {
  const a = { out: null, skipSelftest: false, selftestOnly: false, skipLighthouse: false, skipA1: false, reuse: null, keep: false, updateFixtures: false, limit: 0, concurrency: 4, skipMutation: false };
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
    else if (k === "--help" || k === "-h") { console.log("usage: npm run quality -- --out <dir> [--self-test] [--skip-lighthouse] [--update-fixtures] [--keep] [--reuse-frozen <dir>] [--limit n]"); process.exit(0); }
    else { console.error(`unknown option ${k}`); process.exit(2); }
  }
  return a;
}

async function pool(items, n, fn) {
  const queue = [...items];
  const workers = Array.from({ length: Math.min(n, queue.length) }, async () => { while (queue.length) await fn(queue.shift()); });
  await Promise.all(workers);
}

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
  if (!args.reuse) {
    const steps = [["lint", ["npm", "run", "lint"]], ["typecheck", ["npm", "run", "typecheck"]], ["build", ["npx", "opennextjs-cloudflare", "build"]]];
    for (const [name, cmd] of steps) {
      if (args.skipA1 && name !== "build") continue;
      stage(`A1: ${cmd.join(" ")}`);
      const l = logs(name);
      const r = await run(cmd[0], cmd.slice(1), { cwd: frozen, log: l });
      l.end();
      timings[name] = r.ms;
      checks.add({ id: `A1.${name}`, target: cmd.join(" "), measured: `exit ${r.code} in ${fmtMs(r.ms)}`, threshold: "exit 0", pass: r.code === 0, details: r.code === 0 ? undefined : r.out.slice(-800) });
      if (name === "build") {
        const m = /\[guides\] (\d+) guides? built/.exec(r.out);
        checks.add({ id: "A1.guides-built", target: "build output", measured: m ? `${m[1]} guides built` : "no '[guides] N guides built' line", threshold: "13 guides built", pass: !!m && m[1] === "13" });
        if (r.code !== 0) throw new Error("the build failed; nothing to preview. See logs/build.log");
      }
    }
  }
  if (!existsSync(join(frozen, ".open-next/worker.js"))) throw new Error("no .open-next build in the frozen copy");

  const guides = loadCompiledGuides(frozen);
  const pages = pageList(guides);
  const useGuides = args.limit ? guides.slice(0, args.limit) : guides;

  stage("starting preview");
  preview = await startPreview(frozen, join(outDir, "logs", "preview.log"));
  const base = preview.base;
  stage(`preview at ${base}`);

  // ---------- static + HTTP lines ----------
  const htmlStore = new Map();
  const info = await contractChecks(checks, { base, frozen, guides: useGuides, fixtures, htmlStore });
  if (args.updateFixtures) writeFixtures(repoRoot, { canonicals: info.canonicals });
  stage("B2/B4 static checks on the figure sources and WebP files");
  loaderCheck(checks, frozen);
  sourceFamilyChecks(checks, frozen, useGuides);
  await widthChecks(checks, frozen, useGuides);
  if (!args.skipMutation) await mutationCheck(checks, frozen, useGuides);

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

  // ---------- Lighthouse ----------
  if (!args.skipLighthouse) {
    stage("Lighthouse (mobile) on two guides");
    const slugs = ["check-cream-steroids-mercury-hydroquinone", "sunscreen-for-dark-skin"].filter((s) => guides.some((g) => g.slug === s));
    await lighthouseChecks(checks, { base, slugs: slugs.length ? slugs : guides.slice(0, 2).map((g) => g.slug), outDir });
  }

  // ---------- evidence ----------
  stage("figure evidence and contact sheets");
  const nFigs = await figureEvidence({ frozen, guides, outDir, browser });
  stage(`${nFigs} figures rendered`);

  // ---------- output ----------
  checks.lines.sort((a, b) => a.id.localeCompare(b.id) || a.target.localeCompare(b.target, undefined, { numeric: true }));
  const total = Date.now() - t0;
  const failed = checks.failed.filter((l) => !l.id.startsWith("SELFTEST"));
  const summary = { generatedAt: new Date().toISOString(), command: `npm run quality -- --out ${args.out}`, durationMs: total, stageMs: timings, baseUrlNote: "preview of a frozen copy of the worktree, torn down after the run", lines: checks.lines.length, pass: checks.lines.length - checks.failed.length, fail: checks.failed.length, failedIds: [...new Set(failed.map((l) => l.id))] };
  writeFileSync(join(outDir, "checks.json"), JSON.stringify({ summary, lines: checks.lines }, null, 2) + "\n");
  printSummary(checks.lines, summary);
  await cleanup();
  process.exit(checks.failed.length ? 1 : 0);
} catch (e) {
  console.error(`[quality] FATAL: ${e.stack || e}`);
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
    const ex = fails[0] || ls[0];
    rows.push([id, `${ls.length - fails.length}/${ls.length}`, fails.length ? "FAIL" : "PASS", `${ex.target}: ${String(ex.measured).slice(0, 90)}`]);
  }
  if (st.length) rows.push(["SELFTEST.* (checker proves it can fail)", `${st.filter((l) => l.status === "PASS").length}/${st.length}`, st.some((l) => l.status === "FAIL") ? "FAIL" : "PASS", "synthetic pages and data behave as expected"]);
  const w = rows[0].map((_, i) => Math.min(i === 3 ? 140 : 40, Math.max(...rows.map((r) => String(r[i]).length))));
  console.log("");
  for (const r of rows) console.log(r.map((c, i) => String(c).padEnd(w[i]).slice(0, i === 3 ? 160 : w[i] + 4)).join("  "));
  console.log("");
  console.log(`${summary.pass}/${summary.lines} lines PASS, ${summary.fail} FAIL, in ${fmtMs(summary.durationMs)}. Result: ${summary.fail ? "RED" : "GREEN"}. checks.json: ${join(outDir, "checks.json")}`);
}
