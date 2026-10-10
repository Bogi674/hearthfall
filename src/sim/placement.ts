// Placement rules shared by the place command and the UI preview.
import { BUILDINGS, type BuildingType } from '../data/buildings';
import { RESOURCE_NAMES, type Resource } from '../data/resources';
import { PAD } from '../data/vehicle';
import { EDGES, FLOORS, HOUSE, type EdgeKind, type FloorId } from '../data/house';
import { getTile, inBounds, Tile } from './grid';
import { covered, edgeKey, flanks, floorAt, isHearthTile, isIndoors, isLanding, maxStorey, sealsRoom, storedEdgeAt, type Side } from './house';
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
export function placementError(world: World, type: BuildingType, x: number, y: number, rotated: boolean, mode: 'place' | 'site' = 'place', storey = 0): string | null {
  const [w, h] = footprint(type, rotated);
  if (storey > maxStorey(world)) return 'Repair the house more to build higher';
  for (let ty = y; ty < y + h; ty++) {
    for (let tx = x; tx < x + w; tx++) {
      if (!inBounds(world.map, tx, ty)) return 'Out of bounds';
      const t = getTile(world.map, tx, ty);
      if (t === Tile.Rubble) return 'Clear the rubble first';
      if (t !== Tile.Ground && t !== Tile.Road) return 'Blocked by terrain';
      if (storey === 0 && isHearthTile(world, tx, ty)) return 'Blocked by the hearth';
      if (type !== 'airshipDock' && reservedForPad(world, tx, ty)) return 'Reserved for the launch pad';
      if (BUILDINGS[type].furniture) {
        if (!floorAt(world, tx, ty, storey)) return 'Furniture needs a floor';
        if (BUILDINGS[type].roofed && !isIndoors(world, tx, ty, storey)) return 'Needs a closed room with finished walls';
        if (BUILDINGS[type].roofed && (floorAt(world, tx, ty, storey + 1) || isLanding(world, tx, ty, storey + 1))) return 'Goes under the open sky, with nothing built above';
        if (BUILDINGS[type].stairs) {
          if (storey + 1 > maxStorey(world)) return 'Repair the house more to build higher';
          if (floorAt(world, tx, ty, storey + 1)) return 'Take the floor above away first';
          const top = [[tx + 1, ty], [tx - 1, ty], [tx, ty + 1], [tx, ty - 1]].some(([nx, ny]) => floorAt(world, nx, ny, storey + 1));
          if (!top) return 'Needs a floor beside the top landing';
        }
        continue;
      }
      if (floorAt(world, tx, ty)) return 'Part of the house';
    }
  }
  for (const b of world.buildings) {
    if (b.storey === storey && x < b.x + b.w && b.x < x + w && y < b.y + b.h && b.y < y + h) return 'Blocked by a building';
  }
  if (type === 'airshipDock') {
    const pad = padError(world, x, y, w, h, mode === 'place');
    if (pad) return pad;
    if (mode === 'site') return null;
  }
  const short = missing(world, BUILDINGS[type].cost);
  return short ? `Not enough ${RESOURCE_NAMES[short as Resource].toLowerCase()}` : null;
}

