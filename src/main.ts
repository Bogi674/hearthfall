import { Vector3 } from 'three';
import { createAudio } from './audio/audio';
import { bindCameraControls } from './input/cameraControls';
import { bindPointer } from './input/pointer';
import { targetOf } from './input/pick';
import type { HouseLook, WallMode } from './render/houseView';
import { createInteraction } from './render/interaction';
import { createView } from './render/scene';
import { createWorldView } from './render/sync';
import { deleteSave, exportSave, latestSlot, loadGame, readSave, storeSave, type SlotId } from './save/save';
import { fixedStep } from './sim/loop';
import { BUILDINGS } from './data/buildings';
import { inHouse, maxStorey } from './sim/house';
import { currentPhase } from './sim/query';
import { createWorld, stepWorld, TICKS_PER_SECOND, type World } from './sim/world';
import { createHud, type UiState } from './ui/hud';
import { createLabels } from './ui/labels';
import { loadSettings, storeSettings } from './ui/settings';

const TICK_MS = 1000 / TICKS_PER_SECOND;
const MAX_STEPS_PER_FRAME = 10;
const HUD_INTERVAL_MS = 200;
const LOAD_KEY = 'hearthfall.loadOnStart';

const params = new URLSearchParams(location.search);

/** A load swaps the whole map, so it reloads the page and starts from the save. */
function startWorld(): { world: World; loaded: boolean } {
  try {
    const pending = sessionStorage.getItem(LOAD_KEY);
    sessionStorage.removeItem(LOAD_KEY);
    if (pending) return { world: loadGame(pending), loaded: true };
  } catch {
    // Fall through to a new run.
  }
  return { world: createWorld(Number(params.get('seed') ?? 1)), loaded: false };
}

/** Carries a save across the reload. Returns a note when the save cannot be used. */
function startFrom(text: string | null): string {
  if (!text) return 'That slot is empty.';
  try {
    loadGame(text);
    sessionStorage.setItem(LOAD_KEY, text);
  } catch (e) {
    return e instanceof Error && e.message.includes('version') ? e.message : 'Loading is blocked in this browser.';
  }
  location.href = location.pathname;
  return '';
}

const start = startWorld();
const world = start.world;
const settings = loadSettings();
const container = document.getElementById('app')!;
const view = createView(container, world.map.width);
const worldView = createWorldView(world, view);
const controls = bindCameraControls(view.rig, view.renderer.domElement);
const audio = createAudio();
const state: UiState = {
  placing: null, tool: null, rotated: false, walls: 'up', peek: false, storey: 0, levels: 'all', fill: false, rooms: false, selected: null, speed: 1, paused: false, buildOpen: true,
  buildCat: 'Shelter', tab: 'colonists', poi: null, squad: [], menu: false,
  // The page opens on the title screen. A new game opens with the story. A loaded save goes straight back to the game.
  title: !start.loaded && !params.has('play'),
  intro: !start.loaded && params.has('play'),
  view: 'main',
  seed: String(world.seed),
};
const hud = createHud(document.body, state, () => world, {
  focus: (x, y) => view.rig.target.set(x - world.map.width / 2, 0, y - world.map.height / 2),
  save: (slot) => (storeSave(world, slot) ? `Saved on day ${world.day}.` : 'Saving is blocked in this browser.'),
  load: (slot) => hud.say(startFrom(readSave(slot))),
  remove: (slot) => deleteSave(slot),
  continueRun: () => {
    const slot: SlotId | null = latestSlot();
    if (slot) hud.say(startFrom(readSave(slot)));
  },
  hasSave: () => latestSlot() !== null,
  newGame: (seed) => {
    if (seed === world.seed && world.tick === 0) [state.title, state.intro] = [false, true];
    else location.search = `?seed=${seed}&play=1`;
  },
  exportSave: () => exportSave(world),
  importSave: () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = () => input.files?.[0]?.text().then((text) => hud.say(startFrom(text) || ''), () => hud.say('That file could not be read.'));
    input.click();
  },
  toTitle: () => (location.href = location.pathname),
  settings,
  settingsChanged: () => storeSettings(settings),
});
const labels = createLabels(document.body);
/** The house opens up while the player holds Tab, builds in the house, or has a house piece selected. */
const showInside = (s: UiState) => s.tool !== null || (s.placing !== null && !!BUILDINGS[s.placing].furniture) || (typeof s.selected === 'number' && inHouse(world, s.selected));
const houseLook = (s: UiState): HouseLook => {
  const walls: WallMode = s.peek ? 'down' : showInside(s) && s.walls === 'up' ? 'cut' : s.walls;
  // Building on a lower floor cuts away the floors above it, so the work can be seen.
  const limit = s.levels === 'current' || (showInside(s) && s.storey < maxStorey(world)) ? s.storey : Infinity;
  return { walls, roofs: walls === 'up', storey: limit };
};
const interaction = createInteraction(view.scene);
const pointer = bindPointer(view.renderer.domElement, view.rig.camera, view.scene, state, () => world, interaction);

// Dev builds expose the world so browser scripts can set up scenes for visual checks.
if (import.meta.env.DEV) {
  const v = new Vector3();
  // Screen position of a tile, so browser scripts can point at things.
  const project = (x: number, y: number, h = 0) => {
    v.set(x - world.map.width / 2, h, y - world.map.height / 2).project(view.rig.camera);
    return { x: ((v.x + 1) / 2) * innerWidth, y: ((1 - v.y) / 2) * innerHeight };
  };
  Object.assign(window, { world, project, ui: state });
}

let accumulator = 0;
let last = performance.now();
let lastHud = 0;

function frame(now: number): void {
  const frameMs = now - last;
  last = now;
  const running = !state.paused && !state.menu && !state.intro && !state.title && !world.lost && !world.won;
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
  worldView.update(world, time, result.alpha, view.rig.pixelsPerUnit(view.renderer.domElement.height), view.rig.camera, houseLook(state));
  interaction.update(world, time, pointer.hover, state.selected === null ? null : targetOf(world, state.selected));
  labels.update(world, view.rig.camera, pointer, state.rooms || state.tool !== null);
  audio.update(world, Math.hypot(view.rig.target.x, view.rig.target.z), settings.volume);
  if (now - lastHud > HUD_INTERVAL_MS) {
    hud.update();
    lastHud = now;
  }
  view.render(time);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
