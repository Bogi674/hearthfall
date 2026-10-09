// Placement rules shared by the place command and the UI preview.
import { BALANCE } from '../data/balance';
import { BUILDINGS, type BuildingType } from '../data/buildings';
import { RESOURCE_NAMES, type Resource } from '../data/resources';
import { PAD } from '../data/vehicle';
import { EDGES, FLOORS, type EdgeKind, type FloorId } from '../data/house';
import { getTile, inBounds, Tile } from './grid';
import { edgeKey, flanks, floorAt, inLot, isHearthTile, isIndoors, sealsRoom, storedEdgeAt, type Side } from './house';
import { missing, pay } from './query';
import type { Amounts } from '../data/resources';
import type { World } from './world';

export function footprint(type: BuildingType, rotated: boolean): [number, number] {
  const [w, h] = BUILDINGS[type].size;
  return rotated ? [h, w] : [w, h];
}

/** True for ground the crew has set aside for the launch pad and the ring around it (section 11.2). */
export function reservedForPad(world: World, x: number, y: number): boolean {
  const site = world.airship.site;
  if (!site || world.buildings.some((b) => b.type === 'airshipDock')) return false;
  return x >= site.x - PAD.apron && x < site.x + PAD.size + PAD.apron && y >= site.y - PAD.apron && y < site.y + PAD.size + PAD.apron;
}

/**
 * Returns why the building cannot go here, or null when the spot is valid. In site mode the launch pad is only
 * being chosen, so its cost and the buildings in its ring do not count (they can be cleared later).
 */
export function placementError(world: World, type: BuildingType, x: number, y: number, rotated: boolean, mode: 'place' | 'site' = 'place'): string | null {
  const [w, h] = footprint(type, rotated);
  for (let ty = y; ty < y + h; ty++) {
    for (let tx = x; tx < x + w; tx++) {
      if (!inBounds(world.map, tx, ty)) return 'Out of bounds';
      const t = getTile(world.map, tx, ty);
      if (t !== Tile.Ground && t !== Tile.Road) return 'Blocked by terrain';
      if (Math.abs(tx - world.hearth.x) <= 1 && Math.abs(ty - world.hearth.y) <= 1) return 'Blocked by the hearth';
      if (type !== 'airshipDock' && reservedForPad(world, tx, ty)) return 'Reserved for the launch pad';
      if (BUILDINGS[type].furniture) {
        if (!floorAt(world, tx, ty)) return 'Furniture needs a floor';
        if (BUILDINGS[type].roofed && !isIndoors(world, tx, ty)) return 'Needs a closed room with finished walls';
        continue;
      }
      if (floorAt(world, tx, ty)) return 'Part of the house';
      // The ring around the house is kept free so the house can grow (section 5.6).
      if (onHouseLot(world, tx, ty)) return 'Kept free for the house';
    }
  }
  for (const b of world.buildings) {
    if (x < b.x + b.w && b.x < x + w && y < b.y + b.h && b.y < y + h) return 'Blocked by a building';
  }
  if (type === 'airshipDock') {
    const pad = padError(world, x, y, w, h, mode === 'place');
    if (pad) return pad;
    if (mode === 'site') return null;
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
    hp: def.hp, lit: false, level: 1, construct: prebuilt ? 0 : def.build, node: -1, shelter: false, craft: 'spear', salvage: null,
  });
  world.buildRev++;
  return true;
}

const costError = (world: World, cost: Amounts): string | null => {
  const short = missing(world, cost);
  return short ? `Not enough ${RESOURCE_NAMES[short as Resource].toLowerCase()}` : null;
};

/**
 * Why the airship cannot be moored here, or null (section 11.2). The blueprint must be found, the pad must be near the
 * house, and the ring of ground around it must be clear of buildings and of house floors and walls.
 */
