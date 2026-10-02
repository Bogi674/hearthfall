import { BALANCE } from '../data/balance';
import type { BuildingType } from '../data/buildings';
import type { EnemyType } from '../data/enemies';
import { COLONIST_NAMES } from '../data/colonists';
import { NODE_AMOUNTS } from '../data/recipes';
import { RESOURCES, type Resource } from '../data/resources';
import { applyCommands, type Command } from './commands';
import type { MapState } from './grid';
import { generateMap } from './mapgen';
import { createRng, type RngState } from './rng';
import { jobsSystem } from './systems/jobs';
import { needsSystem } from './systems/needs';
import { combatSystem } from './systems/combat';
import { pathfindingSystem } from './systems/pathfinding';
import { productionSystem } from './systems/production';
import { timeSystem } from './systems/time';
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
  log: { day: number; text: string }[];
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
}

export function createWorld(seed: number): World {
  const rng = createRng(seed);
  const { map, hearth } = generateMap(rng);
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
    hearth: { ...hearth, level: 1, lit: true, outSeconds: 0, hp: BALANCE.defense.hearthHp },
    warmth: new Array<number>(map.width * map.height).fill(0),
    warmthKey: '',
    stock,
    buildings: [],
    colonists: [],
    nextId: 1,
    enemies: [],
    wave: { night: 0, threat: 0, bloodMoon: false, edges: [], plan: [], spawned: 0 },
    flow: { key: '', normal: [], runner: [] },
    buildRev: 0,
    log: [],
    lost: null,
  };
  for (let i = 0; i < BALANCE.start.colonists; i++) {
    const a = (i / BALANCE.start.colonists) * Math.PI * 2;
    const x = hearth.x + Math.cos(a) * 2.5;
    const y = hearth.y + Math.sin(a) * 2.5;
    world.colonists.push({
      id: world.nextId++, name: COLONIST_NAMES[i % COLONIST_NAMES.length], x, y, px: x, py: y,
      health: 1, hunger: 1, rest: 1, warmth: 1, job: null, bed: null, duty: null, asleep: false,
    });
  }
  warmthSystem(world, 0);
  pathfindingSystem(world, 0);
  wavesSystem(world, 0);
  return world;
}

export function addLog(world: World, text: string): void {
  world.log.push({ day: world.day, text });
  if (world.log.length > 50) world.log.shift();
}

export function stepWorld(world: World): void {
  if (world.lost) return;
  applyCommands(world);
  timeSystem(world, TICK_SECONDS);
  wavesSystem(world, TICK_SECONDS);
  warmthSystem(world, TICK_SECONDS);
  pathfindingSystem(world, TICK_SECONDS);
  jobsSystem(world, TICK_SECONDS);
  needsSystem(world, TICK_SECONDS);
  productionSystem(world, TICK_SECONDS);
  combatSystem(world, TICK_SECONDS);
  if (world.hearth.hp <= 0) world.lost = 'The hearth was destroyed.';
  else if (world.hearth.outSeconds >= BALANCE.hearth.outLossSeconds) world.lost = 'The hearth went out.';
  else if (world.colonists.length === 0) world.lost = 'Everyone is dead.';
}
