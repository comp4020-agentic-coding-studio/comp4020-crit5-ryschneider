import { InputTracker } from "./input";
import { findGroundedPlanet, gravityAt, integrate } from "./physics";
import { checkOutcome, createInitialState } from "./rules";
import { render } from "./render";
import type { GameState } from "./types";

const MAX_DT = 1 / 30;

export function startLoop(ctx: CanvasRenderingContext2D, target: Window): void {
  const input = new InputTracker(target);
  let state: GameState = createInitialState();
  let lastTime: number | null = null;

  function frame(time: number): void {
    const dt = lastTime === null ? 0 : Math.min((time - lastTime) / 1000, MAX_DT);
    lastTime = time;

    const restartRequested = input.consumeRestart();
    if (state.outcome !== "playing" && restartRequested) {
      state = createInitialState();
    } else if (state.outcome === "playing") {
      const snapshot = input.snapshot();
      const gravity = gravityAt(state.player.pos, state.planets);
      const groundedPlanet = findGroundedPlanet(
        state.player.pos,
        state.player.radius,
        state.planets,
      );
      const player = integrate(state.player, gravity, snapshot, dt, groundedPlanet);
      const next: GameState = { ...state, player };
      state = { ...next, outcome: checkOutcome(next) };
    }

    render(ctx, state);
    target.requestAnimationFrame(frame);
  }

  target.requestAnimationFrame(frame);
}
