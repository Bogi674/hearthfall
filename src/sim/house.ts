// House layer queries (M10.1): floors, edges, rooms, and which steps people can take.
// Read only. Placement rules are in placement.ts and the commands in commands.ts.
import { BUILDINGS } from '../data/buildings';
import { HOUSE, type EdgeKind } from '../data/house';
import type { HouseEdge, HouseFloor, World } from './world';

export type Side = 'n' | 'w';

export const lotRadius = (world: World): number => HOUSE.lotRadius[world.hearth.level - 1];

/** The top storey the house may reach at its current stage. Storey 0 is the ground floor. */
export const maxStorey = (world: World): number => HOUSE.storeys[world.hearth.level - 1] - 1;

/** True for tiles inside the house lot, where floors, walls, and furniture may go. */
export function inLot(world: World, x: number, y: number): boolean {
  return Math.max(Math.abs(x - world.hearth.x), Math.abs(y - world.hearth.y)) <= lotRadius(world);
}

export const isHearthTile = (world: World, x: number, y: number): boolean =>
  Math.abs(x - world.hearth.x) <= 1 && Math.abs(y - world.hearth.y) <= 1;

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
  extent: number;
  /** Keyed by storey, then tile. */
  floors: Map<number, HouseFloor>;
  edges: Map<string, HouseEdge>;
  /** Built stairs by the tile they stand on and the storey they start from. */
  stairs: Set<number>;
  all: (HouseRoom[] | undefined)[];
  rooms: (HouseRoom[] | undefined)[];
  roomOf: (Map<number, HouseRoom> | undefined)[];
}
const cache = new WeakMap<World, Index>();

function index(world: World): Index {
  let ix = cache.get(world);
  if (!ix || ix.rev !== world.buildRev) {
    const w = world.map.width;
    let extent = 1;
    for (const f of world.house.floors) extent = Math.max(extent, Math.abs(f.x - world.hearth.x), Math.abs(f.y - world.hearth.y));
    for (const e of world.house.edges) extent = Math.max(extent, Math.abs(e.x - world.hearth.x), Math.abs(e.y - world.hearth.y));
    const n = w * world.map.height;
    ix = {
      rev: world.buildRev,
      extent,
      floors: new Map(world.house.floors.map((f) => [f.storey * n + f.y * w + f.x, f])),
      edges: new Map(world.house.edges.map((e) => [edgeKey(e.x, e.y, e.side, e.storey), e])),
      stairs: new Set(world.buildings.filter((b) => BUILDINGS[b.type].stairs).map((b) => b.storey * n + b.y * w + b.x)),
      all: [],
      rooms: [],
      roomOf: [],
    };
    cache.set(world, ix);
  }
  return ix;
}

/** How many tiles from the hearth the built house reaches, at least 1 for the house itself. */
export const houseExtent = (world: World): number => index(world).extent;

const tileKey = (world: World, x: number, y: number, storey: number): number => storey * world.map.width * world.map.height + y * world.map.width + x;

export function floorAt(world: World, x: number, y: number, storey = 0): HouseFloor | undefined {
  return index(world).floors.get(tileKey(world, x, y, storey));
}

export function storedEdgeAt(world: World, x: number, y: number, side: Side, storey = 0): HouseEdge | undefined {
  return index(world).edges.get(edgeKey(x, y, side, storey));
}

/** True when stairs from the storey below open onto this tile, so the tile has no floor but people can stand on it. */
export const isLanding = (world: World, x: number, y: number, storey: number): boolean => storey > 0 && index(world).stairs.has(tileKey(world, x, y, storey - 1));

/** True when stairs stand on this tile and lead up from this storey. */
export const hasStairs = (world: World, x: number, y: number, storey: number): boolean => index(world).stairs.has(tileKey(world, x, y, storey));

/** True when people can stand here: the Hearth House, a floor, or the top of a flight of stairs. Ground outside the house is always open. */
export function walkable(world: World, x: number, y: number, storey: number): boolean {
  if (storey === 0) return true;
  return floorAt(world, x, y, storey) !== undefined || isLanding(world, x, y, storey);
}

