// Placement rules shared by the place command and the UI preview.
import { BUILDINGS, type BuildingType } from '../data/buildings';
import { RESOURCE_NAMES, type Resource } from '../data/resources';
import { getTile, inBounds, Tile } from './grid';
import { missing, pay } from './query';
import type { World } from './world';

export function footprint(type: BuildingType, rotated: boolean): [number, number] {
  const [w, h] = BUILDINGS[type].size;
  return rotated ? [h, w] : [w, h];
}

/** Returns why the building cannot go here, or null when the spot is valid. */
export function placementError(world: World, type: BuildingType, x: number, y: number, rotated: boolean): string | null {
  const [w, h] = footprint(type, rotated);
  for (let ty = y; ty < y + h; ty++) {
    for (let tx = x; tx < x + w; tx++) {
      if (!inBounds(world.map, tx, ty)) return 'Out of bounds';
      const t = getTile(world.map, tx, ty);
      if (t !== Tile.Ground && t !== Tile.Road) return 'Blocked by terrain';
      if (Math.abs(tx - world.hearth.x) <= 1 && Math.abs(ty - world.hearth.y) <= 1) return 'Blocked by the hearth';
    }
  }
  for (const b of world.buildings) {
    if (x < b.x + b.w && b.x < x + w && y < b.y + b.h && b.y < y + h) return 'Blocked by a building';
  }
  const short = missing(world, BUILDINGS[type].cost);
  return short ? `Not enough ${RESOURCE_NAMES[short as Resource].toLowerCase()}` : null;
}

export function placeBuilding(world: World, type: BuildingType, x: number, y: number, rotated: boolean): boolean {
  if (placementError(world, type, x, y, rotated)) return false;
  const [w, h] = footprint(type, rotated);
  pay(world, BUILDINGS[type].cost);
  const def = BUILDINGS[type];
  world.buildings.push({ id: world.nextId++, type, x, y, w, h, workers: def.workers, progress: 0, loaded: false, status: 'ok', hp: def.hp, lit: false });
  world.buildRev++;
  return true;
}
