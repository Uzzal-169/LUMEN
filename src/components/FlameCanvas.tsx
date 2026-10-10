import { useEffect, useRef } from "react";
import type { Atmosphere, Ending, Prediction } from "../model/flex";

interface Spec {
  ending: Ending;
  heat: number;
  heptane: boolean;
  radius: number;
  soot: number;
  oxygen: number;
  helium: number;
  co: number;
}

type Variant = "panel" | "inspect";

/**
 * High-resolution spherical droplet flame. The backing store is 3× the CSS size
 * so browser zoom still resolves the burn surface. Inspect mode is larger still.
 */
export function FlameCanvas({
  atmosphere,
  prediction,
  variant = "panel",
}: {
  atmosphere: Atmosphere;
  prediction: Prediction;
  variant?: Variant;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const spec = useRef<Spec>(readSpec(atmosphere, prediction));
  spec.current = readSpec(atmosphere, prediction);

  const cssW = variant === "inspect" ? 720 : 360;
  const cssH = variant === "inspect" ? 800 : 400;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true, desynchronized: true });
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const oversample = variant === "inspect" ? 2 : Math.max(3, window.devicePixelRatio || 1);
    canvas.width = Math.round(cssW * oversample);
    canvas.height = Math.round(cssH * oversample);
    ctx.setTransform(oversample, 0, 0, oversample, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    const inspect = variant === "inspect";
    const rng = mulberry(7);
    const shell = Array.from({ length: inspect ? 320 : 180 }, () => spawnShell(rng));
    const inner = Array.from({ length: inspect ? 140 : 80 }, () => spawnShell(rng));
    const filaments = Array.from({ length: inspect ? 90 : 48 }, () => spawnFilament(rng));
    const smoke = Array.from({ length: inspect ? 96 : 56 }, () => spawnSmoke(rng));
    const embers = Array.from({ length: inspect ? 48 : 28 }, () => spawnEmber(rng));
    const shards = Array.from({ length: 3 }, (_, i) => ({
      ang: (i / 3) * Math.PI * 2,
      dist: 18 + i * 6,
      size: 0.72 - i * 0.12,
    }));

    let lastEnding: Ending = spec.current.ending;
    let die = 0;
    let hold = 0;
    let t = 0;
    let last = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t += dt;
      const s = spec.current;
      if (s.ending === "Extinction" && lastEnding !== "Extinction") {
        die = 0;
        hold = 0;
      }
      lastEnding = s.ending;
      if (s.ending === "Extinction") {
        if (die >= 1) {
          hold += dt;
          if (hold > 1.2) {
            die = 0;
            hold = 0;
          }
        } else {
          die = Math.min(1, die + dt / 5.6);
        }
      } else {
        die = Math.max(0, die - dt / 0.45);
        hold = 0;
      }

      draw(ctx, cssW, cssH, t, die, s, shell, inner, filaments, smoke, embers, shards, reduced);
      frame = requestAnimationFrame(tick);
    };

    if (reduced) {
      die = spec.current.ending === "Extinction" ? 0.72 : 0;
      draw(ctx, cssW, cssH, 0, die, spec.current, shell, inner, filaments, smoke, embers, shards, true);
      return;
    }

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [variant, cssW, cssH]);

  return (
    <canvas
      ref={ref}
      className={`flame-canvas flame-canvas-${variant}`}
      width={cssW}
      height={cssH}
      aria-hidden="true"
    />
  );
}

function readSpec(atmosphere: Atmosphere, prediction: Prediction): Spec {
  const oxygen = clamp((atmosphere.oxygen - 0.12) / 0.28);
  const droplet = clamp((atmosphere.diameterMm - 1.1) / 3.6);
  const pressure = clamp((atmosphere.pressureAtm - 0.4) / 2.7);
  const helium = clamp(atmosphere.helium / 0.45);
  const co = clamp(atmosphere.carbonMonoxide / 0.7);
  const soot =
    atmosphere.fuel === "Heptane"
      ? clamp(0.25 + oxygen * 0.55 + pressure * 0.2 - helium * 0.7 - co * 0.15)
      : clamp(0.04 + oxygen * 0.08 - helium * 0.12);
  return {
    ending: prediction.top,
    heat: clamp(oxygen * 0.55 + droplet * 0.18 + pressure * 0.12 - helium * 0.25),
    heptane: atmosphere.fuel === "Heptane",
    radius: 52 + droplet * 22,
    soot,
    oxygen,
    helium,
    co,
  };
}

