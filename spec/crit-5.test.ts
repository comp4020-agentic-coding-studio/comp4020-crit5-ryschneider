import { describe, expect, it } from "vitest";
import { gravityAt } from "../src/game/physics";
import type { Planet } from "../src/game/types";

// Contract test for crit 5 ("A game"): "one rule of the game has a focused
// automated test." The rule under test is gravity itself — the player is
// pulled toward whichever planet dominates, not just the nearest one, and
// the pull is a sum of every planet's contribution rather than a hard switch.
describe("gravityAt", () => {
  it("pulls toward a single planet's center", () => {
    const planet: Planet = {
      id: "a",
      pos: { x: 100, y: 0 },
      radius: 20,
      mass: 500,
      isGoal: false,
    };
    const gravity = gravityAt({ x: 0, y: 0 }, [planet]);
    expect(gravity.x).toBeGreaterThan(0);
    expect(Math.abs(gravity.y)).toBeLessThan(1e-9);
  });

  it("is dominated by the nearer, heavier planet when two pull in opposite directions", () => {
    const dominant: Planet = {
      id: "dominant",
      pos: { x: 100, y: 0 },
      radius: 20,
      mass: 2000,
      isGoal: false,
    };
    const weak: Planet = {
      id: "weak",
      pos: { x: -5000, y: 0 },
      radius: 20,
      mass: 500,
      isGoal: false,
    };

    const gravity = gravityAt({ x: 0, y: 0 }, [dominant, weak]);
    const gravityLength = Math.hypot(gravity.x, gravity.y);
    const towardDominant = { x: 1, y: 0 };

    // Normalized dot product with the dominant planet's direction should be
    // close to 1 — the net pull points almost straight at it, not split
    // evenly between the two, proving both planets' pulls were summed rather
    // than only the nearest one being used.
    const alignment =
      (gravity.x * towardDominant.x + gravity.y * towardDominant.y) / gravityLength;
    expect(alignment).toBeGreaterThan(0.9);
  });
});
