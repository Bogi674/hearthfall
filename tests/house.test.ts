import { describe, expect, it } from 'vitest';
import { HOUSE } from '../src/data/house';
import { houseRooms, stepBlocked } from '../src/sim/house';
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
 * A two tile room east of the house, walled on the north, south, and east. The west side is the
 * house wall. The east side holds a door. Tiles are hx+2 and hx+3 on the hearth row.
 */
function eastRoom(w: World, door = true) {
  const { x: hx, y: hy } = w.hearth;
  expect(placeFloor(w, hx + 2, hy, 'boards')).toBe(true);
  expect(placeFloor(w, hx + 3, hy, 'boards')).toBe(true);
  for (const x of [hx + 2, hx + 3]) {
    expect(placeEdge(w, x, hy, 'n', 'wall', 1)).toBe(true);
    expect(placeEdge(w, x, hy + 1, 'n', 'wall', 1)).toBe(true);
  }
  expect(placeEdge(w, hx + 4, hy, 'w', door ? 'door' : 'wall', 1)).toBe(door);
  return { hx, hy };
}

describe('house layer rules (M10.1)', () => {
  it('floors must touch the house, stay on the lot, and cost resources', () => {
    const w = createWorld(1);
    const { x: hx, y: hy } = w.hearth;
    expect(floorPlacementError(w, hx, hy, 'boards')).toBe('The house is already here');
    expect(floorPlacementError(w, hx + 3, hy, 'boards')).toMatch(/touch the house/);
    expect(floorPlacementError(w, hx + 2, hy, 'boards')).toBeNull();
    w.stock.wood = 1;
    expect(floorPlacementError(w, hx + 2, hy, 'boards')).toBe('Not enough wood');
    w.stock.wood = 100;
    expect(placeFloor(w, hx + 2, hy, 'boards')).toBe(true);
    expect(w.stock.wood).toBe(98);
    expect(floorPlacementError(w, hx + 2, hy, 'boards')).toBe('Already has a floor');
    // Stage 1 lot is 3 tiles. A floor at 4 tiles out is off the lot until the house grows.
    expect(placeFloor(w, hx + 3, hy, 'boards')).toBe(true);
    expect(floorPlacementError(w, hx + 4, hy, 'boards')).toMatch(/Outside the house lot/);
    w.hearth.level = 2;
    expect(floorPlacementError(w, hx + 4, hy, 'boards')).toBeNull();
    expect(HOUSE.lotRadius).toEqual([3, 4, 5, 6, 7]);
  });

  it('ordinary buildings cannot be placed on a floor, and furniture needs one', () => {
    const w = createWorld(1);
    rich(w);
    const { x: hx, y: hy } = w.hearth;
    expect(placementError(w, 'bed', hx + 2, hy, false)).toBe('Furniture needs a floor');
    placeFloor(w, hx + 2, hy, 'boards');
    placeFloor(w, hx + 2, hy + 1, 'boards');
    expect(placementError(w, 'bed', hx + 2, hy, false)).toBeNull();
    expect(placementError(w, 'tent', hx + 2, hy, false)).toBe('Part of the house');
    expect(placeBuilding(w, 'bed', hx + 2, hy, false)).toBe(true);
  });

  it('walls need a floor beside them, and the house wall is already there', () => {
    const w = createWorld(1);
    rich(w);
    const { x: hx, y: hy } = w.hearth;
    expect(edgePlacementError(w, hx + 2, hy, 'n', 'wall', 1)).toBe('Walls need a floor beside them');
    // Between the house and the tile east of it.
    expect(edgePlacementError(w, hx + 2, hy, 'w', 'wall', 1)).toBe('The house wall is already here');
    expect(edgePlacementError(w, hx, hy + 2, 'n', 'door', 1)).toBe('The front door is already here');
    placeFloor(w, hx + 2, hy, 'boards');
    expect(edgePlacementError(w, hx + 2, hy, 'n', 'wall', 1)).toBeNull();
    expect(edgePlacementError(w, hx + 2, hy, 'n', 'wall', 9)).toBe('Unknown wall');
    // A door can be cut into the house wall.
    expect(edgePlacementError(w, hx + 2, hy, 'w', 'door', 1)).toBeNull();
  });

  it('refuses a wall that would shut a room in without a door', () => {
    const w = createWorld(1);
    rich(w);
    eastRoom(w, false);
    expect(w.house.edges.length).toBe(4);
    // The room has no way in yet. The last wall is refused, so the player must add a door.
    const { x, y } = w.hearth;
    expect(edgePlacementError(w, x + 4, y, 'w', 'wall', 1)).toMatch(/no door/);
    expect(edgePlacementError(w, x + 4, y, 'w', 'window', 1)).toMatch(/no door/);
    expect(edgePlacementError(w, x + 4, y, 'w', 'door', 1)).toBeNull();
  });

  it('refuses to remove a door that is the only way into a room', () => {
    const w = createWorld(1);
    rich(w);
    const { x: hx, y: hy } = w.hearth;
    // A room whose only door is cut into the house wall. Removing it would bring the house wall back.
    placeFloor(w, hx + 2, hy, 'boards');
    expect(placeEdge(w, hx + 2, hy, 'w', 'door', 1)).toBe(true);
    for (const e of [[hx + 2, hy, 'n'], [hx + 2, hy + 1, 'n'], [hx + 3, hy, 'w']] as const) expect(placeEdge(w, e[0], e[1], e[2], 'wall', 1)).toBe(true);
    const door = w.house.edges.find((e) => e.kind === 'door')!;
    expect(removeError(w, 'edge', door.id)).toMatch(/shut a room in/);
    // A second way in makes it removable.
    const east = w.house.edges.find((e) => e.kind === 'wall' && e.side === 'w')!;
    expect(removeHouseItem(w, 'edge', east.id)).toBe(true);
    expect(placeEdge(w, hx + 3, hy, 'w', 'door', 1)).toBe(true);
    expect(removeError(w, 'edge', door.id)).toBeNull();
  });

  it('removing a plain door only opens a gap', () => {
    const w = createWorld(1);
    rich(w);
    eastRoom(w);
    expect(removeError(w, 'edge', w.house.edges.find((e) => e.kind === 'door')!.id)).toBeNull();
  });

  it('removing a piece refunds all of an untouched site and half of a finished one', () => {
    const w = createWorld(1);
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
  });

  it('keeps a floor that has furniture or walls on it', () => {
    const w = createWorld(1);
    rich(w);
    const { x: hx, y: hy } = w.hearth;
    placeFloor(w, hx + 2, hy, 'boards');
    placeFloor(w, hx + 2, hy + 1, 'boards');
    placeBuilding(w, 'bed', hx + 2, hy, false);
    const f = w.house.floors[0];
    expect(removeError(w, 'floor', f.id)).toBe('Remove the furniture first');
    placeEdge(w, hx + 2, hy, 'n', 'wall', 1);
    const g = w.house.floors[1];
    expect(removeError(w, 'floor', g.id)).toBe('Remove the furniture first');
  });
});

