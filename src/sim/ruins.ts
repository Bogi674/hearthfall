// Ruined houses (M12). Every ruin is made of the same pieces the player builds with: floors, wall edges, doors, windows,
// and furniture. They start worn out. Walls have low hit points and gaps, some roofs are open to the sky, and some
// furniture is broken. The starting ruin is the large one with the hearth in it. The town is full of small ones.
import type { BuildingType } from '../data/buildings';
import type { EdgeKind, FloorId } from '../data/house';
import { BALANCE } from '../data/balance';
import { getTile, inBounds, setTile, Tile, type MapState } from './grid';
import { chance, nextFloat, nextInt, type RngState } from './rng';
import type { Side } from './house';

const R = BALANCE.ruin;

export interface RuinFloor {
  x: number;
  y: number;
  storey: number;
  kind: FloorId;
  roofBroken: boolean;
}

export interface RuinEdge {
  x: number;
  y: number;
  side: Side;
  storey: number;
  kind: EdgeKind;
  level: number;
  /** Share of the full hit points the piece has left. */
  hpShare: number;
}

export interface RuinFurniture {
  type: BuildingType;
  x: number;
  y: number;
  storey: number;
  broken: boolean;
  hpShare: number;
}

export interface Ruins {
  floors: RuinFloor[];
  edges: RuinEdge[];
  furniture: RuinFurniture[];
  /** Where the hidden stash lies in the starting ruin. */
  stash: { x: number; y: number };
  /** The rectangle of every town house, which can be scavenged (M13). */
  houses: { x: number; y: number; w: number; d: number }[];
}

export const emptyRuins = (): Ruins => ({ floors: [], edges: [], furniture: [], stash: { x: 0, y: 0 }, houses: [] });

const key = (x: number, y: number) => `${x},${y}`;

interface Room {
  name: string;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

/** Shares of hit points left on a worn piece. */
const worn = (rng: RngState, lo: number, hi: number) => lo + nextFloat(rng) * (hi - lo);

/**
 * Walls between tiles of a set of rooms: an outer wall where a room tile meets open ground and a partition where two rooms meet.
 * Each partition gets a doorway, either a door that survived or a gap. Pieces may be missing or damaged.
 */
function wallRooms(
  rng: RngState,
  rooms: Room[],
  storey: number,
  kind: { outer: number; inner: number },
  keepWhole: Room | null,
  out: Ruins,
  outerDoor: { x: number; y: number; side: Side; gap?: boolean } | null,
): void {
  const roomAt = new Map<string, Room>();
  for (const r of rooms) for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) roomAt.set(key(x, y), r);
  // Every border between a room tile and something else, once.
  type Border = { x: number; y: number; side: Side; a: Room | undefined; b: Room | undefined };
  const borders: Border[] = [];
  for (const [k, room] of roomAt) {
    const [x, y] = k.split(',').map(Number);
    const east = roomAt.get(key(x + 1, y));
    const south = roomAt.get(key(x, y + 1));
    const north = roomAt.get(key(x, y - 1));
    const west = roomAt.get(key(x - 1, y));
    if (east !== room) borders.push({ x: x + 1, y, side: 'w', a: room, b: east });
    if (south !== room) borders.push({ x, y: y + 1, side: 'n', a: room, b: south });
    if (!north) borders.push({ x, y, side: 'n', a: undefined, b: room });
    if (!west) borders.push({ x, y, side: 'w', a: undefined, b: room });
  }
  // One doorway for each pair of rooms that touch.
  const doorway = new Map<string, Border>();
  for (const b of borders) {
    if (!b.a || !b.b) continue;
    const pair = [b.a.name, b.b.name].sort().join('|');
    const current = doorway.get(pair);
    if (!current || nextFloat(rng) < 0.3) doorway.set(pair, b);
  }
  const doorways = new Set([...doorway.values()].map((b) => `${b.side}${b.x},${b.y}`));

  for (const b of borders) {
    const id = `${b.side}${b.x},${b.y}`;
    const outer = !b.a || !b.b;
    const whole = keepWhole !== null && (b.a === keepWhole || b.b === keepWhole);
    const level = outer ? kind.outer : kind.inner;
    if (outerDoor && b.x === outerDoor.x && b.y === outerDoor.y && b.side === outerDoor.side) {
      if (outerDoor.gap) continue;
      out.edges.push({ x: b.x, y: b.y, side: b.side, storey, kind: 'door', level: 1, hpShare: worn(rng, 0.45, 0.9) });
      continue;
    }
    if (doorways.has(id)) {
      // A doorway is a door that survived, or a gap.
      if (chance(rng, R.doorSurvives)) out.edges.push({ x: b.x, y: b.y, side: b.side, storey, kind: 'door', level: 1, hpShare: worn(rng, 0.25, 0.8) });
      continue;
    }
    if (!whole && chance(rng, R.wallMissing)) continue;
    const window = outer && chance(rng, R.windowChance);
    out.edges.push({
      x: b.x, y: b.y, side: b.side, storey, kind: window ? 'window' : 'wall', level: window ? 1 : level,
      hpShare: whole ? worn(rng, 0.6, 0.95) : worn(rng, R.wallHp[0], R.wallHp[1]),
    });
  }
}

