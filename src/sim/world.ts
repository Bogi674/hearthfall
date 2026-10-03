import { BALANCE } from '../data/balance';
import type { BuildingType } from '../data/buildings';
import type { EnemyType } from '../data/enemies';
import { COLONIST_NAMES } from '../data/colonists';
import type { ItemId, PoiType } from '../data/pois';
import type { ComponentId } from '../data/vehicle';
import { NODE_AMOUNTS } from '../data/recipes';
import { RESOURCES, type Amounts, type Resource } from '../data/resources';
import { applyCommands, type Command } from './commands';
import type { MapState } from './grid';
import { generateMap } from './mapgen';
import { createRng, type RngState } from './rng';
import { jobsSystem } from './systems/jobs';
import { needsSystem } from './systems/needs';
import { combatSystem } from './systems/combat';
import { discoverySystem } from './systems/discovery';
import { expeditionsSystem } from './systems/expeditions';
import { hopeSystem } from './systems/hope';
import { pathfindingSystem } from './systems/pathfinding';
import { productionSystem } from './systems/production';
import { timeSystem } from './systems/time';
import { vehicleSystem } from './systems/vehicle';
import { warmthSystem } from './systems/warmth';
import { wavesSystem } from './systems/waves';

export const TICKS_PER_SECOND = 10;
export const TICK_SECONDS = 1 / TICKS_PER_SECOND;

export interface Hearth {
  x: number;
  y: number;
  level: number;
  lit: boolean;
  /** Seconds the hearth has been out without a break. */
  outSeconds: number;
  hp: number;
}

export type BuildingStatus = 'ok' | 'night' | 'noWorkers' | 'noDefender' | 'noInput' | 'noFuel' | 'noResource' | 'tooCold' | 'storageFull';

export interface Building {
  id: number;
  type: BuildingType;
  /** Top left tile and footprint after rotation. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Requested worker count. */
  workers: number;
  /** Seconds of work done on the current cycle. */
  progress: number;
  /** True once the inputs for the current cycle are taken from the stockpile. */
  loaded: boolean;
  status: BuildingStatus;
  hp: number;
  /** Lantern posts are lit for the night once their fuel is paid. */
  lit: boolean;
  /** Upgrade stage for buildings that have stages, such as the Lookout Post. */
  level: number;
}

export interface Colonist {
  id: number;
  name: string;
  /** Position in tile units, and the position one tick ago for render interpolation. */
  x: number;
  y: number;
  px: number;
  py: number;
  /** Needs and health run from 0 to 1. */
  health: number;
  hunger: number;
  rest: number;
  warmth: number;
  job: number | null;
  bed: number | null;
  /** Watchtower this colonist guards at night instead of sleeping. */
  duty: number | null;
  /** Expedition this colonist is away on. */
  expedition: number | null;
  asleep: boolean;
}

export interface World {
  seed: number;
  tick: number;
  day: number;
  /** Seconds into the current day. */
  dayTime: number;
  /** Outdoor temperature in degrees. */
  temperature: number;
  rng: RngState;
  commands: Command[];
  map: MapState;
  /** Units left in each resource node tile. */
  nodes: number[];
  /** Bumped when a tile changes, so renderers know to rebuild props. */
  mapRev: number;
  hearth: Hearth;
  /** Warmth 0 to 100 per tile, row major like map.tiles. */
  warmth: number[];
  /** Inputs the warmth map was last computed from. Renderers compare it to know when to refresh. */
  warmthKey: string;
  stock: Record<Resource, number>;
  buildings: Building[];
  colonists: Colonist[];
  nextId: number;
  enemies: Enemy[];
  wave: Wave;
  /** Flow fields toward the hearth: distance per tile for normal enemies and for runners. */
  flow: { key: string; normal: number[]; runner: number[] };
  /** Bumped when a building is placed or destroyed, so the flow field is rebuilt. */
  buildRev: number;
  pois: Poi[];
  /** Fog of war: 1 for revealed tiles, row major like map.tiles. */
  revealed: number[];
  /** Bumped when tiles are revealed, so renderers know to refresh. */
  revealRev: number;
  expeditions: Expedition[];
  items: Partial<Record<ItemId, number>>;
  /** Colony morale from 0 to 100 (section 6.5). */
  hope: number;
  /** Deaths since dusk, so dawn can reward a night without losses. */
  deathsTonight: number;
  airship: Airship;
  /** Set when the airship launches. The world stops advancing. */
  won: { score: number; aboard: string[]; leftBehind: string[] } | null;
  /** Everyone who died, for the score screen. */
  dead: { name: string; cause: string; day: number }[];
  /** Event log. Entries with a position let the UI focus the camera there. */
  log: { day: number; text: string; x?: number; y?: number }[];
  /** Set when the run is lost. The world stops advancing. */
  lost: string | null;
}

export interface Enemy {
  id: number;
  type: EnemyType;
  x: number;
  y: number;
  px: number;
  py: number;
  hp: number;
  /** Seconds until the next hit. */
  cooldown: number;
}

/** Forecast and spawn plan for one night (section 9.5). */
export interface Wave {
  night: number;
  threat: number;
  bloodMoon: boolean;
  /** Active edges: 0 north, 1 east, 2 south, 3 west. */
  edges: number[];
  plan: EnemyType[];
  spawned: number;
  /** The final horde of The Last Night. */
  final: boolean;
}

