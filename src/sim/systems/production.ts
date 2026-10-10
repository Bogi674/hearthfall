// Production buildings: workers, inputs, gathering from nodes, warmth, and storage (section 7.3).
import { BALANCE } from '../../data/balance';
import { BUILDINGS } from '../../data/buildings';
import { RECIPES, type Recipe } from '../../data/recipes';
import { WEAPONS } from '../../data/weapons';
import type { Amounts } from '../../data/resources';
import { Tile } from '../grid';
import { bandAt, capacity, center, currentPhase, hopeSpeed, isBuilt, missing, pay, stockTotal, weatherNow } from '../query';
import { scheduleRegrow } from './regrow';
import type { Building, World } from '../world';

export function productionSystem(world: World, dt: number): void {
  const work = currentPhase(world).work;
  for (const b of world.buildings) {
    const recipe = recipeFor(b);
    if (!recipe || !isBuilt(b)) continue;
    if (b.broken) {
      b.status = 'broken';
      continue;
    }
    const slots = BUILDINGS[b.type].workers;
    const at = center(b);
    const crew = world.colonists.filter((c) => c.job === b.id && c.task === 'work');
    const band = bandAt(world, at.x, at.y);
    const node = recipe.gather ? findNode(world, at, recipe.gather.tile, recipe.gather.radius) : -1;
    b.node = node ?? -1;

    if (!work) b.status = 'night';
    else if (b.shelter || world.alarm) b.status = 'sheltering';
    else if (crew.length === 0) b.status = 'noWorkers';
    else if (node === null) b.status = 'noResource';
    else if (band === 'freezing') b.status = 'tooCold';
    else if (!b.loaded && recipe.inputs && missing(world, recipe.inputs)) b.status = 'noInput';
    else {
      if (!b.loaded && recipe.inputs) pay(world, recipe.inputs);
      b.loaded = true;
      const speed = crew.reduce((s, c) => s + (c.rest > 0 ? 1 : BALANCE.needs.tiredWorkSpeed), 0) / slots;
      b.progress = Math.min(recipe.cycle, b.progress + dt * speed * forageFactor(world, b) * hopeSpeed(world) * (recipe.gather ? weatherNow(world).work : 1) * (band === 'cold' ? BALANCE.production.coldSpeed : 1));
      b.status = 'ok';
      if (b.progress >= recipe.cycle) finishCycle(world, b, recipe.outputs, node);
    }
  }
}

/** Winter thins the brush. Foragers find a little less each day, down to half (M13). */
const forageFactor = (world: World, b: Building): number => (b.type === 'foragerHut' ? Math.max(0.55, 1 - 0.035 * (world.day - 1)) : 1);

/** The recipe a building runs. An armory crafts whichever weapon it is set to (section 9.6). */
function recipeFor(b: Building): Recipe | undefined {
  if (!BUILDINGS[b.type].armory) return RECIPES[b.type];
  const weapon = WEAPONS[b.craft];
  return { cycle: weapon.craft, inputs: weapon.cost, outputs: {} };
}

function finishCycle(world: World, b: Building, outputs: Amounts, node: number | null): void {
  if (BUILDINGS[b.type].armory) {
    world.weapons[b.craft]++;
    [b.progress, b.loaded] = [0, false];
    return;
  }
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
      scheduleRegrow(world, node);
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