function draw(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  die: number,
  s: Spec,
  shell: Shell[],
  inner: Shell[],
  filaments: Filament[],
  smoke: Smoke[],
  embers: Ember[],
  shards: Shard[],
  reduced: boolean,
) {
  ctx.clearRect(0, 0, w, h);
  const u = Math.min(w, h) / 400;
  const cx = w * 0.5;
  const cy = h * 0.48;
  const dying = s.ending === "Extinction" || die > 0.02;
  const split = s.ending === "Disruption" && die < 0.2;
  const collapse = smooth(die);
  const beat = reduced ? 0 : Math.sin(t * (1.8 + s.heat * 2.2)) * 0.5 + 0.5;
  const baseR = s.radius * u * (0.78 + s.heat * 0.28) * (1 - collapse * 0.72) * (0.94 + beat * 0.06);

  if (dying) {
    ctx.globalCompositeOperation = "source-over";
    for (const p of smoke) {
      const life = (t * p.spd + p.ph) % 1;
      const spread = 1 + collapse * 1.8 + life * 1.4;
      const a = p.a + t * 0.12 * p.spin;
      const x = cx + Math.cos(a) * p.r * u * spread * (0.55 + collapse);
      const y = cy + Math.sin(a * 0.92 + p.ph) * p.r * u * spread * (0.55 + collapse);
      const alpha = (1 - life) * (0.04 + collapse * 0.14) * (0.35 + s.soot * 1.1);
      const rad = (8 + p.size * 16) * u * (0.6 + life);
      const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, `rgba(170, 186, 204, ${alpha})`);
      g.addColorStop(1, "rgba(20, 14, 11, 0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, rad, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.globalCompositeOperation = "lighter";

  const hot = heatColor(s, collapse);
  const haloR = baseR * (2.15 - collapse * 0.6);
  const halo = ctx.createRadialGradient(cx, cy, baseR * 0.12, cx, cy, haloR);
  halo.addColorStop(0, rgba(hot.core, 0.58 * hot.dim * (1 - collapse * 0.35)));
  halo.addColorStop(0.32, rgba(hot.body, 0.3 * hot.dim * (1 - collapse * 0.15)));
  halo.addColorStop(1, rgba(hot.body, 0));
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(cx, cy, haloR, 0, Math.PI * 2);
  ctx.fill();

  if (split) {
    for (const shard of shards) {
      const wob = Math.sin(t * 3.1 + shard.ang) * 4 * u;
      const x = cx + Math.cos(shard.ang + t * 0.7) * (shard.dist * u * 1.6 + wob);
      const y = cy + Math.sin(shard.ang + t * 0.7) * (shard.dist * u * 1.35 + wob * 0.4);
      blob(ctx, x, y, baseR * shard.size, hot, 0.9);
    }
  } else {
    blob(ctx, cx, cy, baseR, hot, 1);
    if (collapse > 0.08) {
      const rim = ctx.createRadialGradient(cx, cy, baseR * (0.35 + collapse * 0.2), cx, cy, baseR * 1.18);
      rim.addColorStop(0, "rgba(255, 220, 160, 0)");
      rim.addColorStop(0.45, rgba("#7ec8ff", 0.12 + collapse * 0.2));
      rim.addColorStop(0.78, rgba("#3a8dff", 0.22 + collapse * 0.35));
      rim.addColorStop(1, "rgba(10, 24, 48, 0)");
      ctx.fillStyle = rim;
      ctx.beginPath();
      ctx.arc(cx, cy, baseR * 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Fine inner kernel — visible when zoomed.
  for (const p of inner) {
    const flicker = 0.75 + 0.25 * Math.sin(t * p.freq * 1.4 + p.ph);
    const x = cx + Math.cos(p.a + t * p.spin * 1.3) * baseR * p.r * 0.42;
    const y = cy + Math.sin(p.b + t * p.spin) * baseR * p.r * 0.38;
    const rad = p.size * (1.6 + s.heat * 1.4) * u * flicker;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad * 2);
    g.addColorStop(0, rgba(hot.core, 0.55 * flicker));
    g.addColorStop(1, rgba(hot.core, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, rad * 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Surface cells / turbulence.
  for (const p of shell) {
    const flicker = 0.7 + 0.3 * Math.sin(t * p.freq + p.ph);
    const shrink = 1 - collapse * (0.35 + p.jitter * 0.5);
    const x = cx + Math.cos(p.a + t * p.spin) * baseR * p.r * shrink;
    const y = cy + Math.sin(p.b + t * p.spin * 0.8) * baseR * p.r * 0.92 * shrink;
    const rad = p.size * (2.4 + s.heat * 2.2) * u * flicker * (1 - collapse * 0.55);
    const tone = collapse > 0.25 ? mixRgb(hot.body, "#8ec7ff", clamp((collapse - 0.25) / 0.5)) : hot.body;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad * 2.2);
    g.addColorStop(0, rgba(hot.core, 0.42 * flicker * (1 - collapse * 0.4)));
    g.addColorStop(0.5, rgba(tone, 0.2 * flicker));
    g.addColorStop(1, rgba(tone, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, rad * 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Chemi-luminescent filaments on the sphere skin (read clearly when zoomed).
  ctx.save();
  ctx.globalAlpha = 0.22 + s.oxygen * 0.18;
  ctx.strokeStyle = rgba(s.soot > 0.45 ? hot.core : "#b9dcff", 0.85);
  ctx.lineWidth = 0.7 * u;
  ctx.lineCap = "round";
  for (const f of filaments) {
    const ang = f.a + t * f.spin;
    const wob = 1 + 0.08 * Math.sin(t * f.freq + f.ph);
    const r0 = baseR * (0.82 + f.r * 0.18) * wob;
    const r1 = baseR * (1.02 + f.r * 0.12) * wob;
    ctx.beginPath();
    ctx.arc(cx, cy, (r0 + r1) / 2, ang, ang + f.len);
    ctx.stroke();
  }
  ctx.restore();

  if (collapse > 0.45) {
    for (const e of embers) {
      const local = (t * e.spd + e.ph) % 1;
      const burst = Math.pow(Math.sin(local * Math.PI), 2);
      if (burst < 0.05) continue;
      const drift = (8 + collapse * 28) * u;
      const x = cx + Math.cos(e.a) * drift * local;
      const y = cy + Math.sin(e.a * 1.1) * drift * local * 0.9;
      const rad = (1.2 + e.size) * u * (1.6 - local) * (collapse > 0.78 ? 0.7 : 1);
      const g = ctx.createRadialGradient(x, y, 0, x, y, rad * 5);
      g.addColorStop(0, rgba("#e8f4ff", 0.85 * burst * (1 - local)));
      g.addColorStop(0.35, rgba("#6aa8ff", 0.35 * burst));
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, rad * 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const coreR = baseR * (0.28 - collapse * 0.18) * (collapse > 0.88 ? Math.max(0, 1 - (collapse - 0.88) / 0.12) : 1);
  if (coreR > 0.8 * u) {
    const core = ctx.createRadialGradient(cx - baseR * 0.08, cy - baseR * 0.1, 0, cx, cy, coreR * 2.4);
    core.addColorStop(0, rgba(collapse > 0.35 ? "#f4fbff" : hot.core, 0.95));
    core.addColorStop(0.4, rgba(collapse > 0.35 ? "#b9dcff" : hot.body, 0.55));
    core.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(cx, cy, coreR * 2.4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalCompositeOperation = "source-over";
}

function blob(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  hot: { core: string; body: string },
  alpha: number,
) {
  const g = ctx.createRadialGradient(x - r * 0.18, y - r * 0.22, r * 0.08, x, y, r);
  g.addColorStop(0, rgba(hot.core, 0.95 * alpha));
  g.addColorStop(0.38, rgba(hot.body, 0.75 * alpha));
  g.addColorStop(0.78, rgba(hot.body, 0.18 * alpha));
  g.addColorStop(1, rgba(hot.body, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function heatColor(s: Spec, die: number) {
  const blueBody = mixRgb("#3a7dff", "#7ec8ff", s.oxygen);
  const blueCore = mixRgb("#cfe8ff", "#f4fbff", s.oxygen);
  const goldBody = mixRgb("#ff7a22", "#ffd056", s.heat);
  const goldCore = mixRgb("#ffe7a8", "#fff8e0", s.heat);
  const liveBody = mixRgb(blueBody, goldBody, s.soot);
  const liveCore = mixRgb(blueCore, goldCore, s.soot);
  const deadBody = mixRgb("#4a88ff", "#b9dcff", s.oxygen);
  const deadCore = "#eaf4ff";
  const u = smooth(clamp((die - 0.06) / 0.5));
  const dim = 1 - s.helium * 0.25 - s.co * 0.08;
  return {
    body: mixRgb(liveBody, deadBody, u),
    core: mixRgb(liveCore, deadCore, u),
    dim,
  };
}

interface Shell {
  a: number;
  b: number;
  r: number;
  size: number;
  ph: number;
  freq: number;
  spin: number;
  jitter: number;
}
interface Filament {
  a: number;
  r: number;
  len: number;
  ph: number;
  freq: number;
  spin: number;
}
interface Smoke {
  a: number;
  r: number;
  size: number;
  ph: number;
  spd: number;
  spin: number;
}
interface Ember {
  a: number;
  ph: number;
  spd: number;
  size: number;
}
interface Shard {
  ang: number;
  dist: number;
  size: number;
}

function spawnShell(rng: () => number): Shell {
  return {
    a: rng() * Math.PI * 2,
    b: rng() * Math.PI * 2,
    r: 0.55 + rng() * 0.5,
    size: 0.55 + rng() * 1.15,
    ph: rng() * Math.PI * 2,
    freq: 2 + rng() * 4,
    spin: (rng() - 0.5) * 0.6,
    jitter: rng(),
  };
}
function spawnFilament(rng: () => number): Filament {
  return {
    a: rng() * Math.PI * 2,
    r: rng(),
    len: 0.12 + rng() * 0.35,
    ph: rng() * Math.PI * 2,
    freq: 1.2 + rng() * 2.4,
    spin: (rng() - 0.5) * 0.25,
  };
}
function spawnSmoke(rng: () => number): Smoke {
  return {
    a: rng() * Math.PI * 2,
    r: 22 + rng() * 36,
    size: rng(),
    ph: rng(),
    spd: 0.08 + rng() * 0.12,
    spin: (rng() - 0.5) * 0.4,
  };
}
function spawnEmber(rng: () => number): Ember {
  return { a: rng() * Math.PI * 2, ph: rng(), spd: 0.22 + rng() * 0.35, size: rng() * 2 };
}

function mulberry(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(v: number) {
  return Math.min(1, Math.max(0, v));
}
function smooth(v: number) {
  return v * v * (3 - 2 * v);
}
function hex(color: string): [number, number, number] {
  const n = color.replace("#", "");
  return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)];
}
function mixRgb(a: string, b: string, t: number): string {
  const pa = hex(a);
  const pb = hex(b);
  const ch = (i: number) => Math.round(pa[i] + (pb[i] - pa[i]) * t);
  return `#${[ch(0), ch(1), ch(2)].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}
function rgba(color: string, a: number): string {
  const [r, g, b] = hex(color);
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, a))})`;
}
