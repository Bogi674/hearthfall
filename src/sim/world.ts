import { BALANCE } from '../data/balance';
import type { Command } from './commands';
import type { MapState } from './grid';
import { generateMap } from './mapgen';
import { createRng, type RngState } from './rng';
import { timeSystem } from './systems/time';
import { warmthSystem } from './systems/warmth';

export const TICKS_PER_SECOND = 10;
export const TICK_SECONDS = 1 / TICKS_PER_SECOND;

export interface Hearth {
  x: number;
  y: number;
  level: number;
}

export interface World {
  seed: number;
  tick: number;
  day: number;
  /** Outdoor temperature in degrees. */
  temperature: number;
  rng: RngState;
  commands: Command[];
  map: MapState;
  hearth: Hearth;
  /** Warmth 0 to 100 per tile, row major like map.tiles. */
  warmth: number[];
  /** Inputs the warmth map was last computed from. Renderers compare it to know when to refresh. */
  warmthKey: string;
}

export function createWorld(seed: number): World {
  const rng = createRng(seed);
  const { map, hearth } = generateMap(rng);
  const world: World = {
    seed,
    tick: 0,
    day: 1,
    temperature: BALANCE.temperature.day1,
    rng,
    commands: [],
    map,
    hearth: { ...hearth, level: 1 },
    warmth: new Array<number>(map.width * map.height).fill(0),
    warmthKey: '',
  };
  warmthSystem(world, 0);
  return world;
}

export function stepWorld(world: World): void {
  world.commands.length = 0;
  timeSystem(world, TICK_SECONDS);
  warmthSystem(world, TICK_SECONDS);
}
