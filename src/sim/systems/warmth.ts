// Hearth fuel and the warmth map. Each tile holds 0 to 100. The map is recomputed only when its inputs change.
import { BALANCE } from '../../data/balance';
import type { World } from '../world';

const CFG = BALANCE.warmth;

export function baselineWarmth(temperature: number): number {
  return clamp(CFG.baselineAtZero + Math.min(0, temperature) * CFG.perDegree, 0, 100);
}

/** Warmth a heat source gives a tile at distance d. Full heat at the center, warm threshold at the radius edge. */
export function sourceWarmth(d: number, radius: number): number {
  if (d <= radius) return 100 - (100 - CFG.warmThreshold) * (d / radius);
  return Math.max(0, CFG.warmThreshold * (1 - (d - radius) / CFG.edgeFalloff));
}

export function hearthRadius(world: World): number {
  return BALANCE.hearth.levels[world.hearth.level - 1].radius;
}

export function warmthSystem(world: World, dt: number): void {
  const h = world.hearth;
  const burn = (BALANCE.hearth.levels[h.level - 1].fuelPerMinute / 60) * dt;
  h.lit = world.stock.fuel >= burn;
  world.stock.fuel = Math.max(0, world.stock.fuel - burn);
  h.outSeconds = h.lit ? 0 : h.outSeconds + dt;

  const radius = h.lit ? hearthRadius(world) : 0;
  const key = `${world.temperature}|${radius}`;
  if (key === world.warmthKey) return;

  const { width, height } = world.map;
  const base = baselineWarmth(world.temperature);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const d = Math.hypot(x - world.hearth.x, y - world.hearth.y);
      world.warmth[y * width + x] = Math.round(radius > 0 ? Math.max(base, sourceWarmth(d, radius)) : base);
    }
  }
  world.warmthKey = key;
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}
