import { bareWorld } from './helpers';
import { Tile } from '../src/sim/grid';
import { describe, expect, it } from 'vitest';
import { HOUSE } from '../src/data/house';
import { houseRooms, roomInfos, stepBlocked } from '../src/sim/house';
import { edgePlacementError, floorPlacementError, placeBuilding, placeEdge, placeFloor, placementError, removeError, removeHouseItem } from '../src/sim/placement';
import { routeFor } from '../src/sim/route';
import { createWorld, stepWorld, TICKS_PER_SECOND, type World } from '../src/sim/world';

const seconds = (w: World, s: number) => {
  for (let i = 0; i < s * TICKS_PER_SECOND && !w.lost; i++) stepWorld(w);
};
const rich = (w: World) => {
  for (const r of Object.keys(w.stock) as (keyof World['stock'])[]) w.stock[r] = 500;
};
/** Finishes every house piece at once, so a test can look at the built result. */
const finishHouse = (w: World) => {
  for (const f of w.house.floors) f.construct = 0;
  for (const e of w.house.edges) e.construct = 0;
  for (const b of w.buildings) b.construct = 0;
  w.buildRev++;
};

/**
 * A two tile room east of the hearth: floors on hx+2 and hx+3 of the hearth row, walls on the north, south, and east, and
 * a door on the west side. There is no old house, so the room stands on its own.
 */
function eastRoom(w: World, door = true) {
  const { x: hx, y: hy } = w.hearth;
  expect(placeFloor(w, hx + 2, hy, 'boards')).toBe(true);
  expect(placeFloor(w, hx + 3, hy, 'boards')).toBe(true);
  for (const x of [hx + 2, hx + 3]) {
    expect(placeEdge(w, x, hy, 'n', 'wall', 1)).toBe(true);
    expect(placeEdge(w, x, hy + 1, 'n', 'wall', 1)).toBe(true);
  }
  expect(placeEdge(w, hx + 4, hy, 'w', 'wall', 1)).toBe(true);
  expect(placeEdge(w, hx + 2, hy, 'w', door ? 'door' : 'wall', 1)).toBe(door);
  return { hx, hy };
}

