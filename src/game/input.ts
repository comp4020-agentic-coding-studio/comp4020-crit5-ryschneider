import type { InputSnapshot } from "./types";

const LEFT_KEYS = new Set(["ArrowLeft", "a", "A"]);
const RIGHT_KEYS = new Set(["ArrowRight", "d", "D"]);
const UP_KEYS = new Set(["ArrowUp", "w", "W", " ", "Spacebar"]);

export class InputTracker {
  private held = new Set<string>();
  private pointerHeld = false;
  private restartQueued = false;

  constructor(target: Window) {
    target.addEventListener("keydown", (e) => {
      this.held.add(e.key);
      this.restartQueued = true;
    });
    target.addEventListener("keyup", (e) => {
      this.held.delete(e.key);
    });
    target.addEventListener("pointerdown", () => {
      this.pointerHeld = true;
      this.restartQueued = true;
    });
    target.addEventListener("pointerup", () => {
      this.pointerHeld = false;
    });
  }

  /** Consumes and returns whether a restart was requested since the last read. */
  consumeRestart(): boolean {
    const requested = this.restartQueued;
    this.restartQueued = false;
    return requested;
  }

  snapshot(): InputSnapshot {
    const left = [...this.held].some((k) => LEFT_KEYS.has(k));
    const right = [...this.held].some((k) => RIGHT_KEYS.has(k));
    const up = this.pointerHeld || [...this.held].some((k) => UP_KEYS.has(k));
    return { left, right, up };
  }
}
