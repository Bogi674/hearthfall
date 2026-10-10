// What is under the cursor (section 14.2). Positions are continuous tile units, where tile centers sit on whole numbers.
import { edgeAcross, floorAt, storedEdgeAt } from '../sim/house';
import type { World } from '../sim/world';

export interface Target {
  kind: 'colonist' | 'building' | 'hearth' | 'stash' | 'edge' | 'floor';
  /** The id the selection panel shows. The hearth has no number. */
  id: number | 'hearth' | 'stash';
  /** Center in tile units and the size of the thing, for the glow frame. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Storey the thing stands on, for the glow frame. */
  storey: number;
}

const COLONIST_REACH = 0.7;
/** How close to a tile border the cursor must be to pick a wall piece. Close to the border wins over what stands on the tile. */
const EDGE_REACH = 0.3;
const EDGE_NEAR = 0.2;

/** Colonists first, then buildings, then the house itself, then wall pieces, then floor tiles. */
export function pick(w: World, u: number, v: number, storey = 0): Target | null {
  let best: { id: number; x: number; y: number; d: number } | null = null;
  for (const c of w.colonists) {
    // People asleep or sheltering are indoors and out of sight.
    if (c.asleep || c.task === 'shelter' || c.expedition !== null || c.storey !== storey) continue;
    const d = Math.hypot(c.x - u, c.y - v - 0.3);
    if (d < COLONIST_REACH && (!best || d < best.d)) best = { id: c.id, x: c.x, y: c.y, d };
  }
  if (best) return { kind: 'colonist', id: best.id, x: best.x, y: best.y, w: 0.9, h: 0.9, storey };

  const close = edgeNear(w, u, v, EDGE_NEAR, storey);
  if (close) return close;
  const [tx, ty] = [Math.round(u), Math.round(v)];
  const b = w.buildings.find((o) => o.storey === storey && tx >= o.x && tx < o.x + o.w && ty >= o.y && ty < o.y + o.h);
  if (b) return { kind: 'building', id: b.id, x: b.x + (b.w - 1) / 2, y: b.y + (b.h - 1) / 2, w: b.w, h: b.h, storey };
  if (storey === 0 && tx === w.hearth.x && ty === w.hearth.y) return { kind: 'hearth', id: 'hearth', x: w.hearth.x, y: w.hearth.y, w: 1, h: 1, storey };
  if (w.stash && w.stash.state === 'found' && storey === 0 && tx === w.stash.x && ty === w.stash.y) return { kind: 'stash', id: 'stash', x: w.stash.x, y: w.stash.y, w: 1, h: 1, storey };

  const edge = edgeNear(w, u, v, EDGE_REACH, storey);
  if (edge) return edge;
  const f = floorAt(w, tx, ty, storey);
  return f ? { kind: 'floor', id: f.id, x: f.x, y: f.y, w: 1, h: 1, storey } : null;
}

/** The wall piece on the tile border nearest the cursor, if the cursor is close to it. */
function edgeNear(w: World, u: number, v: number, reach: number, storey: number): Target | null {
  const [tx, ty] = [Math.floor(u + 0.5), Math.floor(v + 0.5)];
  const [fx, fy] = [u + 0.5 - tx, v + 0.5 - ty];
  const nearest = Math.min(fx, 1 - fx, fy, 1 - fy);
  if (nearest > reach) return null;
  const e = nearest === fx ? edgeAcross(tx - 1, ty, tx, ty) : nearest === 1 - fx ? edgeAcross(tx, ty, tx + 1, ty) : nearest === fy ? edgeAcross(tx, ty - 1, tx, ty) : edgeAcross(tx, ty, tx, ty + 1);
  const stored = storedEdgeAt(w, e.x, e.y, e.side, storey);
  return stored ? targetOfEdge(stored.id, e.x, e.y, e.side, storey) : null;
}

const targetOfEdge = (id: number, x: number, y: number, side: 'n' | 'w', storey: number): Target =>
  side === 'n' ? { kind: 'edge', id, x, y: y - 0.5, w: 1.1, h: 0.24, storey } : { kind: 'edge', id, x: x - 0.5, y, w: 0.24, h: 1.1, storey };

/** The target for something already selected, or null once it is gone. */
export function targetOf(w: World, id: number | 'hearth' | 'stash'): Target | null {
  if (id === 'hearth') return { kind: 'hearth', id, x: w.hearth.x, y: w.hearth.y, w: 1, h: 1, storey: 0 };
  if (id === 'stash') return w.stash && w.stash.state !== 'hidden' ? { kind: 'stash', id, x: w.stash.x, y: w.stash.y, w: 1, h: 1, storey: 0 } : null;
  const b = w.buildings.find((o) => o.id === id);
  if (b) return { kind: 'building', id, x: b.x + (b.w - 1) / 2, y: b.y + (b.h - 1) / 2, w: b.w, h: b.h, storey: b.storey };
  const c = w.colonists.find((o) => o.id === id);
  if (c) return { kind: 'colonist', id, x: c.x, y: c.y, w: 0.9, h: 0.9, storey: c.storey };
  const e = w.house.edges.find((o) => o.id === id);
  if (e) return targetOfEdge(id, e.x, e.y, e.side, e.storey);
  const f = w.house.floors.find((o) => o.id === id);
  return f ? { kind: 'floor', id, x: f.x, y: f.y, w: 1, h: 1, storey: f.storey } : null;
}
