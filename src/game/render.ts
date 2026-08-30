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

/** A shaded sphere (not a flat disc), with an optional ring, so it reads as a planet. */
function drawPlanet(ctx: CanvasRenderingContext2D, planet: Planet): void {
  const { x, y } = planet.pos;
  const r = planet.radius;
  const base = hexToRgb(planet.color ?? DEFAULT_PLANET_COLOR);
  const highlight = mix(base, [255, 255, 255], 0.55);
  const shadow = mix(base, [0, 0, 0], 0.35);

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

  const sphere = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
  sphere.addColorStop(0, toCss(highlight));
  sphere.addColorStop(0.6, toCss(base));
  sphere.addColorStop(1, toCss(shadow));

  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = sphere;
  ctx.fill();

  if (planet.isGoal) {
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
