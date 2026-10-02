import { bindCameraControls } from './input/cameraControls';
import { bindPointer } from './input/pointer';
import { createView } from './render/scene';
import { createWorldView } from './render/sync';
import { fixedStep } from './sim/loop';
import { currentPhase } from './sim/query';
import { createWorld, stepWorld, TICKS_PER_SECOND } from './sim/world';
import { createHud, type UiState } from './ui/hud';
import { createLabels } from './ui/labels';

const TICK_MS = 1000 / TICKS_PER_SECOND;
const MAX_STEPS_PER_FRAME = 10;
const HUD_INTERVAL_MS = 200;

const seed = Number(new URLSearchParams(location.search).get('seed') ?? 1);
const world = createWorld(seed);
const container = document.getElementById('app')!;
const view = createView(container, world.map.width);
const worldView = createWorldView(world, view.scene, view.fog);
const controls = bindCameraControls(view.rig, view.renderer.domElement);
const state: UiState = { placing: null, rotated: false, selected: null, speed: 1, paused: false, buildOpen: true, tab: 'colonists', poi: null, squad: [] };
const hud = createHud(document.body, state, () => world, (x, y) => view.rig.target.set(x - world.map.width / 2, 0, y - world.map.height / 2));
const labels = createLabels(document.body);
const pointer = bindPointer(view.renderer.domElement, view.rig.camera, view.scene, state, () => world);

// Dev builds expose the world so browser scripts can set up scenes for visual checks.
if (import.meta.env.DEV) Object.assign(window, { world });

let accumulator = 0;
let last = performance.now();
let lastHud = 0;

function frame(now: number): void {
  const frameMs = now - last;
  last = now;
  const running = !state.paused && !world.lost;
  const result = fixedStep(running ? accumulator : 0, running ? frameMs * state.speed : 0, TICK_MS, MAX_STEPS_PER_FRAME);
  accumulator = result.accumulator;
  for (let i = 0; i < result.steps; i++) {
    const before = currentPhase(world).name;
    stepWorld(world);
    // The prototype auto pauses when dusk starts (section 3.2).
    if (before !== 'Dusk' && currentPhase(world).name === 'Dusk') {
      state.paused = true;
      accumulator = 0;
      break;
    }
  }

  const time = now / 1000;
  const dt = Math.min(frameMs, 100) / 1000;
  controls.update(dt);
  view.rig.update(dt);
  pointer.update(world);
  worldView.update(world, time, result.alpha, view.rig.pixelsPerUnit(view.renderer.domElement.height), view.rig.camera);
  labels.update(world, view.rig.camera, pointer);
  if (now - lastHud > HUD_INTERVAL_MS) {
    hud.update();
    lastHud = now;
  }
  view.render(time);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
