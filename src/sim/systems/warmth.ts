// Hearth fuel and the warmth map. Each tile holds 0 to 100. The map is recomputed only when its inputs change.
import { BALANCE } from '../../data/balance';
import { BUILDINGS } from '../../data/buildings';
import { isIndoors, stepBlocked } from '../house';
import { fuelFactor, weatherNow } from '../query';
import type { World } from '../world';

const CFG = BALANCE.warmth;

export function baselineWarmth(temperature: number): number {
  return clamp(CFG.baselineAtZero + Math.min(0, temperature) * CFG.perDegree, 0, 100);
}

/** Warmth a heat source gives a tile at distance d. Full heat at the center, warm threshold at the radius edge. */
export function sourceWarmth(d: number, radius: number): number {
  if (d <= radius) return 100 - (100 - CFG.warmThreshold) * (d / radius);
  return Math.max(0, CFG.warmThreshold * (1 - (d - radius) / (radius * CFG.edgeFalloff)));
}

export function hearthRadius(world: World): number {
  return BALANCE.hearth.levels[world.hearth.level - 1].radius;
}

/**
 * How far heat gets from a source, in tiles. Open ground and doors cost the straight distance. Each wall or window it passes adds a few
 * tiles, so a closed room holds its heat and a wall shades the ground behind it without cutting it off.
 */
function heatDistances(world: World, sx: number, sy: number, reach: number): Map<number, number> {
  const { width, height } = world.map;
  const dist = new Map<number, number>([[sy * width + sx, 0]]);
  const heap: [number, number][] = [[0, sy * width + sx]];
  const push = (v: [number, number]) => {
    heap.push(v);
    for (let i = heap.length - 1; i > 0; ) {
      const p = (i - 1) >> 1;
      if (heap[p][0] <= heap[i][0]) break;
      [heap[p], heap[i]] = [heap[i], heap[p]];
      i = p;
    }
  };
  const pop = (): [number, number] => {
    const top = heap[0];
    const last = heap.pop()!;
    if (heap.length) {
      heap[0] = last;
      for (let i = 0; ; ) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
        if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
        if (m === i) break;
        [heap[m], heap[i]] = [heap[i], heap[m]];
        i = m;
      }
    }
    return top;
  };
  while (heap.length) {
    const [d, i] = pop();
    if (d > (dist.get(i) ?? Infinity)) continue;
    const x = i % width;
    const y = (i - x) / width;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const wall = (ax: number, ay: number, bx: number, by: number) => (stepBlocked(world, ax, ay, bx, by) ? CFG.wallCost : 0);
        // A diagonal step takes the cheaper way around the corner.
        const through = dx !== 0 && dy !== 0 ? Math.min(wall(x, y, nx, y) + wall(nx, y, nx, ny), wall(x, y, x, ny) + wall(x, ny, nx, ny)) : wall(x, y, nx, ny);
        const nd = d + through + (dx !== 0 && dy !== 0 ? Math.SQRT2 : 1);
        if (nd > reach) continue;
        const n = ny * width + nx;
        if (nd < (dist.get(n) ?? Infinity)) {
          dist.set(n, nd);
          push([nd, n]);
        }
      }
    }
  }
  return dist;
}

export function warmthSystem(world: World, dt: number): void {
  const h = world.hearth;
  const cold = fuelFactor(world);
  // A hearth nobody has lit yet only smolders. It burns no fuel and cannot be lost.
  const burn = h.ignited ? (BALANCE.hearth.levels[h.level - 1].fuelPerMinute / 60) * dt * cold : 0;
  h.lit = h.ignited && world.stock.fuel >= burn;
  world.stock.fuel = Math.max(0, world.stock.fuel - burn);
  h.outSeconds = h.lit || !h.ignited ? 0 : h.outSeconds + dt;

  // Heaters burn their own fuel and add smaller warm radii (section 5.1).
  const sources = h.lit ? [{ x: h.x, y: h.y, r: hearthRadius(world) }] : [];
  for (const b of world.buildings) {
    const heat = BUILDINGS[b.type].heat;
    if (!heat || b.construct > 0) continue;
    const fuel = (heat.fuelPerMinute / 60) * dt * cold;
    b.lit = world.stock.fuel >= fuel;
    world.stock.fuel = Math.max(0, world.stock.fuel - fuel);
    b.status = b.lit ? 'ok' : 'noFuel';
    if (b.lit) sources.push({ x: b.x, y: b.y, r: heat.radius });
  }
  // In a blizzard the wind pushes heat back. Closed rooms keep their full reach. Walls change where heat goes, so the layout is part of the key.
  const reach = weatherNow(world).heatReach;
  const key = `${world.temperature}|${reach}|${world.buildRev}|${sources.map((s) => `${s.x},${s.y},${s.r}`).join(';')}`;
  if (key === world.warmthKey) return;

  const { width } = world.map;
  const base = baselineWarmth(world.temperature);
  world.warmth.fill(Math.round(base));
  for (const s of sources) {
    const span = s.r * (1 + CFG.edgeFalloff);
    const dist = heatDistances(world, s.x, s.y, span * 1.1 + 1);
    for (const [i, path] of dist) {
      const x = i % width;
      const y = (i - x) / width;
      // Open ground gives the straight distance. A detour around walls is longer, and heat follows it.
      const d = Math.max(Math.hypot(x - s.x, y - s.y), path * 0.92);
      const indoors = isIndoors(world, x, y);
      const shrink = reach < 1 && !indoors ? reach : 1;
      const w = Math.min(100, sourceWarmth(d, s.r * shrink) + (indoors ? CFG.indoorBonus : 0));
      if (Math.round(w) > world.warmth[i]) world.warmth[i] = Math.round(w);
    }
  }
  world.warmthKey = key;
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}