/** Floors for every tile of the rooms. Some tiles have lost their floor and some have lost their roof. */
function floorRooms(rng: RngState, map: MapState, rooms: Room[], storey: number, keepWhole: Room | null, out: Ruins): void {
  for (const r of rooms) {
    for (let y = r.y0; y <= r.y1; y++) {
      for (let x = r.x0; x <= r.x1; x++) {
        const whole = r === keepWhole;
        if (!whole && chance(rng, R.floorMissing)) {
          // The floor is gone. The ground under it is rubble or bare.
          if (storey === 0 && inBounds(map, x, y) && chance(rng, R.rubbleOnLostFloor)) setTile(map, x, y, Tile.Rubble);
          continue;
        }
        out.floors.push({ x, y, storey, kind: 'boards', roofBroken: !whole && chance(rng, R.roofBroken) });
      }
    }
  }
}

function clearTerrain(map: MapState, x0: number, y0: number, x1: number, y1: number): void {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (inBounds(map, x, y)) setTile(map, x, y, Tile.Ground);
}

function furnish(rng: RngState, out: Ruins, items: [BuildingType, number, number, number?][]): void {
  for (const [type, x, y, storey = 0] of items) {
    // Furniture stands only where there is a floor.
    if (!out.floors.some((f) => f.x === x && f.y === y && f.storey === storey)) continue;
    const broken = chance(rng, R.furnitureBroken);
    out.furniture.push({ type, x, y, storey, broken, hpShare: broken ? worn(rng, 0.15, 0.4) : worn(rng, 0.6, 1) });
  }
}

/**
 * The starting ruin: a hall with the old hearth, a bedroom, a kitchen, and a storeroom, with a ruined attic over the bedroom.
 * The hearth sits at (hx, hy). Returns the pieces and the room that is kept in better shape, where the crew first shelters.
 */
export function startingRuin(rng: RngState, map: MapState, hx: number, hy: number): Ruins {
  const at = (x0: number, y0: number, x1: number, y1: number, name: string): Room => ({ name, x0: hx + x0, y0: hy + y0, x1: hx + x1, y1: hy + y1 });
  const hall = at(-3, -2, 3, 2, 'hall');
  const bedroom = at(-7, -2, -4, 2, 'bedroom');
  const store = at(4, -2, 7, 2, 'store');
  const kitchen = at(-3, 3, 3, 5, 'kitchen');
  const rooms = [hall, bedroom, store, kitchen];
  clearTerrain(map, hx - 9, hy - 4, hx + 9, hy + 8);

  const out = emptyRuins();
  // The best kept room is the bedroom or the storeroom, chosen by the map.
  const kept = nextFloat(rng) < 0.5 ? bedroom : store;
  floorRooms(rng, map, rooms, 0, kept, out);
  // The old hearth stands on its own bit of floor, with its roof over it open or not.
  if (!out.floors.some((f) => f.x === hx && f.y === hy && f.storey === 0)) {
    setTile(map, hx, hy, Tile.Ground);
    out.floors.push({ x: hx, y: hy, storey: 0, kind: 'boards', roofBroken: chance(rng, R.roofBroken) });
  }
  // A stone ruin or a wooden one.
  const stone = chance(rng, 0.35);
  wallRooms(rng, rooms, 0, { outer: stone ? 3 : 1, inner: 1 }, kept, out, { x: hx, y: hy + 6, side: 'n' });

  // The attic over the bedroom: part of the second floor still stands.
  const attic = at(-7, -2, -4, 2, 'attic');
  floorRooms(rng, map, [attic], 1, null, out);
  const upper = out.floors.filter((f) => f.storey === 1);
  // The stairs stand in the bedroom. Their landing has no floor, and the tiles beside it do.
  const stairs = { x: hx - 5, y: hy + 1 };
  out.floors = out.floors.filter((f) => !(f.storey === 1 && f.x === stairs.x && f.y === stairs.y));
  for (const [dx, dy] of [[-1, 0], [0, -1]]) {
    if (!out.floors.some((f) => f.storey === 1 && f.x === stairs.x + dx && f.y === stairs.y + dy)) out.floors.push({ x: stairs.x + dx, y: stairs.y + dy, storey: 1, kind: 'boards', roofBroken: true });
  }
  void upper;
  wallRooms(rng, [attic], 1, { outer: 1, inner: 1 }, null, out, null);
  // Walls of the attic need a floor on one side. Keep the ones that have it.
  const floored = new Set(out.floors.filter((f) => f.storey === 1).map((f) => key(f.x, f.y)));
  out.edges = out.edges.filter((e) => {
    if (e.storey !== 1) return true;
    const [a, b] = e.side === 'n' ? [key(e.x, e.y), key(e.x, e.y - 1)] : [key(e.x, e.y), key(e.x - 1, e.y)];
    return floored.has(a) || floored.has(b) || (e.x === stairs.x && e.y === stairs.y);
  });

  furnish(rng, out, [
    ['table', hx + 2, hy - 1], ['table', hx + 3, hy - 1], ['sofa', hx - 3, hy + 2], ['sofa', hx - 2, hy + 2], ['plant', hx + 3, hy + 2], ['lamp', hx - 3, hy - 2],
    ['bed', hx - 7, hy - 2], ['bed', hx - 7, hy - 1], ['shelf', hx - 4, hy - 2], ['crate', hx - 6, hy + 1],
    ['stove', hx - 2, hy + 3], ['shelf', hx + 2, hy + 3], ['crate', hx + 3, hy + 5],
    ['shelf', hx + 7, hy - 2], ['shelf', hx + 7, hy - 1], ['crate', hx + 6, hy + 2], ['crate', hx + 5, hy - 2],
  ]);
  // The stairs are furniture too. They are broken until repaired.
  if (out.floors.some((f) => f.x === stairs.x && f.y === stairs.y && f.storey === 0)) {
    out.furniture.push({ type: 'stairs', x: stairs.x, y: stairs.y, storey: 0, broken: true, hpShare: worn(rng, 0.2, 0.4) });
  }
  // The stash is hidden in the storeroom, on a floor tile.
  out.stash = { x: hx + 7, y: hy + 1 };
  if (!out.floors.some((f) => f.x === out.stash.x && f.y === out.stash.y && f.storey === 0)) {
    out.floors.push({ x: out.stash.x, y: out.stash.y, storey: 0, kind: 'boards', roofBroken: false });
  }
  return out;
}

