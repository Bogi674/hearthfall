// Production buildings: workers, inputs, gathering from nodes, warmth, and storage (section 7.3).
// Also handles house rooms with production.
import { BALANCE } from '../../data/balance';
import { BUILDINGS } from '../../data/buildings';
import { ROOMS } from '../../data/rooms';
import { RECIPES, type Recipe } from '../../data/recipes';
import { WEAPONS, type WeaponId } from '../../data/weapons';
import type { Amounts } from '../../data/resources';
import { Tile } from '../grid';
import { bandAt, capacity, center, currentPhase, hopeSpeed, isBuilt, isRoomBuilt, missing, pay, roomCenter, stockTotal } from '../query';
import type { Building, Room, World } from '../world';

export function productionSystem(world: World, dt: number): void {
  const work = currentPhase(world).work;

  // Buildings
  for (const b of world.buildings) {
    const recipe = recipeFor(b);
    if (!recipe || !isBuilt(b)) continue;
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
      b.progress = Math.min(recipe.cycle, b.progress + dt * speed * hopeSpeed(world) * (band === 'cold' ? BALANCE.production.coldSpeed : 1));
      b.status = 'ok';
      if (b.progress >= recipe.cycle) finishCycle(world, b, recipe.outputs, node);
    }
  }

  // Rooms with production
  for (const r of world.rooms) {
    if (!isRoomBuilt(r)) continue;
    const def = ROOMS.find(rd => rd.id === r.roomId);
    if (!def || !def.produces) continue;
    const recipe = recipeForRoom(r, def);
    if (!recipe) continue;
    const slots = def.workers;
    const at = roomCenter(r);
    const crew = world.colonists.filter((c) => c.job === r.id && c.task === 'work');
    const band = bandAt(world, at.x, at.y);
    const node = recipe.gather ? findNode(world, at, recipe.gather.tile, recipe.gather.radius) : -1;
    r.node = node ?? -1;

    if (!work) r.status = 'night';
    else if (r.shelter || world.alarm) r.status = 'sheltering';
    else if (crew.length === 0) r.status = 'noWorkers';
    else if (node === null) r.status = 'noResource';
    else if (band === 'freezing') r.status = 'tooCold';
    else if (!r.loaded && recipe.inputs && missing(world, recipe.inputs)) r.status = 'noInput';
    else {
      if (!r.loaded && recipe.inputs) pay(world, recipe.inputs);
      r.loaded = true;
      const speed = crew.reduce((s, c) => s + (c.rest > 0 ? 1 : BALANCE.needs.tiredWorkSpeed), 0) / slots;
      const progress = (r.progress ?? 0) + dt * speed * hopeSpeed(world) * (band === 'cold' ? BALANCE.production.coldSpeed : 1);
      r.progress = Math.min(recipe.cycle, progress);
      r.status = 'ok';
      if (r.progress >= recipe.cycle) finishRoomCycle(world, r, recipe.outputs, node);
    }
  }
}

/** The recipe a building runs. An armory crafts whichever weapon it is set to (section 9.6). */
function recipeFor(b: Building): Recipe | undefined {
  if (!BUILDINGS[b.type].armory) return RECIPES[b.type];
  const weapon = WEAPONS[b.craft as WeaponId];
  return { cycle: weapon.craft, inputs: weapon.cost, outputs: {} };
}

/** The recipe a room runs. */
function recipeForRoom(r: Room, def: typeof ROOMS[0]): Recipe | undefined {
  if (!def.produces) return undefined;
  if (def.produces === 'armory' && BUILDINGS.armory.armory) {
    const weapon = WEAPONS[(r.craft as WeaponId) || 'pipe'];
    return { cycle: weapon.craft, inputs: weapon.cost, outputs: {} };
  }
  return RECIPES[def.produces];
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
  for (const [res, n] of Object.entries(outputs) as [keyof World['stock'], number][]) world.stock[res] += n;
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

function finishRoomCycle(world: World, r: Room, outputs: Amounts, node: number | null): void {
  const def = ROOMS.find(rd => rd.id === r.roomId);
  if (def?.produces === 'armory') {
    world.weapons[(r.craft as WeaponId) || 'pipe']++;
    [r.progress, r.loaded] = [0, false];
    return;
  }
  const amount = Object.values(outputs).reduce((s, n) => s + n, 0);
  if (stockTotal(world) + amount > capacity(world)) {
    r.status = 'storageFull';
    return;
  }
  for (const [res, n] of Object.entries(outputs) as [keyof World['stock'], number][]) world.stock[res] += n;
  r.progress = 0;
  r.loaded = false;
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
