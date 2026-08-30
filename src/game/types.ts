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
  jumpPressedThisFrame: boolean;
}