/** A small ruined house in town: a rectangle of floor with worn walls, a doorway, and a few broken things inside. */
export function townRuin(rng: RngState, map: MapState, x0: number, y0: number, w: number, d: number, out: Ruins): void {
  const rooms: Room[] =
    w >= 6 && nextFloat(rng) < 0.5
      ? [{ name: 'a', x0, y0, x1: x0 + Math.floor(w / 2) - 1, y1: y0 + d - 1 }, { name: 'b', x0: x0 + Math.floor(w / 2), y0, x1: x0 + w - 1, y1: y0 + d - 1 }]
      : [{ name: 'a', x0, y0, x1: x0 + w - 1, y1: y0 + d - 1 }];
  const made = emptyRuins();
  floorRooms(rng, map, rooms, 0, null, made);
  // Every town house has a way in: a door that survived or a gap in the north wall.
  const doorX = nextInt(rng, x0, x0 + w - 1);
  wallRooms(rng, rooms, 0, { outer: 1, inner: 1 }, null, made, { x: doorX, y: y0, side: 'n', gap: !chance(rng, R.doorSurvives) });
  // Town houses are in worse shape than the starting ruin.
  for (const f of made.floors) f.roofBroken = f.roofBroken || chance(rng, R.townExtraRoofBroken);
  const spots = made.floors.filter(() => chance(rng, R.townFurniture));
  for (const f of spots.slice(0, 3)) {
    const types: BuildingType[] = ['crate', 'shelf', 'bed', 'table', 'plant'];
    const type = types[nextInt(rng, 0, types.length - 1)];
    const broken = chance(rng, 0.75);
    made.furniture.push({ type, x: f.x, y: f.y, storey: 0, broken, hpShare: broken ? worn(rng, 0.15, 0.4) : worn(rng, 0.5, 0.9) });
  }
  out.floors.push(...made.floors);
  out.edges.push(...made.edges);
  out.furniture.push(...made.furniture);
  out.houses.push({ x: x0, y: y0, w, d });
  // Masonry heaps and rubble beside the house, where fallen walls and roofs lie. Quarries work the masonry for stone and salvage yards work the rubble.
  for (let blob = 0; blob < 5; blob++) {
    const cx = nextInt(rng, x0 - 3, x0 + w + 2);
    const cy = chance(rng, 0.5) ? y0 - 3 : y0 + d + 2;
    const tile = blob < 3 ? Tile.RuinWall : Tile.Rubble;
    for (let i = 0; i < 7; i++) {
      const x = cx + nextInt(rng, -1, 1);
      const y = cy + nextInt(rng, -1, 1);
      if (inBounds(map, x, y) && getTile(map, x, y) === Tile.Ground) setTile(map, x, y, tile);
    }
  }
}
