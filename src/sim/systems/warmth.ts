// Warmth map. Each tile holds 0 to 100. Recomputed only when its inputs change.
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

export function warmthSystem(world: World, _dt: number): void {
  const radius = hearthRadius(world);
  const key = `${world.temperature}|${radius}`;
  if (key === world.warmthKey) return;

  const { width, height } = world.map;
  const base = baselineWarmth(world.temperature);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const d = Math.hypot(x - world.hearth.x, y - world.hearth.y);
      world.warmth[y * width + x] = Math.round(Math.max(base, sourceWarmth(d, radius)));
    }
  }
  world.warmthKey = key;
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}