export interface Airship {
  built: ComponentId[];
  building: ComponentId | null;
  /** Seconds of dock work done on the component being built. */
  progress: number;
  /** The Last Night, once started: seconds elapsed and fuel loaded (section 11.1). */
  launch: { elapsed: number; fuel: number } | null;
}

export interface Poi {
  type: PoiType;
  x: number;
  y: number;
  /** Full searches done here. Each one reduces later loot (section 10.3). */
  clears: number;
  /** Discovery state (section 10.4). */
  seen: 'hidden' | 'rumored' | 'known';
}

export interface Expedition {
  id: number;
  poi: number;
  members: number[];
  stage: 'out' | 'search' | 'back';
  /** Squad position and the position one tick ago. */
  x: number;
  y: number;
  px: number;
  py: number;
  /** Waypoints still ahead: out through the gate to the POI, or back through the gate to the hearth. */
  route: { x: number; y: number }[];
  gate: { x: number; y: number };
  searchLeft: number;
  rollTimer: number;
  loot: Amounts;
  items: ItemId[];
  recruits: number;
}

export function createWorld(seed: number): World {
  const rng = createRng(seed);
  const { map, hearth, pois } = generateMap(rng);
  const stock = Object.fromEntries(RESOURCES.map((r) => [r, 0])) as Record<Resource, number>;
  Object.assign(stock, BALANCE.start.stock);
  const world: World = {
    seed,
    tick: 0,
    day: 1,
    dayTime: 0,
    temperature: BALANCE.temperature.day1,
    rng,
    commands: [],
    map,
    nodes: map.tiles.map((t) => NODE_AMOUNTS[t] ?? 0),
    mapRev: 0,
    hearth: { ...hearth, level: 1, lit: true, outSeconds: 0, hp: BALANCE.hearth.levels[0].hp },
    warmth: new Array<number>(map.width * map.height).fill(0),
    warmthKey: '',
    stock,
    buildings: [],
    colonists: [],
    nextId: 1,
    enemies: [],
    wave: { night: 0, threat: 0, bloodMoon: false, edges: [], plan: [], spawned: 0, final: false },
    flow: { key: '', normal: [], runner: [] },
    buildRev: 0,
    pois,
    revealed: new Array<number>(map.width * map.height).fill(0),
    revealRev: 0,
    expeditions: [],
    items: {},
    hope: BALANCE.hope.start,
    deathsTonight: 0,
    airship: { built: [], building: null, progress: 0, launch: null },
    won: null,
    dead: [],
    log: [],
    lost: null,
  };
  for (let i = 0; i < BALANCE.start.colonists; i++) {
    const a = (i / BALANCE.start.colonists) * Math.PI * 2;
    addColonist(world, hearth.x + Math.cos(a) * 3.3, hearth.y + Math.sin(a) * 3.3);
  }
  warmthSystem(world, 0);
  discoverySystem(world, 0);
  pathfindingSystem(world, 0);
  wavesSystem(world, 0);
  return world;
}

export function addLog(world: World, text: string, at?: { x: number; y: number }): void {
  world.log.push({ day: world.day, text, ...(at && { x: at.x, y: at.y }) });
  if (world.log.length > 50) world.log.shift();
}

export function addColonist(world: World, x: number, y: number): Colonist {
  const name = COLONIST_NAMES[(world.colonists.length + world.dead.length) % COLONIST_NAMES.length];
  const c: Colonist = {
    id: world.nextId++, name, x, y, px: x, py: y,
    health: 1, hunger: 1, rest: 1, warmth: 1, job: null, bed: null, duty: null, expedition: null, asleep: false,
  };
  world.colonists.push(c);
  return c;
}

/** Logs a death and records it for the score screen. The caller removes colonists with health at 0. */
export function recordDeath(world: World, c: Colonist, cause: string): void {
  c.health = 0;
  world.hope = Math.max(0, world.hope + BALANCE.hope.death);
  world.deathsTonight++;
  world.dead.push({ name: c.name, cause, day: world.day });
  addLog(world, `${c.name} ${cause}.`, c);
}

export function stepWorld(world: World): void {
  if (world.lost || world.won) return;
  applyCommands(world);
  timeSystem(world, TICK_SECONDS);
  wavesSystem(world, TICK_SECONDS);
  warmthSystem(world, TICK_SECONDS);
  pathfindingSystem(world, TICK_SECONDS);
  jobsSystem(world, TICK_SECONDS);
  needsSystem(world, TICK_SECONDS);
  expeditionsSystem(world, TICK_SECONDS);
  discoverySystem(world, TICK_SECONDS);
  productionSystem(world, TICK_SECONDS);
  combatSystem(world, TICK_SECONDS);
  vehicleSystem(world, TICK_SECONDS);
  hopeSystem(world, TICK_SECONDS);
  if (world.hearth.hp <= 0) world.lost = 'The hearth was destroyed.';
  else if (world.hearth.outSeconds >= BALANCE.hearth.outLossSeconds) world.lost = 'The hearth went out.';
  else if (world.colonists.length === 0) world.lost = 'Everyone is dead.';
}
