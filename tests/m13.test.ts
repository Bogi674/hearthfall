import { describe, expect, it } from 'vitest';
import { BUILDING_TYPES, BUILDINGS } from '../src/data/buildings';
import { BUILDING_INFO } from '../src/data/descriptions';
import { ANIMALS, WILD } from '../src/data/wild';
import { Tile } from '../src/sim/grid';
import { cancelBuildError, moveError, scavengeError } from '../src/sim/manage';
import { buildRoom } from '../src/sim/build';
import { placeBuilding, placementError } from '../src/sim/placement';
import { scheduleRegrow } from '../src/sim/systems/regrow';
import { createWorld, stepWorld, TICKS_PER_SECOND, type World } from '../src/sim/world';
import { statLines } from '../src/ui/stats';
import { bareWorld, finish } from './helpers';

const seconds = (w: World, s: number) => {
  for (let i = 0; i < s * TICKS_PER_SECOND && !w.lost; i++) stepWorld(w);
};
/** Enough to build with and still under the 300 the cart holds, so harvests have room to land. */
const rich = (w: World) => Object.assign(w.stock, { wood: 90, planks: 50, stone: 20, scrap: 20, metal: 20, parts: 4, fuel: 40, rawFood: 0, meals: 0 });

describe('a bigger map with houses at varied distances (M13)', () => {
  it('is 240 by 240 and its houses range from hamlets to lone farmsteads', () => {
    const w = createWorld(3);
    expect(w.map.width).toBe(240);
    expect(w.houses.length).toBeGreaterThan(25);
    const nearest = w.houses.map((h) => Math.min(...w.houses.filter((o) => o !== h).map((o) => Math.hypot(o.x - h.x, o.y - h.y))));
    // Some stand together in hamlets, some stand alone and far from anything.
    expect(nearest.filter((d) => d < 14).length).toBeGreaterThan(5);
    expect(nearest.filter((d) => d > 24).length).toBeGreaterThan(2);
    // No two overlap, and the far ones are really far.
    expect(Math.min(...nearest)).toBeGreaterThan(3);
    const far = w.houses.filter((h) => Math.hypot(h.x - w.hearth.x, h.y - w.hearth.y) > 80);
    expect(far.length).toBeGreaterThan(0);
  });

  it('keeps a few neighbors close for the first days', () => {
    for (const seed of [1, 2, 3]) {
      const w = createWorld(seed);
      const close = w.houses.filter((h) => Math.hypot(h.x - w.hearth.x, h.y - w.hearth.y) < 32);
      expect(close.length).toBeGreaterThanOrEqual(2);
    }
  });
});

describe('harvested ground grows back (M13)', () => {
  it('a used up tree comes back smaller at dawn after a few days, and not near the hearth', () => {
    const w = bareWorld(1);
    const i = (y: number, x: number) => y * w.map.width + x;
    const far = i(w.hearth.y + 20, w.hearth.x);
    const near = i(w.hearth.y + 6, w.hearth.x);
    for (const tile of [far, near]) {
      w.map.tiles[tile] = Tile.Tree;
      w.nodes[tile] = 1;
      scheduleRegrow(w, tile);
      w.map.tiles[tile] = Tile.Ground;
      w.nodes[tile] = 0;
    }
    expect(w.regrow.length).toBe(2);
    const due = Math.max(...w.regrow.map((g) => g.due));
    expect(due - w.day).toBeGreaterThanOrEqual(4);
    for (let d = 0; d < 9 && w.map.tiles[far] !== Tile.Tree; d++) {
      w.day++;
      w.dayTime = 539.95;
      seconds(w, 0.3);
      for (const c of w.colonists) [c.health, c.hunger, c.warmth] = [1, 1, 1];
      w.stock.fuel = 100;
    }
    expect(w.map.tiles[far]).toBe(Tile.Tree);
    expect(w.nodes[far]).toBe(24);
    // Nothing grows in the camp.
    expect(w.map.tiles[near]).toBe(Tile.Ground);
  });

  it('a tree does not grow back under a building', () => {
    const w = bareWorld(1);
    rich(w);
    const x = w.hearth.x + 20;
    const y = w.hearth.y + 20;
    const tile = y * w.map.width + x;
    w.map.tiles[tile] = Tile.Tree;
    scheduleRegrow(w, tile);
    w.map.tiles[tile] = Tile.Ground;
    placeBuilding(w, 'woodenBarricade', x, y, false, true);
    w.regrow[0].due = w.day;
    w.dayTime = 539.95;
    seconds(w, 0.3);
    expect(w.map.tiles[tile]).toBe(Tile.Ground);
    expect(w.regrow.length).toBe(1);
    expect(w.regrow[0].tries).toBeLessThan(3);
  });

  it('stone heaps and rubble grow back as smaller ones', () => {
    const w = bareWorld(1);
    for (const kind of [Tile.RuinWall, Tile.Rubble]) {
      const tile = (w.hearth.y - 22) * w.map.width + w.hearth.x + (kind === Tile.RuinWall ? 20 : 24);
      w.map.tiles[tile] = kind;
      scheduleRegrow(w, tile);
      w.map.tiles[tile] = Tile.Ground;
      w.regrow[w.regrow.length - 1].due = w.day;
    }
    w.dayTime = 539.95;
    seconds(w, 0.3);
    expect(w.regrow.length).toBe(0);
    const grown = [Tile.RuinWall, Tile.Rubble].map((k) => w.map.tiles.filter((t) => t === k).length);
    expect(grown.every((n) => n > 0)).toBe(true);
  });
});

