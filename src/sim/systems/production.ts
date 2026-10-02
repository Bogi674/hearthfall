// Production buildings: workers, inputs, gathering from nodes, warmth, and storage (section 7.3).
import { BALANCE } from '../../data/balance';
import { BUILDINGS } from '../../data/buildings';
import { RECIPES } from '../../data/recipes';
import type { Amounts } from '../../data/resources';
import { Tile } from '../grid';
import { bandAt, capacity, center, currentPhase, missing, pay, stockTotal } from '../query';
import type { Building, World } from '../world';

export function productionSystem(world: World, dt: number): void {
  const work = currentPhase(world).work;
  for (const b of world.buildings) {
    const recipe = RECIPES[b.type];
    if (!recipe) continue;
    const slots = BUILDINGS[b.type].workers;
    const at = center(b);
    const crew = world.colonists.filter(
      (c) => c.job === b.id && Math.hypot(c.x - at.x, c.y - at.y) < BALANCE.colonist.arriveDistance,
    );
    const band = bandAt(world, at.x, at.y);
    const node = recipe.gather ? findNode(world, at, recipe.gather.tile, recipe.gather.radius) : -1;

    if (!work) b.status = 'night';
    else if (crew.length === 0) b.status = 'noWorkers';
    else if (node === null) b.status = 'noResource';
    else if (band === 'freezing') b.status = 'tooCold';
    else if (!b.loaded && recipe.inputs && missing(world, recipe.inputs)) b.status = 'noInput';
    else {
      if (!b.loaded && recipe.inputs) pay(world, recipe.inputs);
      b.loaded = true;
      const speed = crew.reduce((s, c) => s + (c.rest > 0 ? 1 : BALANCE.needs.tiredWorkSpeed), 0) / slots;
      b.progress = Math.min(recipe.cycle, b.progress + dt * speed * (band === 'cold' ? BALANCE.production.coldSpeed : 1));
      b.status = 'ok';
      if (b.progress >= recipe.cycle) finishCycle(world, b, recipe.outputs, node);
    }
  }
}

function finishCycle(world: World, b: Building, outputs: Amounts, node: number | null): void {
  const amount = Object.values(outputs).reduce((s, n) => s + n, 0);
  if (stockTotal(world) + amount > capacity(world)) {
    b.status = 'storageFull';
    return;
  }
  for (const [r, n] of Object.entries(outputs) as [keyof World['stock'], number][]) world.stock[r] += n;
  b.progress = 0;
  b.loaded = false;
  if (node !== null && node >= 0) {
    world.nodes[node] -= amount;
    if (world.nodes[node] <= 0) {
      world.map.tiles[node] = Tile.Ground;
      world.mapRev++;
    }
  }
}

/** Nearest tile of the given type with units left, or null when none is in range. */
function findNode(world: World, at: { x: number; y: number }, tile: Tile, radius: number): number | null {
  const { width, height, tiles } = world.map;
  let best: number | null = null;
  let bestD = Infinity;
  for (let y = Math.max(0, Math.floor(at.y - radius)); y <= Math.min(height - 1, Math.ceil(at.y + radius)); y++) {
    for (let x = Math.max(0, Math.floor(at.x - radius)); x <= Math.min(width - 1, Math.ceil(at.x + radius)); x++) {
      const i = y * width + x;
      const d = Math.hypot(x - at.x, y - at.y);
      if (tiles[i] === tile && world.nodes[i] > 0 && d <= radius && d < bestD) {
        best = i;
        bestD = d;
      }
    }
  }
  return best;
}
