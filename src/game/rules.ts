import type { GameState, Planet } from "./types";

const WORLD_WIDTH = 960;
const WORLD_HEIGHT = 540;

function planet(id: string, x: number, y: number, radius: number, mass: number, isGoal = false): Planet {
  return { id, pos: { x, y }, radius, mass, isGoal };
}

/** The single source of truth for both first load and every restart. */
export function createInitialState(): GameState {
  const planets: Planet[] = [
    planet("start", 220, 340, 70, 260),
    planet("mid", 500, 220, 50, 190),
    planet("goal", 760, 360, 60, 230, true),
  ];

  const startPlanet = planets[0]!;
  const restRadius = startPlanet.radius + 14;

  return {
    planets,
    player: {
      pos: { x: startPlanet.pos.x, y: startPlanet.pos.y - restRadius },
      vel: { x: 0, y: 0 },
      radius: 14,
      grounded: true,
      groundedPlanetId: startPlanet.id,
    },
    outcome: "playing",
    worldBounds: {
      minX: 0,
      maxX: WORLD_WIDTH,
      minY: 0,
      maxY: WORLD_HEIGHT,
      margin: 160,
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
