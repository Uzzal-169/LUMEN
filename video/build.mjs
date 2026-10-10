// Builds video/out/lumen-240s.mp4: cards + scripted demo recording, subtitles burned in.
//
//   node video/build.mjs            full build (renders cards, records the demo, assembles)
//   node video/build.mjs --reuse    skip card rendering and demo recording, reassemble only
//   node video/build.mjs --mix      also mux video/out/narration.{wav,m4a,mp3} as the audio track
//
// Needs ffmpeg on PATH and the Playwright Chromium (`npx playwright install chromium` in video/).

import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SEGMENTS, TOTAL_SECONDS } from "./narration.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const out = path.join(here, "out");
const cardsDir = path.join(out, "cards");
const args = new Set(process.argv.slice(2));
const FPS = 30;
const FADE = 0.5;

fs.mkdirSync(cardsDir, { recursive: true });

function run(cmd, cmdArgs, opts = {}) {
  const res = spawnSync(cmd, cmdArgs, { stdio: "inherit", ...opts });
  if (res.status !== 0) throw new Error(`${cmd} ${cmdArgs.join(" ")} failed (${res.status})`);
}

function ffmpeg(ffArgs) {
  run("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...ffArgs]);
}

const sum = SEGMENTS.reduce((n, s) => n + (s.end - s.start), 0);
if (sum !== TOTAL_SECONDS) throw new Error(`segments sum to ${sum}s, expected ${TOTAL_SECONDS}s`);

// 1. Text outputs
run("node", [path.join(here, "text.mjs")]);

// 2. Cards
if (!args.has("--reuse")) {
  run("node", [path.join(here, "cards.mjs"), cardsDir]);
}

// 3. Demo recording against a local dev server
if (!args.has("--reuse")) {
  const port = await freePort();
  // Spawn vite directly (not through npx) and in its own process group so the kill reaches it.
  const server = spawn(
    process.execPath,
    [path.join(root, "node_modules", "vite", "bin", "vite.js"), "--port", String(port), "--strictPort", "--host", "127.0.0.1"],
    { cwd: root, stdio: "ignore", detached: true },
  );
  try {
    await waitForServer(`http://127.0.0.1:${port}/`);
    run("node", [path.join(here, "record-demo.mjs"), out], {
      env: { ...process.env, APP_URL: `http://127.0.0.1:${port}/` },
    });
  } finally {
    server.on("error", () => {});
    for (const pid of [-server.pid, server.pid]) {
      try {
        process.kill(pid, "SIGTERM");
        break;
      } catch {
        // Some sandboxes forbid signalling; the server dies with this process anyway.
      }
    }
    server.unref();
  }
}

async function freePort() {
  const { createServer } = await import("node:net");
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.once("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

async function waitForServer(url) {
  for (let i = 0; i < 100; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`dev server did not answer at ${url}`);
}

// 4. Encode segments with identical parameters so they concatenate without re-encoding
const encode = ["-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-r", String(FPS), "-an"];
const fades = (dur) => `fade=t=in:st=0:d=${FADE},fade=t=out:st=${(dur - FADE).toFixed(3)}:d=${FADE}`;

const list = [];
for (const seg of SEGMENTS) {
  const dur = seg.end - seg.start;
  const file = path.join(out, `seg-${seg.id}.mp4`);
  if (seg.kind === "card") {
    ffmpeg([
      "-loop", "1", "-framerate", String(FPS), "-i", path.join(cardsDir, `${seg.id}.png`),
      "-t", String(dur),
      "-vf", `${fades(dur)},format=yuv420p`,
      ...encode, file,
    ]);
  } else {
    const { offsetMs } = JSON.parse(fs.readFileSync(path.join(out, "demo-offset.json"), "utf8"));
    ffmpeg([
      "-i", path.join(out, "demo-raw.webm"),
      "-ss", (offsetMs / 1000).toFixed(3), "-t", String(dur),
      "-vf", `fps=${FPS},scale=1920:1080:flags=lanczos,${fades(dur)},format=yuv420p`,
      ...encode, file,
    ]);
  }
  // Guard the exact length: the concat step needs every piece to land on its slot.
  const got = probeDuration(file);
  if (Math.abs(got - dur) > 0.2) throw new Error(`${seg.id} is ${got}s, expected ${dur}s`);
  list.push(`file '${file.replace(/'/g, "'\\''")}'`);
  console.log(`segment ${seg.id.padEnd(8)} ${dur}s`);
}

const listPath = path.join(out, "concat.txt");
fs.writeFileSync(listPath, list.join("\n") + "\n");
const silent = path.join(out, "lumen-240s-silent.mp4");
ffmpeg(["-f", "concat", "-safe", "0", "-i", listPath, "-c", "copy", silent]);

// 5. Burn subtitles and attach audio (narration if present and --mix, otherwise a silent track)
const narration = ["wav", "m4a", "mp3", "aac", "flac"]
  .map((ext) => path.join(out, `narration.${ext}`))
  .find((p) => fs.existsSync(p));
const useNarration = args.has("--mix") && narration;
if (args.has("--mix") && !narration) console.warn("--mix given but no video/out/narration.* found; using silence");

const srt = path.join(here, "subtitles.srt");
// libass scales SRT styles against a 384x288 canvas, so these numbers are in that space:
// FontSize 11 ≈ 41 px and MarginV 14 ≈ 52 px on the 1080p frame.
const style =
  "FontName=Noto Sans,FontSize=11,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BackColour=&H99000000," +
  "BorderStyle=4,Outline=0,Shadow=0,MarginV=14,MarginL=28,MarginR=28,Alignment=2";
const final = path.join(out, "lumen-240s.mp4");
ffmpeg([
  "-i", silent,
  ...(useNarration ? ["-i", narration] : ["-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo"]),
  "-vf", `subtitles=${srt.replace(/([:\\'])/g, "\\$1")}:force_style='${style}'`,
  "-map", "0:v:0", "-map", "1:a:0",
  "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
  "-c:a", "aac", "-b:a", "160k", "-ar", "48000",
  "-t", String(TOTAL_SECONDS), "-movflags", "+faststart", final,
]);

console.log(`\n${final}\nduration ${probeDuration(final).toFixed(3)}s · audio: ${useNarration ? path.basename(narration) : "silent"}`);

function probeDuration(file) {
  const res = spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file], {
    encoding: "utf8",
  });
  return Number(res.stdout.trim());
}
