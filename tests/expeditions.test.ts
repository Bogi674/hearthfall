import { describe, expect, it } from 'vitest';
import { POIS } from '../src/data/pois';
import { expeditionError } from '../src/sim/commands';
import { expeditionRisk } from '../src/sim/systems/expeditions';
import { stepWorld, type World } from '../src/sim/world';
import { bareWorld, build } from './helpers';

const poiIndex = (w: World, type: keyof typeof POIS) => w.pois.findIndex((p) => p.type === type);

function camp(seed: number): World {
  const world = bareWorld(seed);
  // Stay under the 300 storage cap so returning loot has room.
  Object.assign(world.stock, { planks: 20, fuel: 60, meals: 40 });
  expect(build(world, 'gate')).toBe(true);
  return world;
}

/** Runs until every expedition is home. Monsters are cleared so only expedition danger applies. */
function runTrips(world: World, maxSeconds = 2000): void {
  for (let i = 0; i < maxSeconds * 10 && world.expeditions.length > 0 && !world.lost; i++) {
    world.stock.fuel = 60;
    stepWorld(world);
    world.enemies = [];
  }
}

function send(world: World, type: keyof typeof POIS, size: number): number[] {
  // These tests are about danger and loot, so the place counts as already found.
  world.pois[poiIndex(world, type)].seen = 'known';
  const members = world.colonists.filter((c) => c.expedition === null).slice(0, size).map((c) => c.id);
  world.commands.push({ type: 'sendExpedition', poi: poiIndex(world, type), members });
  stepWorld(world);
  return members;
}

describe('expeditions (M4)', () => {
  it('generates one POI of each type at its design distance', () => {
    const world = bareWorld(1);
    expect(world.pois.length).toBe(6);
    for (const p of world.pois) {
      const d = Math.hypot(p.x - world.hearth.x, p.y - world.hearth.y);
      // Each place sits within a tenth of its design distance, a little nearer or farther by the map.
      expect(d).toBeGreaterThan(POIS[p.type].distance * 0.86);
      expect(d).toBeLessThan(POIS[p.type].distance * 1.14);
    }
  });

  it('needs a gate and a squad of 1 to 4', () => {
    const world = bareWorld(1);
    const ids = world.colonists.map((c) => c.id);
    expect(expeditionError(world, 0, ids.slice(0, 2))).toBe('Build a Gate first');
    Object.assign(world.stock, { planks: 100 });
    build(world, 'gate');
    expect(expeditionError(world, 0, [])).toBe('Pick 1 to 4 colonists');
    expect(expeditionError(world, 0, ids.slice(0, 5))).toBe('Pick 1 to 4 colonists');
    expect(expeditionError(world, 0, ids.slice(0, 2))).toBeNull();
  });

  it('a squad walks out visibly, searches, and returns with loot', () => {
    const world = camp(2);
    const food = world.stock.rawFood;
    const members = send(world, 'farmhouse', 2);
    for (let i = 0; i < 100; i++) stepWorld(world);
    const out = world.colonists.find((c) => c.id === members[0])!;
    expect(Math.hypot(out.x - world.hearth.x, out.y - world.hearth.y)).toBeGreaterThan(5);
    runTrips(world);
    expect(world.stock.rawFood).toBeGreaterThan(food);
    expect(world.pois[poiIndex(world, 'farmhouse')].clears).toBe(1);
    expect(world.colonists.filter((c) => members.includes(c.id)).every((c) => c.expedition === null)).toBe(true);
    expect(world.log.some((l) => l.text.startsWith('The squad is back from the Farmhouse with'))).toBe(true);
  });

  it('a searched POI gives less loot on the next visit', () => {
    const world = camp(3);
    const gains: number[] = [];
    for (let trip = 0; trip < 3; trip++) {
      const before = world.stock.rawFood + world.stock.wood;
      send(world, 'farmhouse', 2);
      runTrips(world);
      gains.push(world.stock.rawFood + world.stock.wood - before);
    }
    expect(gains[2]).toBeLessThan(gains[0]);
  });

  it('larger squads and daylight lower the risk', () => {
    const world = bareWorld(1);
    expect(expeditionRisk(world, 5, 4)).toBeLessThan(expeditionRisk(world, 5, 1));
    const day = expeditionRisk(world, 3, 2);
    world.dayTime = 400;
    expect(expeditionRisk(world, 3, 2)).toBeGreaterThan(day);
  });

  it('a lone colonist sent to dangerous places gets hurt and can die', () => {
    const world = camp(4);
    for (let trip = 0; trip < 8 && !world.dead.length; trip++) {
      send(world, 'oldAirfield', 1);
      runTrips(world);
    }
    expect(world.log.some((l) => /bitten|clawed|rotten floor|rusted metal/.test(l.text))).toBe(true);
    expect(world.dead.some((d) => d.cause === 'died at the Old Airfield')).toBe(true);
  });

  it('a recalled squad turns around at once', () => {
    const world = camp(5);
    send(world, 'railDepot', 2);
    for (let i = 0; i < 50; i++) stepWorld(world);
    world.commands.push({ type: 'recall', id: world.expeditions[0].id });
    stepWorld(world);
    expect(world.expeditions[0].stage).toBe('back');
    runTrips(world);
    expect(world.expeditions.length).toBe(0);
    expect(world.pois[poiIndex(world, 'railDepot')].clears).toBe(0);
  });
});