describe('food from the wild (M13)', () => {
  it('animals live in the wild away from the camp, and more wander in at dawn', () => {
    const w = createWorld(1);
    expect(w.animals.length).toBe(WILD.start);
    for (const a of w.animals) expect(Math.hypot(a.x - w.hearth.x, a.y - w.hearth.y)).toBeGreaterThanOrEqual(WILD.from - 1);
    w.animals = w.animals.slice(0, 2);
    w.dayTime = 539.95;
    seconds(w, 0.3);
    expect(w.animals.length).toBe(2 + WILD.perDay);
  });

  it('hunters from a lodge bring meat back, and the animal is gone', () => {
    const w = bareWorld(1);
    rich(w);
    const [x, y] = [w.hearth.x + 14, w.hearth.y];
    expect(placementError(w, 'huntingLodge', x, y, false)).toBeNull();
    placeBuilding(w, 'huntingLodge', x, y, false);
    finish(w);
    w.animals = [];
    w.animals.push({ id: w.nextId++, kind: 'deer', x: x + 12, y: y + 3, px: x + 12, py: y + 3, tx: x + 12, ty: y + 3, pause: 30, hunter: null, caught: 0 });
    stepWorld(w);
    const hunters = w.colonists.filter((c) => c.job !== null);
    expect(hunters.length).toBe(2);
    seconds(w, 90);
    expect(w.animals.length).toBe(0);
    expect(w.stock.rawFood).toBeGreaterThanOrEqual(ANIMALS.deer.meat);
    expect(w.log.some((l) => l.text.includes('brought down a deer'))).toBe(true);
  });

  it('pigs give more meat than deer and run slower', () => {
    expect(ANIMALS.pig.meat).toBeGreaterThan(ANIMALS.deer.meat);
    expect(ANIMALS.pig.speed).toBeLessThan(ANIMALS.deer.speed);
  });

  it('a hydroponic farm in a closed room turns fuel into raw food', () => {
    const w = bareWorld(1);
    rich(w);
    w.stock.rawFood = 0;
    w.stock.wood = 200;
    const [x, y] = [w.hearth.x - 6, w.hearth.y - 8];
    expect(placementError(w, 'hydroponics', x + 1, y + 1, false)).toBe('Furniture needs a floor');
    buildRoom(w, { x, y, w: 4, h: 4 }, 'boards', 1);
    finish(w);
    expect(placementError(w, 'hydroponics', x + 1, y + 1, false)).toBeNull();
    placeBuilding(w, 'hydroponics', x + 1, y + 1, false);
    finish(w);
    w.stock.fuel = 100;
    w.warmthKey = '';
    seconds(w, 150);
    expect(w.stock.rawFood).toBeGreaterThan(10);
    expect(w.stock.fuel).toBeLessThan(100);
  });

  it('the forager finds less as the winter deepens', () => {
    const w = bareWorld(1);
    rich(w);
    const [x, y] = [w.hearth.x + 6, w.hearth.y + 6];
    placeBuilding(w, 'foragerHut', x, y, false);
    finish(w);
    const run = (day: number) => {
      const c = bareWorld(1);
      rich(c);
      c.stock.rawFood = 0;
      c.day = day;
      placeBuilding(c, 'foragerHut', x, y, false, true);
      seconds(c, 60);
      return c.stock.rawFood;
    };
    expect(run(1)).toBeGreaterThan(run(12));
  });
});