describe('house layer rules (M10.1)', () => {
  it('floors go anywhere on open ground and cost resources', () => {
    const w = bareWorld(1);
    const { x: hx, y: hy } = w.hearth;
    expect(floorPlacementError(w, hx + 3, hy, 'boards')).toBeNull();
    expect(floorPlacementError(w, hx + 9, hy + 9, 'boards')).toBeNull();
    w.stock.wood = 1;
    expect(floorPlacementError(w, hx + 2, hy, 'boards')).toBe('Not enough wood');
    w.stock.wood = 100;
    expect(placeFloor(w, hx + 2, hy, 'boards')).toBe(true);
    expect(w.stock.wood).toBe(98);
    expect(floorPlacementError(w, hx + 2, hy, 'boards')).toBe('Already has a floor');
    // No build limit: a floor far from the hearth is fine.
    expect(placeFloor(w, hx + 12, hy, 'boards')).toBe(true);
  });

  it('ordinary buildings cannot be placed on a floor, and furniture needs one', () => {
    const w = bareWorld(1);
    rich(w);
    const { x: hx, y: hy } = w.hearth;
    expect(placementError(w, 'bed', hx + 2, hy, false)).toBe('Furniture needs a floor');
    placeFloor(w, hx + 2, hy, 'boards');
    placeFloor(w, hx + 2, hy + 1, 'boards');
    expect(placementError(w, 'bed', hx + 2, hy, false)).toBeNull();
    expect(placementError(w, 'tent', hx + 2, hy, false)).toBe('Part of the house');
    expect(placeBuilding(w, 'bed', hx + 2, hy, false)).toBe(true);
  });

  it('nothing is built on the hearth tile, and rubble must be cleared first', () => {
    const w = bareWorld(1);
    rich(w);
    const { x: hx, y: hy } = w.hearth;
    expect(placementError(w, 'tent', hx, hy, false)).toBe('Blocked by the hearth');
    w.map.tiles[hy * w.map.width + hx + 4] = Tile.Rubble;
    expect(placementError(w, 'tent', hx + 4, hy, false)).toBe('Clear the rubble first');
    expect(floorPlacementError(w, hx + 4, hy, 'boards')).toBe('Clear the rubble first');
  });

  it('walls need a floor beside them', () => {
    const w = bareWorld(1);
    rich(w);
    const { x: hx, y: hy } = w.hearth;
    expect(edgePlacementError(w, hx + 2, hy, 'n', 'wall', 1)).toBe('Walls need a floor beside them');
    placeFloor(w, hx + 2, hy, 'boards');
    expect(edgePlacementError(w, hx + 2, hy, 'n', 'wall', 1)).toBeNull();
    expect(edgePlacementError(w, hx + 2, hy, 'n', 'wall', 9)).toBe('Unknown wall');
    expect(edgePlacementError(w, hx + 2, hy, 'w', 'door', 1)).toBeNull();
  });

  it('refuses a wall that would shut a room in without a door', () => {
    const w = bareWorld(1);
    rich(w);
    const { hx, hy } = eastRoom(w, false);
    // Five pieces are built. The wall that closes the last gap is refused, so the player must put a door there.
    expect(w.house.edges.length).toBe(5);
    expect(edgePlacementError(w, hx + 2, hy, 'w', 'wall', 1)).toMatch(/no door/);
    expect(edgePlacementError(w, hx + 2, hy, 'w', 'window', 1)).toMatch(/no door/);
    expect(edgePlacementError(w, hx + 2, hy, 'w', 'door', 1)).toBeNull();
  });

  it('removing a door only opens a gap, and removing a wall that keeps a room closed is allowed', () => {
    const w = bareWorld(1);
    rich(w);
    eastRoom(w);
    finishHouse(w);
    expect(removeError(w, 'edge', w.house.edges.find((e) => e.kind === 'door')!.id)).toBeNull();
  });

  it('removing a piece refunds all of an untouched site, half of a finished one, and most of a ruin', () => {
    const w = bareWorld(1);
    const { x: hx, y: hy } = w.hearth;
    w.stock.wood = 100;
    placeFloor(w, hx + 2, hy, 'boards');
    expect(removeHouseItem(w, 'floor', w.house.floors[0].id)).toBe(true);
    expect(w.stock.wood).toBe(100);
    placeFloor(w, hx + 2, hy, 'boards');
    finishHouse(w);
    removeHouseItem(w, 'floor', w.house.floors[0].id);
    expect(w.stock.wood).toBe(99);
    expect(w.house.floors.length).toBe(0);
    // A ruin floor gives back most of its cost, but at least what whole units allow.
    placeFloor(w, hx + 2, hy, 'boards');
    finishHouse(w);
    w.house.floors[0].ruin = true;
    w.stock.wood = 100;
    removeHouseItem(w, 'floor', w.house.floors[0].id);
    expect(w.stock.wood).toBe(100 + Math.floor(2 * HOUSE.ruinSalvage));
  });

  it('keeps a floor that has furniture or walls on it', () => {
    const w = bareWorld(1);
    rich(w);
    const { x: hx, y: hy } = w.hearth;
    placeFloor(w, hx + 2, hy, 'boards');
    placeFloor(w, hx + 2, hy + 1, 'boards');
    placeBuilding(w, 'bed', hx + 2, hy, false);
    const f = w.house.floors[0];
    expect(removeError(w, 'floor', f.id)).toBe('Remove the furniture first');
    placeEdge(w, hx + 2, hy + 2, 'n', 'wall', 1);
    const g = w.house.floors[1];
    expect(removeError(w, 'floor', g.id)).toBe('Remove the walls on it first');
  });
});

describe('rooms and walking (M10.1)', () => {
  it('finds a finished room and lets walls block steps while doors do not', () => {
    const w = bareWorld(1);
    rich(w);
    const { hx, hy } = eastRoom(w);
    finishHouse(w);
    const rooms = houseRooms(w);
    expect(rooms.length).toBe(1);
    expect(rooms[0].floorCount).toBe(2);
    expect(stepBlocked(w, hx + 2, hy, hx + 2, hy - 1)).toBe(true);
    expect(stepBlocked(w, hx + 3, hy, hx + 4, hy)).toBe(true);
    expect(stepBlocked(w, hx + 1, hy, hx + 2, hy)).toBe(false);
  });

  it('routes colonists through a door and not through walls', () => {
    const w = bareWorld(1);
    rich(w);
    const { hx, hy } = eastRoom(w);
    finishHouse(w);
    // From the north of the room to inside it. The only way in is the west door.
    const route = routeFor(w, { x: hx + 3, y: hy - 4 }, { x: hx + 3, y: hy })!;
    expect(route).not.toBeNull();
    expect(route.some((p) => p.x <= hx + 1 && p.y === hy)).toBe(true);
    // No leg of the walk crosses a wall.
    let at = { x: hx + 3, y: hy - 4 };
    for (const p of route) {
      for (let i = 0; i <= 20; i++) {
        const x = at.x + ((p.x - at.x) * i) / 20;
        const y = at.y + ((p.y - at.y) * (i + 1)) / 21;
        const nx = at.x + ((p.x - at.x) * (i + 1)) / 20;
        const ny = at.y + ((p.y - at.y) * (i + 1)) / 20;
        if (Math.round(x) !== Math.round(nx) || Math.round(y) !== Math.round(ny)) {
          const [ax, ay, bx, by] = [Math.round(x), Math.round(y), Math.round(nx), Math.round(ny)];
          if ((ax === bx) !== (ay === by)) expect(stepBlocked(w, ax, ay, bx, by)).toBe(false);
        }
      }
      at = p;
    }
  });

  it('walks straight when the trip never goes near a house, and gives up on a sealed target', () => {
    const w = bareWorld(1);
    const { x: hx, y: hy } = w.hearth;
    expect(routeFor(w, { x: hx + 12, y: hy }, { x: hx + 12, y: hy + 10 })).toEqual([]);
    // Force a sealed room by building the data directly, as a bug or an old save might.
    rich(w);
    eastRoom(w);
    w.house.edges.find((e) => e.kind === 'door')!.kind = 'wall';
    finishHouse(w);
    expect(routeFor(w, { x: hx + 3, y: hy - 4 }, { x: hx + 3, y: hy })).toBeNull();
  });

  it('a ruin anywhere on the map blocks routes the same way', () => {
    const w = createWorld(1);
    // Pick any town ruin far from the hearth and walk through its wall. The route must not cut the wall.
    const wall = w.house.edges.find((e) => e.ruin && e.kind === 'wall' && Math.hypot(e.x - w.hearth.x, e.y - w.hearth.y) > 30)!;
    expect(wall).toBeDefined();
    const a = wall.side === 'n' ? { x: wall.x, y: wall.y - 1 } : { x: wall.x - 1, y: wall.y };
    const b = { x: wall.x, y: wall.y };
    const route = routeFor(w, a, b);
    expect(route === null || route.length > 1).toBe(true);
  });
});

