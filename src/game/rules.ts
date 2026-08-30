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
  ring?: boolean,
): Planet {
  return { id, pos, radius, mass, isGoal, color, ring };
}

/**
 * The single source of truth for both first load and every restart.
 *
 * `width`/`height` are the actual canvas size (the full browser window, so
 * the game fills it edge to edge). The tuned layout only ever shrinks to
 * fit inside a smaller-than-reference window and is otherwise centered
 * as-is at 1:1 scale, so a bigger window just means more visible space
 * around the planets rather than stretched-out gravity/movement feel.
 */
export function createInitialState(width = REF_WIDTH, height = REF_HEIGHT): GameState {
  const scale = Math.min(1, width / REF_WIDTH, height / REF_HEIGHT);
  const offsetX = (width - REF_WIDTH * scale) / 2;
  const offsetY = (height - REF_HEIGHT * scale) / 2;
  const at = (x: number, y: number): Vec2 => ({ x: offsetX + x * scale, y: offsetY + y * scale });

  const planets: Planet[] = [
    planet("start", at(220, 340), 70 * scale, 260, false, "#d98a5f"),
    planet("zephyr", at(400, 70), 30 * scale, 110, false, "#8fe0c4"),
    planet("mid", at(500, 220), 50 * scale, 190, false, "#4fa5c9"),
    planet("aurora", at(80, 150), 38 * scale, 140, false, "#9b7fd4"),
    planet("ember", at(650, 480), 45 * scale, 170, false, "#e0b878", true),
    planet("outpost", at(900, 500), 35 * scale, 130, false, "#e8829a"),
    planet("goal", at(760, 360), 60 * scale, 230, true, "#ffd166"),
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
