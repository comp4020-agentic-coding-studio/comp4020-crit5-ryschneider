import type { GameState, Planet } from "./types";

const SPARKLE_COUNT = 40;
const CLOUD_COUNT = 5;
const DEFAULT_PLANET_COLOR = "#4fa5c9";
const INK = "#1d2b53";

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

function inkWidth(r: number): number {
  return Math.max(2, r * 0.09);
}

/** A puffy cartoon cloud: a cluster of overlapping outlined circles. */
function drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number): void {
  const puffs = [
    { dx: -0.9, dy: 0.1, r: 0.55 },
    { dx: -0.3, dy: -0.25, r: 0.7 },
    { dx: 0.35, dy: -0.15, r: 0.65 },
    { dx: 0.9, dy: 0.15, r: 0.5 },
    { dx: 0, dy: 0.3, r: 0.75 },
  ];
  ctx.beginPath();
  for (const p of puffs) {
    ctx.moveTo(x + p.dx * scale + p.r * scale, y + p.dy * scale);
    ctx.arc(x + p.dx * scale, y + p.dy * scale, p.r * scale, 0, Math.PI * 2);
  }
  ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
  ctx.fill("nonzero");
  ctx.lineWidth = Math.max(1.5, scale * 0.06);
  ctx.strokeStyle = "rgba(180, 205, 235, 0.7)";
  ctx.stroke();
}

/** Bright, pastel sky with cartoon clouds and little star-sparkles. */
function drawSky(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, "#bfe4ff");
  sky.addColorStop(0.55, "#dcebff");
  sky.addColorStop(1, "#ffe0ef");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  for (let i = 0; i < CLOUD_COUNT; i++) {
    const cx = ((i * 337 + 120) % (width + 200)) - 100;
    const cy = (i * 173 + 40) % Math.max(1, height * 0.6);
    const scale = 22 + (i % 3) * 10;
    drawCloud(ctx, cx, cy, scale);
  }

  for (let i = 0; i < SPARKLE_COUNT; i++) {
    const x = (i * 197) % width;
    const y = (i * 331 + i * i * 7) % height;
    const r = (i % 3) * 1.1 + 1.4;
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.lineTo(x + r * 0.3, y - r * 0.3);
    ctx.lineTo(x + r, y);
    ctx.lineTo(x + r * 0.3, y + r * 0.3);
    ctx.lineTo(x, y + r);
    ctx.lineTo(x - r * 0.3, y + r * 0.3);
    ctx.lineTo(x - r, y);
    ctx.lineTo(x - r * 0.3, y - r * 0.3);
    ctx.closePath();
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    ctx.fill();
  }
}

/** A wobbly, hand-drawn-looking silhouette instead of a perfect circle.
 *  Physics still treats the planet as the circle described by `radius` —
 *  the wobble amplitude is kept small enough that landing still reads as
 *  touching the surface. */
function tracePath(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, seed: number) {
  const points = 28;
  const a1 = 0.02 + rand01(seed + 1) * 0.02;
  const a2 = 0.015 + rand01(seed + 2) * 0.015;
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

/** Flat, two-tone cel shading — a solid base fill plus one hard-edged shadow
 *  patch, no gloss/specular highlight. Real cartoon planets (Kirby, Katamari)
 *  read as flat-painted, not as a shiny plastic marble. `pathFn` draws the
 *  silhouette. */
function fillCelShaded(
  ctx: CanvasRenderingContext2D,
  pathFn: () => void,
  x: number,
  y: number,
  r: number,
  base: Rgb,
  shadow: Rgb,
): void {
  pathFn();
  ctx.fillStyle = toCss(base);
  ctx.fill();

  ctx.save();
  pathFn();
  ctx.clip();
  ctx.beginPath();
  ctx.arc(x + r * 0.45, y + r * 0.4, r * 0.95, 0, Math.PI * 2);
  ctx.fillStyle = toCss(shadow, 0.45);
  ctx.fill();
  ctx.restore();

  pathFn();
  ctx.lineWidth = inkWidth(r);
  ctx.strokeStyle = INK;
  ctx.stroke();
}

/** A few outlined pockmarks, scattered deterministically, for a rocky texture. */
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
    const cr = r * (0.14 + rand01(seed + 40 + i) * 0.12);
    const cx = x + Math.cos(angle) * dist;
    const cy = y + Math.sin(angle) * dist;
    ctx.beginPath();
    ctx.ellipse(cx, cy, cr, cr * 0.8, angle, 0, Math.PI * 2);
    ctx.fillStyle = toCss(shadow, 0.6);
    ctx.fill();
    ctx.lineWidth = Math.max(1, r * 0.03);
    ctx.strokeStyle = toCss(shadow, 0.9);
    ctx.stroke();
  }
}

