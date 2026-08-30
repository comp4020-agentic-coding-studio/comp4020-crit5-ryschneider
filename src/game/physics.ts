import type { InputSnapshot, Planet, PlayerState, Vec2 } from "./types";

const MOVE_ACCEL = 420;
const MAX_SURFACE_SPEED = 170;
const JUMP_SPEED = 180;
const AIR_CONTROL_ACCEL = 90;
const SURFACE_SNAP_EPSILON = 0.05;
/** How fast un-pressed speed bleeds off, before a planet's `friction` scales it. */
const FRICTION_DECEL = 460;
/** Even on the iciest planet, input still steers at least this fraction as hard. */
const MIN_ACCEL_GRIP = 0.3;

function subtract(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

function scale(v: Vec2, s: number): Vec2 {
  return { x: v.x * s, y: v.y * s };
}

function length(v: Vec2): number {
  return Math.hypot(v.x, v.y);
}

function normalize(v: Vec2): Vec2 {
  const len = length(v);
  return len === 0 ? { x: 0, y: 0 } : { x: v.x / len, y: v.y / len };
}

function dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

/** Perpendicular of a vector, rotated 90° clockwise in screen space (y down). */
function perp(v: Vec2): Vec2 {
  return { x: -v.y, y: v.x };
}

/**
 * Net gravitational acceleration at a point: the sum of every planet's pull,
 * not just the nearest one. Summing keeps the direction continuous as
 * dominance shifts from one planet to another mid-flight; a nearest-only
 * model would snap "down" instantly at the boundary between two wells.
 *
 * Distance is measured in planet radii, not raw pixels: a world of 60-900px
 * gaps between planets of wildly different sizes needs gravity strength
 * decoupled from absolute pixel scale, so `mass` can be tuned once as "surface
 * pull strength" and reused at any radius.
 */
export function gravityAt(pos: Vec2, planets: Planet[]): Vec2 {
  return planets.reduce<Vec2>(
    (total, planet) => {
      const toPlanet = subtract(planet.pos, pos);
      const rawDist = length(toPlanet);
      const distInRadii = Math.max(rawDist / planet.radius, 1);
      const strength = planet.mass / (distInRadii * distInRadii);
      return add(total, scale(normalize(toPlanet), strength));
    },
    { x: 0, y: 0 },
  );
}

/** The planet whose surface the player is currently touching, if any. */
export function findGroundedPlanet(
  playerPos: Vec2,
  playerRadius: number,
  planets: Planet[],
): Planet | null {
  let closest: Planet | null = null;
  let closestGap = Infinity;
  for (const planet of planets) {
    const dist = length(subtract(playerPos, planet.pos));
    const gap = dist - (planet.radius + playerRadius);
    if (gap <= SURFACE_SNAP_EPSILON && gap < closestGap) {
      closest = planet;
      closestGap = gap;
    }
  }
  return closest;
}

/** One physics step: a pure state transition, no rendering or DOM involved. */
export function integrate(
  player: PlayerState,
  gravity: Vec2,
  input: InputSnapshot,
  dt: number,
  groundedPlanet: Planet | null,
): PlayerState {
  const moveDir = (input.left ? -1 : 0) + (input.right ? 1 : 0);

  if (groundedPlanet) {
    const outward = normalize(subtract(player.pos, groundedPlanet.pos));
    const tangent = perp(outward);

    if (input.jumpPressedThisFrame) {
      const tangentialSpeed = dot(player.vel, tangent);
      const vel = add(scale(outward, JUMP_SPEED), scale(tangent, tangentialSpeed));
      return {
        ...player,
        vel,
        pos: add(player.pos, scale(vel, dt)),
        grounded: false,
        groundedPlanetId: null,
      };
    }

    const friction = groundedPlanet.friction ?? 1;
    const accelGrip = Math.max(friction, MIN_ACCEL_GRIP);
    let rawSpeed = dot(player.vel, tangent) + moveDir * MOVE_ACCEL * accelGrip * dt;

    // Friction only bleeds off speed the player isn't actively driving with
    // input — otherwise holding a direction into high friction would fight
    // its own acceleration instead of just capping top speed.
    if (moveDir === 0) {
      const decel = FRICTION_DECEL * friction * dt;
      rawSpeed = rawSpeed > 0 ? Math.max(0, rawSpeed - decel) : Math.min(0, rawSpeed + decel);
    }

    const tangentialSpeed = Math.max(-MAX_SURFACE_SPEED, Math.min(MAX_SURFACE_SPEED, rawSpeed));
    const vel = scale(tangent, tangentialSpeed);
    const restRadius = groundedPlanet.radius + player.radius;

    // Re-derive "outward" from the moved-along-tangent point, then snap that
    // back onto the surface circle — this is what actually walks the player
    // around the curve. Reusing the pre-move `outward` here would silently
    // reproject the OLD position onto itself every frame, so left/right did
    // nothing while grounded even though `vel` was changing correctly.
    const moved = add(player.pos, scale(tangent, tangentialSpeed * dt));
    const rolledOutward = normalize(subtract(moved, groundedPlanet.pos));
    const pos = add(groundedPlanet.pos, scale(rolledOutward, restRadius));

    return {
      ...player,
      vel,
      pos,
      grounded: true,
      groundedPlanetId: groundedPlanet.id,
    };
  }

  const gravityDir = length(gravity) > 0 ? normalize(gravity) : { x: 0, y: 1 };
  // Use perp(-gravityDir), matching the grounded tangent's perp(outward) —
  // outward is "away from the planet" (roughly -gravityDir), so using
  // perp(gravityDir) directly would flip which way "right" pushes the moment
  // you leave the ground.
  const airTangent = perp(scale(gravityDir, -1));
  const vel = add(
    add(player.vel, scale(gravity, dt)),
    scale(airTangent, moveDir * AIR_CONTROL_ACCEL * dt),
  );

  return {
    ...player,
    vel,
    pos: add(player.pos, scale(vel, dt)),
    grounded: false,
    groundedPlanetId: null,
  };
}
