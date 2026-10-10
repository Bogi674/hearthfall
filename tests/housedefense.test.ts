import { describe, expect, it } from 'vitest';
import { EDGES } from '../src/data/house';
import { edgePlacementError, placeBuilding, placementError, removeHouseItem } from '../src/sim/placement';
import { currentPhase, lightSources } from '../src/sim/query';
import { combatSystem } from '../src/sim/systems/combat';
import { pathfindingSystem } from '../src/sim/systems/pathfinding';
import { stepWorld, TICKS_PER_SECOND, type Enemy, type World } from '../src/sim/world';
import { bareWorld, closedRoom, finish } from './helpers';

const seconds = (w: World, s: number) => {
  for (let i = 0; i < s * TICKS_PER_SECOND && !w.lost; i++) stepWorld(w);
};
const monster = (w: World, x: number, y: number, breaker: boolean, hp = 1000): Enemy => {
  const e: Enemy = { id: w.nextId++, type: 'shambler', x, y, px: x, py: y, hp, cooldown: 0, breaker };
  w.enemies.push(e);
  return e;
};
const rich = (w: World) => Object.assign(w.stock, { wood: 500, scrap: 300, planks: 200, metal: 200, stone: 100, parts: 50, fuel: 500, rawFood: 100, meals: 100 });
/**
 * A ring of floor two tiles around the house, walled on its whole outside, with a door on the east side.
 * Monsters must break a wall or the door to reach the house. The whole ring is one closed room.
 */
function ring(w: World): void {
  const { x, y } = w.hearth;
  const cmd = (c: World['commands'][number]) => w.commands.push(c);
  // Corners last, since a floor must touch the house or another floor.
  const tiles: [number, number][] = [];
  for (let dx = -2; dx <= 2; dx++) for (let dy = -2; dy <= 2; dy++) if (Math.max(Math.abs(dx), Math.abs(dy)) === 2) tiles.push([dx, dy]);
  tiles.sort((a, b) => Math.abs(a[0] * a[1]) - Math.abs(b[0] * b[1]));
  for (const [dx, dy] of tiles) cmd({ type: 'paintFloor', x: x + dx, y: y + dy, kind: 'boards' });
  stepWorld(w);
  cmd({ type: 'buildEdge', x: x + 3, y, side: 'w', kind: 'door', level: 1 });
  for (let i = -2; i <= 2; i++) {
    cmd({ type: 'buildEdge', x: x + i, y: y - 2, side: 'n', kind: 'wall', level: 1 });
    cmd({ type: 'buildEdge', x: x + i, y: y + 3, side: 'n', kind: 'wall', level: 1 });
    cmd({ type: 'buildEdge', x: x - 2, y: y + i, side: 'w', kind: 'wall', level: 1 });
    if (i !== 0) cmd({ type: 'buildEdge', x: x + 3, y: y + i, side: 'w', kind: 'wall', level: 1 });
  }
  stepWorld(w);
  finish(w);
  stepWorld(w);
}

/** No hearth light, so monsters can hurt people. Tests call the combat system directly. */
const dark = (w: World) => {
  w.hearth.lit = false;
};

