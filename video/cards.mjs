// Renders the still cards (title, team, problem, data, impact, close) to 1920x1080 PNGs.
// Usage: node cards.mjs <outDir>

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { TEAM } from "./narration.mjs";
import { LAUNCH_ARGS } from "./browser.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const outDir = path.resolve(process.argv[2] ?? path.join(here, "out", "cards"));
fs.mkdirSync(outDir, { recursive: true });

const model = JSON.parse(fs.readFileSync(path.join(root, "src/model/flexModel.json"), "utf8"));
const csv = fs.readFileSync(path.join(root, "data/nasa/FLEX.csv"), "utf8").trim().split("\n");
const csvRows = csv.slice(1, 6).map((line) => line.split(","));

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const BASE_CSS = `
  :root {
    --bg: #140e0b; --raise: #231811; --line: #4a3426; --text: #f7f0e8; --muted: #cbb9a8;
    --ember: #ff5a1f; --gold: #ffb020; --blue: #9fd4ff; --safe: #8dcea8;
    font-family: "Segoe UI", "Noto Sans", sans-serif; color: var(--text);
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; width: 1920px; height: 1080px; overflow: hidden; }
  body {
    background:
      radial-gradient(1400px 700px at 80% -10%, rgba(255, 90, 31, 0.22), transparent 60%),
      radial-gradient(900px 500px at 0% 110%, rgba(159, 212, 255, 0.08), transparent 60%),
      var(--bg);
    display: grid; grid-template-rows: auto 1fr auto; padding: 64px 120px 56px;
  }
  .top { display: flex; justify-content: space-between; align-items: center; letter-spacing: 0.16em; font-weight: 700; font-size: 26px; }
  .brand { display: flex; gap: 14px; align-items: center; }
  .mark { width: 22px; height: 22px; border-radius: 50% 50% 50% 0; transform: rotate(45deg);
          background: linear-gradient(180deg, var(--gold), var(--ember)); }
  .top .team { color: var(--muted); font-weight: 400; letter-spacing: 0; font-size: 24px; }
  .body { display: grid; align-content: center; gap: 28px; }
  .kicker { color: var(--gold); letter-spacing: 0.12em; text-transform: uppercase; font-size: 26px; margin: 0; }
  h1 { font-size: 96px; line-height: 1.05; margin: 0; font-weight: 650; max-width: 1500px; }
  h2 { font-size: 64px; line-height: 1.1; margin: 0; font-weight: 650; max-width: 1500px; }
  .lede { font-size: 36px; color: var(--muted); max-width: 1400px; margin: 0; line-height: 1.4; }
  .foot { color: var(--muted); font-size: 24px; display: flex; justify-content: space-between; }
  .pills { display: flex; gap: 14px; flex-wrap: wrap; }
  .pill { padding: 10px 22px; border-radius: 999px; background: #3a2416; color: var(--gold); font-size: 28px; }
  .pill.blue { background: #1d2c3a; color: var(--blue); }
  .pill.red { background: #5a2416; color: #ffd0c2; }
  .pill.green { background: #1d3328; color: var(--safe); }
  .grid { display: grid; gap: 22px; }
  .card { background: rgba(35, 24, 17, 0.92); border: 1px solid var(--line); border-radius: 26px; padding: 30px 36px;
          box-shadow: 0 24px 60px rgba(0,0,0,0.28); }
  .card strong { display: block; font-size: 40px; font-weight: 650; }
  .card span { color: var(--muted); font-size: 28px; }
  .bullets { margin: 0; padding: 0; list-style: none; display: grid; gap: 22px; font-size: 40px; line-height: 1.35; max-width: 1500px; }
  .bullets li { padding-left: 44px; position: relative; }
  .bullets li::before { content: ""; position: absolute; left: 0; top: 0.45em; width: 18px; height: 18px; border-radius: 50% 50% 50% 0;
                        transform: rotate(45deg); background: linear-gradient(180deg, var(--gold), var(--ember)); }
  table { border-collapse: collapse; font-size: 24px; width: 100%; font-variant-numeric: tabular-nums; }
  th, td { text-align: left; padding: 10px 16px; border-bottom: 1px solid var(--line); white-space: nowrap; }
  th { color: var(--gold); font-weight: 600; letter-spacing: 0.04em; }
  td { color: var(--text); }
  td.muted { color: var(--muted); }
  body.dense .body { gap: 20px; }
  body.dense h2 { font-size: 54px; }
  body.dense .lede { font-size: 30px; }
  body.dense .card { padding: 20px 28px; }
  body.dense .card strong { font-size: 36px; }
  body.dense .card span { font-size: 24px; }
  body.dense th, body.dense td { padding: 8px 14px; font-size: 22px; }
  .mono { font-family: ui-monospace, "Noto Sans Mono", monospace; }
`;

const shell = (inner, foot = "", bodyClass = "") => `<!doctype html><html><head><meta charset="utf-8"><style>${BASE_CSS}</style></head>
<body class="${bodyClass}">
  <div class="top"><div class="brand"><span class="mark"></span>LUMEN</div>
    <div class="team">${esc(TEAM.name)} · ${esc(TEAM.city)} · NASA Space Apps 2026</div></div>
  <div class="body">${inner}</div>
  <div class="foot">${foot}</div>
</body></html>`;

