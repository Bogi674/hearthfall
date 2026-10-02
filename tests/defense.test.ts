import { describe, expect, it } from 'vitest';
import { ENEMIES } from '../src/data/enemies';
import { placementError } from '../src/sim/placement';
import { currentPhase, DAY_SECONDS, nightThreat } from '../src/sim/query';
import { BLOCKED } from '../src/sim/systems/pathfinding';
import { createWorld, stepWorld, TICKS_PER_SECOND, type World } from '../src/sim/world';
import { build, runDays } from './helpers';

const at = (w: World, x: number, y: number) => y * w.map.width + x;
const stepSeconds = (w: World, s: number) => {
  for (let i = 0; i < s * TICKS_PER_SECOND && !w.lost; i++) stepWorld(w);
};
/** Advances to the start of the night of the current day. */
const toNight = (w: World) => {
  while (currentPhase(w).name !== 'Night') stepWorld(w);
};
const ring = (w: World, r: number) => {
  const tiles: [number, number][] = [];
  for (let y = w.hearth.y - r - 1; y <= w.hearth.y + r + 1; y++) {
    for (let x = w.hearth.x - r - 1; x <= w.hearth.x + r + 1; x++) {
      if (Math.round(Math.hypot(x - w.hearth.x, y - w.hearth.y)) === r) tiles.push([x, y]);
    }
  }
  return tiles;
};
const placeAll = (w: World, type: 'woodenBarricade' | 'spikeTrap', tiles: [number, number][]) => {
  for (const [x, y] of tiles) if (!placementError(w, type, x, y, false)) w.commands.push({ type: 'place', building: type, x, y, rotated: false });
};

describe('waves', () => {
  it('follows the threat formula with a Blood Moon every fifth night', () => {
    expect(nightThreat(1)).toBe(0);
    expect(nightThreat(2)).toBe(13);
    expect(nightThreat(5)).toBe(60);
    expect(nightThreat(8)).toBe(70);
  });

  it('spends threat only on enemies unlocked by that night', () => {
    const world = createWorld(4);
    for (let day = 1; day <= 8; day++) {
      const plan = world.wave.plan;
      const spent = plan.reduce((s, t) => s + ENEMIES[t].threat, 0);
      expect(spent).toBeLessThanOrEqual(world.wave.threat);
      expect(spent).toBeGreaterThan(world.wave.threat - 1 - 1e-9);
      for (const t of plan) expect(ENEMIES[t].fromNight).toBeLessThanOrEqual(day);
      runDays(world, 1, undefined, false);
    }
  });

  it('spawns the planned wave at night and clears it at dawn', () => {
    const world = createWorld(5);
    world.stock.fuel = 1000;
    world.hearth.hp = 1e6;
    runDays(world, 1, undefined, false);
    toNight(world);
    stepSeconds(world, 100);
    expect(world.enemies.length).toBeGreaterThan(0);
    while (currentPhase(world).name !== 'Dawn' && !world.lost) stepWorld(world);
    stepWorld(world);
    expect(world.enemies.length).toBe(0);
  });
});

describe('flow field', () => {
  it('leads every reachable tile downhill to the hearth', () => {
    const world = createWorld(1);
    const f = world.flow.normal;
    expect(f[at(world, world.hearth.x, world.hearth.y)]).toBe(0);
    expect(f[at(world, world.hearth.x + 5, world.hearth.y)]).toBe(4);
  });

  it('prices walls high but keeps a walled base reachable', () => {
    const world = createWorld(1);
    world.stock.wood = 1000;
    placeAll(world, 'woodenBarricade', ring(world, 3));
    stepWorld(world);
    const f = world.flow.normal;
    expect(f[at(world, world.hearth.x + 5, world.hearth.y)]).toBeGreaterThan(40);
    expect(f[at(world, world.hearth.x + 5, world.hearth.y)]).toBeLessThan(BLOCKED);
  });

  it('monsters attack the wall that blocks them', () => {
    const world = createWorld(1);
    world.stock.wood = 1000;
    placeAll(world, 'woodenBarricade', ring(world, 3));
    stepWorld(world);
    world.enemies.push({ id: 999, type: 'shambler', x: world.hearth.x + 7, y: world.hearth.y, px: 0, py: 0, hp: 40, cooldown: 0 });
    stepSeconds(world, 30);
    expect(world.buildings.some((b) => b.hp < 100)).toBe(true);
    expect(world.hearth.hp).toBe(4000);
  });
});

describe('defender duty', () => {
  it('a watchtower defender skips sleep and shoots monsters in range', () => {
    const world = createWorld(1);
    world.stock.planks = 100;
    world.stock.fuel = 1000;
    expect(build(world, 'watchtower')).toBe(true);
    const guard = world.colonists.find((c) => c.duty !== null)!;
    expect(guard).toBeDefined();
    toNight(world);
    stepSeconds(world, 5);
    expect(guard.asleep).toBe(false);
    const tower = world.buildings[0];
    world.enemies.push({ id: 998, type: 'runner', x: tower.x + 3, y: tower.y + 3, px: 0, py: 0, hp: 25, cooldown: 0 });
    stepSeconds(world, 3);
    expect(world.enemies.find((e) => e.id === 998)).toBeUndefined();
  });
});

/** Colony with endless food and fuel, so only the defense decides the outcome. */
function colony(seed: number): World {
  const world = createWorld(seed);
  Object.assign(world.stock, { wood: 2000, planks: 2000, fuel: 2000, meals: 2000 });
  build(world, 'tent');
  build(world, 'tent');
  return world;
}

function runNights(world: World, nights: number, player?: () => void): void {
  for (let t = 0; t < nights * DAY_SECONDS * TICKS_PER_SECOND && !world.lost; t++) {
    if (player && t % TICKS_PER_SECOND === 0) player();
    Object.assign(world.stock, { meals: 2000, fuel: 2000 });
    stepWorld(world);
  }
}

describe('defense (M3 done when)', () => {
  it('a ringed base with towers and traps holds through night 8', () => {
    for (const seed of [1, 2, 3]) {
      const world = colony(seed);
      for (let i = 0; i < 4; i++) build(world, 'watchtower');
      const wall = ring(world, 5);
      const traps = ring(world, 6);
      runNights(world, 8, () => {
        placeAll(world, 'woodenBarricade', wall);
        placeAll(world, 'spikeTrap', traps);
      });
      expect(world.lost, `seed ${seed}`).toBeNull();
      expect(world.day).toBe(9);
    }
  });

  it('the same colony with no defenses falls by night 8', () => {
    for (const seed of [1, 2, 3]) {
      const world = colony(seed);
      runNights(world, 8);
      expect(world.lost, `seed ${seed}`).not.toBeNull();
    }
  });
});
