// Area tools for the house builder (M11): fill a floor, raise a whole room, run a wall, or take an area apart.
// Each one is a loop over the single piece rules in placement.ts, so every rule still holds for every piece.
import { BUILDINGS } from '../data/buildings';
import type { EdgeKind, FloorId } from '../data/house';
import { covered, edgeInfo, flanks, floorAt, storedEdgeAt, type Side } from './house';
import { floorPlacementError, placeEdge, placeFloor, removeError, removeHouseItem } from './placement';
import type { World } from './world';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const tilesOf = (r: Rect): [number, number][] => {
  const out: [number, number][] = [];
  for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) out.push([x, y]);
  return out;
};

/**
 * Lays floor on every free tile of the rectangle, in the order the rules allow. A floor must touch the house or another floor,
 * so tiles next to what exists go first and the rest follow. Returns how many were placed.
 */
export function paintArea(world: World, r: Rect, kind: FloorId, storey = 0): number {
  let left = tilesOf(r).filter(([x, y]) => !floorAt(world, x, y, storey));
  let placed = 0;
  for (let pass = 0; pass < left.length + 1; pass++) {
    const next: [number, number][] = [];
    let progress = false;
    for (const [x, y] of left) {
      if (placeFloor(world, x, y, kind, storey)) {
        placed++;
        progress = true;
      } else next.push([x, y]);
    }
    left = next;
    if (!progress || left.length === 0) break;
  }
  return placed;
}

interface Border {
  x: number;
  y: number;
  side: Side;
}

/** The borders around a rectangle of tiles. */
export function perimeter(r: Rect): Border[] {
  const out: Border[] = [];
  for (let x = r.x; x < r.x + r.w; x++) out.push({ x, y: r.y, side: 'n' }, { x, y: r.y + r.h, side: 'n' });
  for (let y = r.y; y < r.y + r.h; y++) out.push({ x: r.x, y, side: 'w' }, { x: r.x + r.w, y, side: 'w' });
  return out;
}

/** The border of a room where the door goes: the one that opens onto the house or an existing floor, else the middle of the south side. */
function doorBorder(world: World, r: Rect, storey: number): Border {
  const borders = perimeter(r);
  const inside = (t: [number, number]) => t[0] >= r.x && t[0] < r.x + r.w && t[1] >= r.y && t[1] < r.y + r.h;
  const toExisting = borders.filter((b) => {
    const outside = flanks(b.x, b.y, b.side).find((t) => !inside(t));
    return outside && covered(world, outside[0], outside[1], storey);
  });
  if (toExisting.length) {
    const cx = r.x + (r.w - 1) / 2;
    const cy = r.y + (r.h - 1) / 2;
    return toExisting.reduce((best, b) => (Math.hypot(b.x - cx, b.y - cy) < Math.hypot(best.x - cx, best.y - cy) ? b : best));
  }
  return { x: r.x + Math.floor(r.w / 2), y: r.y + r.h, side: 'n' };
}

/** Floors, walls all around, and one door. Pieces that cannot go are skipped. Returns the number of pieces placed. */
export function buildRoom(world: World, r: Rect, floor: FloorId, level: number, storey = 0): number {
  let placed = paintArea(world, r, floor, storey);
  const door = doorBorder(world, r, storey);
  if (placeEdge(world, door.x, door.y, door.side, 'door', 1, storey)) placed++;
  for (const b of perimeter(r)) {
    if (storedEdgeAt(world, b.x, b.y, b.side, storey)) continue;
    if (edgeInfo(world, b.x, b.y, b.side, storey)?.virtual) continue;
    if (placeEdge(world, b.x, b.y, b.side, 'wall', level, storey)) placed++;
  }
  return placed;
}

/** A straight run of walls, doors, or windows along one axis, starting at a border. */
export function buildLine(world: World, start: Border, length: number, kind: EdgeKind, level: number, storey = 0): number {
  let placed = 0;
  for (let i = 0; i < length; i++) {
    const [x, y] = start.side === 'n' ? [start.x + i, start.y] : [start.x, start.y + i];
    if (placeEdge(world, x, y, start.side, kind, level, storey)) placed++;
  }
  return placed;
}

/** Takes furniture, wall pieces, and floors out of the rectangle, in that order, as far as the rules allow. */
export function demolishArea(world: World, r: Rect, storey = 0): number {
  const inside = (x: number, y: number) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
  let removed = 0;
  for (let pass = 0; pass < 6; pass++) {
    let progress = false;
    const furniture = world.buildings.filter((b) => BUILDINGS[b.type].furniture && b.storey === storey && tilesOf({ x: b.x, y: b.y, w: b.w, h: b.h }).some(([x, y]) => inside(x, y)));
    const edges = world.house.edges.filter((e) => e.storey === storey && flanks(e.x, e.y, e.side).some(([x, y]) => inside(x, y)));
    const floors = world.house.floors.filter((f) => f.storey === storey && inside(f.x, f.y));
    // Doors go last among the walls, so a room is never shut in halfway.
    edges.sort((a, b) => Number(a.kind === 'door') - Number(b.kind === 'door'));
    const pieces: ['furniture' | 'edge' | 'floor', number][] = [
      ...furniture.map((b) => ['furniture', b.id] as ['furniture', number]),
      ...edges.map((e) => ['edge', e.id] as ['edge', number]),
      ...floors.map((f) => ['floor', f.id] as ['floor', number]),
    ];
    for (const [item, id] of pieces) {
      if (removeError(world, item, id) === null && removeHouseItem(world, item, id)) {
        removed++;
        progress = true;
      }
    }
    if (!progress) break;
  }
  return removed;
}

/** How many tiles of the rectangle could take a floor right now, ignoring cost, for the cost preview. */
export function fillable(world: World, r: Rect, kind: FloorId, storey = 0): number {
  return tilesOf(r).filter(([x, y]) => {
    const e = floorPlacementError(world, x, y, kind, storey);
    return e === null || e.startsWith('Not enough');
  }).length;
}
