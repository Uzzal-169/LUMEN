// Generates subtitles.srt and script.md from narration.mjs.
// Usage: node text.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CUES, SEGMENTS, TEAM, TOTAL_SECONDS } from "./narration.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));

function srtTime(seconds) {
  const ms = Math.round(seconds * 1000);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const r = ms % 1000;
  const pad = (n, w = 2) => String(n).padStart(w, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(r, 3)}`;
}

function clock(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function buildSrt() {
  return (
    CUES.map((cue, i) => `${i + 1}\n${srtTime(cue.start)} --> ${srtTime(cue.end)}\n${cue.text}\n`).join("\n") + "\n"
  );
}

export function buildScript() {
  const words = CUES.reduce((n, c) => n + c.text.split(/\s+/).length, 0);
  const lines = [
    `# LUMEN — 240-second local judging video, voice script`,
    ``,
    `Team: ${TEAM.name} · ${TEAM.city} · NASA Space Apps 2026 · Flame in Freefall`,
    ``,
    `Total length: ${TOTAL_SECONDS} s · ${words} words (about ${Math.round((words / TOTAL_SECONDS) * 60)} words per minute, a calm pace).`,
    ``,
    `How to record: one speaker reads every line below in order, in a quiet room, phone or laptop mic`,
    `about 20 cm from the mouth. Pause for a breath where a new timestamp starts. Do not rush the`,
    `demo section; the on-screen actions are timed to these cues. Save as WAV or M4A and drop the file`,
    `in \`video/out/narration.wav\`, then run \`node video/build.mjs --mix\`.`,
    ``,
    `Before recording, replace the bracketed names in \`video/narration.mjs\` and rerun`,
    `\`node video/text.mjs\` so this script and the subtitles match. Nobody under 18 may be named or shown.`,
    ``,
  ];
  for (const seg of SEGMENTS) {
    const cues = CUES.filter((c) => c.start >= seg.start && c.start < seg.end);
    const screen = SCREEN_NOTES[seg.id] ?? "";
    lines.push(`## ${clock(seg.start)} – ${clock(seg.end)} · ${seg.id}`);
    if (screen) lines.push(``, `*On screen:* ${screen}`);
    lines.push(``);
    for (const cue of cues) {
      lines.push(`**${clock(cue.start)}** ${cue.text}`, ``);
    }
  }
  return lines.join("\n");
}

const SCREEN_NOTES = {
  title: "Title card: LUMEN, the one-line description, the three ending pills.",
  team: "Team card with names and roles. Swap for the team's own phone clip in the final cut if you have one.",
  problem: "Problem card: four bullets on microgravity fire.",
  data: "Data card: PSI-69 / FLEX identity, counts, and the first six rows of data/nasa/FLEX.csv.",
  demo:
    "Screen recording of the app. 20CAL10 → Extinction 87%. 20CAL08 → Disruption 74%. Oxygen slider 0.21 → 0.20 flips to Extinction 92%, down to 0.16 = 100%. Back up to 0.30 = Disruption 94%. 192F001 → Completion 58%. Scroll to Held-out score, then What the model uses.",
  impact: "Impact card: four bullets, including the 75% vs 69% figure.",
  close: "Close card: repository link, dataset line, thank you.",
};

const srtPath = path.join(here, "subtitles.srt");
const scriptPath = path.join(here, "script.md");
fs.writeFileSync(srtPath, buildSrt());
fs.writeFileSync(scriptPath, buildScript());
console.log("wrote", srtPath);
console.log("wrote", scriptPath);
