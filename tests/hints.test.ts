import { describe, expect, it } from 'vitest';
import { currentHint, HINTS } from '../src/data/hints';
import { createWorld, stepWorld } from '../src/sim/world';
import { build, mendedHouse } from './helpers';

describe('tutorial hints (M6)', () => {
  it('starts with lighting the hearth and moves on as goals are met', () => {
    const w = createWorld(1);
    expect(currentHint(w)).toBe(HINTS[0]);
    w.commands.push({ type: 'lightHearth' });
    for (let i = 0; i < 200 && !w.hearth.ignited; i++) stepWorld(w);
    expect(w.hearth.ignited).toBe(true);
    expect(currentHint(w)).toBe(HINTS[1]);
    expect(build(w, 'woodcutterCamp')).toBe(true);
    // The mend goal is done once a closed room with a whole roof and working furniture stands.
    mendedHouse(w, 1);
    expect(HINTS.indexOf(currentHint(w)!)).toBeGreaterThanOrEqual(3);
    expect(currentHint(w)!.text).not.toMatch(/Mend tool/);
  });

  it('stops after the first two days', () => {
    const w = createWorld(1);
    w.day = 3;
    expect(currentHint(w)).toBeNull();
  });
});
