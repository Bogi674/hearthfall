import { describe, expect, it } from 'vitest';
import { buildLine, buildRoom, demolishArea, paintArea } from '../src/sim/build';
import { houseRooms, isIndoors, storedEdgeAt } from '../src/sim/house';
import { placeBuilding } from '../src/sim/placement';
import { stepWorld, type World } from '../src/sim/world';
import { bareWorld, finish } from './helpers';

function rich(level = 5): World {
  const w = bareWorld(1);
  w.hearth.level = level;
  Object.assign(w.stock, { wood: 900, planks: 300, stone: 300, scrap: 300, metal: 200, parts: 50 });
  return w;
}

describe('area tools for the house builder (M11)', () => {
  it('fills a rectangle of floor that grows from the house outward', () => {
    const w = rich();
    const { x, y } = w.hearth;
    // The rectangle is far from the house in reading order, but it touches the house on one side.
    expect(paintArea(w, { x: x + 2, y: y - 2, w: 4, h: 4 }, 'boards')).toBe(16);
    expect(w.house.floors.length).toBe(16);
    expect(w.stock.wood).toBe(900 - 32);
  });

  it('a rectangle goes anywhere on open ground, far from the hearth too', () => {
    const w = rich();
    const { x, y } = w.hearth;
    expect(paintArea(w, { x: x + 14, y: y - 12, w: 2, h: 2 }, 'boards')).toBe(4);
  });

  it('raises a room with floors, walls all around, and one door on the south side', () => {
    const w = rich();
    const { x, y } = w.hearth;
    const n = buildRoom(w, { x: x + 2, y: y - 1, w: 4, h: 3 }, 'boards', 1);
    // 12 floors and 14 perimeter borders, one of them the door.
    expect(n).toBe(12 + 14);
    finish(w);
    expect(houseRooms(w).length).toBe(1);
    expect(isIndoors(w, x + 3, y, 0)).toBe(true);
    const doors = w.house.edges.filter((e) => e.kind === 'door');
    expect(doors.length).toBe(1);
    expect(doors[0].side === 'n' && doors[0].y === y + 2).toBe(true);
  });

  it('puts the door where the room meets an existing floor', () => {
    const w = rich();
    const { x, y } = w.hearth;
    paintArea(w, { x: x + 6, y: y - 1, w: 2, h: 3 }, 'boards');
    finish(w);
    buildRoom(w, { x: x + 2, y: y - 1, w: 4, h: 3 }, 'boards', 1);
    const door = w.house.edges.find((e) => e.kind === 'door')!;
    expect(door.x === x + 6 && door.side === 'w').toBe(true);
  });

  it('puts the door on the south side when the room touches nothing', () => {
    const w = rich();
    const { x, y } = w.hearth;
    paintArea(w, { x: x + 2, y: y - 1, w: 1, h: 3 }, 'boards');
    const before = w.house.edges.length;
    buildRoom(w, { x: x + 3, y: y - 1, w: 2, h: 2 }, 'boards', 1);
    expect(w.house.edges.length).toBeGreaterThan(before);
  });

  it('runs a line of wall along a border row', () => {
    const w = rich();
    const { x, y } = w.hearth;
    paintArea(w, { x: x + 2, y: y - 1, w: 5, h: 1 }, 'boards');
    expect(buildLine(w, { x: x + 2, y: y - 1, side: 'n' }, 5, 'wall', 1)).toBe(5);
    expect(storedEdgeAt(w, x + 6, y - 1, 'n')).toBeDefined();
  });

  it('works on an upper storey over a built floor', () => {
    const w = rich();
    const { x, y } = w.hearth;
    paintArea(w, { x: x + 2, y: y - 1, w: 3, h: 3 }, 'boards');
    finish(w);
    expect(buildRoom(w, { x: x + 2, y: y - 1, w: 3, h: 3 }, 'boards', 1, 1)).toBeGreaterThan(9);
    expect(w.house.floors.filter((f) => f.storey === 1).length).toBe(9);
    expect(w.house.edges.some((e) => e.storey === 1 && e.kind === 'door')).toBe(true);
  });

  it('takes an area apart: furniture, then walls, then floors, and refunds some of it', () => {
    const w = rich();
    const { x, y } = w.hearth;
    buildRoom(w, { x: x + 2, y: y - 1, w: 3, h: 3 }, 'boards', 1);
    finish(w);
    expect(placeBuilding(w, 'bed', x + 3, y, false)).toBe(true);
    finish(w);
    const wood = w.stock.wood;
    expect(demolishArea(w, { x: x + 2, y: y - 1, w: 3, h: 3 })).toBeGreaterThanOrEqual(19);
    expect(w.house.floors.length).toBe(0);
    expect(w.house.edges.length).toBe(0);
    expect(w.buildings.some((b) => b.type === 'bed')).toBe(false);
    expect(w.stock.wood).toBeGreaterThan(wood);
    stepWorld(w);
  });

  it('commands run the tools in the tick', () => {
    const w = rich();
    const { x, y } = w.hearth;
    w.commands.push({ type: 'buildRoom', x: x + 2, y: y - 1, w: 3, h: 3, kind: 'boards', level: 1 });
    stepWorld(w);
    expect(w.house.floors.length).toBe(9);
    w.commands.push({ type: 'demolishArea', x: x + 2, y: y - 1, w: 3, h: 3 });
    stepWorld(w);
    expect(w.house.floors.length).toBe(0);
  });
});
