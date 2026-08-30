import { startLoop } from "./loop";

const canvas = document.querySelector<HTMLCanvasElement>("#game");
if (canvas) {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx = canvas.getContext("2d");
  if (ctx) startLoop(ctx, window);
}