/** True when the tile has a floor, or the hearth house, or a landing, as part of the house on this storey. */
export const covered = (world: World, x: number, y: number, storey: number): boolean =>
  (storey === 0 && isHearthTile(world, x, y)) || floorAt(world, x, y, storey) !== undefined || isLanding(world, x, y, storey);

/** What stands on an edge. The house itself is a wall with a front door on its south side. */
export interface EdgeInfo {
  kind: EdgeKind | 'hearth';
  built: boolean;
  /** True for the walls of the Hearth House itself. */
  virtual: boolean;
}

function virtualEdge(world: World, x: number, y: number, side: Side, storey = 0): EdgeInfo | null {
  if (storey !== 0) return null;
  const [a, b] = flanks(x, y, side);
  if (isHearthTile(world, a[0], a[1]) === isHearthTile(world, b[0], b[1])) return null;
  const frontDoor = side === 'n' && x === world.hearth.x && y === world.hearth.y + 2;
  return { kind: frontDoor ? 'door' : 'hearth', built: true, virtual: true };
}

export function edgeInfo(world: World, x: number, y: number, side: Side, storey = 0): EdgeInfo | null {
  const stored = storedEdgeAt(world, x, y, side, storey);
  return stored ? { kind: stored.kind, built: stored.construct <= 0, virtual: false } : virtualEdge(world, x, y, side, storey);
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

/**
 * Splits the area around the house into rooms. Walls, windows, and doors all separate rooms. People can
 * pass between rooms through doors. With includeSites, planned pieces count as built, which is how
 * placement checks that no room gets sealed without a door.
 */
export function analyze(world: World, includeSites: boolean, change: Change = {}): HouseRoom[] {
  const storey = change.storey ?? 0;
  const { width } = world.map;
  const R = lotRadius(world) + 1;
  const S = 2 * R + 1;
  const hx = world.hearth.x - R;
  const hy = world.hearth.y - R;
  const ix = index(world);
  const idx = (x: number, y: number) => (y - hy) * S + (x - hx);
  const add = change.addEdge ? edgeKey(change.addEdge.x, change.addEdge.y, change.addEdge.side, storey) : '';

  const info = (x: number, y: number, side: Side): EdgeInfo | null => {
    const key = edgeKey(x, y, side, storey);
    if (key === add) return { kind: change.addEdge!.kind, built: false, virtual: false };
    if (key === change.removeEdge) return virtualEdge(world, x, y, side, storey);
    return edgeInfo(world, x, y, side, storey);
  };
  const visible = (e: EdgeInfo | null): e is EdgeInfo => e !== null && (e.built || includeSites);
  const isFloor = (x: number, y: number) => {
    if (storey === 0 && isHearthTile(world, x, y)) return true;
    if (change.addFloor && change.addFloor.x === x && change.addFloor.y === y) return true;
    if (isLanding(world, x, y, storey)) return true;
    const f = ix.floors.get(tileKey(world, x, y, storey));
    return f !== undefined && (includeSites || f.construct <= 0);
  };

  // Flood fill across neighbors with nothing between them.
  const comp = new Int32Array(S * S).fill(-1);
  const rooms: HouseRoom[] = [];
  for (let sy = hy; sy < hy + S; sy++) {
    for (let sx = hx; sx < hx + S; sx++) {
      if (comp[idx(sx, sy)] !== -1) continue;
      const id = rooms.length;
      const room: HouseRoom = { tiles: [], floorCount: 0, outside: false, reachable: false };
      const stack = [[sx, sy]];
      comp[idx(sx, sy)] = id;
      while (stack.length) {
        const [x, y] = stack.pop()!;
        room.tiles.push(y * width + x);
        if (isFloor(x, y)) room.floorCount++;
        if (x === hx || y === hy || x === hx + S - 1 || y === hy + S - 1) room.outside = true;
        const next: [number, number, boolean][] = [
          [x + 1, y, visible(info(x + 1, y, 'w'))],
          [x - 1, y, visible(info(x, y, 'w'))],
          [x, y + 1, visible(info(x, y + 1, 'n'))],
          [x, y - 1, visible(info(x, y, 'n'))],
        ];
        for (const [nx, ny, separated] of next) {
          if (separated || nx < hx || ny < hy || nx >= hx + S || ny >= hy + S || comp[idx(nx, ny)] !== -1) continue;
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
    if (a[0] < hx || a[1] < hy || b[0] < hx || b[1] < hy || a[0] >= hx + S || a[1] >= hy + S || b[0] >= hx + S || b[1] >= hy + S) return;
    const ca = comp[idx(a[0], a[1])];
    const cb = comp[idx(b[0], b[1])];
    links[ca].push(cb);
    links[cb].push(ca);
  };
  for (let y = hy; y < hy + S; y++) {
    for (let x = hx; x < hx + S; x++) {
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

/** Every area around the house on one storey, closed or open, cached until the layout changes. */
function allRooms(world: World, storey = 0): HouseRoom[] {
  const ix = index(world);
  return (ix.all[storey] ??= analyze(world, false, { storey }));
}

export type RoomRole = 'hearth' | 'bedroom' | 'infirmary' | 'kitchen' | 'workshop' | 'drafting' | 'hall' | 'storage' | 'empty' | 'open';

export interface RoomInfo {
  storey: number;
  role: RoomRole;
  name: string;
  /** Center in tile units, and the room's closed state. */
  x: number;
  y: number;
  closed: boolean;
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
  hearth: 'Hearth hall', bedroom: 'Bedroom', infirmary: 'Infirmary', kitchen: 'Kitchen', workshop: 'Workshop', drafting: 'Drafting room',
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
  const isHall = (t: number) => storey === 0 && isHearthTile(world, t % w, Math.floor(t / w));
  for (const r of allRooms(world, storey)) {
    if (r.floorCount === 0) continue;
    const closed = !r.outside;
    const tiles = new Set(r.tiles);
    const inside = world.buildings.filter((b) => BUILDINGS[b.type].furniture && b.storey === storey && b.construct <= 0 && tiles.has(b.y * w + b.x));
    const has = (f: (d: (typeof BUILDINGS)[keyof typeof BUILDINGS]) => boolean) => inside.some((b) => f(BUILDINGS[b.type]));
    const beds = inside.reduce((n, b) => n + (BUILDINGS[b.type].beds ?? 0), 0);
    const seats = inside.reduce((n, b) => n + (BUILDINGS[b.type].social ? b.w * b.h : 0), 0);
    const decor = inside.filter((b) => BUILDINGS[b.type].decor).length;
    const hearth = r.tiles.some(isHall);
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
    const mine = r.tiles.filter((t) => !isHall(t) || hearth);
    const [cx, cy] = mine.reduce((a, t) => [a[0] + (t % w), a[1] + Math.floor(t / w)], [0, 0]);
    const count = mine.length || 1;
    out.push({
      storey, tiles: r.tiles, role, name: ROLE_NAMES[role], x: cx / count, y: cy / count, closed, floors: r.floorCount, beds, seats, decor,
      note: !closed ? 'Not closed. Walls are missing, so it is cold and unsafe' : role === 'empty' ? 'Needs furniture' : role === 'bedroom' && beds < 1 ? 'No bed' : '',
    });
  }
  return out;
}



/** The closed room a position is in, or undefined outdoors, in a room with a gap, or off the floor. */
export function roomAt(world: World, x: number, y: number, storey = 0): HouseRoom | undefined {
  const ix = index(world);
  let map = ix.roomOf[storey];
  if (!map) {
    map = ix.roomOf[storey] = new Map();
    for (const r of houseRooms(world, storey)) for (const t of r.tiles) map.set(t, r);
  }
  const tx = Math.round(x);
  const ty = Math.round(y);
  if (!covered(world, tx, ty, storey)) return undefined;
  return map.get(ty * world.map.width + tx);
}

/** True for a spot on the floor of a closed room, where walls stand all around. */
export const isIndoors = (world: World, x: number, y: number, storey = 0): boolean => roomAt(world, x, y, storey) !== undefined;

/** True for a spot on a house floor that is not in a closed room, because a wall is down or missing. */
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
