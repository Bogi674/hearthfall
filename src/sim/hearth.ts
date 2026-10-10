// The hearth as an object (M12): it smolders until someone lights it, it can be moved, and it can be upgraded into a stove and
// a fireplace. The higher stages must stand indoors. Reads and changes the world through commands only.
import { BALANCE, type Stands } from '../data/balance';
import { RESOURCE_NAMES, type Amounts, type Resource } from '../data/resources';
import { getTile, inBounds, Tile } from './grid';
import { floorAt, isIndoors } from './house';
import { reservedForPad } from './placement';
import { missing } from './query';
import type { World } from './world';

const H = BALANCE.hearth;

/** Why a hearth stage cannot stand on this tile, or null. */
export function standsError(world: World, stands: Stands, x: number, y: number): string | null {
  if (stands === 'floor' && !floorAt(world, x, y)) return 'This stage needs a house floor under it';
  if (stands === 'room' && !(floorAt(world, x, y) && isIndoors(world, x, y))) return 'This stage needs a closed room with a whole roof';
  return null;
}

const short = (world: World, cost: Amounts): string | null => {
  const r = missing(world, cost);
  return r ? `Not enough ${RESOURCE_NAMES[r as Resource].toLowerCase()}` : null;
};

export function hearthUpgradeError(world: World): string | null {
  const next = H.levels[world.hearth.level];
  if (!next) return 'Fully upgraded';
  return standsError(world, next.stands, world.hearth.x, world.hearth.y) ?? short(world, next.cost);
}

/** What it costs to move the hearth: some wood, and half of what its stage cost. */
export function moveCost(world: World): Amounts {
  const cost: Amounts = { wood: H.moveWood };
  for (const [r, n] of Object.entries(H.levels[world.hearth.level - 1].cost) as [Resource, number][]) cost[r] = (cost[r] ?? 0) + Math.floor(n / 2);
  return cost;
}

/** Why the hearth cannot be moved to this tile, or null. */
export function hearthMoveError(world: World, x: number, y: number): string | null {
  if (world.hearthSite) return 'The hearth is already being moved';
  if (!inBounds(world.map, x, y)) return 'Out of bounds';
  if (x === world.hearth.x && y === world.hearth.y) return 'The hearth is already here';
  const t = getTile(world.map, x, y);
  if (t === Tile.Rubble) return 'Clear the rubble first';
  if (t !== Tile.Ground && t !== Tile.Road) return 'Blocked by terrain';
  if (reservedForPad(world, x, y)) return 'Reserved for the launch pad';
  if (world.buildings.some((b) => b.storey === 0 && x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h && true)) return 'Something is in the way';
  return standsError(world, H.levels[world.hearth.level - 1].stands, x, y) ?? short(world, moveCost(world));
}

export function lightError(world: World): string | null {
  if (world.hearth.ignited) return 'The hearth is already lit';
  if (world.hearth.lighting !== null) return 'Someone is already lighting it';
  if (world.stock.fuel < H.lightFuel) return `Needs ${H.lightFuel} fuel to light`;
  return null;
}
