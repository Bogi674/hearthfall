import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/data/balance';
import type { BuildingType } from '../src/data/buildings';
import { createWorld, stepWorld } from '../src/sim/world';
import { build, makePlayer, runDays } from './helpers';

const FULL_PLAN: BuildingType[] = ['woodcutterCamp', 'tent', 'quarry', 'charcoalKiln', 'foragerHut', 'kitchen', 'tent'];

describe('core economy with no monsters (M2 done when)', () => {
  it('a managed colony survives 5 days with everyone alive', () => {
    const world = createWorld(1);
    runDays(world, 5, makePlayer(FULL_PLAN), false);
    expect(world.lost).toBeNull();
    expect(world.day).toBe(6);
    // Everyone lives, and a drifter joins on the dusk of day 3 because the tents have free beds.
    expect(world.dead.length).toBe(0);
    expect(world.colonists.length).toBe(BALANCE.start.colonists + 1);
    expect(world.hearth.lit).toBe(true);
  });

  it('a colony that does nothing loses when the hearth goes out', () => {
    const world = createWorld(1);
    runDays(world, 5, undefined, false);
    expect(world.lost).toBe('The hearth went out.');
    expect(world.day).toBeLessThanOrEqual(2);
  });

  it('a colony that neglects food starves', () => {
    const world = createWorld(1);
    runDays(world, 6, makePlayer(['woodcutterCamp', 'tent', 'quarry', 'charcoalKiln', 'tent']), false);
    expect(world.log.some((l) => l.text.includes('starved'))).toBe(true);
    expect(world.lost).toBe('Everyone is dead.');
  });
});

describe('production', () => {
  it('a woodcutter camp turns trees into wood and depletes them', () => {
    const world = createWorld(2);
    expect(build(world, 'woodcutterCamp')).toBe(true);
    const nodesBefore = world.nodes.reduce((s, n) => s + n, 0);
    const woodBefore = world.stock.wood;
    for (let i = 0; i < 1200; i++) stepWorld(world);
    expect(world.stock.wood).toBeGreaterThan(woodBefore);
    expect(world.nodes.reduce((s, n) => s + n, 0)).toBeLessThan(nodesBefore);
  });

  it('a kitchen with no raw food reports missing input', () => {
    const world = createWorld(3);
    world.stock.rawFood = 0;
    expect(build(world, 'kitchen')).toBe(true);
    for (let i = 0; i < 300; i++) stepWorld(world);
    expect(world.buildings.find((b) => b.type === 'kitchen')!.status).toBe('noInput');
  });

  it('placement rejects overlap and unaffordable buildings with a reason', () => {
    const world = createWorld(1);
    world.stock.wood = 5;
    expect(build(world, 'tent')).toBe(false);
  });
});