export function padError(world: World, x: number, y: number, w: number, h: number, strict = true): string | null {
  if (!world.airship.blueprint) return 'Needs the old owner\'s blueprint. Repair the house and keep hope up';
  const d = Math.hypot(x + (w - 1) / 2 - world.hearth.x, y + (h - 1) / 2 - world.hearth.y);
  if (d > PAD.maxDistance) return `Too far from the house for the last dash (most ${PAD.maxDistance} tiles)`;
  if (!strict) return null;
  const site = world.airship.site;
  if (site && (site.x !== x || site.y !== y)) return 'The launch pad goes on the site the crew chose';
  const [x0, y0, x1, y1] = [x - PAD.apron, y - PAD.apron, x + w + PAD.apron, y + h + PAD.apron];
  const hit = world.buildings.filter((b) => b.x < x1 && x0 < b.x + b.w && b.y < y1 && y0 < b.y + b.h);
  if (hit.length) return `Clear the ground around the pad first. ${hit.length} building${hit.length > 1 ? 's are' : ' is'} in the way`;
  const roofed = world.house.floors.some((f) => f.x >= x0 && f.x < x1 && f.y >= y0 && f.y < y1);
  return roofed ? 'Nothing may be built over the pad. House floors are in the way' : null;
}

/** Returns why the crew cannot choose this spot for the launch pad, or null when they can (section 11.2). */
export function siteError(world: World, x: number, y: number): string | null {
  if (world.buildings.some((b) => b.type === 'airshipDock')) return 'The pad is already built';
  const { size } = PAD;
  const saved = world.airship.site;
  world.airship.site = null;
  const error = placementError(world, 'airshipDock', x, y, false, 'site');
  world.airship.site = saved;
  return error ?? (world.house.floors.some((f) => f.x >= x && f.x < x + size && f.y >= y && f.y < y + size) ? 'House floors are in the way' : null);
}

/** Returns why this floor tile cannot go here, or null when the spot is valid. */
export function floorPlacementError(world: World, x: number, y: number, kind: FloorId): string | null {
  if (!FLOORS[kind]) return 'Unknown floor';
  if (reservedForPad(world, x, y)) return 'Reserved for the launch pad';
  if (!inBounds(world.map, x, y)) return 'Out of bounds';
  const t = getTile(world.map, x, y);
  if (t !== Tile.Ground && t !== Tile.Road) return 'Blocked by terrain';
  if (isHearthTile(world, x, y)) return 'The house is already here';
  if (!inLot(world, x, y)) return 'Outside the house lot. Repair the house to grow it';
  if (floorAt(world, x, y)) return 'Already has a floor';
  if (world.buildings.some((b) => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h)) return 'Blocked by a building';
  const touches = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]].some(([nx, ny]) => isHearthTile(world, nx, ny) || floorAt(world, nx, ny));
  if (!touches) return 'Floors must touch the house or another floor';
  if (sealsRoom(world, { addFloor: { x, y } })) return 'A room would have no door';
  return costError(world, FLOORS[kind].cost);
}

/** Returns why this wall, door, or window cannot go here, or null when the spot is valid. */
export function edgePlacementError(world: World, x: number, y: number, side: Side, kind: EdgeKind, level: number): string | null {
  const def = EDGES[kind]?.levels[level - 1];
  if (!def) return 'Unknown wall';
  const [a, b] = flanks(x, y, side);
  if (!inBounds(world.map, a[0], a[1]) || !inBounds(world.map, b[0], b[1])) return 'Out of bounds';
  if (!inLot(world, a[0], a[1]) && !inLot(world, b[0], b[1])) return 'Outside the house lot. Repair the house to grow it';
  if (isHearthTile(world, a[0], a[1]) && isHearthTile(world, b[0], b[1])) return 'Inside the house';
  const floored = (p: [number, number]) => isHearthTile(world, p[0], p[1]) || floorAt(world, p[0], p[1]) !== undefined;
  if (!floored(a) && !floored(b)) return 'Walls need a floor beside them';
  const old = storedEdgeAt(world, x, y, side);
  if (old) {
    // A built piece can be upgraded to a stronger level or changed to another kind. The old piece stands until the work is done.
    if (old.construct > 0 || old.pending) return 'Still being built';
    if (old.kind === kind && old.level === level) return 'Already built here';
    if (old.kind === kind && old.level > level) return 'A stronger one is already here';
    if (sealsRoom(world, { addEdge: { x, y, side, kind } })) return 'A room would have no door. Add a door first';
    return costError(world, def.cost);
  }
  const onHouseWall = isHearthTile(world, a[0], a[1]) !== isHearthTile(world, b[0], b[1]);
  if (onHouseWall && kind === 'wall') return 'The house wall is already here';
  if (onHouseWall && kind === 'door' && side === 'n' && x === world.hearth.x && y === world.hearth.y + 2) return 'The front door is already here';
  if (sealsRoom(world, { addEdge: { x, y, side, kind } })) return 'A room would have no door. Add a door first';
  return costError(world, def.cost);
}