/** Bold, outlined horizontal stripe bands clipped to the sphere. */
function drawBands(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
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
    ctx.ellipse(x, by, r * 1.05, r * 0.16, 0, 0, Math.PI * 2);
    ctx.fillStyle = toCss(shadow, 0.3);
    ctx.fill();
    ctx.lineWidth = Math.max(1, r * 0.04);
    ctx.strokeStyle = toCss(shadow, 0.5);
    ctx.stroke();
  }
  ctx.restore();
}

/** A faceted gem/ice-crystal look: straight edges, flat triangular shading
 *  fanning out from the centre, bold ink outline — cut, not round. */
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
    const rr = r * (0.94 + rand01(seed + 50 + i) * 0.08);
    verts.push({ x: x + Math.cos(angle) * rr, y: y + Math.sin(angle) * rr });
  }

  ctx.beginPath();
  verts.forEach((v, i) => (i === 0 ? ctx.moveTo(v.x, v.y) : ctx.lineTo(v.x, v.y)));
  ctx.closePath();
  ctx.fillStyle = toCss(base);
  ctx.fill();

  for (let i = 0; i < sides; i++) {
    const a = verts[i]!;
    const b = verts[(i + 1) % sides]!;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.closePath();
    ctx.fillStyle = toCss(i % 2 === 0 ? highlight : shadow, 0.28);
    ctx.fill();
    ctx.lineWidth = Math.max(1, r * 0.025);
    ctx.strokeStyle = toCss(mix(base, [255, 255, 255], 0.5), 0.6);
    ctx.stroke();
  }

  ctx.beginPath();
  verts.forEach((v, i) => (i === 0 ? ctx.moveTo(v.x, v.y) : ctx.lineTo(v.x, v.y)));
  ctx.closePath();
  ctx.lineWidth = inkWidth(r);
  ctx.strokeStyle = INK;
  ctx.stroke();
}

/** A solid, outlined band — drawn as a filled ellipse ring rather than a
 *  thin translucent stroke, so it reads as a chunky cartoon prop. */
