// Flow fields toward the hearth (section 9.3). Each tile holds the cheapest cost to reach the hearth.
// Walls cost a lot instead of blocking, so a fully walled base is still reachable through its weakest wall.
// Rebuilt only when buildings or tiles change.
import { BALANCE } from '../../data/balance';
import { BUILDINGS } from '../../data/buildings';
import { Tile } from '../grid';
import { barrierBetween } from '../house';
import type { HouseEdge, World } from '../world';

const P = BALANCE.paths;
/** Cost of an impassable tile. A finite number keeps the state JSON safe. */
export const BLOCKED = 1e9;

export function pathfindingSystem(world: World, _dt: number): void {
  const key = `${world.mapRev}|${world.buildRev}`;
  if (world.flow.key === key) return;
  world.flow = { key, normal: field(world, false), runner: field(world, true) };
}

function tileCost(world: World, runner: boolean): number[] {
  const terrain: Partial<Record<Tile, number>> = { [Tile.Ground]: P.ground, [Tile.Road]: P.road, [Tile.Tree]: P.tree, [Tile.Rubble]: P.rubble };
  const cost = world.map.tiles.map((t) => terrain[t] ?? BLOCKED);
  for (const b of world.buildings) {
    const def = BUILDINGS[b.type];
    if (def.walkable) continue;
    const c = !runner ? P.structure : def.gate ? P.runnerGate : P.runnerStructure;
    for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) cost[y * world.map.width + x] = c;
  }
  return cost;
}

/**
 * House walls, doors, and windows cost by their strength, so monsters go for the weakest piece. Doors are the
 * cheapest, and runners favor them like gates. Only finished pieces count. The house itself adds no cost.
 */
function edgeCosts(world: World, runner: boolean): Map<number, number> {
  const out = new Map<number, number>();
  const { width } = world.map;
  for (const e of world.house.edges) {
    if (e.construct > 0) continue;
    out.set((e.y * width + e.x) * 2 + (e.side === 'n' ? 0 : 1), breakCost(e, runner));
  }
  return out;
}

const breakCost = (e: HouseEdge, runner: boolean): number => (runner ? (e.kind === 'door' ? P.runnerGate : e.hp * 0.8) : e.hp * 0.4);

/** What it costs a monster to break through the house wall between two neighbor tiles, or 0 when nothing stands there. */
export function crossCost(world: World, runner: boolean, ax: number, ay: number, bx: number, by: number): number {
  if (world.house.edges.length === 0) return 0;
  const e = barrierBetween(world, ax, ay, bx, by);
  return e ? breakCost(e, runner) : 0;
}

/** The key of the edge crossed by a step between two neighbor tiles. */
function stepEdge(width: number, x: number, y: number, nx: number, ny: number): number {
  if (nx !== x) return (y * width + Math.max(x, nx)) * 2 + 1;
  return (Math.max(y, ny) * width + x) * 2;
}

/** Dijkstra from the hearth footprint over 4 neighbors. */
function field(world: World, runner: boolean): number[] {
  const { width, height } = world.map;
  const cost = tileCost(world, runner);
  const edges = edgeCosts(world, runner);
  const dist = new Array<number>(width * height).fill(BLOCKED);
  const heap: [number, number][] = [];
  dist[world.hearth.y * width + world.hearth.x] = 0;
  push(heap, [0, world.hearth.y * width + world.hearth.x]);
  while (heap.length) {
    const [d, i] = pop(heap);
    if (d > dist[i]) continue;
    const x = i % width;
    const y = (i - x) / width;
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const n = ny * width + nx;
      if (cost[n] >= BLOCKED) continue;
      const nd = d + cost[n] + (edges.size ? edges.get(stepEdge(width, x, y, nx, ny)) ?? 0 : 0);
      if (nd < dist[n]) {
        dist[n] = nd;
        push(heap, [nd, n]);
      }
    }
  }
  return dist;
}

function push(h: [number, number][], v: [number, number]): void {
  h.push(v);
  for (let i = h.length - 1; i > 0; ) {
    const p = (i - 1) >> 1;
    if (h[p][0] <= h[i][0]) break;
    [h[p], h[i]] = [h[i], h[p]];
    i = p;
  }
}

function pop(h: [number, number][]): [number, number] {
  const top = h[0];
  const last = h.pop()!;
  if (h.length) {
    h[0] = last;
    for (let i = 0; ; ) {
      const l = 2 * i + 1;
      const r = l + 1;
      let m = i;
      if (l < h.length && h[l][0] < h[m][0]) m = l;
      if (r < h.length && h[r][0] < h[m][0]) m = r;
      if (m === i) break;
      [h[m], h[i]] = [h[i], h[m]];
      i = m;
    }
  }
  return top;
}
