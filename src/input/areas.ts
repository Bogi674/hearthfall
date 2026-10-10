// Plans for the house builder's drag tools (M11): which pieces a dragged shape covers, whether each can go, what it costs,
// and the command that builds it. Reads the world only.
import { EDGES, FLOORS } from '../data/house';
import type { Amounts, Resource } from '../data/resources';
import { perimeter, tilesOf, type Rect } from '../sim/build';
import type { Command } from '../sim/commands';
import { floorAt, storedEdgeAt, type Side } from '../sim/house';
import { edgePlacementError, floorPlacementError } from '../sim/placement';
import { mendCount, planMend } from '../sim/mend';
import { missing } from '../sim/query';
import type { World } from '../sim/world';
import { BUILDINGS } from '../data/buildings';
import { amounts, type HouseTool } from '../ui/build';

export type Anchor = { x: number; y: number; side?: Side };

export interface PreviewItem {
  kind: 'tile' | 'edge';
  x: number;
  y: number;
  side?: Side;
  /** Can go, cannot go, or is being taken away. */
  state: 'ok' | 'bad' | 'clear';
}

export interface AreaPlan {
  items: PreviewItem[];
  command: Command | null;
  text: string;
  /** Nothing can be built, or the stockpile cannot pay. */
  blocked: boolean;
}

export const rectOf = (a: Anchor, b: Anchor): Rect => ({ x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(b.x - a.x) + 1, h: Math.abs(b.y - a.y) + 1 });

/** The run of borders a line covers, starting at the first anchor and following its axis to the second. */
export function lineOf(a: Anchor, b: Anchor): { x: number; y: number; side: Side; length: number } {
  const side = a.side ?? 'n';
  return side === 'n'
    ? { x: Math.min(a.x, b.x), y: a.y, side, length: Math.abs(b.x - a.x) + 1 }
    : { x: a.x, y: Math.min(a.y, b.y), side, length: Math.abs(b.y - a.y) + 1 };
}

const scale = (cost: Amounts, n: number): Amounts => Object.fromEntries(Object.entries(cost).map(([r, v]) => [r, (v as number) * n]));
const add = (a: Amounts, b: Amounts): Amounts => {
  const out: Amounts = { ...a };
  for (const [r, v] of Object.entries(b) as [Resource, number][]) out[r] = (out[r] ?? 0) + v;
  return out;
};

/** Errors that fix themselves once the rest of the shape is built, so they do not turn a piece red. */
const SOFT = /^(Floors must touch|Upper floors need|Not enough|A room would have no door|Walls need a floor|Furniture needs)/;
const costText = (w: World, cost: Amounts): { text: string; short: boolean } => {
  const short = missing(w, cost);
  return { text: amounts(cost), short: short !== null && short !== undefined };
};