describe('gun ports, upgrades, and walls under attack (section 9.8)', () => {
  it('a wall becomes a gun port, a defender takes it, and it fires at night', () => {
    const w = bareWorld(1);
    rich(w);
    closedRoom(w);
    const { x, y } = w.hearth;
    expect(edgePlacementError(w, x + 3, y, 'w', 'gunPort', 1)).toBeNull();
    w.commands.push({ type: 'buildEdge', x: x + 3, y, side: 'w', kind: 'gunPort', level: 1 });
    stepWorld(w);
    const wall = w.house.edges.find((e) => e.x === x + 3 && e.y === y && e.side === 'w')!;
    // The wall stands while builders work on the gun port.
    expect(wall.kind).toBe('wall');
    expect(wall.pending?.kind).toBe('gunPort');
    seconds(w, 40);
    expect(wall.kind).toBe('gunPort');
    expect(wall.pending).toBeNull();
    stepWorld(w);
    const defender = w.colonists.find((c) => c.duty === wall.id)!;
    expect(defender).toBeDefined();
    // At night the defender stands just inside the wall and fires through it.
    w.dayTime = 380;
    seconds(w, 15);
    expect(defender.task).toBe('guard');
    expect(Math.hypot(defender.x - (x + 2), defender.y - y)).toBeLessThan(0.3);
    const e = monster(w, x + 7, y, false, 24);
    seconds(w, 4);
    expect(w.enemies.includes(e)).toBe(false);
  });

  it('a gun port with no defender does not fire, and a stronger port can be built over a weaker one', () => {
    const w = bareWorld(1);
    rich(w);
    closedRoom(w);
    const { x, y } = w.hearth;
    w.commands.push({ type: 'buildEdge', x: x + 3, y, side: 'w', kind: 'gunPort', level: 1 });
    stepWorld(w);
    finish(w);
    const port = w.house.edges.find((e) => e.kind === 'gunPort')!;
    expect(edgePlacementError(w, x + 3, y, 'w', 'gunPort', 1)).toBe('Already built here');
    expect(edgePlacementError(w, x + 3, y, 'w', 'gunPort', 2)).toBeNull();
    expect(edgePlacementError(w, x + 3, y, 'w', 'wall', 1)).toBeNull();
    const before = w.stock.metal;
    w.commands.push({ type: 'buildEdge', x: x + 3, y, side: 'w', kind: 'gunPort', level: 2 });
    stepWorld(w);
    expect(w.stock.metal).toBe(before - 6);
    expect(port.pending?.level).toBe(2);
    // Removing the piece during the upgrade cancels it and refunds in full.
    expect(removeHouseItem(w, 'edge', port.id)).toBe(true);
    expect(port.pending).toBeNull();
    expect(w.stock.metal).toBe(before);
    expect(w.house.edges.includes(port)).toBe(true);
  });

  it('people in a closed room are safe, and exposed once a wall is broken', () => {
    const w = bareWorld(1);
    rich(w);
    ring(w);
    dark(w);
    const { x, y } = w.hearth;
    const c = w.colonists[0];
    [c.x, c.y, c.px, c.py, c.task] = [x + 2.4, y + 1, x + 2.4, y + 1, 'idle'];
    monster(w, x + 3, y + 1, false);
    for (let i = 0; i < 30; i++) combatSystem(w, 0.1);
    expect(c.health).toBe(1);
    // The wall between them falls. The same colonist is now on the floor of a room with a gap.
    const wall = w.house.edges.find((e) => e.x === x + 3 && e.y === y + 1 && e.side === 'w')!;
    wall.hp = 0;
    combatSystem(w, 0.1);
    expect(w.house.edges.includes(wall)).toBe(false);
    w.enemies.length = 0;
    monster(w, x + 2.95, y + 1, false);
    for (let i = 0; i < 30; i++) combatSystem(w, 0.1);
    expect(c.health).toBeLessThan(1);
  });

  it('breakers smash a house wall, and go for the door before a wall', () => {
    const w = bareWorld(1);
    rich(w);
    ring(w);
    dark(w);
    pathfindingSystem(w, 0);
    const { x, y } = w.hearth;
    const wall = w.house.edges.find((o) => o.x === x + 3 && o.y === y + 1 && o.side === 'w')!;
    const door = w.house.edges.find((o) => o.x === x + 3 && o.y === y && o.side === 'w')!;
    expect(door.kind).toBe('door');
    // The monster comes from the east in line with the wall next to the door. The door is the weaker piece.
    const m = monster(w, x + 7, y + 1, true);
    for (let i = 0; i < 3000 && w.house.edges.includes(door); i++) combatSystem(w, 0.1);
    expect(w.house.edges.includes(door)).toBe(false);
    expect(wall.hp).toBe(EDGES.wall.levels[0].hp);
    expect(m.hp).toBeGreaterThan(0);
  });
});

describe('roof turrets and spotlights (section 9.8)', () => {
  it('a roof turret needs a closed room, takes a defender, and fires from the roof', () => {
    const w = bareWorld(1);
    rich(w);
    const { x, y } = w.hearth;
    for (const dy of [0, 1]) w.commands.push({ type: 'paintFloor', x: x + 2, y: y + dy, kind: 'boards' });
    stepWorld(w);
    expect(placementError(w, 'roofTurret', x + 2, y, false)).toBe('Needs a closed room with finished walls');
    w.commands.length = 0;
    w.commands.push({ type: 'removeHouseItem', item: 'floor', id: w.house.floors[0].id }, { type: 'removeHouseItem', item: 'floor', id: w.house.floors[1].id });
    stepWorld(w);
    closedRoom(w);
    expect(placementError(w, 'roofTurret', x + 2, y, false)).toBeNull();
    expect(placeBuilding(w, 'roofTurret', x + 2, y, false)).toBe(true);
    finish(w);
    stepWorld(w);
    const turret = w.buildings.find((b) => b.type === 'roofTurret')!;
    expect(w.colonists.filter((c) => c.duty === turret.id).length).toBe(1);
    w.dayTime = 380;
    seconds(w, 15);
    const target = monster(w, x + 6, y, false, 12);
    seconds(w, 3);
    expect(w.enemies.includes(target)).toBe(false);
    expect(currentPhase(w).name).toBe('Night');
  });

  it('a spotlight lights a wide circle at night for fuel', () => {
    const w = bareWorld(1);
    rich(w);
    closedRoom(w);
    const { x, y } = w.hearth;
    expect(placeBuilding(w, 'spotlight', x + 2, y, false)).toBe(true);
    finish(w);
    const before = lightSources(w).length;
    w.dayTime = 365;
    seconds(w, 2);
    const spot = w.buildings.find((b) => b.type === 'spotlight')!;
    expect(spot.lit).toBe(true);
    const lights = lightSources(w);
    expect(lights.some((l) => l.r === 8)).toBe(true);
    expect(lights.length).toBeGreaterThanOrEqual(before);
  });
});
