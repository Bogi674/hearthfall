import { describe, expect, it } from 'vitest';
import { fixedStep } from '../src/sim/loop';
import { createWorld, stepWorld } from '../src/sim/world';

describe('fixed tick loop', () => {
  it('runs one tick per 100 ms and carries the remainder', () => {
    const r = fixedStep(0, 250, 100, 10);
    expect(r.steps).toBe(2);
    expect(r.accumulator).toBeCloseTo(50);
    expect(r.alpha).toBeCloseTo(0.5);
  });

  it('drops the backlog after a long stall', () => {
    const r = fixedStep(0, 5000, 100, 10);
    expect(r.steps).toBe(10);
    expect(r.accumulator).toBe(0);
  });

  it('advances the world tick', () => {
    const world = createWorld(1);
    for (let i = 0; i < 5; i++) stepWorld(world);
    expect(world.tick).toBe(5);
  });

  it('world state survives JSON round trip', () => {
    const world = createWorld(5);
    stepWorld(world);
    expect(JSON.parse(JSON.stringify(world))).toEqual(world);
  });
});
