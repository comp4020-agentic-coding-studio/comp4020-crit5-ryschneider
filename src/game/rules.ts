import type { GameState, Planet, Vec2 } from "./types";

/** The layout below was tuned (and playtested) at this reference size. */
const REF_WIDTH = 960;
const REF_HEIGHT = 540;

function planet(
  id: string,
  pos: Vec2,
  radius: number,
  mass: number,
  isGoal = false,
  color?: string,
  opts: Pick<Planet, "ring" | "shape" | "friction"> = {},
): Planet {
  return { id, pos, radius, mass, isGoal, color, ...opts };
}

/**
 * The single source of truth for both first load and every restart.
 *
 * `width`/`height` are the actual canvas size (the full browser window, so
 * the game fills it edge to edge). The tuned layout scales up or down to
 * fit whatever window it's given — movement/gravity constants in
 * `physics.ts` are expressed relative to the (also-scaled) player radius,
 * so a bigger window fills with more world rather than just more margin.
 */
export function createInitialState(width = REF_WIDTH, height = REF_HEIGHT): GameState {
  const scale = Math.min(width / REF_WIDTH, height / REF_HEIGHT);
  const offsetX = (width - REF_WIDTH * scale) / 2;
  const offsetY = (height - REF_HEIGHT * scale) / 2;
  const at = (x: number, y: number): Vec2 => ({ x: offsetX + x * scale, y: offsetY + y * scale });

  const planets: Planet[] = [
    planet("start", at(190, 390), 70 * scale, 260, false, "#d98a5f", {
      shape: "rocky",
      friction: 1.2,
    }),
    planet("zephyr", at(400, 130), 30 * scale, 110, false, "#bfeeff", {
      shape: "crystal",
      friction: 0.05,
    }),
    planet("mid", at(560, 250), 50 * scale, 190, false, "#4fa5c9", {
      shape: "round",
      friction: 1.2,
    }),
    planet("ember", at(700, 400), 45 * scale, 170, false, "#e0b878", {
      ring: true,
      shape: "rocky",
      friction: 1.3,
    }),
    planet("void", at(650, 120), 40 * scale, 200, false, "#a78bfa", {
      shape: "banded",
    }),
    planet("goal", at(810, 180), 60 * scale, 230, true, "#ffd166", {
      shape: "round",
      friction: 1.2,
    }),
  ];

  const startPlanet = planets[0]!;
  const playerRadius = 14 * scale;
  const restRadius = startPlanet.radius + playerRadius;

  return {
    planets,
    player: {
      pos: { x: startPlanet.pos.x, y: startPlanet.pos.y - restRadius },
      vel: { x: 0, y: 0 },
      radius: playerRadius,
      grounded: true,
      groundedPlanetId: startPlanet.id,
      thrustDir: 0,
      ascending: false,
    },
    outcome: "playing",
    worldBounds: {
      minX: 0,
      maxX: width,
      minY: 0,
      maxY: height,
      margin: 160 * scale,
    },
  };
}

/** Win: landed on the goal planet. Loss: drifted past the world bounds with
 *  no planet's gravity having recaptured the player. */
export function checkOutcome(state: GameState): GameState["outcome"] {
  if (state.outcome !== "playing") return state.outcome;

  const goal = state.planets.find((p) => p.isGoal);
  if (goal && state.player.grounded && state.player.groundedPlanetId === goal.id) {
    return "won";
  }

  const { minX, maxX, minY, maxY, margin } = state.worldBounds;
  const { x, y } = state.player.pos;
  if (x < minX - margin || x > maxX + margin || y < minY - margin || y > maxY + margin) {
    return "lost";
  }

  return "playing";
}
