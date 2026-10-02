// Read only helpers shared by systems, commands, and UI.
import { BALANCE } from '../data/balance';
import { BUILDINGS } from '../data/buildings';
import { RESOURCES, type Amounts } from '../data/resources';
import type { Building, World } from './world';

const W = BALANCE.warmth;
export const DAY_SECONDS = BALANCE.phases.reduce((s, p) => s + p.seconds, 0);

export function currentPhase(world: World) {
  let t = world.dayTime;
  for (const p of BALANCE.phases) {
    if (t < p.seconds) return { ...p, left: p.seconds - t };
    t -= p.seconds;
  }
  const last = BALANCE.phases[BALANCE.phases.length - 1];
  return { ...last, left: 0 };
}

export type WarmthBand = 'warm' | 'cold' | 'freezing';

export function bandAt(world: World, x: number, y: number): WarmthBand {
  const { width, height } = world.map;
  const tx = Math.min(width - 1, Math.max(0, Math.round(x)));
  const ty = Math.min(height - 1, Math.max(0, Math.round(y)));
  const w = world.warmth[ty * width + tx];
  return w >= W.warmThreshold ? 'warm' : w >= W.freezingThreshold ? 'cold' : 'freezing';
}

export function center(b: Building): { x: number; y: number } {
  return { x: b.x + (b.w - 1) / 2, y: b.y + (b.h - 1) / 2 };
}

export function capacity(world: World): number {
  return world.buildings.reduce<number>((s, b) => s + (BUILDINGS[b.type].storage ?? 0), BALANCE.start.storage);
}

export function stockTotal(world: World): number {
  return RESOURCES.reduce((s, r) => s + world.stock[r], 0);
}

/** Returns the first resource the stock is short of, or null if it covers the amounts. */
export function missing(world: World, amounts: Amounts): string | null {
  for (const [r, n] of Object.entries(amounts) as [keyof typeof world.stock, number][]) {
    if (world.stock[r] < n) return r;
  }
  return null;
}

export function pay(world: World, amounts: Amounts): void {
  for (const [r, n] of Object.entries(amounts) as [keyof typeof world.stock, number][]) world.stock[r] -= n;
}
