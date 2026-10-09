import { BALANCE } from '../data/balance';
import type { BuildingType } from '../data/buildings';
import type { EdgeKind, FloorId } from '../data/house';
import type { EnemyType } from '../data/enemies';
import { COLONIST_NAMES } from '../data/colonists';
import type { ItemId, PoiType } from '../data/pois';
import type { ComponentId } from '../data/vehicle';
import { WEAPON_IDS, type WeaponId } from '../data/weapons';
import { NODE_AMOUNTS } from '../data/recipes';
import { RESOURCES, type Amounts, type Resource } from '../data/resources';
import { applyCommands, type Command } from './commands';
import type { MapState } from './grid';
import { generateMap } from './mapgen';
import { placeBuilding } from './placement';
import { createRng, type RngState } from './rng';
import { nextWeather, temperatureFor, type WeatherKind } from './weather';
import { arrivalsSystem } from './systems/arrivals';
import { jobsSystem } from './systems/jobs';
import { needsSystem } from './systems/needs';
import { combatSystem } from './systems/combat';
import { constructionSystem } from './systems/construction';
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

export type BuildingStatus = 'ok' | 'night' | 'noWorkers' | 'noDefender' | 'noInput' | 'noFuel' | 'noResource' | 'tooCold' | 'storageFull' | 'building' | 'sheltering';

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
  /** Seconds of builder work left. 0 once the building is finished (section 8.2). */
  construct: number;
  /** Node tile a gatherer is working on, or -1. Workers stand next to it. */
  node: number;
  /** Workers take shelter inside instead of working (section 9.7). */
  shelter: boolean;
  /** Weapon an armory crafts. */
  craft: WeaponId;
  /** Seconds of builder work left to take it apart for salvage, or null when it is not marked. */
  salvage: number | null;
  /** Storey the building stands on. Only house furniture leaves the ground (M11). */
  storey: number;
}

/** One tile of house floor. It is a construction site until construct reaches 0. */
export interface HouseFloor {
  id: number;
  x: number;
  y: number;
  /** 0 is the ground floor. */
  storey: number;
  kind: FloorId;
  construct: number;
}

/**
 * A wall, door, or window on the border between two tiles. The edge belongs to tile (x, y) and its
 * north neighbor when side is 'n', or its west neighbor when side is 'w'.
 */
export interface HouseEdge {
  id: number;
  x: number;
  y: number;
  storey: number;
  side: 'n' | 'w';
  kind: EdgeKind;
  /** Stage in EDGES[kind].levels, starting at 1. */
  level: number;
  hp: number;
  construct: number;
  /** An upgrade or a change of kind in progress. The old piece stands until it is done. */
  pending: { kind: EdgeKind; level: number; left: number } | null;
}

export interface House {
  floors: HouseFloor[];
  edges: HouseEdge[];
}

/** What a colonist is doing right now. The renderer picks an animation from it. */
export type Task = 'idle' | 'walk' | 'build' | 'work' | 'sleep' | 'guard' | 'shelter' | 'eat' | 'mingle';

export interface Colonist {
  id: number;
  name: string;
  /** Position in tile units, and the position one tick ago for render interpolation. */
  x: number;
  y: number;
  px: number;
  py: number;
  /** Storey the colonist stands on. */
  storey: number;
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
  task: Task;
  /** Construction site this colonist is building. */
  site: number | null;
  weapon: WeaponId;
  /** Seconds until this colonist can hit or fire again. */
  cooldown: number;
  /** Waypoints to the current target, ending at the target. Empty means walk straight. */
  route: { x: number; y: number; storey?: number }[];
  /** The target and house layout the route was made for. */
  routeKey: string;
}

