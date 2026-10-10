// Colonist routes around the house (M10.1, storeys in M11). Outside the house colonists still walk straight lines.
// Near it they walk tile to tile, so finished walls stop them and doors let them through.
// Stairs join one storey to the next, and upper storeys can only be walked where there is a floor.
import { hasStairs, nearPieces, stepBlocked, walkable } from './house';
import type { World } from './world';

export interface Point {
  x: number;
  y: number;
}

/** A waypoint says which storey the colonist is on once it gets there. */
export interface Waypoint extends Point {
  storey?: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** True when the straight walk between two points passes by a wall or a floor of any house, ruin or new. */
function crossesHouse(world: World, a: Point, b: Point): boolean {
  const n = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) * 4) + 1;
  for (let i = 0; i <= n; i++) {
    if (nearPieces(world, a.x + ((b.x - a.x) * i) / n, a.y + ((b.y - a.y) * i) / n)) return true;
  }
  return false;
}

const STEPS: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
/** Climbing a flight of stairs costs about two tiles of walking. */
const STAIR_COST = 2;

/**
 * Waypoints from one point to another, ending at the target. An empty list means walk straight.
 * Returns null when the target cannot be reached, so the caller walks straight instead.
 */
export function routeFor(world: World, from: Point & { storey?: number }, to: Point & { storey?: number }): Waypoint[] | null {
  // Until the player builds on the house, the old ruin does not block walking, as before M10.1.
  if (world.house.floors.length === 0 && world.house.edges.length === 0) return [];
  const fromStorey = from.storey ?? 0;
  const toStorey = to.storey ?? 0;
  if (fromStorey === 0 && toStorey === 0 && !crossesHouse(world, from, to)) return [];
  // The search runs in a box around the walk, so a ruin anywhere on the map costs the same as one beside the hearth.
  const margin = 6;
  const lo = { x: Math.max(0, Math.floor(Math.min(from.x, to.x)) - margin), y: Math.max(0, Math.floor(Math.min(from.y, to.y)) - margin) };
  const hi = { x: Math.min(world.map.width - 1, Math.ceil(Math.max(from.x, to.x)) + margin), y: Math.min(world.map.height - 1, Math.ceil(Math.max(from.y, to.y)) + margin) };
  const SX = hi.x - lo.x + 1;
  const SY = hi.y - lo.y + 1;
  const layers = Math.max(fromStorey, toStorey, world.house.floors.reduce((m, f) => Math.max(m, f.storey), 0)) + 1;
  const tile = (p: Point) => ({ x: clamp(Math.round(p.x), lo.x, hi.x), y: clamp(Math.round(p.y), lo.y, hi.y) });
  const start = tile(from);
  const goal = tile(to);
  const id = (s: number, x: number, y: number) => s * SX * SY + (y - lo.y) * SX + (x - lo.x);

  // A star over the tiles of the house area on every storey. Steps cost 1, diagonals 1.41.
  const cost = new Float64Array(SX * SY * layers).fill(Infinity);
  const prev = new Int32Array(SX * SY * layers).fill(-1);
  type Node = { i: number; s: number; x: number; y: number; f: number };
  const open: Node[] = [{ i: id(fromStorey, start.x, start.y), s: fromStorey, x: start.x, y: start.y, f: 0 }];
  cost[open[0].i] = 0;
  const h = (s: number, x: number, y: number) => {
    const dx = Math.abs(x - goal.x);
    const dy = Math.abs(y - goal.y);
    return dx + dy - 0.59 * Math.min(dx, dy) + Math.abs(s - toStorey) * STAIR_COST;
  };
  const closed = new Uint8Array(SX * SY * layers);
  let found = false;
  const relax = (cur: Node, ns: number, nx: number, ny: number, step: number) => {
    const ni = id(ns, nx, ny);
    const c = cost[cur.i] + step;
    if (c >= cost[ni]) return;
    cost[ni] = c;
    prev[ni] = cur.i;
    open.push({ i: ni, s: ns, x: nx, y: ny, f: c + h(ns, nx, ny) });
  };
  while (open.length) {
    let best = 0;
    for (let k = 1; k < open.length; k++) if (open[k].f < open[best].f) best = k;
    const cur = open.splice(best, 1)[0];
    if (closed[cur.i]) continue;
    closed[cur.i] = 1;
    if (cur.s === toStorey && cur.x === goal.x && cur.y === goal.y) {
      found = true;
      break;
    }
    const s = cur.s;
    for (const [dx, dy] of STEPS) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      if (nx < lo.x || ny < lo.y || nx > hi.x || ny > hi.y) continue;
      if (!walkable(world, nx, ny, s)) continue;
      if (dx !== 0 && dy !== 0) {
        // No cutting corners through a wall or a gap in the floor.
        if (!walkable(world, nx, cur.y, s) || !walkable(world, cur.x, ny, s)) continue;
        if (stepBlocked(world, cur.x, cur.y, nx, cur.y, s) || stepBlocked(world, nx, cur.y, nx, ny, s)) continue;
        if (stepBlocked(world, cur.x, cur.y, cur.x, ny, s) || stepBlocked(world, cur.x, ny, nx, ny, s)) continue;
      } else if (stepBlocked(world, cur.x, cur.y, nx, ny, s)) continue;
      relax(cur, s, nx, ny, dx !== 0 && dy !== 0 ? 1.41 : 1);
    }
    if (hasStairs(world, cur.x, cur.y, s) && s + 1 < layers) relax(cur, s + 1, cur.x, cur.y, STAIR_COST);
    if (s > 0 && hasStairs(world, cur.x, cur.y, s - 1)) relax(cur, s - 1, cur.x, cur.y, STAIR_COST);
  }
  if (!found) return null;

  const nodes: { x: number; y: number; s: number }[] = [];
  for (let i = id(toStorey, goal.x, goal.y); i !== -1; i = prev[i]) {
    const s = Math.floor(i / (SX * SY));
    const r = i - s * SX * SY;
    nodes.push({ x: lo.x + (r % SX), y: lo.y + Math.floor(r / SX), s });
  }
  nodes.reverse();
  nodes.shift();
  // Keep only the tiles where the walk turns or changes storey.
  const startNode = { x: start.x, y: start.y, s: fromStorey };
  const turns = nodes.filter((p, k) => {
    const before = k === 0 ? startNode : nodes[k - 1];
    const after = nodes[k + 1];
    if (!after) return true;
    return p.s !== before.s || p.s !== after.s || p.x - before.x !== after.x - p.x || p.y - before.y !== after.y - p.y;
  });
  const outside = fromStorey === 0 && (tile(from).x !== Math.round(from.x) || tile(from).y !== Math.round(from.y));
  const route: Waypoint[] = turns.map((p) => ({ x: p.x, y: p.y, storey: p.s }));
  if (outside) route.unshift({ x: start.x, y: start.y, storey: fromStorey });
  if (toStorey === 0 && (tile(to).x !== Math.round(to.x) || tile(to).y !== Math.round(to.y))) route.push({ x: goal.x, y: goal.y, storey: 0 });
  route.push({ x: to.x, y: to.y, storey: toStorey });
  return route;
}
