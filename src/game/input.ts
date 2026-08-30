import type { InputSnapshot } from "./types";

const LEFT_KEYS = new Set(["ArrowLeft", "a", "A"]);
const RIGHT_KEYS = new Set(["ArrowRight", "d", "D"]);
const JUMP_KEYS = new Set(["ArrowUp", "w", "W", " ", "Spacebar"]);

export class InputTracker {
  private held = new Set<string>();
  private jumpQueued = false;
  private restartQueued = false;

  constructor(target: Window) {
    target.addEventListener("keydown", (e) => {
      if (JUMP_KEYS.has(e.key) && !this.held.has(e.key)) this.jumpQueued = true;
      this.held.add(e.key);
      this.restartQueued = true;
    });
    target.addEventListener("keyup", (e) => {
      this.held.delete(e.key);
    });
    target.addEventListener("pointerdown", () => {
      this.jumpQueued = true;
      this.restartQueued = true;
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
    const jumpPressedThisFrame = this.jumpQueued;
    this.jumpQueued = false;
    return { left, right, jumpPressedThisFrame };
  }
}