export interface World {
  seed: number;
  tick: number;
  day: number;
  /** Seconds into the current day. */
  dayTime: number;
  /** Outdoor temperature in degrees. */
  temperature: number;
  /** Today's weather and the forecast for tomorrow (M10.2). */
  weather: WeatherKind;
  weatherNext: WeatherKind;
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
  house: House;
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
  /** Spare weapons on the armory rack (section 9.6). */
  weapons: Record<WeaponId, number>;
  /** Everyone takes cover: workers shelter and defenders man their posts (section 9.7). */
  alarm: boolean;
  /** Colony morale from 0 to 100 (section 6.5). */
  hope: number;
  /** Deaths since dusk, so dawn can reward a night without losses. */
  deathsTonight: number;
  /** Colonist seconds spent at a table or sofa this evening. It lifts hope at dawn. */
  socialSeconds: number;
  /** The most colonists asleep on mats, with no bed, at one time since dusk. It costs hope at dawn. */
  matSleepers: number;
  airship: Airship;
  /** A stranger walking in from the dark toward the hearth, or null (section 6.6). */
  drifter: { x: number; y: number; px: number; py: number } | null;
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
  /** Can damage walls, buildings, and the house. Rolled at spawn (section 9.4). */
  breaker: boolean;
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
  /** The old owner's blueprint has been found. Nothing can be built before it (section 11.2). */
  blueprint: boolean;
  /** Top left tile of the launch pad the crew chose, or null before the Moot (section 11.2). */
  site: { x: number; y: number } | null;
  /** Berth Decks built, each adding seats. */
  berths: number;
  built: ComponentId[];
  building: ComponentId | 'berth' | null;
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
    temperature: temperatureFor(1, BALANCE.weather.firstDay, 'Day'),
    weather: BALANCE.weather.firstDay,
    weatherNext: nextWeather(seed, 1, BALANCE.weather.firstDay),
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
    house: { floors: [], edges: [] },
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
    weapons: Object.fromEntries(WEAPON_IDS.map((id) => [id, 0])) as Record<WeaponId, number>,
    alarm: false,
    hope: BALANCE.hope.start,
    deathsTonight: 0,
    socialSeconds: 0,
    matSleepers: 0,
    drifter: null,
    airship: { blueprint: false, site: null, berths: 0, built: [], building: null, progress: 0, launch: null },
    won: null,
    dead: [],
    log: [],
    lost: null,
  };
  for (let i = 0; i < BALANCE.start.colonists; i++) {
    const a = (i / BALANCE.start.colonists) * Math.PI * 2;
    addColonist(world, hearth.x + Math.cos(a) * BALANCE.colonist.idleRadius, hearth.y + Math.sin(a) * BALANCE.colonist.idleRadius);
  }
  // The survivors arrived with a hand cart of supplies. It is the first storage (section 7.2).
  const cart = BALANCE.start.cart;
  placeBuilding(world, 'supplyCart', hearth.x + cart.x, hearth.y + cart.y, false, true);
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
    id: world.nextId++, name, x, y, px: x, py: y, storey: 0,
    health: 1, hunger: 1, rest: 1, warmth: 1, job: null, bed: null, duty: null, expedition: null, asleep: false,
    task: 'idle', site: null, weapon: BALANCE.start.weapon, cooldown: 0, route: [], routeKey: '',
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
  constructionSystem(world, TICK_SECONDS);
  needsSystem(world, TICK_SECONDS);
  expeditionsSystem(world, TICK_SECONDS);
  discoverySystem(world, TICK_SECONDS);
  productionSystem(world, TICK_SECONDS);
  combatSystem(world, TICK_SECONDS);
  vehicleSystem(world, TICK_SECONDS);
  hopeSystem(world, TICK_SECONDS);
  arrivalsSystem(world, TICK_SECONDS);
  if (world.hearth.hp <= 0) world.lost = 'The hearth was destroyed.';
  else if (world.hearth.outSeconds >= BALANCE.hearth.outLossSeconds) world.lost = 'The hearth went out.';
  else if (world.colonists.length === 0) world.lost = 'Everyone is dead.';
}
