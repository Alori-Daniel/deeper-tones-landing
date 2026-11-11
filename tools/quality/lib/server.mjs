// Starts `opennextjs-cloudflare preview` in the frozen copy on its own port and kills the whole process group after.
import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { freePort, sleep } from "./util.mjs";

export async function startPreview(dir, logPath) {
  const port = await freePort();
  const inspector = await freePort();
  const log = createWriteStream(logPath);
  const child = spawn("npx", ["opennextjs-cloudflare", "preview", "--port", String(port), "--inspector-port", String(inspector)], {
    cwd: dir,
    detached: true,
    env: { ...process.env, CI: "1", FORCE_COLOR: "0", WRANGLER_SEND_METRICS: "false", NO_COLOR: "1" },
  });
  child.stdout.on("data", (d) => log.write(d));
  child.stderr.on("data", (d) => log.write(d));
  let exited = false;
  child.on("exit", () => (exited = true));
  const base = `http://127.0.0.1:${port}`;
  const t0 = Date.now();
  for (;;) {
    if (exited) throw new Error(`preview exited early, see ${logPath}`);
    if (Date.now() - t0 > 180_000) {
      stopPreview({ child });
      throw new Error(`preview did not answer on ${base} within 180s, see ${logPath}`);
    }
    try {
      const r = await fetch(base + "/", { signal: AbortSignal.timeout(8000) });
      if (r.status === 200) break;
    } catch {}
    await sleep(700);
  }
  return { base, port, child, log };
}

export function stopPreview(p) {
  if (!p?.child?.pid) return;
  for (const sig of ["SIGTERM", "SIGKILL"]) {
    try {
      process.kill(-p.child.pid, sig);
    } catch {}
  }
  p.log?.end();
}
