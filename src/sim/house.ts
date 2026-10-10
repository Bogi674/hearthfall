// House layer queries (M10.1, M11, M12): floors, edges, rooms, roofs, and which steps people can take.
// Read only. Placement rules are in placement.ts and the commands in commands.ts.
// The ruins and the player's own work are the same pieces, so every query works anywhere on the map.
import { BUILDINGS } from '../data/buildings';
import { HOUSE, type EdgeKind } from '../data/house';
import type { HouseEdge, HouseFloor, World } from './world';

export type Side = 'n' | 'w';

/** The highest storey a piece may be built on. Storey 0 is the ground floor. */
export const maxStorey = (_world?: World): number => HOUSE.maxStorey;

/** True on the tile the hearth stands on. */
export const isHearthTile = (world: World, x: number, y: number): boolean => x === world.hearth.x && y === world.hearth.y;

export const edgeKey = (x: number, y: number, side: Side, storey = 0): string => `${storey}${side}${x},${y}`;

/** The two tiles an edge separates. */
export function flanks(x: number, y: number, side: Side): [[number, number], [number, number]] {
  return side === 'n' ? [[x, y], [x, y - 1]] : [[x, y], [x - 1, y]];
}

/** The edge between two orthogonal neighbor tiles. */
export function edgeAcross(ax: number, ay: number, bx: number, by: number): { x: number; y: number; side: Side } {
  return bx === ax ? { x: ax, y: Math.max(ay, by), side: 'n' } : { x: Math.max(ax, bx), y: ay, side: 'w' };
}

interface Index {
  rev: number;
  /** Keyed by storey, then tile. */
  floors: Map<number, HouseFloor>;
  edges: Map<string, HouseEdge>;
  /** Stairs by the tile they stand on and the storey they start from. Broken ones are in `stairs` but not in `usable`. */
  stairs: Set<number>;
  usable: Set<number>;
  /** Per storey, the tiles that hold a piece or touch one. Clusters of these are analysed one at a time. */
  occ: (Set<number> | undefined)[];
  all: (HouseRoom[] | undefined)[];
  rooms: (HouseRoom[] | undefined)[];
  roomOf: (Map<number, HouseRoom> | undefined)[];
}
const cache = new WeakMap<World, Index>();

function index(world: World): Index {
  let ix = cache.get(world);
  if (!ix || ix.rev !== world.buildRev) {
    const w = world.map.width;
    const n = w * world.map.height;
    const stairs = world.buildings.filter((b) => BUILDINGS[b.type].stairs);
    ix = {
      rev: world.buildRev,
      floors: new Map(world.house.floors.map((f) => [f.storey * n + f.y * w + f.x, f])),
      edges: new Map(world.house.edges.map((e) => [edgeKey(e.x, e.y, e.side, e.storey), e])),
      stairs: new Set(stairs.map((b) => b.storey * n + b.y * w + b.x)),
      usable: new Set(stairs.filter((b) => !b.broken && b.construct <= 0).map((b) => b.storey * n + b.y * w + b.x)),
      occ: [],
      all: [],
      rooms: [],
      roomOf: [],
    };
    cache.set(world, ix);
  }
  return ix;
}

const tileKey = (world: World, x: number, y: number, storey: number): number => storey * world.map.width * world.map.height + y * world.map.width + x;

export function floorAt(world: World, x: number, y: number, storey = 0): HouseFloor | undefined {
  return index(world).floors.get(tileKey(world, x, y, storey));
}

export function storedEdgeAt(world: World, x: number, y: number, side: Side, storey = 0): HouseEdge | undefined {
  return index(world).edges.get(edgeKey(x, y, side, storey));
}

/** True when stairs from the storey below open onto this tile, so the tile has no floor but people can stand on it. */
export const isLanding = (world: World, x: number, y: number, storey: number): boolean => storey > 0 && index(world).stairs.has(tileKey(world, x, y, storey - 1));

/** True when working stairs stand on this tile and lead up from this storey. Broken stairs do not count. */
export const hasStairs = (world: World, x: number, y: number, storey: number): boolean => index(world).usable.has(tileKey(world, x, y, storey));

/** True when people can stand here: a floor, or the top of a flight of stairs. Ground outside is always open. */
export function walkable(world: World, x: number, y: number, storey: number): boolean {
  if (storey === 0) return true;
  return floorAt(world, x, y, storey) !== undefined || isLanding(world, x, y, storey);
}

