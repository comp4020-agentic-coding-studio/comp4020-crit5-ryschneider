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
