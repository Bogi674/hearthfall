import { describe, expect, it } from 'vitest';
import { barrierBetween, houseRooms, isIndoors, roomAt, sealsRoom } from '../src/sim/house';
import { edgePlacementError, floorPlacementError, placeBuilding, placeEdge, placeFloor, placementError, removeError } from '../src/sim/placement';
import { routeFor } from '../src/sim/route';
import { stepWorld, TICKS_PER_SECOND, type World } from '../src/sim/world';
import { bareWorld, finish } from './helpers';

const seconds = (w: World, s: number) => {
  for (let i = 0; i < s * TICKS_PER_SECOND && !w.lost; i++) stepWorld(w);
};

function rich(level = 5): World {
  const w = bareWorld(1);
  w.hearth.level = level;
  Object.assign(w.stock, { wood: 900, planks: 300, stone: 300, scrap: 300, metal: 200, parts: 50, rawFood: 100, meals: 100, fuel: 500 });
  return w;
}

/** Ground hall of 3 by 3 east of the house with a door, then a stairwell and an upper room over the west two columns. */
function tower() {
  const w = rich();
  const { x, y } = w.hearth;
  for (let dx = 2; dx <= 4; dx++) for (let dy = -1; dy <= 1; dy++) expect(placeFloor(w, x + dx, y + dy, 'boards')).toBe(true);
  placeEdge(w, x + 2, y, 'w', 'door', 1);
  for (let dx = 2; dx <= 4; dx++) {
    placeEdge(w, x + dx, y - 1, 'n', 'wall', 1);
    placeEdge(w, x + dx, y + 2, 'n', 'wall', 1);
  }
  for (let dy = -1; dy <= 1; dy++) placeEdge(w, x + 5, y + dy, 'w', 'wall', 1);
  finish(w);
  // Upper floor over the first two columns. Stairs stand at the third column, and their top is the tile beside it.
  for (let dx = 2; dx <= 3; dx++) for (let dy = -1; dy <= 1; dy++) expect(placeFloor(w, x + dx, y + dy, 'boards', 1)).toBe(true);
  expect(placeBuilding(w, 'stairs', x + 4, y + 1, false, false, 0)).toBe(true);
  finish(w);
  // Walls around the upper room: its two columns plus the landing.
  const upper = (px: number, py: number) => (px >= x + 2 && px <= x + 3 && py >= y - 1 && py <= y + 1) || (px === x + 4 && py === y + 1);
  for (let px = x + 1; px <= x + 5; px++) {
    for (let py = y - 1; py <= y + 2; py++) {
      if (upper(px, py) !== upper(px, py - 1)) placeEdge(w, px, py, 'n', 'wall', 1, 1);
    }
  }
  for (let py = y - 1; py <= y + 1; py++) {
    for (let px = x + 2; px <= x + 5; px++) {
      if (upper(px, py) !== upper(px - 1, py)) placeEdge(w, px, py, 'w', 'wall', 1, 1);
    }
  }
  finish(w);
  return { w, x, y };
}

