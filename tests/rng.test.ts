import { describe, expect, it } from 'vitest';
import { createRng, nextFloat, nextInt } from '../src/sim/rng';

describe('rng', () => {
  it('produces the same sequence for the same seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    for (let i = 0; i < 100; i++) expect(nextFloat(a)).toBe(nextFloat(b));
  });

  it('produces different sequences for different seeds', () => {
    const a = createRng(1);
    const b = createRng(2);
    const seqA = Array.from({ length: 10 }, () => nextFloat(a));
    const seqB = Array.from({ length: 10 }, () => nextFloat(b));
    expect(seqA).not.toEqual(seqB);
  });

  it('stays in [0, 1)', () => {
    const rng = createRng(7);
    for (let i = 0; i < 10000; i++) {
      const v = nextFloat(rng);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('nextInt covers the inclusive range', () => {
    const rng = createRng(3);
    const seen = new Set<number>();
    for (let i = 0; i < 1000; i++) seen.add(nextInt(rng, 2, 5));
    expect([...seen].sort()).toEqual([2, 3, 4, 5]);
  });

  it('resumes the same sequence after a JSON round trip', () => {
    const rng = createRng(99);
    nextFloat(rng);
    const copy = JSON.parse(JSON.stringify(rng));
    expect(nextFloat(copy)).toBe(nextFloat(rng));
  });
});
