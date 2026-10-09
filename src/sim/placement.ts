// Placement rules shared by the place command and the UI preview.
import { BALANCE } from '../data/balance';
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
      // The ring around the house is kept for its rooms (section 5.5).
      const onLot = onHouseLot(world, tx, ty);
      if (BUILDINGS[type].room && !onLot) return 'Rooms go on the house lot next to the house';
      if (!BUILDINGS[type].room && onLot) return 'Kept free for house rooms';
    }
  }
  for (const b of world.buildings) {
    if (x < b.x + b.w && b.x < x + w && y < b.y + b.h && b.y < y + h) return 'Blocked by a building';
  }
  const short = missing(world, BUILDINGS[type].cost);
  return short ? `Not enough ${RESOURCE_NAMES[short as Resource].toLowerCase()}` : null;
}

/** True for tiles in the square around the hearth that only house rooms may use. */
export function onHouseLot(world: World, x: number, y: number): boolean {
  return Math.max(Math.abs(x - world.hearth.x), Math.abs(y - world.hearth.y)) <= BALANCE.hearth.lot;
}

/** Places a construction site that builders turn into the building. A prebuilt one is finished at once. */
export function placeBuilding(world: World, type: BuildingType, x: number, y: number, rotated: boolean, prebuilt = false): boolean {
  if (!prebuilt && placementError(world, type, x, y, rotated)) return false;
  const [w, h] = footprint(type, rotated);
  const def = BUILDINGS[type];
  if (!prebuilt) pay(world, def.cost);
  world.buildings.push({
    id: world.nextId++, type, x, y, w, h, workers: def.workers, progress: 0, loaded: false, status: prebuilt ? 'ok' : 'building',
    hp: def.hp, lit: false, level: 1, construct: prebuilt ? 0 : def.build, node: -1, shelter: false, craft: 'spear',
  });
  world.buildRev++;
  return true;
}