/** True when the tile has a floor, or a landing, as part of the house on this storey. */
export const covered = (world: World, x: number, y: number, storey: number): boolean => floorAt(world, x, y, storey) !== undefined || isLanding(world, x, y, storey);

/** True when something is over the tile: a floor or stairs on the next storey, or its own roof when that is whole. */
export function roofed(world: World, x: number, y: number, storey: number): boolean {
  if (floorAt(world, x, y, storey + 1) || isLanding(world, x, y, storey + 1)) return true;
  const f = floorAt(world, x, y, storey);
  if (f) return !f.roofBroken;
  // The top of a flight of stairs has no floor of its own. It is under the roof of the floor beside it.
  return isLanding(world, x, y, storey) && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => floorAt(world, x + dx, y + dy, storey)?.roofBroken === false);
}

/** What stands on an edge. */
export interface EdgeInfo {
  kind: EdgeKind;
  built: boolean;
}

export function edgeInfo(world: World, x: number, y: number, side: Side, storey = 0): EdgeInfo | null {
  const stored = storedEdgeAt(world, x, y, side, storey);
  return stored ? { kind: stored.kind, built: stored.construct <= 0 } : null;
}

/** True when a finished wall or window stands between two neighbor tiles. Doors and unfinished sites do not block. */
export function stepBlocked(world: World, ax: number, ay: number, bx: number, by: number, storey = 0): boolean {
  const e = edgeAcross(ax, ay, bx, by);
  const info = edgeInfo(world, e.x, e.y, e.side, storey);
  return info !== null && info.built && info.kind !== 'door';
}

/** The finished wall, door, or window between two orthogonal neighbor tiles that monsters must break, if any. */
export function barrierBetween(world: World, ax: number, ay: number, bx: number, by: number): HouseEdge | undefined {
  // Monsters walk on the ground, so only ground floor walls stand in their way.
  const e = edgeAcross(ax, ay, bx, by);
  const stored = storedEdgeAt(world, e.x, e.y, e.side, 0);
  return stored && stored.construct <= 0 ? stored : undefined;
}

/** The tiles of a storey that hold a piece of the house or touch one. */
function occupied(world: World, storey: number): Set<number> {
  const ix = index(world);
  let occ = ix.occ[storey];
  if (!occ) {
    occ = ix.occ[storey] = new Set();
    const w = world.map.width;
    for (const f of world.house.floors) if (f.storey === storey) occ.add(f.y * w + f.x);
    for (const e of world.house.edges) {
      if (e.storey !== storey) continue;
      for (const [x, y] of flanks(e.x, e.y, e.side)) occ.add(y * w + x);
    }
    for (const b of world.buildings) if (BUILDINGS[b.type].stairs && b.storey === storey - 1) occ.add(b.y * w + b.x);
  }
  return occ;
}

/** True when a piece of the house stands within a tile of this spot on the ground floor. Used to decide if a walk needs a route. */
export const nearPieces = (world: World, x: number, y: number): boolean => {
  const occ = occupied(world, 0);
  const w = world.map.width;
  const [tx, ty] = [Math.round(x), Math.round(y)];
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (occ.has((ty + dy) * w + tx + dx)) return true;
  return false;
};

export interface HouseRoom {
  /** Map tile indexes. */
  tiles: number[];
  floorCount: number;
  /** Open to the outside, with no wall or door around it. */
  outside: boolean;
  /** People can walk from the outside to it through doors. */
  reachable: boolean;
}

export interface Change {
  /** The storey the change is on. */
  storey?: number;
  /** An edge that is about to be built. */
  addEdge?: { x: number; y: number; side: Side; kind: EdgeKind };
  /** A stored edge that is about to be removed. */
  removeEdge?: string;
  /** A floor tile that is about to be added. */
  addFloor?: { x: number; y: number };
}

interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** Groups tiles that touch, even by a corner, and returns the box around each group with one tile of margin. */
function clusterBoxes(world: World, cells: Set<number>, seeds?: number[]): Box[] {
  const w = world.map.width;
  const seen = new Set<number>();
  const boxes: Box[] = [];
  const start = seeds ?? [...cells];
  for (const s of start) {
    if (seen.has(s) || !cells.has(s)) continue;
    const stack = [s];
    seen.add(s);
    const box = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
    while (stack.length) {
      const c = stack.pop()!;
      const [x, y] = [c % w, Math.floor(c / w)];
      box.x0 = Math.min(box.x0, x);
      box.y0 = Math.min(box.y0, y);
      box.x1 = Math.max(box.x1, x);
      box.y1 = Math.max(box.y1, y);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const n = (y + dy) * w + x + dx;
          if (seen.has(n) || !cells.has(n)) continue;
          seen.add(n);
          stack.push(n);
        }
      }
    }
    boxes.push({ x0: box.x0 - 1, y0: box.y0 - 1, x1: box.x1 + 1, y1: box.y1 + 1 });
  }
  return boxes;
}

/**
 * Splits the area around the pieces into rooms, one cluster of pieces at a time. Walls, windows, and doors all separate rooms.
 * People can pass between rooms through doors. With includeSites, planned pieces count as built, which is how placement
 * checks that no room gets sealed without a door. A change limits the work to the cluster it touches.
 */
export function analyze(world: World, includeSites: boolean, change: Change = {}): HouseRoom[] {
  const storey = change.storey ?? 0;
  const w = world.map.width;
  const ix = index(world);
  const cells = new Set(occupied(world, storey));
  let seeds: number[] | undefined;
  if (change.addFloor || change.addEdge || change.removeEdge) {
    seeds = [];
    const at: [number, number][] = [];
    if (change.addFloor) at.push([change.addFloor.x, change.addFloor.y]);
    if (change.addEdge) at.push(...flanks(change.addEdge.x, change.addEdge.y, change.addEdge.side));
    if (change.removeEdge) {
      const m = /^(\d+)([nw])(-?\d+),(-?\d+)$/.exec(change.removeEdge);
      if (m) at.push(...flanks(Number(m[3]), Number(m[4]), m[2] as Side));
    }
    for (const [x, y] of at) {
      cells.add(y * w + x);
      seeds.push(y * w + x);
    }
  }
  const rooms: HouseRoom[] = [];
  for (const box of clusterBoxes(world, cells, seeds)) rooms.push(...floodBox(world, ix, box, includeSites, change, storey));
  return rooms;
}

function floodBox(world: World, ix: Index, box: Box, includeSites: boolean, change: Change, storey: number): HouseRoom[] {
  const { width } = world.map;
  const [hx, hy] = [box.x0, box.y0];
  const SX = box.x1 - box.x0 + 1;
  const SY = box.y1 - box.y0 + 1;
  const idx = (x: number, y: number) => (y - hy) * SX + (x - hx);
  const add = change.addEdge ? edgeKey(change.addEdge.x, change.addEdge.y, change.addEdge.side, storey) : '';

  const info = (x: number, y: number, side: Side): EdgeInfo | null => {
    const key = edgeKey(x, y, side, storey);
    if (key === add) return { kind: change.addEdge!.kind, built: false };
    if (key === change.removeEdge) return null;
    return edgeInfo(world, x, y, side, storey);
  };
  const visible = (e: EdgeInfo | null): e is EdgeInfo => e !== null && (e.built || includeSites);
  const isFloor = (x: number, y: number) => {
    if (change.addFloor && change.addFloor.x === x && change.addFloor.y === y) return true;
    if (isLanding(world, x, y, storey)) return true;
    const f = ix.floors.get(tileKey(world, x, y, storey));
    return f !== undefined && (includeSites || f.construct <= 0);
  };

  // Flood fill across neighbors with nothing between them.
  const comp = new Int32Array(SX * SY).fill(-1);
  const rooms: HouseRoom[] = [];
  for (let sy = hy; sy < hy + SY; sy++) {
    for (let sx = hx; sx < hx + SX; sx++) {
      if (comp[idx(sx, sy)] !== -1) continue;
      const id = rooms.length;
      const room: HouseRoom = { tiles: [], floorCount: 0, outside: false, reachable: false };
      const stack = [[sx, sy]];
      comp[idx(sx, sy)] = id;
      while (stack.length) {
        const [x, y] = stack.pop()!;
        room.tiles.push(y * width + x);
        if (isFloor(x, y)) room.floorCount++;
        if (x === hx || y === hy || x === hx + SX - 1 || y === hy + SY - 1) room.outside = true;
        const next: [number, number, boolean][] = [
          [x + 1, y, visible(info(x + 1, y, 'w'))],
          [x - 1, y, visible(info(x, y, 'w'))],
          [x, y + 1, visible(info(x, y + 1, 'n'))],
          [x, y - 1, visible(info(x, y, 'n'))],
        ];
        for (const [nx, ny, separated] of next) {
          if (separated || nx < hx || ny < hy || nx >= hx + SX || ny >= hy + SY || comp[idx(nx, ny)] !== -1) continue;
          comp[idx(nx, ny)] = id;
          stack.push([nx, ny]);
        }
      }
      rooms.push(room);
    }
  }

  // Doors link rooms. Everything linked to the outside is reachable.
  const links: number[][] = rooms.map(() => []);
  const door = (x: number, y: number, side: Side) => {
    const e = info(x, y, side);
    if (!visible(e) || e.kind !== 'door') return;
    const [a, b] = flanks(x, y, side);
    if (a[0] < hx || a[1] < hy || b[0] < hx || b[1] < hy || a[0] >= hx + SX || a[1] >= hy + SY || b[0] >= hx + SX || b[1] >= hy + SY) return;
    const ca = comp[idx(a[0], a[1])];
    const cb = comp[idx(b[0], b[1])];
    links[ca].push(cb);
    links[cb].push(ca);
  };
  for (let y = hy; y < hy + SY; y++) {
    for (let x = hx; x < hx + SX; x++) {
      door(x, y, 'n');
      door(x, y, 'w');
    }
  }
  // Outside, or the top of a flight of stairs, is where people come from.
  const landed = (r: HouseRoom) => storey > 0 && r.tiles.some((t) => isLanding(world, t % width, Math.floor(t / width), storey));
  const queue = rooms.flatMap((r, i) => (r.outside || landed(r) ? [i] : []));
  for (const i of queue) rooms[i].reachable = true;
  while (queue.length) {
    for (const j of links[queue.pop()!]) {
      if (rooms[j].reachable) continue;
      rooms[j].reachable = true;
      queue.push(j);
    }
  }
  return rooms;
}

