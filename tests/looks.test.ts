import { describe, expect, it } from 'vitest';
import { lookFor, MEN, WOMEN } from '../src/data/looks';

describe('colonist looks', () => {
  it('has ten different designs each for women and men', () => {
    for (const list of [WOMEN, MEN]) {
      expect(list.length).toBe(10);
      expect(new Set(list.map((l) => JSON.stringify(l))).size).toBe(10);
    }
  });

  it('gives the first ten women and the first ten men every design once', () => {
    for (const seed of [1, 7]) {
      const women = Array.from({ length: 10 }, (_, k) => lookFor(seed, k * 2));
      const men = Array.from({ length: 10 }, (_, k) => lookFor(seed, k * 2 + 1));
      expect(new Set(women)).toEqual(new Set(WOMEN));
      expect(new Set(men)).toEqual(new Set(MEN));
    }
  });
});