describe('rooms and walking (M10.1)', () => {
  it('finds a finished room and lets walls block steps while doors do not', () => {
    const w = createWorld(1);
    rich(w);
    const { hx, hy } = eastRoom(w);
    expect(houseRooms(w).length).toBe(1);
    finishHouse(w);
    const rooms = houseRooms(w);
    expect(rooms.length).toBe(2);
    expect(rooms.map((r) => r.floorCount).sort((a, b) => a - b)).toEqual([2, 9]);
    expect(stepBlocked(w, hx + 2, hy, hx + 2, hy - 1)).toBe(true);
    expect(stepBlocked(w, hx + 3, hy, hx + 4, hy)).toBe(false);
    expect(stepBlocked(w, hx + 1, hy, hx + 2, hy)).toBe(true);
    // The front door of the house lets people into the hearth room.
    expect(stepBlocked(w, hx, hy + 1, hx, hy + 2)).toBe(false);
  });

  it('routes colonists through a door and not through walls', () => {
    const w = createWorld(1);
    rich(w);
    const { hx, hy } = eastRoom(w);
    finishHouse(w);
    // From the north of the room to inside it. The only way in is the east door.
    const route = routeFor(w, { x: hx + 2, y: hy - 4 }, { x: hx + 2, y: hy })!;
    expect(route).not.toBeNull();
    expect(route.some((p) => p.x >= hx + 4 && p.y === hy)).toBe(true);
    // No leg of the walk crosses a wall.
    let at = { x: hx + 2, y: hy - 4 };
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

  it('walks straight when the trip never goes near the house, and gives up on a sealed target', () => {
    const w = createWorld(1);
    const { x: hx, y: hy } = w.hearth;
    expect(routeFor(w, { x: hx + 12, y: hy }, { x: hx + 12, y: hy + 10 })).toEqual([]);
    // Force a sealed room by building the data directly, as a bug or an old save might.
    rich(w);
    eastRoom(w);
    w.house.edges.find((e) => e.kind === 'door')!.kind = 'wall';
    finishHouse(w);
    expect(routeFor(w, { x: hx + 2, y: hy - 4 }, { x: hx + 2, y: hy })).toBeNull();
  });
});

describe('colonists build and use the house (M10.1)', () => {
  it('colonists build floors, walls, a door, and furniture without any other help', () => {
    const w = createWorld(1);
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
    const w = createWorld(1);
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
    const w = createWorld(3);
    rich(w);
    eastRoom(w);
    seconds(w, 20);
    const copy: World = JSON.parse(JSON.stringify(w));
    seconds(w, 40);
    seconds(copy, 40);
    expect(copy).toEqual(w);
  });
});
