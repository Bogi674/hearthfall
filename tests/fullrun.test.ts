import { describe, expect, it } from 'vitest';
import { DAY_SECONDS } from '../src/sim/query';
import { createWorld, stepWorld, TICKS_PER_SECOND } from '../src/sim/world';
import { fullRunPlayer } from './fullrun';

describe('full run (M5 done when)', () => {
  for (const seed of [1, 2]) {
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
});