describe('storeys: placement', () => {
  it('a house can rise to three storeys, and wood only holds up two', () => {
    const w = rich(1);
    const { x, y } = w.hearth;
    placeFloor(w, x + 2, y, 'boards');
    expect(floorPlacementError(w, x + 2, y, 'boards', 1)).toBeNull();
    expect(placeFloor(w, x + 2, y, 'boards', 1)).toBe(true);
    expect(floorPlacementError(w, x + 2, y, 'boards', 2)).toMatch(/Use stone/);
    expect(floorPlacementError(w, x + 2, y, 'stone', 2)).toBeNull();
    expect(floorPlacementError(w, x + 2, y, 'stone', 3)).toMatch(/as high as/);
  });

  it('an upper floor needs a floor below, or a neighbor that has one', () => {
    const w = rich(2);
    const { x, y } = w.hearth;
    placeFloor(w, x + 2, y, 'boards');
    expect(floorPlacementError(w, x + 4, y, 'boards', 1)).toMatch(/floor below/);
    // One tile past the supported floor is a balcony. Two tiles is too far.
    expect(placeFloor(w, x + 2, y, 'boards', 1)).toBe(true);
    expect(floorPlacementError(w, x + 3, y, 'boards', 1)).toBeNull();
    expect(placeFloor(w, x + 3, y, 'boards', 1)).toBe(true);
    expect(floorPlacementError(w, x + 4, y, 'boards', 1)).toMatch(/floor below/);
  });

  it('stairs need a floor under them, no floor over them, and a floor beside the top', () => {
    const w = rich(2);
    const { x, y } = w.hearth;
    placeFloor(w, x + 2, y, 'boards');
    placeFloor(w, x + 3, y, 'boards');
    expect(placementError(w, 'stairs', x + 2, y, false, 'place', 0)).toMatch(/beside the top landing/);
    placeFloor(w, x + 3, y, 'boards', 1);
    expect(placementError(w, 'stairs', x + 2, y, false, 'place', 0)).toBeNull();
    expect(placementError(w, 'stairs', x + 3, y, false, 'place', 0)).toMatch(/floor above/);
    expect(placeBuilding(w, 'stairs', x + 2, y, false, false, 0)).toBe(true);
    // The landing takes no floor.
    expect(floorPlacementError(w, x + 2, y, 'boards', 1)).toMatch(/stairs open/);
  });

  it('keeps a floor that has a floor above it', () => {
    const { w, x, y } = tower();
    const ground = w.house.floors.find((f) => f.storey === 0 && f.x === x + 3 && f.y === y)!;
    expect(removeError(w, 'floor', ground.id)).toMatch(/floor above/);
    const upper = w.house.floors.find((f) => f.storey === 1 && f.x === x + 3 && f.y === y)!;
    expect(removeError(w, 'floor', upper.id)).toMatch(/walls on it|furniture/);
  });

  it('walls on an upper storey need a floor on that storey', () => {
    const w = rich(2);
    const { x, y } = w.hearth;
    placeFloor(w, x + 2, y, 'boards');
    expect(edgePlacementError(w, x + 2, y, 'n', 'wall', 1, 1)).toMatch(/floor beside/);
    placeFloor(w, x + 2, y, 'boards', 1);
    expect(edgePlacementError(w, x + 2, y, 'n', 'wall', 1, 1)).toBeNull();
  });
});

describe('storeys: rooms, routes, and living upstairs', () => {
  it('an upper room is closed by its walls and reached by the stairs, not by a door', () => {
    const { w, x, y } = tower();
    expect(houseRooms(w, 1).length).toBe(1);
    expect(isIndoors(w, x + 2, y, 1)).toBe(true);
    expect(isIndoors(w, x + 4, y + 1, 1)).toBe(true);
    expect(roomAt(w, x + 2, y, 1)!.floorCount).toBe(7);
    expect(sealsRoom(w, { storey: 1 })).toBe(false);
  });

  it('the route up goes through the stairs and says which storey each stop is on', () => {
    const { w, x, y } = tower();
    const route = routeFor(w, { x: x + 2, y: y - 1, storey: 0 }, { x: x + 2, y: y - 1, storey: 1 })!;
    expect(route.length).toBeGreaterThan(1);
    expect(route.some((p) => p.storey === 0 && p.x === x + 4 && p.y === y + 1)).toBe(true);
    expect(route.some((p) => p.storey === 1 && p.x === x + 4 && p.y === y + 1)).toBe(true);
    expect(route[route.length - 1]).toMatchObject({ storey: 1 });
  });

  it('a colonist sleeps in a bed upstairs and is safe in the closed room', () => {
    const { w, x, y } = tower();
    expect(placeBuilding(w, 'bed', x + 2, y - 1, false, false, 1)).toBe(true);
    finish(w);
    for (const c of w.colonists) c.rest = 0.1;
    w.dayTime = 380;
    seconds(w, 40);
    const sleeper = w.colonists.find((c) => c.bed !== null && w.buildings.find((b) => b.id === c.bed)!.storey === 1)!;
    expect(sleeper.task).toBe('sleep');
    expect(sleeper.storey).toBe(1);
    expect(Math.hypot(sleeper.x - (x + 2), sleeper.y - (y - 1))).toBeLessThan(0.1);
    expect(isIndoors(w, sleeper.x, sleeper.y, sleeper.storey)).toBe(true);
  });

  it('monsters only have to break the ground floor walls', () => {
    const { w, x, y } = tower();
    // The upper north wall of the first column is a stored edge, but not a barrier for monsters.
    expect(barrierBetween(w, x + 2, y - 1, x + 2, y - 2)).toBeDefined();
    const upperOnly = w.house.edges.find((e) => e.storey === 1 && e.side === 'n' && e.x === x + 3 && e.y === y + 1);
    expect(upperOnly === undefined || barrierBetween(w, x + 3, y, x + 3, y + 1) !== upperOnly).toBe(true);
  });

  it('upper floors and stairs survive a save', async () => {
    const { w } = tower();
    const { saveGame, loadGame } = await import('../src/save/save');
    const copy = loadGame(saveGame(w));
    expect(copy.house.floors.filter((f) => f.storey === 1).length).toBe(6);
    expect(copy.buildings.some((b) => b.type === 'stairs')).toBe(true);
  });
});
