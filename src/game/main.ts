import { startLoop } from "./loop";

const canvas = document.querySelector<HTMLCanvasElement>("#game");
if (canvas) {
  const ctx = canvas.getContext("2d");
  if (ctx) startLoop(ctx, window);
}