/** Finished rooms of one storey, cached until the layout changes. */
export function houseRooms(world: World, storey = 0): HouseRoom[] {
  const ix = index(world);
  return (ix.rooms[storey] ??= allRooms(world, storey).filter((r) => !r.outside && r.floorCount > 0));
}

/** Every area around the pieces on one storey, closed or open, cached until the layout changes. */
function allRooms(world: World, storey = 0): HouseRoom[] {
  const ix = index(world);
  return (ix.all[storey] ??= analyze(world, false, { storey }));
}

export type RoomRole = 'bedroom' | 'infirmary' | 'kitchen' | 'workshop' | 'drafting' | 'hall' | 'storage' | 'empty' | 'open' | 'hearth';

export interface RoomInfo {
  storey: number;
  role: RoomRole;
  name: string;
  /** Center in tile units, and the room's closed state. */
  x: number;
  y: number;
  closed: boolean;
  /** Closed with every floor tile under a whole roof. Only these rooms are warm and safe. */
  roofed: boolean;
  floors: number;
  beds: number;
  seats: number;
  decor: number;
  /** Map tile indexes of the room. */
  tiles: number[];
  /** A short note when the room has a problem or a missing use. */
  note: string;
}

const ROLE_NAMES: Record<RoomRole, string> = {
  hearth: 'Hearth room', bedroom: 'Bedroom', infirmary: 'Infirmary', kitchen: 'Kitchen', workshop: 'Workshop', drafting: 'Drafting room',
  hall: 'Hall', storage: 'Storeroom', empty: 'Empty room', open: 'Open floor',
};

/** What each floor area is, from the furniture in it, for the room overlay and the selection panel (section 5.7). */
export function roomInfos(world: World): RoomInfo[] {
  const out: RoomInfo[] = [];
  const top = world.house.floors.reduce((m, f) => Math.max(m, f.storey), 0);
  for (let storey = 0; storey <= top; storey++) out.push(...roomsOnStorey(world, storey));
  return out;
}

