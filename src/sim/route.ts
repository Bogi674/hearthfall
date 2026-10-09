// Colonist routes around the house (M10.1). Outside the house colonists still walk straight lines.
// Near it they walk tile to tile, so finished walls stop them and doors let them through.
import { houseExtent, stepBlocked } from './house';
import type { World } from './world';

export interface Point {
  x: number;
  y: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** True when the straight walk between two points passes through the house area. */
function crossesHouse(world: World, a: Point, b: Point): boolean {
  const half = houseExtent(world) + 0.6;
  const n = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) * 4) + 1;
  for (let i = 0; i <= n; i++) {
    const x = a.x + ((b.x - a.x) * i) / n;
    const y = a.y + ((b.y - a.y) * i) / n;
    if (Math.abs(x - world.hearth.x) <= half && Math.abs(y - world.hearth.y) <= half) return true;
  }
  return false;
}

const STEPS: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

/**
 * Waypoints from one point to another, ending at the target. An empty list means walk straight.
 * Returns null when the target cannot be reached, so the caller walks straight instead.
 */
export function routeFor(world: World, from: Point, to: Point): Point[] | null {
  // Until the player builds on the house, the old ruin does not block walking, as before M10.1.
  if (world.house.floors.length === 0 && world.house.edges.length === 0) return [];
  if (!crossesHouse(world, from, to)) return [];
  const R = houseExtent(world) + 2;
  const lo = { x: world.hearth.x - R, y: world.hearth.y - R };
  const S = 2 * R + 1;
  const tile = (p: Point) => ({ x: clamp(Math.round(p.x), lo.x, lo.x + S - 1), y: clamp(Math.round(p.y), lo.y, lo.y + S - 1) });
  const start = tile(from);
  const goal = tile(to);
  const id = (x: number, y: number) => (y - lo.y) * S + (x - lo.x);

  // A star over the tiles of the house area. Steps cost 1, diagonals 1.41.
  const cost = new Float64Array(S * S).fill(Infinity);
  const prev = new Int32Array(S * S).fill(-1);
  const open: { i: number; x: number; y: number; f: number }[] = [{ i: id(start.x, start.y), x: start.x, y: start.y, f: 0 }];
  cost[open[0].i] = 0;
  const h = (x: number, y: number) => {
    const dx = Math.abs(x - goal.x);
    const dy = Math.abs(y - goal.y);
    return dx + dy - 0.59 * Math.min(dx, dy);
  };
  const closed = new Uint8Array(S * S);
  let found = false;
  while (open.length) {
    let best = 0;
    for (let k = 1; k < open.length; k++) if (open[k].f < open[best].f) best = k;
    const cur = open.splice(best, 1)[0];
    if (closed[cur.i]) continue;
    closed[cur.i] = 1;
    if (cur.x === goal.x && cur.y === goal.y) {
      found = true;
      break;
    }
    for (const [dx, dy] of STEPS) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      if (nx < lo.x || ny < lo.y || nx >= lo.x + S || ny >= lo.y + S) continue;
      if (dx !== 0 && dy !== 0) {
        // No cutting corners through a wall.
        if (stepBlocked(world, cur.x, cur.y, nx, cur.y) || stepBlocked(world, nx, cur.y, nx, ny)) continue;
        if (stepBlocked(world, cur.x, cur.y, cur.x, ny) || stepBlocked(world, cur.x, ny, nx, ny)) continue;
      } else if (stepBlocked(world, cur.x, cur.y, nx, ny)) continue;
      const ni = id(nx, ny);
      const c = cost[cur.i] + (dx !== 0 && dy !== 0 ? 1.41 : 1);
      if (c >= cost[ni]) continue;
      cost[ni] = c;
      prev[ni] = cur.i;
      open.push({ i: ni, x: nx, y: ny, f: c + h(nx, ny) });
    }
  }
  if (!found) return null;

  const tiles: Point[] = [];
  for (let i = id(goal.x, goal.y); i !== -1; i = prev[i]) tiles.push({ x: lo.x + (i % S), y: lo.y + Math.floor(i / S) });
  tiles.reverse();
  tiles.shift();
  // Keep only the tiles where the walk turns.
  const turns = tiles.filter((p, k) => {
    const before = k === 0 ? start : tiles[k - 1];
    const after = tiles[k + 1];
    return !after || p.x - before.x !== after.x - p.x || p.y - before.y !== after.y - p.y;
  });
  const outside = tile(from).x !== Math.round(from.x) || tile(from).y !== Math.round(from.y);
  const route = outside ? [{ ...start }, ...turns] : turns;
  if (tile(to).x !== Math.round(to.x) || tile(to).y !== Math.round(to.y)) route.push({ ...goal });
  route.push({ x: to.x, y: to.y });
  return route;
}
