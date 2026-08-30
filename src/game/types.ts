export interface Vec2 {
  x: number;
  y: number;
}

export interface Planet {
  id: string;
  pos: Vec2;
  radius: number;
  mass: number;
  isGoal: boolean;
  /** Base surface colour for rendering; falls back to a default if omitted. */
  color?: string;
  /** Draws a Saturn-style ring behind the sphere. */
  ring?: boolean;
  /** Visual silhouette; falls back to "round" if omitted. Physics always
   *  treats the planet as the circle described by `radius` regardless of
   *  shape — only the drawing varies. */
  shape?: "round" | "rocky" | "crystal" | "banded";
  /** Surface grip multiplier for walking, 1 = normal. Low values (an icy
   *  planet) mean weak acceleration and almost no stopping friction, so the
   *  player keeps sliding. Falls back to 1 if omitted. */
  friction?: number;
}

export interface PlayerState {
  pos: Vec2;
  vel: Vec2;
  radius: number;
  grounded: boolean;
  groundedPlanetId: string | null;
  /** Which way lateral thrust is currently being applied, straight from
   *  input each physics step — drives the side-thruster flame in render.ts,
   *  independent of whether that thrust is actually still changing speed
   *  (e.g. already at max surface speed). */
  thrustDir: -1 | 0 | 1;
  /** Whether outward thrust is being applied this physics step, straight
   *  from input — drives the main-engine flame in render.ts. Kept separate
   *  from raw speed so the flame only shows while "up" is actually held,
   *  not whenever the ship happens to be moving fast (falling, spinning). */
  ascending: boolean;
}

export type Outcome = "playing" | "won" | "lost";

export interface WorldBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  margin: number;
}

export interface GameState {
  planets: Planet[];
  player: PlayerState;
  outcome: Outcome;
  worldBounds: WorldBounds;
}

export interface InputSnapshot {
  left: boolean;
  right: boolean;
  /** Held state, same as `left`/`right` — thrusts outward, away from
   *  whichever planet is holding the player down (or the net pull while
   *  already airborne), for as long as it's held. */
  up: boolean;
}