const cards = {
  title: shell(
    `<p class="kicker">Flame in Freefall · Local judging</p>
     <h1>How an ISS droplet flame ends, learned from NASA's FLEX table.</h1>
     <p class="lede">A gradient-boosted classifier over 261 Space Station burns predicts whether a flame will go out, break apart, or burn to completion.</p>
     <div class="pills"><span class="pill blue">Extinction</span><span class="pill red">Disruption</span><span class="pill green">Completion</span></div>`,
    `<span>${esc(TEAM.university)}</span><span>240-second pitch</span>`,
  ),

  team: shell(
    `<p class="kicker">The team</p>
     <h2>${esc(TEAM.name)}</h2>
     <div class="grid" style="grid-template-columns: repeat(${Math.min(TEAM.members.length, 4)}, 1fr)">
       ${TEAM.members
         .map((m) => `<div class="card"><strong>${esc(m.name)}</strong><span>${esc(m.role)}</span></div>`)
         .join("")}
     </div>
     <p class="lede">${esc(TEAM.university)} · Dhaka local event</p>`,
    `<span>${esc(TEAM.university)}</span><span>NASA Space Apps Challenge 2026 · Dhaka</span>`,
  ),

  problem: shell(
    `<p class="kicker">The problem</p>
     <h2>Fire behaves differently without buoyancy.</h2>
     <ul class="bullets">
       <li>No "up": a burning droplet becomes a sphere and burns slowly.</li>
       <li>Flames survive in atmospheres that would extinguish them on Earth.</li>
       <li>Hundreds of ISS burns sit in tables an engineer cannot read in a hurry.</li>
       <li><b>Question:</b> given a chamber atmosphere, how will this flame end?</li>
     </ul>`,
    `<span>Challenge: Flame in Freefall — AI-powered fire-safety insights from microgravity combustion data</span>`,
  ),

  data: shell(
    `<p class="kicker">NASA data</p>
     <h2>PSI-69 · Flame Extinguishment Experiment (FLEX)</h2>
     <p class="lede">Physical Sciences Informatics repository · listed on data.nasa.gov · <span class="mono">data/nasa/FLEX.csv</span></p>
     <div class="grid" style="grid-template-columns: repeat(4, 1fr)">
       <div class="card"><strong>274</strong><span>station burns in the table</span></div>
       <div class="card"><strong>${model.rowsUsed}</strong><span>rows with pressure, diameter and ending</span></div>
       <div class="card"><strong>7</strong><span>features: O₂ N₂ CO He · pressure · diameter · fuel</span></div>
       <div class="card"><strong>3</strong><span>endings: extinction · disruption · completion</span></div>
     </div>
     <table>
       <thead><tr><th>#</th><th>FLEX id</th><th>Fuel</th><th>p (mmHg)</th><th>O₂</th><th>N₂</th><th>CO</th><th>He</th><th>d₀ (mm)</th><th>Test end</th></tr></thead>
       <tbody>${csvRows
         .map(
           (r) =>
             `<tr><td class="muted">${esc(r[0])}</td><td class="mono">${esc(r[1])}</td><td>${esc(r[4])}</td><td>${esc(r[5])}</td><td>${esc(r[6])}</td><td>${esc(r[7])}</td><td>${esc(r[8])}</td><td>${esc(r[9])}</td><td>${esc(r[10] || "—")}</td><td>${esc(r[14])}</td></tr>`,
         )
         .join("")}</tbody>
     </table>`,
    `<span>psi.nasa.gov/physci/repo/data/investigations/PSI-69</span><span>Table and trained model are committed to the repository</span>`,
    "dense",
  ),

  impact: shell(
    `<p class="kicker">Impact and next steps</p>
     <h2>A spacecraft atmosphere is a design choice.</h2>
     <ul class="bullets">
       <li>One-second answer for an engineer, grounded in real station burns.</li>
       <li>Held-out score printed next to every result: ${Math.round(model.metrics.accuracy * 100)}% vs ${Math.round(model.metrics.majorityAccuracy * 100)}% baseline.</li>
       <li>Next: BASS and ACME tables, out-of-range warning, uncertainty display.</li>
       <li>Next: retrieval layer that cites the exact experiment behind each prediction.</li>
     </ul>`,
    `<span>Deterministic model in code · no language model computes a number</span>`,
  ),

  close: shell(
    `<p class="kicker">Open source · Apache 2.0</p>
     <h1>LUMEN</h1>
     <p class="lede mono">${esc(TEAM.repo)}</p>
     <p class="lede">Data: NASA PSI-69 Flame Extinguishment Experiment · data.nasa.gov</p>
     <h2 style="margin-top: 20px">Thank you.</h2>`,
    `<span>${esc(TEAM.name)} · ${esc(TEAM.university)}</span><span>NASA Space Apps Challenge 2026 · Dhaka</span>`,
  ),
};

const browser = await chromium.launch({ args: LAUNCH_ARGS });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
for (const [id, html] of Object.entries(cards)) {
  await page.setContent(html, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  const file = path.join(outDir, `${id}.png`);
  await page.screenshot({ path: file, type: "png" });
  console.log("card", file);
}
await browser.close();
