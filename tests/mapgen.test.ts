import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/data/balance';
import { getTile, Tile } from '../src/sim/grid';
import { generateMap } from '../src/sim/mapgen';
import { createRng } from '../src/sim/rng';

describe('mapgen', () => {
  it('is deterministic for a seed', () => {
    expect(generateMap(createRng(11))).toEqual(generateMap(createRng(11)));
  });

  it('differs between seeds', () => {
    expect(generateMap(createRng(1)).map.tiles).not.toEqual(generateMap(createRng(2)).map.tiles);
  });

  it('builds an 80 by 80 map with the hearth in the center', () => {
    const { map, hearth } = generateMap(createRng(3));
    expect(map.tiles.length).toBe(80 * 80);
    expect(hearth).toEqual({ x: 40, y: 40 });
  });

  it('keeps a clear ground circle around the hearth', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const { map, hearth } = generateMap(createRng(seed));
      const r = BALANCE.map.clearingRadius;
      for (let y = hearth.y - r; y <= hearth.y + r; y++) {
        for (let x = hearth.x - r; x <= hearth.x + r; x++) {
          if (Math.hypot(x - hearth.x, y - hearth.y) <= r) expect(getTile(map, x, y)).toBe(Tile.Ground);
        }
      }
    }
  });

  it('contains roads, trees, rubble, ruins, and water', () => {
    const { map } = generateMap(createRng(9));
    for (const t of [Tile.Ground, Tile.Road, Tile.Tree, Tile.Rubble, Tile.RuinWall, Tile.Water]) {
      expect(map.tiles.includes(t), `tile ${t}`).toBe(true);
    }
  });
});