export function placeFloor(world: World, x: number, y: number, kind: FloorId): boolean {
  if (floorPlacementError(world, x, y, kind)) return false;
  pay(world, FLOORS[kind].cost);
  world.house.floors.push({ id: world.nextId++, x, y, kind, construct: FLOORS[kind].build });
  world.buildRev++;
  return true;
}

export function placeEdge(world: World, x: number, y: number, side: Side, kind: EdgeKind, level: number): boolean {
  if (edgePlacementError(world, x, y, side, kind, level)) return false;
  const def = EDGES[kind].levels[level - 1];
  pay(world, def.cost);
  const old = storedEdgeAt(world, x, y, side);
  if (old) old.pending = { kind, level, left: def.build };
  else world.house.edges.push({ id: world.nextId++, x, y, side, kind, level, hp: def.hp, construct: def.build, pending: null });
  world.buildRev++;
  return true;
}

export type HouseItem = 'floor' | 'edge' | 'furniture';

/** Returns why this house piece cannot be removed, or null when it can. */
export function removeError(world: World, item: HouseItem, id: number): string | null {
  if (item === 'furniture') {
    const b = world.buildings.find((o) => o.id === id);
    return b && BUILDINGS[b.type].furniture ? null : 'Nothing to remove';
  }
  if (item === 'edge') {
    const e = world.house.edges.find((o) => o.id === id);
    if (!e) return 'Nothing to remove';
    if (e.pending) return null;
    return sealsRoom(world, { removeEdge: edgeKey(e.x, e.y, e.side) }) ? 'Removing it would shut a room in' : null;
  }
  const f = world.house.floors.find((o) => o.id === id);
  if (!f) return 'Nothing to remove';
  if (world.buildings.some((b) => BUILDINGS[b.type].furniture && f.x >= b.x && f.x < b.x + b.w && f.y >= b.y && f.y < b.y + b.h)) return 'Remove the furniture first';
  const here = (x: number, y: number) => (x === f.x && y === f.y ? false : isHearthTile(world, x, y) || floorAt(world, x, y) !== undefined);
  const needs = world.house.edges.some((e) => flanks(e.x, e.y, e.side).every(([x, y]) => (x === f.x && y === f.y) || !here(x, y)) && flanks(e.x, e.y, e.side).some(([x, y]) => x === f.x && y === f.y));
  return needs ? 'Remove the walls on it first' : null;
}

/** Takes a house piece away. An untouched site refunds all of its cost. Anything else refunds half. */
export function removeHouseItem(world: World, item: HouseItem, id: number): boolean {
  if (removeError(world, item, id)) return false;
  let cost: Amounts;
  let untouched: boolean;
  if (item === 'furniture') {
    const i = world.buildings.findIndex((o) => o.id === id);
    const b = world.buildings[i];
    cost = BUILDINGS[b.type].cost;
    untouched = b.construct >= BUILDINGS[b.type].build;
    world.buildings.splice(i, 1);
  } else if (item === 'edge') {
    const i = world.house.edges.findIndex((o) => o.id === id);
    const e = world.house.edges[i];
    if (e.pending) {
      // Removing a piece that is being upgraded cancels the upgrade and keeps the piece.
      const next = EDGES[e.pending.kind].levels[e.pending.level - 1];
      cost = next.cost;
      untouched = e.pending.left >= next.build;
      e.pending = null;
    } else {
      cost = EDGES[e.kind].levels[e.level - 1].cost;
      untouched = e.construct >= EDGES[e.kind].levels[e.level - 1].build;
      world.house.edges.splice(i, 1);
    }
  } else {
    const i = world.house.floors.findIndex((o) => o.id === id);
    const f = world.house.floors[i];
    cost = FLOORS[f.kind].cost;
    untouched = f.construct >= FLOORS[f.kind].build;
    world.house.floors.splice(i, 1);
  }
  for (const [r, n] of Object.entries(cost) as [Resource, number][]) world.stock[r] += untouched ? n : Math.floor(n / 2);
  world.buildRev++;
  return true;
}
