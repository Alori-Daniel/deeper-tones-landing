// Turn a quality run's checks.json into a short Markdown summary for the GitHub Actions job page.
//   node tools/quality/ci-summary.mjs <out-dir>/checks.json "Title" >> "$GITHUB_STEP_SUMMARY"
import { existsSync, readFileSync } from "node:fs";

const [file, title = "Quality checks"] = process.argv.slice(2);
if (!file || !existsSync(file)) {
  console.log(`### ${title}\n\nNo checks.json was written: the run stopped early. Open the job log above.`);
  process.exit(0);
}

const { summary, lines = [] } = JSON.parse(readFileSync(file, "utf8"));
const cell = (v) => String(v ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ").slice(0, 300);
const count = (status) => lines.filter((l) => l.status === status).length;
const [pass, warn, fail] = ["PASS", "WARN", "FAIL"].map(count);
// A run that stopped early writes { fatal } and no counts: it is never green.
const result = summary.fatal ? `RED, stopped early: ${cell(summary.fatal)}` : fail ? "RED" : warn ? "GREEN, with warnings" : "GREEN";
const out = [`### ${title}: ${result}`, "", `${pass}/${lines.length} lines PASS, ${warn} WARN, ${fail} FAIL${summary.fatal ? " before the stop" : ""}.`];

for (const status of ["FAIL", "WARN"]) {
  const rows = lines.filter((l) => l.status === status);
  if (!rows.length) continue;
  out.push("", `**${status}**`, "", "| Line | Target | Measured | Needs |", "|---|---|---|---|");
  for (const l of rows) out.push(`| ${cell(l.id)} | ${cell(l.target)} | ${cell(l.measured)} | ${cell(l.threshold)} |`);
  const details = rows.flatMap((l) => (l.details ?? []).map((d) => `- ${l.id}: ${cell(d)}`));
  if (details.length) out.push("", ...details.slice(0, 40));
}
out.push("", "Full evidence (screenshots, Lighthouse reports, logs) is in this run's artifacts.");
console.log(out.join("\n"));
