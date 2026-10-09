// Placement rules shared by the place command and the UI preview.
import { BUILDINGS, type BuildingType } from '../data/buildings';
import { ROOMS, WALL_MODULES } from '../data/rooms';
import { RESOURCE_NAMES, type Resource } from '../data/resources';
import { getTile, inBounds, Tile } from './grid';
import { missing, pay, roomTier, houseLotRadius } from './query';
import type { World } from './world';

export function footprint(type: BuildingType, rotated: boolean): [number, number] {
  const [w, h] = BUILDINGS[type].size;
  return rotated ? [h, w] : [w, h];
}

export function roomFootprint(roomId: string, rotated: boolean): [number, number] {
  const room = ROOMS.find(r => r.id === roomId);
  if (!room) return [0, 0];
  const [w, h] = room.size;
  return rotated ? [h, w] : [w, h];
}

export function wallModuleFootprint(): [number, number] {
  return [1, 1];
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
      // The ring around the house is kept for its rooms.
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

/** Returns why the room cannot go here, or null when the spot is valid. */
export function roomPlacementError(world: World, roomId: string, x: number, y: number, rotated: boolean): string | null {
  const room = ROOMS.find(r => r.id === roomId);
  if (!room) return 'Unknown room';
  const tier = roomTier(world);
  if (room.tier > tier) return `Requires hearth stage ${room.tier}`;
  const [w, h] = roomFootprint(roomId, rotated);
  for (let ty = y; ty < y + h; ty++) {
    for (let tx = x; tx < x + w; tx++) {
      if (!inBounds(world.map, tx, ty)) return 'Out of bounds';
      const t = getTile(world.map, tx, ty);
      if (t !== Tile.Ground && t !== Tile.Road) return 'Blocked by terrain';
      if (Math.abs(tx - world.hearth.x) <= 1 && Math.abs(ty - world.hearth.y) <= 1) return 'Blocked by the hearth';
      // Must be on house lot
      const lotRadius = houseLotRadius(world);
      const onLot = Math.max(Math.abs(tx - world.hearth.x), Math.abs(ty - world.hearth.y)) <= lotRadius;
      if (!onLot) return `Outside house lot (radius ${lotRadius})`;
    }
  }
  // Check overlap with existing rooms
  for (const r of world.rooms) {
    if (x < r.x + r.w && r.x < x + w && y < r.h + r.h && r.y < y + h) return 'Overlaps another room';
  }
  // Check overlap with buildings
  for (const b of world.buildings) {
    if (x < b.x + b.w && b.x < x + w && y < b.y + b.h && b.y < y + h) return 'Blocked by a building';
  }
  // Must connect to hearth or existing room (adjacent tiles)
  if (world.rooms.length > 0) {
    let connected = false;
    for (let ty = y; ty < y + h && !connected; ty++) {
      for (let tx = x; tx < x + w && !connected; tx++) {
        // Check adjacent to hearth
        if (Math.abs(tx - world.hearth.x) <= 1 && Math.abs(ty - world.hearth.y) <= 1) connected = true;
        // Check adjacent to existing rooms
        for (const r of world.rooms) {
          if (tx >= r.x - 1 && tx <= r.x + r.w && ty >= r.y - 1 && ty <= r.y + r.h) {
            connected = true;
            break;
          }
        }
      }
    }
    if (!connected) return 'Must connect to house or existing room';
  }
  const short = missing(world, room.cost);
  return short ? `Not enough ${RESOURCE_NAMES[short as Resource].toLowerCase()}` : null;
}

/** Returns why the wall module cannot go here, or null when valid. */
export function wallModulePlacementError(world: World, moduleId: string, x: number, y: number): string | null {
  const module = WALL_MODULES.find(m => m.id === moduleId);
  if (!module) return 'Unknown wall module';
  const tier = roomTier(world);
  if (tier < 2) return 'Requires hearth stage 2';
  if (!inBounds(world.map, x, y)) return 'Out of bounds';
  // Must be on house lot edge
  const lotRadius = houseLotRadius(world);
  const onLot = Math.max(Math.abs(x - world.hearth.x), Math.abs(y - world.hearth.y)) <= lotRadius;
  if (!onLot) return 'Outside house lot';
  // Must be on the perimeter of a room or the hearth
  let onEdge = false;
  if (Math.abs(x - world.hearth.x) <= 1 && Math.abs(y - world.hearth.y) <= 1) onEdge = true;
  for (const r of world.rooms) {
    if ((x >= r.x - 1 && x <= r.x + r.w && (y === r.y - 1 || y === r.y + r.h)) ||
        (y >= r.y - 1 && y <= r.y + r.h && (x === r.x - 1 || x === r.x + r.w))) {
      onEdge = true;
      break;
    }
  }
  if (!onEdge) return 'Must be on room or house edge';
  // Check if already has a wall module
  for (const w of world.wallModules) {
    if (w.x === x && w.y === y) return 'Already has a wall module';
  }
  const short = missing(world, module.cost);
  return short ? `Not enough ${RESOURCE_NAMES[short as Resource].toLowerCase()}` : null;
}

/** True for tiles in the square around the hearth that only house rooms may use. */
export function onHouseLot(world: World, x: number, y: number): boolean {
  const lotRadius = houseLotRadius(world);
  return Math.max(Math.abs(x - world.hearth.x), Math.abs(y - world.hearth.y)) <= lotRadius;
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

/** Places a room construction site. */
export function placeRoom(world: World, roomId: string, x: number, y: number, rotated: boolean): boolean {
  if (roomPlacementError(world, roomId, x, y, rotated)) return false;
  const room = ROOMS.find(r => r.id === roomId)!;
  const [w, h] = roomFootprint(roomId, rotated);
  pay(world, room.cost);
  world.rooms.push({
    id: world.nextId++,
    roomId,
    x, y, w, h,
    rotated,
    construct: room.buildTime,
    hp: room.size[0] * room.size[1] * 50, // Base HP per tile
    walls: room.defaultWalls.map(edge => edge.map(wt => ({ type: wt, hp: wallHp(wt), maxHp: wallHp(wt) }))),
  });
  world.buildRev++;
  return true;
}

/** Places a wall module on a room/house edge. */
export function placeWallModule(world: World, moduleId: string, x: number, y: number): boolean {
  if (wallModulePlacementError(world, moduleId, x, y)) return false;
  const module = WALL_MODULES.find(m => m.id === moduleId)!;
  pay(world, module.cost);
  world.wallModules.push({
    id: world.nextId++,
    moduleId,
    x, y,
    construct: module.buildTime,
    hp: module.hp,
  });
  world.buildRev++;
  return true;
}

function wallHp(type: import('../data/rooms').WallType): number {
  const module = WALL_MODULES.find(m => m.wallType === type);
  return module?.hp ?? 100;
}