function drawRing(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, base: Rgb): void {
  const rotation = -0.2;
  const outerRx = r * 1.95;
  const outerRy = r * 0.6;
  const bandWidth = Math.max(3, r * 0.26);

  ctx.save();
  ctx.beginPath();
  ctx.ellipse(x, y, outerRx, outerRy, rotation, 0, Math.PI * 2);
  ctx.closePath();
  ctx.ellipse(x, y, outerRx - bandWidth, outerRy - bandWidth * 0.32, rotation, 0, Math.PI * 2, true);
  ctx.closePath();
  ctx.fillStyle = toCss(mix(base, [255, 255, 255], 0.35));
  ctx.fill("evenodd");
  ctx.lineWidth = inkWidth(r) * 0.8;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(x, y, outerRx - bandWidth, outerRy - bandWidth * 0.32, rotation, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/** A cel-shaded, textured planet — round, rocky, banded or a faceted
 *  crystal — with a bold cartoon ink outline and an optional ring. */
function drawPlanet(ctx: CanvasRenderingContext2D, planet: Planet): void {
  const { x, y } = planet.pos;
  const r = planet.radius;

  const seed = hashId(planet.id);
  const base = hexToRgb(planet.color ?? DEFAULT_PLANET_COLOR);
  const highlight = mix(base, [255, 255, 255], 0.55);
  const shadow = mix(base, [0, 0, 0], 0.4);
  const shape = planet.shape ?? "round";

  if (planet.ring) drawRing(ctx, x, y, r, base);

  if (shape === "crystal") {
    drawCrystal(ctx, x, y, r, seed, base, highlight, shadow);
  } else if (shape === "rocky") {
    fillCelShaded(ctx, () => tracePath(ctx, x, y, r, seed), x, y, r, base, shadow);
    drawCraters(ctx, x, y, r, seed, shadow);
  } else {
    const path = () => {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
    };
    fillCelShaded(ctx, path, x, y, r, base, shadow);
    if (shape === "banded") drawBands(ctx, x, y, r, shadow);
  }

  if (planet.isGoal) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.lineWidth = Math.max(2, r * 0.06);
    ctx.strokeStyle = "#fff3c4";
    ctx.stroke();
  }
}

/** A small cartoon rocket ship — pointed nose, tapered body, fins, side
 *  RCS thruster pods and a cockpit window — oriented along its direction of
 *  travel (or straight "up" off the surface while standing still) so the
 *  existing acceleration mechanic reads as thrust rather than an arbitrary
 *  circle sliding around. `angle` is the rotation that points the ship's
 *  nose at the facing direction; `thrust` shows the main engine flame only
 *  while outward thrust ("up") is actually being held, not just whenever
 *  the ship happens to be moving fast; `thrustDir` fires the opposite-side
 *  pod (real RCS thrusters push by venting away from the direction you want
 *  to move) whenever left/right is actually held, independent of `thrust`. */
function drawPlayer(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  fill: string,
  angle: number,
  thrust: number,
  thrustDir: -1 | 0 | 1,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  if (thrust > 0.05) {
    const flameLen = r * (0.6 + thrust * 1.3);
    ctx.beginPath();
    ctx.moveTo(-r * 0.35, r * 0.75);
    ctx.lineTo(0, r * 0.75 + flameLen);
    ctx.lineTo(r * 0.35, r * 0.75);
    ctx.closePath();
    ctx.fillStyle = "#ffd166";
    ctx.fill();
    ctx.lineWidth = Math.max(1.5, inkWidth(r) * 0.7);
    ctx.strokeStyle = INK;
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.moveTo(0, -r * 1.3);
  ctx.quadraticCurveTo(r * 0.75, -r * 0.5, r * 0.55, r * 0.6);
  ctx.lineTo(r * 0.4, r * 0.85);
  ctx.lineTo(-r * 0.4, r * 0.85);
  ctx.lineTo(-r * 0.55, r * 0.6);
  ctx.quadraticCurveTo(-r * 0.75, -r * 0.5, 0, -r * 1.3);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = inkWidth(r);
  ctx.strokeStyle = INK;
  ctx.stroke();

  for (const dir of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(dir * r * 0.45, r * 0.2);
    ctx.lineTo(dir * r * 0.95, r * 0.85);
    ctx.lineTo(dir * r * 0.35, r * 0.7);
    ctx.closePath();
    ctx.fillStyle = INK;
    ctx.fill();
  }

  // Side thruster pods, mid-hull — always visible so the ship reads as
  // having a way to push itself sideways even at rest.
  const podOffsetX = r * 0.62;
  const podW = r * 0.22;
  const podH = r * 0.3;
  for (const dir of [-1, 1]) {
    ctx.beginPath();
    ctx.rect(dir * podOffsetX - podW / 2, -podH / 2, podW, podH);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = Math.max(1.5, inkWidth(r) * 0.7);
    ctx.strokeStyle = INK;
    ctx.stroke();
  }

  // Firing pod vents away from the direction you're pushing toward — that's
  // what actually makes it thrust the ship the other way.
  if (thrustDir !== 0) {
    const firingSide = -thrustDir;
    const podX = firingSide * podOffsetX;
    const flameLen = r * 0.9;
    ctx.beginPath();
    ctx.moveTo(podX, -podH * 0.45);
    ctx.lineTo(podX + firingSide * flameLen, 0);
    ctx.lineTo(podX, podH * 0.45);
    ctx.closePath();
    ctx.fillStyle = "#ffd166";
    ctx.fill();
    ctx.lineWidth = Math.max(1.5, inkWidth(r) * 0.6);
    ctx.strokeStyle = INK;
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.arc(0, -r * 0.25, r * 0.32, 0, Math.PI * 2);
  ctx.fillStyle = "#bfeeff";
  ctx.fill();
  ctx.lineWidth = Math.max(1.5, inkWidth(r) * 0.7);
  ctx.strokeStyle = INK;
  ctx.stroke();

  ctx.restore();
}

/** Facing direction for the ship: pointing away from the surface while
 *  grounded (like a rocket standing on a landing pad), or along current
 *  velocity while airborne. Falls back to "up" when nearly stationary so a
 *  freshly-spawned or momentarily-still ship doesn't point somewhere random. */
function shipAngle(state: GameState): number {
  const { player, planets } = state;
  let fx = 0;
  let fy = -1;

  if (player.grounded && player.groundedPlanetId) {
    const ground = planets.find((p) => p.id === player.groundedPlanetId);
    if (ground) {
      const dx = player.pos.x - ground.pos.x;
      const dy = player.pos.y - ground.pos.y;
      const len = Math.hypot(dx, dy) || 1;
      fx = dx / len;
      fy = dy / len;
    }
  } else {
    const speed = Math.hypot(player.vel.x, player.vel.y);
    if (speed > 1) {
      fx = player.vel.x / speed;
      fy = player.vel.y / speed;
    }
  }

  return Math.atan2(fx, -fy);
}

function shipThrust(state: GameState): number {
  return state.player.ascending ? 1 : 0;
}

export function render(ctx: CanvasRenderingContext2D, state: GameState): void {
  const { width, height } = ctx.canvas;

  drawSky(ctx, width, height);

  for (const planet of state.planets) {
    drawPlanet(ctx, planet);
  }

  const flash =
    state.outcome === "won" ? "#ffd166" : state.outcome === "lost" ? "#c1443c" : null;

  drawPlayer(
    ctx,
    state.player.pos.x,
    state.player.pos.y,
    state.player.radius,
    flash ?? "#ff5d73",
    shipAngle(state),
    shipThrust(state),
    state.player.thrustDir,
  );

  if (flash) {
    ctx.fillStyle = flash;
    ctx.globalAlpha = 0.18;
    ctx.fillRect(0, 0, width, height);
    ctx.globalAlpha = 1;
  }
}
