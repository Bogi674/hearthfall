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

  it('builds a 240 by 240 map with the hearth in the center', () => {
    const { map, hearth } = generateMap(createRng(3));
    expect(map.tiles.length).toBe(240 * 240);
    expect(hearth).toEqual({ x: 120, y: 120 });
  });

  it('keeps a clear circle around the hearth, with no trees, walls, or water, only rubble from the old house', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const { map, hearth } = generateMap(createRng(seed));
      const r = BALANCE.map.clearingRadius;
      for (let y = hearth.y - r; y <= hearth.y + r; y++) {
        for (let x = hearth.x - r; x <= hearth.x + r; x++) {
          if (Math.hypot(x - hearth.x, y - hearth.y) <= r) expect([Tile.Ground, Tile.Rubble, Tile.Road]).toContain(getTile(map, x, y));
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

describe('the paddock (section 4)', () => {
  it('every map has an open square beside the house for the launch pad', () => {
    const { size, distance } = BALANCE.map.yard;
    for (let seed = 1; seed <= 30; seed++) {
      const { map, hearth } = generateMap(createRng(seed));
      let found = false;
      for (let a = 0; a < 8 && !found; a++) {
        const cx = Math.round(hearth.x + Math.cos((a * Math.PI) / 4) * distance);
        const cy = Math.round(hearth.y + Math.sin((a * Math.PI) / 4) * distance);
        const half = Math.floor(size / 2);
        found = Array.from({ length: size * size }, (_, i) => getTile(map, cx - half + (i % size), cy - half + Math.floor(i / size))).every((t) => t === Tile.Ground);
      }
      expect(found).toBe(true);
    }
  });
});
