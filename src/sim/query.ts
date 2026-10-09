// Read only helpers shared by systems, commands, and UI.
import { BALANCE } from '../data/balance';
import { BUILDINGS } from '../data/buildings';
import { RESOURCES, type Amounts } from '../data/resources';
import { BERTH, SEATS } from '../data/vehicle';
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

/** True once builders have finished it (section 8.2). Sites do nothing until then. */
export const isBuilt = (b: Building) => b.construct <= 0;

export function capacity(world: World): number {
  return world.buildings.reduce<number>((s, b) => s + (isBuilt(b) ? (BUILDINGS[b.type].storage ?? 0) : 0), BALANCE.start.storage);
}

export interface LightSource {
  x: number;
  y: number;
  r: number;
}

/** Every light in the colony: the hearth, lit lanterns and heaters, and the small glow of finished buildings (section 5.3). */
export function lightSources(world: World): LightSource[] {
  const out: LightSource[] = [];
  if (world.hearth.lit) out.push({ x: world.hearth.x, y: world.hearth.y, r: hearthStage(world).radius });
  for (const b of world.buildings) {
    if (!isBuilt(b)) continue;
    const def = BUILDINGS[b.type];
    let r = def.glow ?? 0;
    if (b.lit && def.light) r = Math.max(r, def.light.radius);
    if (b.lit && def.heat) r = Math.max(r, def.heat.radius);
    if (r > 0) out.push({ ...center(b), r });
  }
  return out;
}

export type LightStep = (typeof BALANCE.light.steps)[number];

/** The strongest light step over a point, or null in the dark. Steps are shares of each light's radius. */
export function lightStepAt(sources: LightSource[], x: number, y: number): LightStep | null {
  let best: LightStep | null = null;
  for (const l of sources) {
    const d = Math.hypot(x - l.x, y - l.y) / l.r;
    const step = BALANCE.light.steps.find((s) => d <= s.reach);
    if (step && (!best || step.damage < best.damage)) best = step;
  }
  return best;
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

/** Threat points for night n (section 9.5). Every fifth night is a Blood Moon with double threat. */
export function nightThreat(n: number): number {
  const W = BALANCE.waves;
  if (n < W.firstNight) return 0;
  return Math.round(W.base * W.growth ** (n - 1)) * (n % W.bloodMoonEvery === 0 ? 2 : 1);
}

const DIRECTIONS = ['east', 'south east', 'south', 'south west', 'west', 'north west', 'north', 'north east'];

/** Compass direction from the hearth, for rumors such as "something to the north". */
export function directionFromHearth(world: World, x: number, y: number): string {
  const a = Math.atan2(y - world.hearth.y, x - world.hearth.x);
  return DIRECTIONS[(Math.round(a / (Math.PI / 4)) + 8) % 8];
}

/** True on the first tick of the named phase. */
export function phaseStarted(world: World, name: string, dt: number): boolean {
  const p = currentPhase(world);
  return p.name === name && p.seconds - p.left < dt - 1e-9;
}

export const hearthStage = (world: World) => BALANCE.hearth.levels[world.hearth.level - 1];

/** Work speed multiplier from hope (section 6.5). */
export function hopeSpeed(world: World): number {
  return world.hope < BALANCE.hope.lowBelow ? BALANCE.hope.lowWorkSpeed : 1;
}

/** Seats aboard the airship: the Frame gives the base seats and each Berth Deck adds more (section 11.2). */
export const seatCount = (world: World): number => (world.airship.built.includes('frame') ? SEATS.base : 0) + world.airship.berths * BERTH.seats;