function roomsOnStorey(world: World, storey: number): RoomInfo[] {
  const out: RoomInfo[] = [];
  const w = world.map.width;
  for (const r of allRooms(world, storey)) {
    if (r.floorCount === 0) continue;
    const closed = !r.outside;
    const tiles = new Set(r.tiles);
    const inside = world.buildings.filter((b) => BUILDINGS[b.type].furniture && b.storey === storey && b.construct <= 0 && !b.broken && tiles.has(b.y * w + b.x));
    const has = (f: (d: (typeof BUILDINGS)[keyof typeof BUILDINGS]) => boolean) => inside.some((b) => f(BUILDINGS[b.type]));
    const beds = inside.reduce((n, b) => n + (BUILDINGS[b.type].beds ?? 0), 0);
    const seats = inside.reduce((n, b) => n + (BUILDINGS[b.type].social ? b.w * b.h : 0), 0);
    const decor = inside.filter((b) => BUILDINGS[b.type].decor).length;
    const hearth = storey === 0 && tiles.has(world.hearth.y * w + world.hearth.x);
    const floored = r.tiles.filter((t) => floorAt(world, t % w, Math.floor(t / w), storey) !== undefined);
    const whole = floored.length > 0 && floored.every((t) => roofed(world, t % w, Math.floor(t / w), storey));
    const role: RoomRole = !closed ? 'open'
      : hearth ? 'hearth'
      : has((d) => d.restBonus === 3) ? 'infirmary'
      : beds > 0 ? 'bedroom'
      : has((d) => d.work === 'stir') ? 'kitchen'
      : has((d) => d.armory === true) ? 'workshop'
      : inside.some((b) => b.type === 'draftingTable') ? 'drafting'
      : seats > 0 ? 'hall'
      : has((d) => (d.storage ?? 0) > 0) ? 'storage'
      : 'empty';
    const [cx, cy] = floored.reduce((a, t) => [a[0] + (t % w), a[1] + Math.floor(t / w)], [0, 0]);
    const count = floored.length || 1;
    out.push({
      storey, tiles: r.tiles, role, name: ROLE_NAMES[role], x: cx / count, y: cy / count, closed, roofed: closed && whole, floors: r.floorCount, beds, seats, decor,
      note: !closed ? 'Not closed. Walls are missing, so it is cold and unsafe' : !whole ? 'The roof is open to the sky. Patch it' : role === 'empty' ? 'Needs furniture' : role === 'bedroom' && beds < 1 ? 'No bed' : '',
    });
  }
  return out;
}

/** The room a position is in, or undefined outdoors, in a room with a gap in its walls, under an open roof, or off the floor. */
export function roomAt(world: World, x: number, y: number, storey = 0): HouseRoom | undefined {
  const ix = index(world);
  let map = ix.roomOf[storey];
  if (!map) {
    map = ix.roomOf[storey] = new Map();
    for (const r of houseRooms(world, storey)) for (const t of r.tiles) map.set(t, r);
  }
  const tx = Math.round(x);
  const ty = Math.round(y);
  if (!covered(world, tx, ty, storey) || !roofed(world, tx, ty, storey)) return undefined;
  return map.get(ty * world.map.width + tx);
}

/** True for a spot on the floor of a closed room under a whole roof, where walls stand all around. */
export const isIndoors = (world: World, x: number, y: number, storey = 0): boolean => roomAt(world, x, y, storey) !== undefined;

/** True for a spot on a house floor that is not indoors, because a wall is down or the roof is open. */
export const isBreached = (world: World, x: number, y: number, storey = 0): boolean => {
  const tx = Math.round(x);
  const ty = Math.round(y);
  return covered(world, tx, ty, storey) && !isIndoors(world, x, y, storey);
};

/** True when the change would leave a room with floor that no one can enter. */
export function sealsRoom(world: World, change: Change): boolean {
  return analyze(world, true, change).some((r) => !r.reachable && r.floorCount > 0);
}

/** True when the id belongs to a floor tile, a wall piece, or a piece of furniture of the house. */
export function inHouse(world: World, id: number): boolean {
  return world.house.floors.some((f) => f.id === id) || world.house.edges.some((e) => e.id === id) || world.buildings.some((b) => b.id === id && BUILDINGS[b.type].furniture === true);
}

/** True when the tile is part of the room. */
export const roomHasTile = (world: World, room: RoomInfo, x: number, y: number): boolean => room.tiles.includes(y * world.map.width + x);

/** Closed, roofed rooms with working furniture in them, which count toward finding the blueprint (M12). */
export function mendedRooms(world: World): number {
  return roomInfos(world).filter((r) => r.roofed && r.role !== 'empty' && r.role !== 'open').length;
}
