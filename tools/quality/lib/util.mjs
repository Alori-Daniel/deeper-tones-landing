// Shared helpers: the check collector, subprocess runner, free-port finder, chromium launcher.
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// One result line: { id, section, target, measured, threshold, status: PASS|FAIL, details? }.
export class Checks {
  constructor() {
    this.lines = [];
  }
  add({ id, target, measured, threshold, pass, details }) {
    const line = {
      id,
      section: id.split(".")[0],
      target,
      measured: measured === undefined ? null : measured,
      threshold,
      status: pass ? "PASS" : "FAIL",
    };
    if (details !== undefined && details !== null && !(Array.isArray(details) && details.length === 0)) line.details = details;
    this.lines.push(line);
    return line;
  }
  addAll(lines) {
    for (const l of lines) this.lines.push(l);
  }
  get failed() {
    return this.lines.filter((l) => l.status === "FAIL");
  }
}

export const round = (n, d = 2) => (typeof n === "number" && Number.isFinite(n) ? Math.round(n * 10 ** d) / 10 ** d : n);

export function freePort() {
  return new Promise((resolve, reject) => {
    const s = createServer();
    s.unref();
    s.on("error", reject);
    s.listen(0, "127.0.0.1", () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });
}

// Runs a command, resolves { code, out, ms }. Output is also appended to opts.log (a write stream) when given.
export function run(cmd, args, { cwd, env = {}, log, timeoutMs = 20 * 60_000 } = {}) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    const child = spawn(cmd, args, { cwd, env: { ...process.env, CI: "1", FORCE_COLOR: "0", ...env }, detached: true });
    let out = "";
    const take = (d) => {
      out += d;
      log?.write(d);
    };
    child.stdout.on("data", take);
    child.stderr.on("data", take);
    const timer = setTimeout(() => {
      take(`\n[quality] timed out after ${timeoutMs / 1000}s, killing\n`);
      try {
        process.kill(-child.pid, "SIGKILL");
      } catch {}
    }, timeoutMs);
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code: code ?? 1, out, ms: Date.now() - t0 });
    });
    child.on("error", (e) => {
      clearTimeout(timer);
      resolve({ code: 1, out: out + String(e), ms: Date.now() - t0 });
    });
  });
}

// Finds a Chromium for Playwright. Prefers the one Playwright wants; otherwise the newest cached revision.
export async function launchChromium(chromium, args = {}) {
  try {
    return await chromium.launch({ headless: true, ...args });
  } catch (e) {
    const exe = findCachedChromium();
    if (!exe) throw e;
    return await chromium.launch({ headless: true, executablePath: exe, ...args });
  }
}

export function findCachedChromium() {
  const base = join(homedir(), "Library/Caches/ms-playwright");
  if (!existsSync(base)) return null;
  const revs = (prefix) =>
    readdirSync(base)
      .filter((d) => d.startsWith(prefix))
      .sort((a, b) => parseInt(b.split("-").pop()) - parseInt(a.split("-").pop()));
  for (const d of revs("chromium-")) {
    const p = join(base, d, "chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing");
    if (existsSync(p)) return p;
  }
  return null;
}

export function fmtMs(ms) {
  const s = Math.round(ms / 1000);
  return s >= 60 ? `${Math.floor(s / 60)}m${String(s % 60).padStart(2, "0")}s` : `${s}s`;
}