export function planArea(world: World, tool: HouseTool, a: Anchor, b: Anchor, storey: number): AreaPlan {
  const items: PreviewItem[] = [];
  if (tool.kind === 'floor' || tool.kind === 'room') {
    const r = rectOf(a, b);
    const floor = FLOORS[tool.floor];
    let tiles = 0;
    for (const [x, y] of tilesOf(r)) {
      if (floorAt(world, x, y, storey)) continue;
      const e = floorPlacementError(world, x, y, tool.floor, storey);
      const ok = e === null || SOFT.test(e);
      items.push({ kind: 'tile', x, y, state: ok ? 'ok' : 'bad' });
      if (ok) tiles++;
    }
    let cost = scale(floor.cost, tiles);
    let walls = 0;
    if (tool.kind === 'room') {
      for (const p of perimeter(r)) {
        if (storedEdgeAt(world, p.x, p.y, p.side, storey)) continue;
        const e = edgePlacementError(world, p.x, p.y, p.side, 'wall', tool.level, storey);
        const ok = e === null || SOFT.test(e);
        items.push({ kind: 'edge', x: p.x, y: p.y, side: p.side, state: ok ? 'ok' : 'bad' });
        if (ok) walls++;
      }
      cost = add(add(cost, scale(EDGES.wall.levels[tool.level - 1].cost, Math.max(0, walls - 1))), EDGES.door.levels[0].cost);
    }
    const { text, short } = costText(world, cost);
    const what = tool.kind === 'room' ? `Room ${r.w} by ${r.h}: ${tiles} floor tiles and ${walls} wall pieces` : `${tiles} floor tiles`;
    const blocked = tiles === 0 || short;
    return {
      items,
      command: tool.kind === 'room' ? { type: 'buildRoom', ...r, kind: tool.floor, level: tool.level, storey } : { type: 'paintArea', ...r, kind: tool.floor, storey },
      text: tiles === 0 ? 'Nothing can be built here. Floors must touch the house or another floor' : `${what}. ${text}${short ? '. Not enough in the stockpile' : ''}`,
      blocked,
    };
  }
  if (tool.kind === 'edge') {
    const line = lineOf(a, b);
    let n = 0;
    for (let i = 0; i < line.length; i++) {
      const [x, y] = line.side === 'n' ? [line.x + i, line.y] : [line.x, line.y + i];
      const e = edgePlacementError(world, x, y, line.side, tool.edge, tool.level, storey);
      const ok = e === null;
      items.push({ kind: 'edge', x, y, side: line.side, state: ok ? 'ok' : 'bad' });
      if (ok) n++;
    }
    const level = EDGES[tool.edge].levels[tool.level - 1];
    const { text, short } = costText(world, scale(level.cost, n));
    return {
      items,
      command: { type: 'buildLine', x: line.x, y: line.y, side: line.side, length: line.length, edge: tool.edge, level: tool.level, storey },
      text: n === 0 ? 'Nothing can be built along this line' : `${n} ${level.name.toLowerCase()} pieces. ${text}${short ? '. Not enough in the stockpile' : ''}`,
      blocked: n === 0 || short,
    };
  }
  if (tool.kind === 'mend') {
    const r = rectOf(a, b);
    const plan = planMend(world, r, storey);
    for (const e of plan.edges) items.push({ kind: 'edge', x: e.x, y: e.y, side: e.side, state: 'ok' });
    for (const f of plan.furniture) items.push({ kind: 'tile', x: f.x, y: f.y, state: 'ok' });
    for (const f of plan.roofs) items.push({ kind: 'tile', x: f.x, y: f.y, state: 'ok' });
    for (const t of plan.rubble) items.push({ kind: 'tile', x: t % world.map.width, y: Math.floor(t / world.map.width), state: 'ok' });
    const n = mendCount(plan);
    const short = missing(world, plan.cost) !== null && missing(world, plan.cost) !== undefined;
    return {
      items,
      command: { type: 'mendArea', ...r, storey },
      text: n === 0 ? 'Nothing to mend here' : `Mend ${n} pieces. ${amounts(plan.cost) || 'No cost'}${short ? '. Not enough in the stockpile' : ''}`,
      blocked: n === 0 || short,
    };
  }
  // Taking an area apart.
  const r = rectOf(a, b);
  let pieces = 0;
  for (const [x, y] of tilesOf(r)) {
    const has = floorAt(world, x, y, storey) || world.buildings.some((o) => BUILDINGS[o.type].furniture && o.storey === storey && x >= o.x && x < o.x + o.w && y >= o.y && y < o.y + o.h);
    if (has) {
      items.push({ kind: 'tile', x, y, state: 'clear' });
      pieces++;
    }
  }
  for (const e of world.house.edges) {
    if (e.storey !== storey) continue;
    const inside = (px: number, py: number) => px >= r.x && px < r.x + r.w && py >= r.y && py < r.y + r.h;
    const touches = e.side === 'n' ? inside(e.x, e.y) || inside(e.x, e.y - 1) : inside(e.x, e.y) || inside(e.x - 1, e.y);
    if (touches) {
      items.push({ kind: 'edge', x: e.x, y: e.y, side: e.side, state: 'clear' });
      pieces++;
    }
  }
  return {
    items,
    command: { type: 'demolishArea', ...r, storey },
    text: pieces === 0 ? 'Nothing to take apart here' : `Take apart ${pieces} pieces. Half of the cost comes back`,
    blocked: pieces === 0,
  };
}
