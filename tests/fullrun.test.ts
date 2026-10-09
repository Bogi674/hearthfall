import { describe, expect, it } from 'vitest';
import { DAY_SECONDS } from '../src/sim/query';
import { createWorld, stepWorld, TICKS_PER_SECOND } from '../src/sim/world';
import { fullRunPlayer, houseBuilder } from './fullrun';

describe('full run (M5 done when)', () => {
  for (const seed of [2, 3, 5]) {
    it(`a careful player can launch the airship on seed ${seed}`, () => {
      const world = createWorld(seed);
      const player = fullRunPlayer();
      for (let t = 0; t < 14 * DAY_SECONDS * TICKS_PER_SECOND && !world.lost && !world.won; t++) {
        if (t % TICKS_PER_SECOND === 0) player(world);
        stepWorld(world);
      }
      expect(world.lost).toBeNull();
      expect(world.won).not.toBeNull();
      expect(world.won!.aboard.length).toBeGreaterThan(0);
      // About 45 minutes at 2x speed (see docs/DECISIONS.md).
      expect(world.day).toBeLessThanOrEqual(10);
    });
  }

  it('a run with a house built on the lot still launches the airship (M10.1a)', () => {
    const world = createWorld(2);
    const player = fullRunPlayer();
    const house = houseBuilder();
    for (let t = 0; t < 14 * DAY_SECONDS * TICKS_PER_SECOND && !world.lost && !world.won; t++) {
      if (t % TICKS_PER_SECOND === 0) {
        house(world);
        player(world);
      }
      stepWorld(world);
    }
    expect(world.house.floors.every((f) => f.construct === 0)).toBe(true);
    expect(world.house.edges.every((e) => e.construct === 0)).toBe(true);
    expect(world.buildings.filter((b) => b.type === 'bed' && b.construct === 0).length).toBe(2);
    expect(world.lost).toBeNull();
    expect(world.won).not.toBeNull();
    expect(world.day).toBeLessThanOrEqual(10);
  });
});
