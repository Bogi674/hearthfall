import { bindCameraControls } from './input/cameraControls';
import { createView } from './render/scene';
import { createWorldView } from './render/sync';
import { fixedStep } from './sim/loop';
import { createWorld, stepWorld, TICKS_PER_SECOND } from './sim/world';

const TICK_MS = 1000 / TICKS_PER_SECOND;
const MAX_STEPS_PER_FRAME = 10;

const seed = Number(new URLSearchParams(location.search).get('seed') ?? 1);
const world = createWorld(seed);
const container = document.getElementById('app')!;
const view = createView(container, world.map.width);
const worldView = createWorldView(world, view.scene, view.fog);
const controls = bindCameraControls(view.rig, view.renderer.domElement);

let accumulator = 0;
let last = performance.now();

function frame(now: number): void {
  const frameMs = now - last;
  last = now;
  const result = fixedStep(accumulator, frameMs, TICK_MS, MAX_STEPS_PER_FRAME);
  accumulator = result.accumulator;
  for (let i = 0; i < result.steps; i++) stepWorld(world);

  const time = now / 1000;
  controls.update(Math.min(frameMs, 100) / 1000);
  view.rig.update(Math.min(frameMs, 100) / 1000);
  worldView.update(world, time, view.rig.pixelsPerUnit(view.renderer.domElement.height), view.rig.camera);
  view.render(time);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