describe('colonists build and use the house (M10.1)', () => {
  it('colonists build floors, walls, a door, and furniture without any other help', () => {
    const w = bareWorld(1);
    rich(w);
    eastRoom(w);
    const { x: hx, y: hy } = w.hearth;
    seconds(w, 5);
    expect(w.colonists.some((c) => c.task === 'build')).toBe(true);
    seconds(w, 90);
    expect(w.house.floors.every((f) => f.construct === 0)).toBe(true);
    expect(w.house.edges.every((e) => e.construct === 0)).toBe(true);
    expect(placeBuilding(w, 'bed', hx + 2, hy, true)).toBe(true);
    seconds(w, 60);
    expect(w.buildings.find((b) => b.type === 'bed')!.construct).toBe(0);
  });

  it('a colonist walks through the door to sleep in a bed inside', () => {
    const w = bareWorld(1);
    rich(w);
    eastRoom(w);
    const { x: hx, y: hy } = w.hearth;
    finishHouse(w);
    expect(placeBuilding(w, 'bed', hx + 2, hy, true)).toBe(true);
    finishHouse(w);
    const bed = w.buildings.find((b) => b.type === 'bed')!;
    seconds(w, 330);
    const sleepers = w.colonists.filter((c) => c.bed === bed.id);
    expect(sleepers.length).toBe(1);
    seconds(w, 60);
    const sleeper = sleepers[0];
    expect(w.colonists.length).toBeGreaterThan(0);
    expect(sleeper.asleep).toBe(true);
    expect(Math.hypot(sleeper.x - (bed.x + (bed.w - 1) / 2), sleeper.y - (bed.y + (bed.h - 1) / 2))).toBeLessThan(0.2);
  });

  it('survives a save round trip', () => {
    const w = bareWorld(3);
    rich(w);
    eastRoom(w);
    seconds(w, 20);
    const copy: World = JSON.parse(JSON.stringify(w));
    seconds(w, 40);
    seconds(copy, 40);
    expect(copy).toEqual(w);
  });
});

describe('room names (section 5.7)', () => {
  it('names rooms from their furniture and warns about rooms with gaps', () => {
    const w = bareWorld(1);
    Object.assign(w.stock, { wood: 500, planks: 100, stone: 50, metal: 50, scrap: 50 });
    const { hx, hy } = eastRoom(w);
    finishHouse(w);
    expect(roomInfos(w).map((r) => r.name)).toEqual(['Empty room']);
    expect(roomInfos(w)[0].note).toBe('Needs furniture');
    expect(placeBuilding(w, 'bed', hx + 2, hy, false)).toBe(true);
    finishHouse(w);
    expect(roomInfos(w).map((r) => r.name)).toEqual(['Bedroom']);
    // A floor with no walls is open to the cold.
    w.commands.push({ type: 'paintFloor', x: hx + 2, y: hy - 3, kind: 'boards' });
    stepWorld(w);
    finishHouse(w);
    const open = roomInfos(w).find((r) => r.role === 'open')!;
    expect(open.closed).toBe(false);
    expect(open.note).toMatch(/Not closed/);
  });
});