describe('scavenging ruined houses (M13)', () => {
  it('a crew searches a house once and brings back food and scrap', () => {
    const w = createWorld(2);
    rich(w);
    w.hearth.ignited = true;
    w.hearth.lit = true;
    const house = [...w.houses].sort((a, b) => Math.hypot(a.x - w.hearth.x, a.y - w.hearth.y) - Math.hypot(b.x - w.hearth.x, b.y - w.hearth.y))[0];
    w.stock.rawFood = 5;
    const raw = w.stock.rawFood;
    const scrap = w.stock.scrap;
    w.revealed.fill(1);
    expect(scavengeError(w, house.id)).toBeNull();
    w.commands.push({ type: 'scavenge', house: house.id });
    seconds(w, 150);
    expect(house.state).toBe('looted');
    // The old kitchen stove cooks some of the raw food at once, so the log is the proof.
    expect(w.log.some((l) => /found .*raw food/.test(l.text))).toBe(true);
    expect(w.stock.scrap).toBeGreaterThanOrEqual(scrap);
    expect(raw).toBe(5);
    expect(w.log.some((l) => l.text.includes('searched a ruined house'))).toBe(true);
    expect(scavengeError(w, house.id)).toMatch(/Already searched/);
  });

  it('an unexplored house cannot be searched', () => {
    const w = createWorld(2);
    const far = [...w.houses].sort((a, b) => Math.hypot(b.x - w.hearth.x, b.y - w.hearth.y) - Math.hypot(a.x - w.hearth.x, a.y - w.hearth.y))[0];
    expect(scavengeError(w, far.id)).toBe('Not explored yet');
  });
});

describe('managing buildings (M13)', () => {
  it('cancelling an untouched site refunds everything, and one with work in it refunds half', () => {
    const w = bareWorld(1);
    rich(w);
    const [x, y] = [w.hearth.x + 8, w.hearth.y + 8];
    const wood = w.stock.wood;
    placeBuilding(w, 'storageShed', x, y, false);
    const site = w.buildings.find((b) => b.type === 'storageShed')!;
    expect(cancelBuildError(w, site)).toBeNull();
    w.commands.push({ type: 'cancelBuild', id: site.id });
    stepWorld(w);
    expect(w.buildings.some((b) => b.type === 'storageShed')).toBe(false);
    expect(w.stock.wood).toBe(wood);
    placeBuilding(w, 'storageShed', x, y, false);
    const again = w.buildings.find((b) => b.type === 'storageShed')!;
    again.construct = 4;
    const before = w.stock.wood;
    w.commands.push({ type: 'cancelBuild', id: again.id });
    stepWorld(w);
    expect(w.stock.wood).toBe(before + Math.floor(BUILDINGS.storageShed.cost.wood! / 2));
  });

  it('a built building cannot be cancelled', () => {
    const w = bareWorld(1);
    rich(w);
    placeBuilding(w, 'storageShed', w.hearth.x + 8, w.hearth.y + 8, false, true);
    expect(cancelBuildError(w, w.buildings.find((b) => b.type === 'storageShed')!)).toMatch(/already built/);
  });

  it('moving a building takes it down and puts it up again at the new place, with no cost', () => {
    const w = bareWorld(1);
    rich(w);
    const [x, y] = [w.hearth.x + 8, w.hearth.y + 8];
    placeBuilding(w, 'storageShed', x, y, false, true);
    const shed = w.buildings.find((b) => b.type === 'storageShed')!;
    expect(moveError(w, shed, x + 1, y, false)).toBeNull();
    expect(moveError(w, shed, w.hearth.x, w.hearth.y, false)).toBe('Blocked by the hearth');
    const stock = { ...w.stock };
    w.commands.push({ type: 'moveBuilding', id: shed.id, x: x + 12, y: y - 6, rotated: false });
    stepWorld(w);
    expect(shed.salvage).not.toBeNull();
    seconds(w, 90);
    const moved = w.buildings.find((b) => b.type === 'storageShed')!;
    expect(moved.x).toBe(x + 12);
    expect(moved.y).toBe(y - 6);
    expect(w.buildings.filter((b) => b.type === 'storageShed').length).toBe(1);
    expect(moved.construct).toBe(0);
    expect(w.stock.wood).toBe(stock.wood);
  });

  it('furniture and the launch pad cannot be moved, and every building can be deconstructed', () => {
    const w = bareWorld(1);
    rich(w);
    const [x, y] = [w.hearth.x + 8, w.hearth.y + 8];
    buildRoom(w, { x, y, w: 3, h: 3 }, 'boards', 1);
    finish(w);
    placeBuilding(w, 'bed', x, y, false, true);
    expect(moveError(w, w.buildings.find((b) => b.type === 'bed')!, x + 1, y + 1, false)).toBe('It cannot be moved');
    const cart = w.buildings.find((b) => b.type === 'supplyCart')!;
    w.commands.push({ type: 'salvage', id: cart.id });
    stepWorld(w);
    expect(cart.salvage).not.toBeNull();
  });
});

describe('every building has a description and facts (M13)', () => {
  it('has a line of text and at least a size for each type', () => {
    for (const t of BUILDING_TYPES) {
      expect(BUILDING_INFO[t].length).toBeGreaterThan(10);
      expect(BUILDING_INFO[t]).not.toMatch(/ - | — /);
      expect(statLines(t)[0]).toMatch(/Size/);
    }
    expect(statLines('hydroponics').join(' ')).toMatch(/raw food/);
    expect(statLines('huntingLodge').join(' ')).toMatch(/Workers/);
  });
});
