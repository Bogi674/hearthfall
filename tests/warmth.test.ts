import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/data/balance';
import { baselineWarmth, hearthRadius, warmthSystem } from '../src/sim/systems/warmth';
import { createWorld, type World } from '../src/sim/world';

const W = BALANCE.warmth;

function warmthAt(world: World, dx: number, dy: number): number {
  return world.warmth[(world.hearth.y + dy) * world.map.width + world.hearth.x + dx];
}

describe('warmth', () => {
  it('is 100 on the hearth tile', () => {
    expect(warmthAt(createWorld(1), 0, 0)).toBe(100);
  });

  it('keeps every tile inside the hearth radius warm', () => {
    const world = createWorld(1);
    const r = hearthRadius(world);
    expect(r).toBe(8);
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.hypot(dx, dy) <= r) expect(warmthAt(world, dx, dy)).toBeGreaterThanOrEqual(W.warmThreshold);
      }
    }
  });

  it('falls to the outdoor baseline past the radius', () => {
    const world = createWorld(1);
    const far = Math.ceil(hearthRadius(world) * (1 + W.edgeFalloff)) + 1;
    expect(warmthAt(world, far, 0)).toBe(Math.round(baselineWarmth(world.temperature)));
    expect(warmthAt(world, far, 0)).toBeLessThan(W.warmThreshold);
  });

  it('fades gradually past the radius instead of dropping at once', () => {
    const world = createWorld(1);
    world.temperature = -10;
    warmthSystem(world, 0.1);
    const r = hearthRadius(world);
    const values = [1, 2, 3].map((k) => warmthAt(world, r + k, 0));
    expect(values[0]).toBeLessThan(W.warmThreshold);
    expect(values[0]).toBeGreaterThan(values[1]);
    expect(values[1]).toBeGreaterThan(values[2]);
  });

  it('day 1 outside is cold but not freezing', () => {
    const b = baselineWarmth(BALANCE.temperature.day1);
    expect(b).toBeLessThan(W.warmThreshold);
    expect(b).toBeGreaterThanOrEqual(W.freezingThreshold);
  });

  it('a colder day lowers the outside but not the hearth', () => {
    const world = createWorld(1);
    const before = warmthAt(world, 30, 0);
    world.temperature = -15;
    warmthSystem(world, 0.1);
    expect(warmthAt(world, 30, 0)).toBeLessThan(before);
    expect(warmthAt(world, 0, 0)).toBe(100);
  });

  it('a bigger hearth level warms a larger area', () => {
    const world = createWorld(1);
    expect(warmthAt(world, 11, 0)).toBeLessThan(W.warmThreshold);
    world.hearth.level = 3;
    warmthSystem(world, 0.1);
    expect(warmthAt(world, 11, 0)).toBeGreaterThanOrEqual(W.warmThreshold);
  });
});
