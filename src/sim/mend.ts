// Mending the ruin (M12): repair worn walls, doors, windows, and furniture, patch open roofs, and clear rubble. A mend order pays
// for the work now and queues it for builders, like any construction site.
import { BUILDINGS } from '../data/buildings';
import { EDGES, HOUSE } from '../data/house';
import { RESOURCE_NAMES, type Amounts, type Resource } from '../data/resources';
import { getTile, Tile } from './grid';
import { missing, pay } from './query';
import type { Building, HouseEdge, HouseFloor, World } from './world';
import { tilesOf, type Rect } from './build';

const share = HOUSE.repairShare;

/** The cost and builder seconds of repairing a share of a piece's worth, at least one of its first resource and two seconds. */
function repairOf(cost: Amounts, build: number, missingShare: number): { cost: Amounts; seconds: number } {
  const out: Amounts = {};
  for (const [r, n] of Object.entries(cost) as [Resource, number][]) out[r] = Math.max(1, Math.ceil(n * share * missingShare));
  return { cost: out, seconds: Math.max(2, build * share * missingShare) };
}

export function edgeRepair(e: HouseEdge): { cost: Amounts; seconds: number } | null {
  const level = EDGES[e.kind].levels[e.level - 1];
  if (e.construct > 0 || e.pending || e.repair !== null || e.hp >= level.hp) return null;
  return repairOf(level.cost, level.build, 1 - e.hp / level.hp);
}

export function furnitureRepair(b: Building): { cost: Amounts; seconds: number } | null {
  const def = BUILDINGS[b.type];
  if (!def.furniture || b.construct > 0 || b.repair !== null || b.salvage !== null || (!b.broken && b.hp >= def.hp)) return null;
  return repairOf(def.cost, def.build, b.broken ? 1 : 1 - b.hp / def.hp);
}

export const roofPatchable = (f: HouseFloor): boolean => f.roofBroken && f.roofWork === null && f.construct <= 0;

export const rubbleAt = (world: World, x: number, y: number): boolean => getTile(world.map, x, y) === Tile.Rubble && !world.clearing.some((c) => c.tile === y * world.map.width + x);

export interface MendPlan {
  cost: Amounts;
  edges: HouseEdge[];
  furniture: Building[];
  roofs: HouseFloor[];
  rubble: number[];
}

const add = (a: Amounts, b: Amounts) => {
  for (const [r, n] of Object.entries(b) as [Resource, number][]) a[r] = (a[r] ?? 0) + n;
};

/** Everything inside the rectangle on one storey that can be mended now, and what it costs. */
export function planMend(world: World, rect: Rect, storey: number): MendPlan {
  const inside = (x: number, y: number) => x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h;
  const plan: MendPlan = { cost: {}, edges: [], furniture: [], roofs: [], rubble: [] };
  for (const e of world.house.edges) {
    if (e.storey !== storey) continue;
    const touches = e.side === 'n' ? inside(e.x, e.y) || inside(e.x, e.y - 1) : inside(e.x, e.y) || inside(e.x - 1, e.y);
    const r = touches ? edgeRepair(e) : null;
    if (r) {
      plan.edges.push(e);
      add(plan.cost, r.cost);
    }
  }
  for (const b of world.buildings) {
    if (b.storey !== storey || !tilesOf({ x: b.x, y: b.y, w: b.w, h: b.h }).some(([x, y]) => inside(x, y))) continue;
    const r = furnitureRepair(b);
    if (r) {
      plan.furniture.push(b);
      add(plan.cost, r.cost);
    }
  }
  for (const f of world.house.floors) {
    if (f.storey === storey && inside(f.x, f.y) && roofPatchable(f)) {
      plan.roofs.push(f);
      add(plan.cost, HOUSE.roofPatch.cost);
    }
  }
  if (storey === 0) {
    for (const [x, y] of tilesOf(rect)) if (x >= 0 && y >= 0 && x < world.map.width && y < world.map.height && rubbleAt(world, x, y)) plan.rubble.push(y * world.map.width + x);
  }
  return plan;
}

export const mendCount = (p: MendPlan): number => p.edges.length + p.furniture.length + p.roofs.length + p.rubble.length;

/** Queues the mend work for builders and pays for it. Returns the number of jobs queued, or an error if the stockpile cannot pay. */
export function mendArea(world: World, rect: Rect, storey: number): { queued: number; error: string | null } {
  const plan = planMend(world, rect, storey);
  const short = missing(world, plan.cost);
  if (short) return { queued: 0, error: `Not enough ${RESOURCE_NAMES[short as Resource].toLowerCase()}` };
  pay(world, plan.cost);
  for (const e of plan.edges) e.repair = edgeRepair(e)!.seconds;
  for (const b of plan.furniture) b.repair = furnitureRepair(b)!.seconds;
  for (const f of plan.roofs) f.roofWork = HOUSE.roofPatch.seconds;
  for (const tile of plan.rubble) world.clearing.push({ tile, left: HOUSE.clearRubble.seconds });
  if (mendCount(plan) > 0) world.buildRev++;
  return { queued: mendCount(plan), error: null };
}

/** Orders one repair: a wall piece, a piece of furniture, or the roof over a floor tile. Pays now like a mend area. */
export function mendItem(world: World, item: 'edge' | 'furniture' | 'roof', id: number): string | null {
  const e = item === 'edge' ? world.house.edges.find((o) => o.id === id) : undefined;
  const b = item === 'furniture' ? world.buildings.find((o) => o.id === id) : undefined;
  const f = item === 'roof' ? world.house.floors.find((o) => o.id === id) : undefined;
  const plan = (e && edgeRepair(e)) || (b && furnitureRepair(b)) || (f && roofPatchable(f) ? { cost: HOUSE.roofPatch.cost, seconds: HOUSE.roofPatch.seconds } : null);
  if (!plan) return 'Nothing to mend';
  const short = missing(world, plan.cost);
  if (short) return `Not enough ${RESOURCE_NAMES[short as Resource].toLowerCase()}`;
  pay(world, plan.cost);
  if (e) e.repair = plan.seconds;
  if (b) b.repair = plan.seconds;
  if (f) f.roofWork = plan.seconds;
  world.buildRev++;
  return null;
}
