import { describe, expect, it } from 'vitest';
import { currentHint, HINTS } from '../src/data/hints';
import { createWorld } from '../src/sim/world';
import { build } from './helpers';

describe('tutorial hints (M6)', () => {
  it('starts with the first goal and moves on as goals are met', () => {
    const w = createWorld(1);
    expect(currentHint(w)).toBe(HINTS[0]);
    expect(build(w, 'woodcutterCamp')).toBe(true);
    expect(currentHint(w)).toBe(HINTS[1]);
    build(w, 'tent');
    build(w, 'tent');
    expect(currentHint(w)).toBe(HINTS[2]);
  });

  it('stops after the first two days', () => {
    const w = createWorld(1);
    w.day = 3;
    expect(currentHint(w)).toBeNull();
  });
});
