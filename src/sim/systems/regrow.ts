// Harvested ground grows back (M13). Trees, stone heaps, and rubble piles that were used up return as smaller ones after a few
// days. Growth is checked at dawn, so the map changes once a day.
import { BALANCE } from '../../data/balance';
import { NODE_AMOUNTS } from '../../data/recipes';
import { Tile } from '../grid';
import { floorAt } from '../house';
import { reservedForPad } from '../placement';
import { phaseStarted } from '../query';
import { nextInt } from '../rng';
import type { World } from '../world';

const R = BALANCE.regrow;
const KINDS: Partial<Record<Tile, { days: readonly [number, number]; share: number }>> = {
  [Tile.Tree]: R.tree,
  [Tile.RuinWall]: R.ruinWall,
  [Tile.Rubble]: R.rubble,
};

/** Remembers a tile that just ran out, if its kind grows back. Call before the tile turns to ground. */
export function scheduleRegrow(world: World, tile: number): void {
  const kind = world.map.tiles[tile];
  const rule = KINDS[kind as Tile];
  if (!rule) return;
  world.regrow.push({ tile, kind, due: world.day + nextInt(world.rng, rule.days[0], rule.days[1]), tries: R.retries });
}

/** True when nothing stands on the tile and it is not part of the camp. */
function free(world: World, tile: number): boolean {
  const { width } = world.map;
  const [x, y] = [tile % width, Math.floor(tile / width)];
  if (world.map.tiles[tile] !== Tile.Ground) return false;
  if (Math.hypot(x - world.hearth.x, y - world.hearth.y) < R.keepClear) return false;
  if (reservedForPad(world, x, y) || floorAt(world, x, y)) return false;
  return !world.buildings.some((b) => b.storey === 0 && x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h);
}

export function regrowSystem(world: World, dt: number): void {
  if (world.regrow.length === 0 || !phaseStarted(world, 'Dawn', dt)) return;
  let changed = false;
  const waiting: World['regrow'] = [];
  for (const g of world.regrow) {
    if (g.due > world.day) {
      waiting.push(g);
      continue;
    }
    if (free(world, g.tile)) {
      world.map.tiles[g.tile] = g.kind as Tile;
      world.nodes[g.tile] = Math.max(1, Math.round((NODE_AMOUNTS[g.kind as Tile] ?? 0) * (KINDS[g.kind as Tile]?.share ?? 0)));
      changed = true;
    } else if (g.tries > 1) {
      waiting.push({ ...g, due: world.day + 1, tries: g.tries - 1 });
    }
  }
  world.regrow = waiting;
  if (changed) world.mapRev++;
}
