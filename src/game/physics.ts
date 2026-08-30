import type { InputSnapshot, Planet, PlayerState, Vec2 } from "./types";

// Movement constants are expressed per unit of player radius (not raw pixels)
// so the ship's speed scales along with the world instead of feeling weaker
// on a bigger window — `rules.ts` scales the whole layout, player included,
// to fill whatever screen it's given.
const MOVE_ACCEL_PER_RADIUS = 50;
const MAX_SURFACE_SPEED_PER_RADIUS = 42;
/** Continuous outward thrust, same mechanic as left/right — no instant
 *  impulse, just acceleration for as long as "up" is held. Tuned above the
 *  strongest planet's own surface gravity (see `GRAVITY_MULTIPLIER`'s note)
 *  so sustained thrust always wins the tug-of-war right at the surface. */
const UP_ACCEL_PER_RADIUS = 800;
/** Ascent speed cap, same idea as `MAX_SURFACE_SPEED_PER_RADIUS` — without
 *  one, thrust racing a gravity well this strong blows up to absurd speeds
 *  within a fraction of a second. A capped cruise still escapes: as long as
 *  thrust keeps winning at the surface, holding "up" keeps carrying the
 *  player further out, and a planet's escape velocity keeps shrinking with
 *  distance — so the (comparatively modest) capped speed eventually clears
 *  it, just a little further out rather than instantly. Kept close to the
 *  old one-shot jump's speed so ascending reads as the same kind of hop,
 *  just sustained instead of instantaneous. */
const MAX_ASCENT_SPEED_PER_RADIUS = 26;
const AIR_CONTROL_ACCEL_PER_RADIUS = 14;
const SURFACE_SNAP_EPSILON = 0.05;
/** How fast un-pressed speed bleeds off, before a planet's `friction` scales it. */
const FRICTION_DECEL_PER_RADIUS = 70;
/** Even on the iciest planet, input still steers at least this fraction as hard. */
const MIN_ACCEL_GRIP = 0.3;
/** Blanket multiplier on every planet's pull — tuned so gravity reads as a
 *  real force fighting the ship's thrust, not a faint nudge. Multiplied by
 *  the planet's own (world-scaled) pixel radius so gravity's strength scales
 *  with the window the same way `player.radius`-relative movement does —
 *  without that, a fixed absolute acceleration falls behind a jump speed
 *  that grows linearly with scale, and a straight-up jump can outrun
 *  gravity entirely on a large enough window. */
const GRAVITY_MULTIPLIER = 0.55;

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
      const strength =
        (planet.mass * GRAVITY_MULTIPLIER * planet.radius) / (distInRadii * distInRadii);
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
  const moveDir = ((input.left ? -1 : 0) + (input.right ? 1 : 0)) as -1 | 0 | 1;
  const moveAccel = MOVE_ACCEL_PER_RADIUS * player.radius;
  const maxSurfaceSpeed = MAX_SURFACE_SPEED_PER_RADIUS * player.radius;
  const upAccel = UP_ACCEL_PER_RADIUS * player.radius;
  const maxAscentSpeed = MAX_ASCENT_SPEED_PER_RADIUS * player.radius;
  const airControlAccel = AIR_CONTROL_ACCEL_PER_RADIUS * player.radius;
  const frictionDecel = FRICTION_DECEL_PER_RADIUS * player.radius;

  if (groundedPlanet && !input.up) {
    const outward = normalize(subtract(player.pos, groundedPlanet.pos));
    const tangent = perp(outward);

    const friction = groundedPlanet.friction ?? 1;
    const accelGrip = Math.max(friction, MIN_ACCEL_GRIP);
    let rawSpeed = dot(player.vel, tangent) + moveDir * moveAccel * accelGrip * dt;

    // Friction only bleeds off speed the player isn't actively driving with
    // input — otherwise holding a direction into high friction would fight
    // its own acceleration instead of just capping top speed.
    if (moveDir === 0) {
      const decel = frictionDecel * friction * dt;
      rawSpeed = rawSpeed > 0 ? Math.max(0, rawSpeed - decel) : Math.min(0, rawSpeed + decel);
    }

    const tangentialSpeed = Math.max(-maxSurfaceSpeed, Math.min(maxSurfaceSpeed, rawSpeed));
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
      thrustDir: moveDir,
    };
  }

  const gravityDir = length(gravity) > 0 ? normalize(gravity) : { x: 0, y: 1 };
  // Use perp(-gravityDir), matching the grounded tangent's perp(outward) —
  // outward is "away from the planet" (roughly -gravityDir), so using
  // perp(gravityDir) directly would flip which way "right" pushes the moment
  // you leave the ground.
  const airTangent = perp(scale(gravityDir, -1));
  let vel = add(
    add(player.vel, scale(gravity, dt)),
    scale(airTangent, moveDir * airControlAccel * dt),
  );

  if (input.up) {
    // Thrusting straight off a surface still under the player's feet pushes
    // along that surface's own normal; already-airborne thrust pushes
    // against whatever's currently pulling hardest, since there's no single
    // "the" surface left to push away from.
    const upDir = groundedPlanet
      ? normalize(subtract(player.pos, groundedPlanet.pos))
      : scale(gravityDir, -1);
    const thrust = add(vel, scale(upDir, upAccel * dt));
    // Cap only the outward-along-upDir component, same as the tangential
    // speed cap while grounded — sideways/gravity motion isn't touched.
    const alongUp = dot(thrust, upDir);
    vel = alongUp > maxAscentSpeed ? add(thrust, scale(upDir, maxAscentSpeed - alongUp)) : thrust;
  }

  return {
    ...player,
    vel,
    pos: add(player.pos, scale(vel, dt)),
    grounded: false,
    groundedPlanetId: null,
    thrustDir: moveDir,
  };
}
