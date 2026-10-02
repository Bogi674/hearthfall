import { createView } from './render/scene';
import { fixedStep } from './sim/loop';
import { createWorld, stepWorld, TICKS_PER_SECOND } from './sim/world';

const TICK_MS = 1000 / TICKS_PER_SECOND;
const MAX_STEPS_PER_FRAME = 10;

const world = createWorld(1);
const view = createView(document.getElementById('app')!);

let accumulator = 0;
let last = performance.now();

function frame(now: number): void {
  const result = fixedStep(accumulator, now - last, TICK_MS, MAX_STEPS_PER_FRAME);
  last = now;
  accumulator = result.accumulator;
  for (let i = 0; i < result.steps; i++) stepWorld(world);
  view.render();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
