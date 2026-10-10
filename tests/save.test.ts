import { describe, expect, it } from 'vitest';
import { loadGame, saveGame } from '../src/save/save';
import { createWorld, stepWorld } from '../src/sim/world';
import { fullRunPlayer } from './fullrun';

describe('save and load (M6)', () => {
  it('a loaded game continues exactly like the original', () => {
    const a = createWorld(7);
    const playerA = fullRunPlayer();
    for (let t = 0; t < 3000; t++) {
      if (t % 10 === 0) playerA(a);
      stepWorld(a);
    }
    const b = loadGame(saveGame(a));
    const playerB = fullRunPlayer();
    for (let t = 0; t < 3000; t++) {
      if (t % 10 === 0) {
        playerA(a);
        playerB(b);
      }
      stepWorld(a);
      stepWorld(b);
    }
    expect(b).toEqual(a);
    expect(b.buildings.length).toBeGreaterThan(3);
    expect(b.hearth.ignited).toBe(true);
  }, 120_000);

  it('rejects saves from another version', () => {
    expect(() => loadGame(JSON.stringify({ version: 99, world: {} }))).toThrow('unsupported version');
  });
});
