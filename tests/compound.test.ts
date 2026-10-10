import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/data/balance';
import { BUILDINGS } from '../src/data/buildings';
import { Tile } from '../src/sim/grid';
import { placeBuilding, placementError } from '../src/sim/placement';
import { capacity, currentPhase } from '../src/sim/query';
import { combatSystem } from '../src/sim/systems/combat';
import { stepWorld, TICKS_PER_SECOND, type Enemy, type World } from '../src/sim/world';
import { bareWorld, build, closedRoom, findSpot, finish } from './helpers';

const seconds = (w: World, s: number) => {
  for (let i = 0; i < s * TICKS_PER_SECOND && !w.lost; i++) stepWorld(w);
};
const monster = (w: World, x: number, y: number, breaker: boolean, hp = 1000): Enemy => {
  const e: Enemy = { id: w.nextId++, type: 'shambler', x, y, px: x, py: y, hp, cooldown: 0, breaker };
  w.enemies.push(e);
  return e;
};
const place = (w: World, type: keyof typeof BUILDINGS, minDist = 0) => {
  const spot = findSpot(w, type, minDist)!;
  expect(placeBuilding(w, type, spot.x, spot.y, false)).toBe(true);
  return w.buildings[w.buildings.length - 1];
};

describe('construction (section 8.2)', () => {
  it('a placed building is a site until colonists build it', () => {
    const w = bareWorld(1);
    const camp = place(w, 'woodcutterCamp', 8);
    expect(camp.construct).toBe(BUILDINGS.woodcutterCamp.build);
    seconds(w, 3);
    expect(w.colonists.some((c) => c.task === 'build' && c.site === camp.id)).toBe(true);
    expect(w.stock.wood).toBe(BALANCE.start.stock.wood - BUILDINGS.woodcutterCamp.cost.wood!);
    seconds(w, 30);
    expect(camp.construct).toBe(0);
    seconds(w, 30);
    expect(w.stock.wood).toBeGreaterThan(BALANCE.start.stock.wood - BUILDINGS.woodcutterCamp.cost.wood!);
  });

  it('idle colonists build walls that have no crew of their own', () => {
    const w = bareWorld(1);
    const wall = place(w, 'woodenBarricade', 6);
    seconds(w, 10);
    expect(wall.construct).toBe(0);
  });
});

describe('work spots (section 12.4)', () => {
  it('woodcutters stand next to the tree they are cutting', () => {
    const w = bareWorld(1);
    build(w, 'woodcutterCamp', 8);
    seconds(w, 20);
    const camp = w.buildings.find((b) => b.type === 'woodcutterCamp')!;
    const workers = w.colonists.filter((c) => c.job === camp.id && c.task === 'work');
    expect(workers.length).toBeGreaterThan(0);
    const nx = camp.node % w.map.width;
    const ny = (camp.node - nx) / w.map.width;
    expect(w.map.tiles[camp.node]).toBe(Tile.Tree);
    for (const c of workers) expect(Math.hypot(c.x - nx, c.y - ny)).toBeLessThan(1);
  });
});

describe('the house and the supply cart (section 5.6)', () => {
  it('starts with a supply cart that holds the first storage', () => {
    const w = bareWorld(1);
    expect(w.buildings.map((b) => b.type)).toEqual(['supplyCart']);
    expect(capacity(w)).toBe(300);
  });

  it('keeps the hearth tile free and has no build limit', () => {
    const w = bareWorld(1);
    Object.assign(w.stock, { wood: 100, planks: 100 });
    const { x, y } = w.hearth;
    expect(placementError(w, 'tent', x, y, false)).toBe('Blocked by the hearth');
    expect(placementError(w, 'tent', x + 2, y - 1, false)).toBeNull();
    expect(placementError(w, 'bed', x + 2, y - 1, false)).toBe('Furniture needs a floor');
  });

  it('a bed in a closed room lets sleepers rest faster than a tent', () => {
    const rest = (type: 'tent' | 'bed') => {
      const w = bareWorld(1);
      Object.assign(w.stock, { wood: 100, planks: 100 });
      if (type === 'bed') {
        closedRoom(w);
        expect(placeBuilding(w, 'bed', w.hearth.x + 2, w.hearth.y, false)).toBe(true);
      } else place(w, 'tent');
      finish(w);
      for (const c of w.colonists) c.rest = 0.2;
      while (currentPhase(w).work) stepWorld(w);
      seconds(w, 60 + 40);
      const sleeper = w.colonists.find((c) => c.asleep && c.bed !== null)!;
      return sleeper.rest;
    };
    expect(rest('bed')).toBeGreaterThan(rest('tent'));
  });
});

