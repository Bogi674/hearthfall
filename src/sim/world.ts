import type { Command } from './commands';
import { createRng, type RngState } from './rng';
import { timeSystem } from './systems/time';

export const TICKS_PER_SECOND = 10;
export const TICK_SECONDS = 1 / TICKS_PER_SECOND;

export interface World {
  seed: number;
  tick: number;
  rng: RngState;
  commands: Command[];
}

export function createWorld(seed: number): World {
  return {
    seed,
    tick: 0,
    rng: createRng(seed),
    commands: [],
  };
}

export function stepWorld(world: World): void {
  world.commands.length = 0;
  timeSystem(world, TICK_SECONDS);
}
