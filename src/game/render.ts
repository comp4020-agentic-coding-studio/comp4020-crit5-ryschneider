import type { GameState, Planet } from "./types";

const SPARKLE_COUNT = 140;
const DEFAULT_PLANET_COLOR = "#4fa5c9";

type Rgb = [number, number, number];

function hexToRgb(hex: string): Rgb {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toCss([r, g, b]: Rgb, a = 1): string {
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/** Deterministic per-planet "randomness" so each planet's art is stable
 *  frame to frame instead of jittering — seeded from its id, not Math.random. */
function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (Math.imul(h, 31) + id.charCodeAt(i)) | 0;
  return h >>> 0;
}

function rand01(seed: number): number {
  const x = Math.sin(seed) * 43758.5453;
  return x - Math.floor(x);
}

/** Bright, pastel sky-and-sparkles backdrop rather than a dark starfield. */
function drawSky(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, "#bfe4ff");
  sky.addColorStop(0.55, "#dcebff");
  sky.addColorStop(1, "#ffe0ef");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
  for (let i = 0; i < SPARKLE_COUNT; i++) {
    const x = (i * 197) % width;
    const y = (i * 331 + i * i * 7) % height;
    const r = (i % 3) * 0.6 + 0.6;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** A wobbly, hand-drawn-looking silhouette instead of a perfect circle.
 *  Physics still treats the planet as the circle described by `radius` —
 *  the wobble amplitude is kept small enough that landing still reads as
 *  touching the surface. */
function tracePath(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, seed: number) {
  const points = 28;
  const a1 = 0.05 + rand01(seed + 1) * 0.05;
  const a2 = 0.03 + rand01(seed + 2) * 0.04;
  const f1 = 2 + Math.floor(rand01(seed + 3) * 3);
  const f2 = 4 + Math.floor(rand01(seed + 4) * 3);
  const p1 = rand01(seed + 5) * Math.PI * 2;
  const p2 = rand01(seed + 6) * Math.PI * 2;

  ctx.beginPath();
  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * Math.PI * 2;
    const wobble = 1 + a1 * Math.sin(f1 * angle + p1) + a2 * Math.sin(f2 * angle + p2);
    const px = x + Math.cos(angle) * r * wobble;
    const py = y + Math.sin(angle) * r * wobble;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

/** A few darker pockmarks, scattered deterministically, for a rocky texture. */
function drawCraters(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  seed: number,
  shadow: Rgb,
): void {
  const count = 2 + Math.floor(rand01(seed + 10) * 3);
  for (let i = 0; i < count; i++) {
    const angle = rand01(seed + 20 + i) * Math.PI * 2;
    const dist = rand01(seed + 30 + i) * r * 0.5;
    const cr = r * (0.12 + rand01(seed + 40 + i) * 0.12);
    const cx = x + Math.cos(angle) * dist;
    const cy = y + Math.sin(angle) * dist;
    ctx.beginPath();
    ctx.ellipse(cx, cy, cr, cr * 0.8, angle, 0, Math.PI * 2);
    ctx.fillStyle = toCss(shadow, 0.35);
    ctx.fill();
  }
}

/** Horizontal-ish stripe bands clipped to the sphere, gas-giant style. */
function drawBands(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  highlight: Rgb,
  shadow: Rgb,
): void {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();
  const bandCount = 4;
  for (let i = 0; i < bandCount; i++) {
    const t = (i + 0.5) / bandCount;
    const by = y - r + t * 2 * r;
    ctx.beginPath();
    ctx.ellipse(x, by, r * 1.05, r * 0.14, 0, 0, Math.PI * 2);
    ctx.fillStyle = toCss(i % 2 === 0 ? shadow : highlight, 0.16);
    ctx.fill();
  }
  ctx.restore();
}

/** A faceted gem/ice-crystal look: straight edges, triangular shading
 *  fanning out from the centre so it reads as cut rather than round. */
function drawCrystal(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  seed: number,
  base: Rgb,
  highlight: Rgb,
  shadow: Rgb,
): void {
  const sides = 6 + Math.floor(rand01(seed + 1) * 3);
  const rotation = rand01(seed + 2) * Math.PI * 2;
  const verts: { x: number; y: number }[] = [];
  for (let i = 0; i < sides; i++) {
    const angle = (i / sides) * Math.PI * 2 + rotation;
    const rr = r * (0.82 + rand01(seed + 50 + i) * 0.28);
    verts.push({ x: x + Math.cos(angle) * rr, y: y + Math.sin(angle) * rr });
  }

  ctx.beginPath();
  verts.forEach((v, i) => (i === 0 ? ctx.moveTo(v.x, v.y) : ctx.lineTo(v.x, v.y)));
  ctx.closePath();
  const gradient = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
  gradient.addColorStop(0, toCss(highlight));
  gradient.addColorStop(1, toCss(base));
  ctx.fillStyle = gradient;
  ctx.fill();

  for (let i = 0; i < sides; i++) {
    const a = verts[i]!;
    const b = verts[(i + 1) % sides]!;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.closePath();
    ctx.fillStyle = toCss(i % 2 === 0 ? highlight : shadow, 0.2);
    ctx.fill();
  }

  ctx.strokeStyle = toCss(mix(base, [255, 255, 255], 0.6), 0.8);
  ctx.lineWidth = Math.max(1, r * 0.05);
  ctx.stroke();
}

/** A shaded, textured planet — round, rocky, banded or a faceted crystal —
 *  with an optional ring, so each one reads as its own place rather than a
 *  flat colored disc. */
function drawPlanet(ctx: CanvasRenderingContext2D, planet: Planet): void {
  const { x, y } = planet.pos;
  const r = planet.radius;
  const seed = hashId(planet.id);
  const base = hexToRgb(planet.color ?? DEFAULT_PLANET_COLOR);
  const highlight = mix(base, [255, 255, 255], 0.55);
  const shadow = mix(base, [0, 0, 0], 0.35);
  const shape = planet.shape ?? "round";

  if (planet.ring) {
    ctx.beginPath();
    ctx.ellipse(x, y, r * 1.9, r * 0.55, -0.2, 0, Math.PI * 2);
    ctx.strokeStyle = toCss(mix(base, [255, 255, 255], 0.3), 0.85);
    ctx.lineWidth = Math.max(2, r * 0.22);
    ctx.stroke();
  }

  if (planet.isGoal) {
    ctx.beginPath();
    ctx.arc(x, y, r * 1.4, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 209, 102, 0.3)";
    ctx.fill();
  }

  if (shape === "crystal") {
    drawCrystal(ctx, x, y, r, seed, base, highlight, shadow);
  } else {
    const isRocky = shape === "rocky";
    if (isRocky) tracePath(ctx, x, y, r, seed);
    else {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
    }

    const sphere = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
    sphere.addColorStop(0, toCss(highlight));
    sphere.addColorStop(0.6, toCss(base));
    sphere.addColorStop(1, toCss(shadow));
    ctx.fillStyle = sphere;
    ctx.fill();

    if (isRocky) drawCraters(ctx, x, y, r, seed, shadow);
    if (shape === "banded") drawBands(ctx, x, y, r, highlight, shadow);
  }

  if (planet.isGoal) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.strokeStyle = "#fff3c4";
    ctx.lineWidth = 3;
    ctx.stroke();
  }
}

export function render(ctx: CanvasRenderingContext2D, state: GameState): void {
  const { width, height } = ctx.canvas;

  drawSky(ctx, width, height);

  for (const planet of state.planets) {
    drawPlanet(ctx, planet);
  }

  const flash =
    state.outcome === "won" ? "#ffd166" : state.outcome === "lost" ? "#c1443c" : null;

  ctx.beginPath();
  ctx.arc(state.player.pos.x, state.player.pos.y, state.player.radius, 0, Math.PI * 2);
  ctx.fillStyle = flash ?? "#ff5d73";
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#3c1a24";
  ctx.stroke();

  if (flash) {
    ctx.fillStyle = flash;
    ctx.globalAlpha = 0.18;
    ctx.fillRect(0, 0, width, height);
    ctx.globalAlpha = 1;
  }
}