/** Places a construction site that builders turn into the building. A prebuilt one is finished at once. */
export function placeBuilding(world: World, type: BuildingType, x: number, y: number, rotated: boolean, prebuilt = false, storey = 0): boolean {
  if (!prebuilt && placementError(world, type, x, y, rotated, 'place', storey)) return false;
  const [w, h] = footprint(type, rotated);
  const def = BUILDINGS[type];
  if (!prebuilt) pay(world, def.cost);
  world.buildings.push({
    id: world.nextId++, type, x, y, w, h, workers: def.workers, progress: 0, loaded: false, status: prebuilt ? 'ok' : 'building',
    hp: def.hp, lit: false, level: 1, construct: prebuilt ? 0 : def.build, node: -1, shelter: false, craft: 'spear', salvage: null, storey, ruin: false, broken: false, repair: null,
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

/** True when something under the tile holds a floor up: a floor on the storey below, or a neighbor floor that has one (a balcony may stick out one tile). */
function supported(world: World, x: number, y: number, storey: number): boolean {
  const under = (px: number, py: number) => floorAt(world, px, py, storey - 1) !== undefined;
  if (under(x, y)) return true;
  return [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]].some(([nx, ny]) => floorAt(world, nx, ny, storey) !== undefined && under(nx, ny));
}

/** Returns why this floor tile cannot go here, or null when the spot is valid. */
export function floorPlacementError(world: World, x: number, y: number, kind: FloorId, storey = 0): string | null {
  if (!FLOORS[kind]) return 'Unknown floor';
  if (reservedForPad(world, x, y)) return 'Reserved for the launch pad';
  if (!inBounds(world.map, x, y)) return 'Out of bounds';
  const t = getTile(world.map, x, y);
  if (t === Tile.Rubble) return 'Clear the rubble first';
  if (t !== Tile.Ground && t !== Tile.Road) return 'Blocked by terrain';
  if (storey > maxStorey(world)) return 'That is as high as a house can go';
  if (storey > FLOORS[kind].maxStorey) return `${FLOORS[kind].name} cannot hold up that many storeys. Use stone`;
  if (floorAt(world, x, y, storey)) return 'Already has a floor';
  if (storey === 0 && world.buildings.some((b) => b.storey === 0 && !BUILDINGS[b.type].furniture && x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h)) return 'Blocked by a building';
  if (storey > 0) {
    if (isLanding(world, x, y, storey)) return 'The stairs open here';
    if (!supported(world, x, y, storey)) return 'Upper floors need a floor below, or a floor beside them that has one';
  }
  if (sealsRoom(world, { addFloor: { x, y }, storey })) return 'A room would have no door';
  return costError(world, FLOORS[kind].cost);
}

/** Returns why this wall, door, or window cannot go here, or null when the spot is valid. */
export function edgePlacementError(world: World, x: number, y: number, side: Side, kind: EdgeKind, level: number, storey = 0): string | null {
  const def = EDGES[kind]?.levels[level - 1];
  if (!def) return 'Unknown wall';
  const [a, b] = flanks(x, y, side);
  if (!inBounds(world.map, a[0], a[1]) || !inBounds(world.map, b[0], b[1])) return 'Out of bounds';
  if (storey > maxStorey(world)) return 'That is as high as a house can go';
  const floored = (p: [number, number]) => covered(world, p[0], p[1], storey);
  if (!floored(a) && !floored(b)) return 'Walls need a floor beside them';
  const old = storedEdgeAt(world, x, y, side, storey);
  if (old) {
    // A built piece can be upgraded to a stronger level or changed to another kind. The old piece stands until the work is done.
    if (old.construct > 0 || old.pending) return 'Still being built';
    if (old.kind === kind && old.level === level) return 'Already built here';
    if (old.kind === kind && old.level > level) return 'A stronger one is already here';
    if (sealsRoom(world, { addEdge: { x, y, side, kind }, storey })) return 'A room would have no door. Add a door first';
    return costError(world, def.cost);
  }
  if (sealsRoom(world, { addEdge: { x, y, side, kind }, storey })) return 'A room would have no door. Add a door first';
  return costError(world, def.cost);
}

export function placeFloor(world: World, x: number, y: number, kind: FloorId, storey = 0): boolean {
  if (floorPlacementError(world, x, y, kind, storey)) return false;
  pay(world, FLOORS[kind].cost);
  world.house.floors.push({ id: world.nextId++, x, y, storey, kind, construct: FLOORS[kind].build, ruin: false, roofBroken: false, roofWork: null });
  world.buildRev++;
  return true;
}

export function placeEdge(world: World, x: number, y: number, side: Side, kind: EdgeKind, level: number, storey = 0): boolean {
  if (edgePlacementError(world, x, y, side, kind, level, storey)) return false;
  const def = EDGES[kind].levels[level - 1];
  pay(world, def.cost);
  const old = storedEdgeAt(world, x, y, side, storey);
  if (old) old.pending = { kind, level, left: def.build };
  else world.house.edges.push({ id: world.nextId++, x, y, storey, side, kind, level, hp: def.hp, construct: def.build, pending: null, ruin: false, repair: null });
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
    return sealsRoom(world, { removeEdge: edgeKey(e.x, e.y, e.side, e.storey), storey: e.storey }) ? 'Removing it would shut a room in' : null;
  }
  const f = world.house.floors.find((o) => o.id === id);
  if (!f) return 'Nothing to remove';
  if (world.buildings.some((b) => BUILDINGS[b.type].furniture && b.storey === f.storey && f.x >= b.x && f.x < b.x + b.w && f.y >= b.y && f.y < b.y + b.h)) return 'Remove the furniture first';
  if (floorAt(world, f.x, f.y, f.storey + 1)) return 'Remove the floor above first';
  const here = (x: number, y: number) => (x === f.x && y === f.y ? false : covered(world, x, y, f.storey));
  const needs = world.house.edges.some((e) => e.storey === f.storey && flanks(e.x, e.y, e.side).every(([x, y]) => (x === f.x && y === f.y) || !here(x, y)) && flanks(e.x, e.y, e.side).some(([x, y]) => x === f.x && y === f.y));
  return needs ? 'Remove the walls on it first' : null;
}

/** Takes a house piece away. A ruin gives back most of its cost as salvage. An untouched site refunds all of its cost. Anything else refunds half. */
export function removeHouseItem(world: World, item: HouseItem, id: number): boolean {
  if (removeError(world, item, id)) return false;
  let cost: Amounts;
  let refund: number;
  if (item === 'furniture') {
    const i = world.buildings.findIndex((o) => o.id === id);
    const b = world.buildings[i];
    cost = BUILDINGS[b.type].cost;
    refund = b.ruin ? HOUSE.ruinSalvage : b.construct >= BUILDINGS[b.type].build ? 1 : 0.5;
    world.buildings.splice(i, 1);
  } else if (item === 'edge') {
    const i = world.house.edges.findIndex((o) => o.id === id);
    const e = world.house.edges[i];
    if (e.pending) {
      // Removing a piece that is being upgraded cancels the upgrade and keeps the piece.
      const next = EDGES[e.pending.kind].levels[e.pending.level - 1];
      cost = next.cost;
      refund = e.pending.left >= next.build ? 1 : 0.5;
      e.pending = null;
    } else {
      cost = EDGES[e.kind].levels[e.level - 1].cost;
      refund = e.ruin ? HOUSE.ruinSalvage : e.construct >= EDGES[e.kind].levels[e.level - 1].build ? 1 : 0.5;
      world.house.edges.splice(i, 1);
    }
  } else {
    const i = world.house.floors.findIndex((o) => o.id === id);
    const f = world.house.floors[i];
    cost = FLOORS[f.kind].cost;
    refund = f.ruin ? HOUSE.ruinSalvage : f.construct >= FLOORS[f.kind].build ? 1 : 0.5;
    world.house.floors.splice(i, 1);
  }
  for (const [r, n] of Object.entries(cost) as [Resource, number][]) world.stock[r] += Math.floor(n * refund);
  world.buildRev++;
  return true;
}