describe('shelter and monsters (sections 9.4 and 9.7)', () => {
  it('monsters that cannot break buildings leave walls alone, breakers smash them', () => {
    for (const breaker of [false, true]) {
      const w = bareWorld(1);
      const wall = place(w, 'woodenBarricade', 6);
      finish(w);
      stepWorld(w);
      const e = monster(w, wall.x + 1, wall.y, breaker);
      // Force the path through the wall.
      w.flow.normal = w.flow.normal.map(() => 1000);
      w.flow.normal[wall.y * w.map.width + wall.x + 1] = 99;
      w.flow.normal[wall.y * w.map.width + wall.x] = 1;
      for (let i = 0; i < 50; i++) combatSystem(w, 0.1);
      expect(wall.hp < BUILDINGS.woodenBarricade.hp, `breaker ${breaker}`).toBe(breaker);
      expect(e.hp).toBeGreaterThan(0);
    }
  });

  it('the alarm sends workers inside, where monsters cannot reach them', () => {
    const w = bareWorld(1);
    const camp = place(w, 'woodcutterCamp', 8);
    finish(w);
    seconds(w, 20);
    w.commands.push({ type: 'alarm', on: true });
    seconds(w, 15);
    const crew = w.colonists.filter((c) => c.job === camp.id);
    expect(crew.every((c) => c.task === 'shelter')).toBe(true);
    const c = crew[0];
    monster(w, c.x + 0.3, c.y, true);
    const before = c.health;
    for (let i = 0; i < 50; i++) combatSystem(w, 0.1);
    expect(c.health).toBe(before);
  });

  it('a small raid prowls in by day from day 3', () => {
    const w = bareWorld(2);
    w.stock.fuel = 1000;
    w.stock.meals = 1000;
    while (w.day < BALANCE.waves.raidFromDay) stepWorld(w);
    w.enemies = [];
    seconds(w, BALANCE.waves.raidAt + 1);
    expect(currentPhase(w).name).toBe('Day');
    expect(w.enemies.length).toBeGreaterThan(0);
  });
});

describe('weapons (section 9.6)', () => {
  it('a workbench crafts spears and colonists pick them up', () => {
    const w = bareWorld(1);
    Object.assign(w.stock, { planks: 200, metal: 50, scrap: 50, wood: 50 });
    closedRoom(w);
    expect(placeBuilding(w, 'workbench', w.hearth.x + 2, w.hearth.y, true)).toBe(true);
    finish(w);
    seconds(w, 60);
    expect(w.colonists.some((c) => c.weapon === 'spear')).toBe(true);
  });

  it('a colonist fights back and kills a weak monster', () => {
    const w = bareWorld(1);
    const c = w.colonists[0];
    [c.x, c.y] = [w.hearth.x + 20, w.hearth.y];
    const e = monster(w, c.x + 0.5, c.y, false, 20);
    for (let i = 0; i < 60; i++) combatSystem(w, 0.1);
    expect(w.enemies.includes(e)).toBe(false);
  });

  it('a watchtower has two makeshift guns and upgrades to a heavy gun', () => {
    const w = bareWorld(1);
    Object.assign(w.stock, { wood: 100, scrap: 100, metal: 100, parts: 20, fuel: 1000 });
    build(w, 'watchtower');
    const tower = w.buildings.find((b) => b.type === 'watchtower')!;
    expect(w.colonists.filter((c) => c.duty === tower.id).length).toBe(2);
    w.commands.push({ type: 'upgradeBuilding', id: tower.id });
    stepWorld(w);
    expect(tower.level).toBe(2);
    while (currentPhase(w).work) stepWorld(w);
    seconds(w, 5);
    const e = monster(w, tower.x + 4, tower.y, false, 26);
    seconds(w, 2);
    expect(w.enemies.includes(e)).toBe(false);
  });
});
