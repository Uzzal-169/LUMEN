// Records the 95-second scripted demo of the running app with Playwright.
// Usage: APP_URL=http://localhost:5180 node record-demo.mjs <outDir>
// Writes <outDir>/demo-raw.webm and <outDir>/demo-offset.json ({ offsetMs }) where
// offsetMs is how far into the raw recording the demo clock starts.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { LAUNCH_ARGS } from "./browser.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(process.argv[2] ?? path.join(here, "out"));
fs.mkdirSync(outDir, { recursive: true });
const url = process.env.APP_URL ?? "http://localhost:5180";

const DEMO_SECONDS = 95;

const browser = await chromium.launch({ args: LAUNCH_ARGS });
const recordStart = Date.now();
const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
  recordVideo: { dir: outDir, size: { width: 1920, height: 1080 } },
  reducedMotion: "no-preference",
  colorScheme: "dark",
});
const page = await context.newPage();
await page.goto(url, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);

// Zoom the app a little so slider labels and probabilities read on a projector.
const ZOOM = 1.18;
await page.addStyleTag({
  content: `
    html { zoom: ${ZOOM}; }
    #lumen-cursor {
      position: fixed; top: 0; left: 0; z-index: 99999; width: 26px; height: 26px; margin: -3px 0 0 -3px;
      pointer-events: none; transition: transform 60ms linear;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.6));
    }
    #lumen-cursor.down svg path { fill: #ffb020; }
  `,
});
await page.evaluate((zoom) => {
  const el = document.createElement("div");
  el.id = "lumen-cursor";
  el.innerHTML =
    '<svg viewBox="0 0 24 24"><path d="M4 2l16 9.5-7 1.6-3.6 6.6z" fill="#f7f0e8" stroke="#140e0b" stroke-width="1.4" stroke-linejoin="round"/></svg>';
  document.body.appendChild(el);
  // clientX/Y arrive in viewport pixels; the element lives inside the zoomed root.
  window.addEventListener("mousemove", (e) => {
    el.style.transform = `translate(${e.clientX / zoom}px, ${e.clientY / zoom}px)`;
  });
  window.addEventListener("mousedown", () => el.classList.add("down"));
  window.addEventListener("mouseup", () => el.classList.remove("down"));
}, ZOOM);

const t0 = Date.now();
const offsetMs = t0 - recordStart;
const clock = () => (Date.now() - t0) / 1000;
const until = async (seconds) => {
  const ms = seconds * 1000 - (Date.now() - t0);
  if (ms > 0) await page.waitForTimeout(ms);
};
const log = (msg) => console.log(`[${clock().toFixed(1).padStart(5)}s] ${msg}`);

// The page uses CSS zoom; mouse coordinates must be in CSS pixels of the zoomed layout,
// and boundingClientRect already returns zoomed coordinates in Chromium, so no correction.
async function center(locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error("element not visible");
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function glideTo(x, y, seconds = 0.8) {
  const steps = Math.max(8, Math.round(seconds * 40));
  await page.mouse.move(x, y, { steps });
}

async function clickPreset(id) {
  const button = page.locator(".preset", { hasText: id });
  const { x, y } = await center(button);
  await glideTo(x, y);
  await page.mouse.down();
  await page.waitForTimeout(90);
  await page.mouse.up();
  log(`preset ${id}`);
}

const oxygenInput = page.locator(".field", { hasText: "Oxygen" }).locator("input[type=range]");

async function thumbPosition(value) {
  const box = await oxygenInput.boundingBox();
  const min = Number(await oxygenInput.getAttribute("min"));
  const max = Number(await oxygenInput.getAttribute("max"));
  const thumb = 16; // approximate thumb width in CSS px
  const ratio = (value - min) / (max - min);
  return { x: box.x + thumb / 2 + ratio * (box.width - thumb), y: box.y + box.height / 2 };
}

async function setOxygen(value) {
  await oxygenInput.evaluate((el, v) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    setter.call(el, String(v));
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }, value.toFixed(2));
  const { x, y } = await thumbPosition(value);
  await page.mouse.move(x, y, { steps: 6 });
  log(`oxygen ${value.toFixed(2)}`);
}

async function scrollToHeading(text, seconds = 1.2) {
  const heading = page.locator("h2", { hasText: text });
  await heading.evaluate((el) => {
    const top = el.getBoundingClientRect().top + window.scrollY - 120;
    window.scrollTo({ top, behavior: "smooth" });
  });
  await page.waitForTimeout(seconds * 1000);
  log(`scroll to "${text}"`);
}

async function scrollToLab() {
  await page.locator(".lab").evaluate((el) => {
    const top = el.getBoundingClientRect().top + window.scrollY - 40;
    window.scrollTo({ top, behavior: "smooth" });
  });
  await page.waitForTimeout(1200);
  log("scroll to lab");
}

// ---- timeline (seconds on the demo clock) ----
await page.mouse.move(1500, 200);
await until(2);
await glideTo(1250, 420, 2.5); // drift toward the readout while the narrator introduces the page

await until(7);
await scrollToLab();
await glideTo(1300, 500, 1.5);

await until(12);
await clickPreset("20CAL10");

await until(24);
await clickPreset("20CAL08");

await until(36);
{
  const { x, y } = await thumbPosition(0.21);
  await glideTo(x, y, 1.2);
  await page.mouse.down();
}
// Narration: "Twenty-one percent: disruption. Twenty percent, and the prediction flips…" (video 151–157)
await until(43);
await setOxygen(0.2);
await until(46);
await setOxygen(0.19);
await until(48);
await setOxygen(0.18);
await until(49.5);
await setOxygen(0.17);
await until(51);
await setOxygen(0.16);
await page.mouse.up();

await until(58);
await page.mouse.down();
for (let v = 0.17; v <= 0.3 + 1e-9; v += 0.01) {
  await setOxygen(Number(v.toFixed(2)));
  await page.waitForTimeout(260);
}
await page.mouse.up();

await until(63);
await clickPreset("192F001");

await until(68.5);
await scrollToHeading("Held-out score");
await glideTo(700, 520, 1.5);

await until(85.5);
await scrollToHeading("What the model uses");
// Trace the importance ranking the narrator reads out: oxygen, diameter, pressure, fuel.
for (const label of ["Oxygen", "Droplet diameter", "Pressure", "Fuel"]) {
  const { x, y } = await center(page.locator(".source-grid article", { hasText: label }));
  await glideTo(x, y, 1.2);
  await page.waitForTimeout(900);
}

await until(DEMO_SECONDS + 1);
log("done");

await context.close();
const video = page.video();
const raw = await video.path();
await browser.close();

const target = path.join(outDir, "demo-raw.webm");
fs.renameSync(raw, target);
fs.writeFileSync(path.join(outDir, "demo-offset.json"), JSON.stringify({ offsetMs, demoSeconds: DEMO_SECONDS }));
console.log("wrote", target, "offsetMs", offsetMs);
// Playwright's video encoder can leave a handle open after close(); do not wait for it.
process.exit(0);
