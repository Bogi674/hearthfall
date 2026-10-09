// House layer queries (M10.1): floors, edges, rooms, and which steps people can take.
// Read only. Placement rules are in placement.ts and the commands in commands.ts.
import { HOUSE, type EdgeKind } from '../data/house';
import type { HouseEdge, HouseFloor, World } from './world';

export type Side = 'n' | 'w';

export const lotRadius = (world: World): number => HOUSE.lotRadius[world.hearth.level - 1];

/** True for tiles inside the house lot, where floors, walls, and furniture may go. */
export function inLot(world: World, x: number, y: number): boolean {
  return Math.max(Math.abs(x - world.hearth.x), Math.abs(y - world.hearth.y)) <= lotRadius(world);
}

export const isHearthTile = (world: World, x: number, y: number): boolean =>
  Math.abs(x - world.hearth.x) <= 1 && Math.abs(y - world.hearth.y) <= 1;

export const edgeKey = (x: number, y: number, side: Side): string => `${side}${x},${y}`;

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
  floors: Map<number, HouseFloor>;
  edges: Map<string, HouseEdge>;
  rooms?: HouseRoom[];
  roomOf?: Map<number, HouseRoom>;
}
const cache = new WeakMap<World, Index>();

function index(world: World): Index {
  let ix = cache.get(world);
  if (!ix || ix.rev !== world.buildRev) {
    const w = world.map.width;
    let extent = 1;
    for (const f of world.house.floors) extent = Math.max(extent, Math.abs(f.x - world.hearth.x), Math.abs(f.y - world.hearth.y));
    for (const e of world.house.edges) extent = Math.max(extent, Math.abs(e.x - world.hearth.x), Math.abs(e.y - world.hearth.y));
    ix = {
      rev: world.buildRev,
      extent,
      floors: new Map(world.house.floors.map((f) => [f.y * w + f.x, f])),
      edges: new Map(world.house.edges.map((e) => [edgeKey(e.x, e.y, e.side), e])),
    };
    cache.set(world, ix);
  }
  return ix;
}

/** How many tiles from the hearth the built house reaches, at least 1 for the house itself. */
export const houseExtent = (world: World): number => index(world).extent;

export function floorAt(world: World, x: number, y: number): HouseFloor | undefined {
  return index(world).floors.get(y * world.map.width + x);
}

export function storedEdgeAt(world: World, x: number, y: number, side: Side): HouseEdge | undefined {
  return index(world).edges.get(edgeKey(x, y, side));
}

/** What stands on an edge. The house itself is a wall with a front door on its south side. */
export interface EdgeInfo {
  kind: EdgeKind | 'hearth';
  built: boolean;
  /** True for the walls of the Hearth House itself. */
  virtual: boolean;
}

function virtualEdge(world: World, x: number, y: number, side: Side): EdgeInfo | null {
  const [a, b] = flanks(x, y, side);
  if (isHearthTile(world, a[0], a[1]) === isHearthTile(world, b[0], b[1])) return null;
  const frontDoor = side === 'n' && x === world.hearth.x && y === world.hearth.y + 2;
  return { kind: frontDoor ? 'door' : 'hearth', built: true, virtual: true };
}

export function edgeInfo(world: World, x: number, y: number, side: Side): EdgeInfo | null {
  const stored = storedEdgeAt(world, x, y, side);
  return stored ? { kind: stored.kind, built: stored.construct <= 0, virtual: false } : virtualEdge(world, x, y, side);
}

/** True when a finished wall or window stands between two neighbor tiles. Doors and unfinished sites do not block. */
export function stepBlocked(world: World, ax: number, ay: number, bx: number, by: number): boolean {
  const e = edgeAcross(ax, ay, bx, by);
  const info = edgeInfo(world, e.x, e.y, e.side);
  return info !== null && info.built && info.kind !== 'door';
}

/** The finished wall, door, or window between two orthogonal neighbor tiles that monsters must break, if any. */
export function barrierBetween(world: World, ax: number, ay: number, bx: number, by: number): HouseEdge | undefined {
  const e = edgeAcross(ax, ay, bx, by);
  const stored = storedEdgeAt(world, e.x, e.y, e.side);
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
  const { width } = world.map;
  const R = lotRadius(world) + 1;
  const S = 2 * R + 1;
  const hx = world.hearth.x - R;
  const hy = world.hearth.y - R;
  const ix = index(world);
  const idx = (x: number, y: number) => (y - hy) * S + (x - hx);
  const add = change.addEdge ? edgeKey(change.addEdge.x, change.addEdge.y, change.addEdge.side) : '';

  const info = (x: number, y: number, side: Side): EdgeInfo | null => {
    const key = edgeKey(x, y, side);
    if (key === add) return { kind: change.addEdge!.kind, built: false, virtual: false };
    if (key === change.removeEdge) return virtualEdge(world, x, y, side);
    return edgeInfo(world, x, y, side);
  };
  const visible = (e: EdgeInfo | null): e is EdgeInfo => e !== null && (e.built || includeSites);
  const isFloor = (x: number, y: number) => {
    if (isHearthTile(world, x, y)) return true;
    if (change.addFloor && change.addFloor.x === x && change.addFloor.y === y) return true;
    const f = ix.floors.get(y * width + x);
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
  const queue = rooms.flatMap((r, i) => (r.outside ? [i] : []));
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

/** Finished rooms of the house, cached until the layout changes. Used by furniture and defense later. */
export function houseRooms(world: World): HouseRoom[] {
  const ix = index(world);
  return (ix.rooms ??= analyze(world, false).filter((r) => !r.outside && r.floorCount > 0));
}

/** The closed room a position is in, or undefined outdoors, in a room with a gap, or off the floor. */
export function roomAt(world: World, x: number, y: number): HouseRoom | undefined {
  const ix = index(world);
  if (!ix.roomOf) {
    ix.roomOf = new Map();
    for (const r of houseRooms(world)) for (const t of r.tiles) ix.roomOf.set(t, r);
  }
  const tx = Math.round(x);
  const ty = Math.round(y);
  if (!isHearthTile(world, tx, ty) && !ix.floors.has(ty * world.map.width + tx)) return undefined;
  return ix.roomOf.get(ty * world.map.width + tx);
}

/** True for a spot on the floor of a closed room, where walls stand all around. */
export const isIndoors = (world: World, x: number, y: number): boolean => roomAt(world, x, y) !== undefined;

/** True for a spot on a house floor that is not in a closed room, because a wall is down or missing. */
export const isBreached = (world: World, x: number, y: number): boolean => {
  const tx = Math.round(x);
  const ty = Math.round(y);
  return (isHearthTile(world, tx, ty) || floorAt(world, tx, ty) !== undefined) && !isIndoors(world, x, y);
};

/** True when the change would leave a room with floor that no one can enter. */
export function sealsRoom(world: World, change: Change): boolean {
  return analyze(world, true, change).some((r) => !r.reachable && r.floorCount > 0);
}
