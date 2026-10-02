import { createAudio } from './audio/audio';
import { bindCameraControls } from './input/cameraControls';
import { bindPointer } from './input/pointer';
import { createView } from './render/scene';
import { createWorldView } from './render/sync';
import { loadGame, readSave, storeSave } from './save/save';
import { fixedStep } from './sim/loop';
import { currentPhase } from './sim/query';
import { createWorld, stepWorld, TICKS_PER_SECOND, type World } from './sim/world';
import { createHud, type UiState } from './ui/hud';
import { createLabels } from './ui/labels';
import { loadSettings, storeSettings } from './ui/settings';

const TICK_MS = 1000 / TICKS_PER_SECOND;
const MAX_STEPS_PER_FRAME = 10;
const HUD_INTERVAL_MS = 200;
const LOAD_KEY = 'hearthfall.loadOnStart';

/** A load swaps the whole map, so it reloads the page and starts from the save. */
function startWorld(): World {
  try {
    const pending = sessionStorage.getItem(LOAD_KEY);
    sessionStorage.removeItem(LOAD_KEY);
    if (pending) return loadGame(pending);
  } catch {
    // Fall through to a new run.
  }
  return createWorld(Number(new URLSearchParams(location.search).get('seed') ?? 1));
}

const world = startWorld();
const settings = loadSettings();
const container = document.getElementById('app')!;
const view = createView(container, world.map.width);
const worldView = createWorldView(world, view.scene, view.fog);
const controls = bindCameraControls(view.rig, view.renderer.domElement);
const audio = createAudio();
const state: UiState = {
  placing: null, rotated: false, selected: null, speed: 1, paused: false, buildOpen: true,
  buildCat: 'Shelter', tab: 'colonists', poi: null, squad: [], menu: false,
};
const hud = createHud(document.body, state, () => world, {
  focus: (x, y) => view.rig.target.set(x - world.map.width / 2, 0, y - world.map.height / 2),
  save: () => (storeSave(world) ? `Saved on day ${world.day}.` : 'Saving is blocked in this browser.'),
  load: () => {
    const text = readSave();
    if (!text) return;
    try {
      sessionStorage.setItem(LOAD_KEY, text);
      location.reload();
    } catch {
      // Without session storage the save cannot be carried across the reload.
    }
  },
  newRun: () => (location.search = `?seed=${Math.floor(Math.random() * 1e9)}`),
  hasSave: () => readSave() !== null,
  settings,
  settingsChanged: () => storeSettings(settings),
});
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
  const running = !state.paused && !state.menu && !world.lost && !world.won;
  const result = fixedStep(running ? accumulator : 0, running ? frameMs * state.speed : 0, TICK_MS, MAX_STEPS_PER_FRAME);
  accumulator = result.accumulator;
  for (let i = 0; i < result.steps; i++) {
    const before = currentPhase(world).name;
    const spawned = world.wave.spawned;
    const buildings = world.buildings.length;
    stepWorld(world);
    const after = currentPhase(world).name;
    if (world.wave.spawned > 0 && spawned === 0) audio.stinger('wave');
    if (world.buildings.length < buildings && after === 'Night') audio.stinger('breach');
    if (before !== 'Dawn' && after === 'Dawn') storeSave(world);
    if (before !== 'Dusk' && after === 'Dusk') {
      audio.stinger('dusk');
      // The prototype auto pauses when dusk starts, unless the setting is off (section 3.2).
      if (settings.autoPause) {
        state.paused = true;
        accumulator = 0;
        break;
      }
    }
  }

  const time = now / 1000;
  const dt = Math.min(frameMs, 100) / 1000;
  controls.update(dt);
  view.rig.update(dt);
  pointer.update(world);
  worldView.update(world, time, result.alpha, view.rig.pixelsPerUnit(view.renderer.domElement.height), view.rig.camera);
  labels.update(world, view.rig.camera, pointer);
  audio.update(world, Math.hypot(view.rig.target.x, view.rig.target.z), settings.volume);
  if (now - lastHud > HUD_INTERVAL_MS) {
    hud.update();
    lastHud = now;
  }
  view.render(time);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
