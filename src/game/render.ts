import type { GameState } from "./types";

const STAR_COUNT = 220;

export function render(ctx: CanvasRenderingContext2D, state: GameState): void {
  const { width, height } = ctx.canvas;

  ctx.fillStyle = "#05050a";
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#2a2f45";
  for (let i = 0; i < STAR_COUNT; i++) {
    const x = (i * 137) % width;
    const y = (i * 293) % height;
    const r = (i % 3) + 1;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const planet of state.planets) {
    ctx.beginPath();
    ctx.arc(planet.pos.x, planet.pos.y, planet.radius, 0, Math.PI * 2);
    ctx.fillStyle = planet.isGoal ? "#ffd166" : "#3a6ea5";
    ctx.fill();
    if (planet.isGoal) {
      ctx.strokeStyle = "#fff3c4";
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }

  const flash =
    state.outcome === "won" ? "#ffd166" : state.outcome === "lost" ? "#c1443c" : null;

  ctx.beginPath();
  ctx.arc(state.player.pos.x, state.player.pos.y, state.player.radius, 0, Math.PI * 2);
  ctx.fillStyle = flash ?? "#e8e8f0";
  ctx.fill();

  if (flash) {
    ctx.fillStyle = flash;
    ctx.globalAlpha = 0.18;
    ctx.fillRect(0, 0, width, height);
    ctx.globalAlpha = 1;
  }
}
