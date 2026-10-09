import { BUILDINGS, type BuildingType } from '../src/data/buildings';
import { EDGES } from '../src/data/house';
import { RECIPES } from '../src/data/recipes';
import { placementError } from '../src/sim/placement';
import { DAY_SECONDS } from '../src/sim/query';
import { stepWorld, TICKS_PER_SECOND, type World } from '../src/sim/world';

const sortedSpots = new Map<string, { x: number; y: number; d: number }[]>();

/** Every tile of the map for a footprint, nearest to the hearth first. Built once per map and footprint, since the player asks often. */
function spotsFor(world: World, w: number, h: number): { x: number; y: number; d: number }[] {
  const key = `${world.seed}|${world.map.width}|${w}x${h}`;
  let spots = sortedSpots.get(key);
  if (!spots) {
    spots = [];
    for (let y = 0; y < world.map.height; y++) {
      for (let x = 0; x < world.map.width; x++) spots.push({ x, y, d: Math.hypot(x + (w - 1) / 2 - world.hearth.x, y + (h - 1) / 2 - world.hearth.y) });
    }
    spots.sort((a, b) => a.d - b.d);
    sortedSpots.set(key, spots);
  }
  return spots;
}

/** Nearest valid spot to the hearth. Gatherers also need some nodes in range, like a player would choose. */
export function findSpot(world: World, type: BuildingType, minDist = 0, minNodes = 10): { x: number; y: number } | null {
  const [w, h] = BUILDINGS[type].size;
  const gather = RECIPES[type]?.gather;
  for (const s of spotsFor(world, w, h)) {
    if (s.d < minDist) continue;
    if (placementError(world, type, s.x, s.y, false)) continue;
    if (gather && nodesInRange(world, s.x + (w - 1) / 2, s.y + (h - 1) / 2, gather.tile, gather.radius - 1) < minNodes) continue;
    return s;
  }
  return null;
}

function nodesInRange(world: World, cx: number, cy: number, tile: number, r: number): number {
  let n = 0;
  for (let y = Math.floor(cy - r); y <= cy + r; y++) {
    for (let x = Math.floor(cx - r); x <= cx + r; x++) {
      const i = y * world.map.width + x;
      if (x >= 0 && y >= 0 && x < world.map.width && y < world.map.height && world.map.tiles[i] === tile && Math.hypot(x - cx, y - cy) <= r) n++;
    }
  }
  return n;
}

/** Places the building at the nearest valid spot. Returns false when nothing fits or it is unaffordable. */
export function build(world: World, type: BuildingType, minDist = 0): boolean {
  const spot = findSpot(world, type, minDist);
  if (!spot) return false;
  world.commands.push({ type: 'place', building: type, x: spot.x, y: spot.y, rotated: false });
  stepWorld(world);
  finish(world);
  stepWorld(world);
  return world.buildings.some((b) => b.type === type && b.x === spot.x && b.y === spot.y);
}

/** Finishes every construction site at once, for tests about what buildings do rather than how they go up. */
export function finish(world: World): void {
  for (const b of world.buildings) {
    if (b.construct <= 0) continue;
    [b.construct, b.status] = [0, 'ok'];
    world.buildRev++;
  }
  for (const piece of [...world.house.floors, ...world.house.edges]) {
    if (piece.construct <= 0) continue;
    piece.construct = 0;
    world.buildRev++;
  }
  for (const e of world.house.edges) {
    if (!e.pending) continue;
    [e.kind, e.level, e.pending] = [e.pending.kind, e.pending.level, null];
    e.hp = EDGES[e.kind].levels[e.level - 1].hp;
    world.buildRev++;
  }
}

/**
 * A closed two tile room east of the house: floors, walls on the north, south, and east, and a door in
 * the house wall on the west. It holds one 1 by 2 piece of furniture, or a 2 by 1 piece laid on its side.
 * The hearth tiles are hearth.x and the two floor tiles are hearth.x + 2 on rows hearth.y and hearth.y + 1.
 */
export function closedRoom(world: World): void {
  const { x, y } = world.hearth;
  const cmd = (c: World['commands'][number]) => world.commands.push(c);
  for (const dy of [0, 1]) cmd({ type: 'paintFloor', x: x + 2, y: y + dy, kind: 'boards' });
  stepWorld(world);
  cmd({ type: 'buildEdge', x: x + 2, y, side: 'w', kind: 'door', level: 1 });
  cmd({ type: 'buildEdge', x: x + 2, y, side: 'n', kind: 'wall', level: 1 });
  cmd({ type: 'buildEdge', x: x + 2, y: y + 2, side: 'n', kind: 'wall', level: 1 });
  for (const dy of [0, 1]) cmd({ type: 'buildEdge', x: x + 3, y: y + dy, side: 'w', kind: 'wall', level: 1 });
  stepWorld(world);
  finish(world);
}

/** Runs the world for whole days, calling the player once per simulated second. */
export function runDays(world: World, days: number, player?: (w: World) => void, monsters = true): void {
  for (let t = 0; t < days * DAY_SECONDS * TICKS_PER_SECOND && !world.lost; t++) {
    if (player && t % TICKS_PER_SECOND === 0) player(world);
    stepWorld(world);
    if (!monsters) world.enemies = [];
  }
}

export const count = (world: World, type: BuildingType) => world.buildings.filter((b) => b.type === type).length;

/**
 * A simple player. It builds in plan order, runs the kiln only when fuel is low, the kitchen only when meals are low,
 * the forager only when raw food is low,
 * stops the quarry once the kiln exists, and replaces gatherers that run out of nodes.
 */
export function makePlayer(plan: BuildingType[]) {
  const setWorkers = (world: World, id: number, n: number) => world.commands.push({ type: 'setWorkers', id, count: n });
  return (world: World) => {
    const kiln = world.buildings.find((b) => b.type === 'charcoalKiln');
    for (const b of world.buildings) {
      if (b.type === 'quarry' && kiln && b.workers > 0) setWorkers(world, b.id, 0);
      if (b.type === 'charcoalKiln') setWorkers(world, b.id, world.stock.fuel < 60 ? 1 : 0);
      if (b.type === 'kitchen') setWorkers(world, b.id, world.stock.meals < 30 ? 2 : 0);
      if (b.type === 'foragerHut') setWorkers(world, b.id, world.stock.rawFood < 40 ? 2 : 0);
      if (b.type === 'woodcutterCamp' && b.status === 'noResource' && b.workers > 0) {
        setWorkers(world, b.id, 0);
        build(world, 'woodcutterCamp');
        return;
      }
    }
    const wanted = new Map<BuildingType, number>();
    for (const type of plan) {
      wanted.set(type, (wanted.get(type) ?? 0) + 1);
      if (count(world, type) < wanted.get(type)!) {
        build(world, type);
        return;
      }
    }
  };
}
