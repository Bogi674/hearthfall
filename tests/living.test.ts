import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/data/balance';
import { placeBuilding } from '../src/sim/placement';
import { currentPhase } from '../src/sim/query';
import { createWorld, stepWorld, TICKS_PER_SECOND, type World } from '../src/sim/world';
import { finish } from './helpers';

const seconds = (w: World, s: number) => {
  for (let i = 0; i < s * TICKS_PER_SECOND && !w.lost; i++) stepWorld(w);
};
const at = (w: World, t: number) => {
  w.dayTime = t;
};

/**
 * A 3 by 3 hall east of the house at stage 5, closed by walls with a door into the house.
 * Floors cover x from hearth.x + 2 to + 4 and y from hearth.y - 1 to + 1.
 */
function hall(w: World) {
  w.hearth.level = 5;
  Object.assign(w.stock, { wood: 500, scrap: 200, planks: 100, stone: 100, rawFood: 100, meals: 100, fuel: 500 });
  const { x, y } = w.hearth;
  const cmd = (c: World['commands'][number]) => w.commands.push(c);
  for (let dx = 2; dx <= 4; dx++) for (let dy = -1; dy <= 1; dy++) cmd({ type: 'paintFloor', x: x + dx, y: y + dy, kind: 'boards' });
  stepWorld(w);
  cmd({ type: 'buildEdge', x: x + 2, y, side: 'w', kind: 'door', level: 1 });
  for (let dx = 2; dx <= 4; dx++) {
    cmd({ type: 'buildEdge', x: x + dx, y: y - 1, side: 'n', kind: 'wall', level: 1 });
    cmd({ type: 'buildEdge', x: x + dx, y: y + 2, side: 'n', kind: 'wall', level: 1 });
  }
  for (let dy = -1; dy <= 1; dy++) cmd({ type: 'buildEdge', x: x + 5, y: y + dy, side: 'w', kind: 'wall', level: 1 });
  stepWorld(w);
  finish(w);
  return { x, y };
}

describe('living in the house (section 5.7)', () => {
  it('colonists with no bed sleep on mats by the hearth, resting at half speed', () => {
    const w = createWorld(1);
    for (const c of w.colonists) c.rest = 0.2;
    at(w, 360);
    seconds(w, 40);
    const sleepers = w.colonists.filter((c) => c.asleep);
    expect(sleepers.length).toBe(w.colonists.length);
    for (const c of sleepers) expect(Math.max(Math.abs(c.x - w.hearth.x), Math.abs(c.y - w.hearth.y))).toBeLessThanOrEqual(1.1);
    const gain = sleepers[0].rest - 0.2;
    expect(gain).toBeGreaterThan(0);
    // A bed in the open fills 200 seconds, a mat takes twice as long.
    expect(gain).toBeLessThan((40 / BALANCE.needs.sleepFillSeconds) * 0.9);
  });

  it('mat sleepers cost hope at dawn, up to a limit', () => {
    const w = createWorld(1);
    w.hope = 50;
    at(w, 360);
    seconds(w, 20);
    expect(w.colonists.every((c) => c.asleep)).toBe(true);
    at(w, 539.95);
    seconds(w, 0.3);
    expect(currentPhase(w).name).toBe('Dawn');
    // Eight mat sleepers hit the limit. The fed dawn bonus is added on top.
    expect(w.hope).toBeCloseTo(50 + BALANCE.hope.fedDawn + BALANCE.hope.matMax, 5);
  });

  it('at dusk colonists walk into the house, sit at tables and sofas, and sitting lifts hope at dawn', () => {
    const w = createWorld(1);
    const { x, y } = hall(w);
    expect(placeBuilding(w, 'table', x + 3, y - 1, false)).toBe(true);
    expect(placeBuilding(w, 'sofa', x + 3, y, false)).toBe(true);
    expect(placeBuilding(w, 'sofa', x + 3, y + 1, false)).toBe(true);
    expect(placeBuilding(w, 'bed', x + 2, y - 1, false)).toBe(true);
    finish(w);
    w.hope = 40;
    at(w, 300);
    seconds(w, 35);
    const seated = w.colonists.filter((c) => c.task === 'eat' || c.task === 'mingle');
    expect(seated.length).toBe(6);
    expect(seated.filter((c) => c.task === 'eat').length).toBe(2);
    // Each seated colonist stands on the floor of the closed hall.
    for (const c of seated) expect(Math.round(c.x)).toBeGreaterThanOrEqual(x + 3);
    seconds(w, 25 + 180 + 5);
    expect(w.socialSeconds).toBe(0);
    expect(currentPhase(w).name).toBe('Dawn');
    expect(w.hope).toBeGreaterThan(40);
  });

  it('the evening bonus has a cap that lamps and plants lift', () => {
    const run = (decor: number) => {
      const w = createWorld(1);
      const { x, y } = hall(w);
      const spots: [string, number, number][] = [['lamp', x + 2, y - 1], ['plant', x + 3, y - 1], ['plant', x + 4, y - 1], ['lamp', x + 2, y + 1]];
      for (const [type, sx, sy] of spots.slice(0, decor)) expect(placeBuilding(w, type as 'lamp' | 'plant', sx, sy, false)).toBe(true);
      finish(w);
      w.hope = 20;
      for (const c of w.colonists) [c.hunger, c.rest] = [1, 1];
      at(w, 539.95);
      w.socialSeconds = 100000;
      seconds(w, 0.3);
      expect(currentPhase(w).name).toBe('Dawn');
      return w.hope;
    };
    const plain = run(0);
    expect(run(2) - plain).toBeCloseTo(2 * BALANCE.hope.decorBonus, 5);
    // Four decor pieces reach the limit.
    expect(run(4) - plain).toBeCloseTo(BALANCE.hope.decorMax, 5);
    // Without decor the evening gives mingleMax.
    const bare = createWorld(1);
    bare.hope = 20;
    for (const c of bare.colonists) c.hunger = 1;
    at(bare, 539.95);
    bare.socialSeconds = 100000;
    seconds(bare, 0.3);
    expect(plain).toBeGreaterThanOrEqual(bare.hope - 0.001);
    expect(plain - 20).toBeGreaterThanOrEqual(BALANCE.hope.mingleMax - 0.001);
  });

  it('with a table in the house, colonists eat at it in the evening and not before they are very hungry', () => {
    const w = createWorld(1);
    const { x, y } = hall(w);
    placeBuilding(w, 'table', x + 3, y - 1, false);
    finish(w);
    const [a, b] = w.colonists;
    a.hunger = 0.4;
    b.hunger = 0.2;
    const meals = w.stock.meals;
    seconds(w, 3);
    // By day the hungry one eats anywhere, the other waits for the table.
    expect(b.hunger).toBeGreaterThan(0.6);
    expect(a.hunger).toBeLessThan(0.4);
    expect(w.stock.meals).toBe(meals - 1);
    at(w, 300);
    seconds(w, 30);
    expect(a.hunger).toBeGreaterThan(0.6);
  });
});

describe('crew size and drifters (section 6.6)', () => {
  const dusk = (w: World) => {
    w.dayTime = 299.95;
    w.day = 3;
    seconds(w, 0.3);
  };
  const tents = (w: World, n: number) => {
    w.buildings.push(...Array.from({ length: n }, (_, i) => ({ ...w.buildings[0], id: 900 + i, type: 'tent' as const, construct: 0 })));
    w.buildRev++;
  };

  it('the colony starts small and a drifter walks in on the dusk of day 3 when there is a bed and hope', () => {
    const w = createWorld(1);
    expect(w.colonists.length).toBe(BALANCE.start.colonists);
    expect(BALANCE.start.colonists).toBe(7);
    tents(w, 2);
    dusk(w);
    expect(w.drifter).not.toBeNull();
    expect(w.log.some((l) => l.text.includes('walking toward the light'))).toBe(true);
    seconds(w, 40);
    expect(w.drifter).toBeNull();
    expect(w.colonists.length).toBe(BALANCE.start.colonists + 1);
    expect(w.log.some((l) => l.text.includes('joins the colony'))).toBe(true);
  });

  it('no drifter comes without a free bed, with low hope, or at the crew limit', () => {
    const noBed = createWorld(1);
    dusk(noBed);
    expect(noBed.drifter).toBeNull();
    const sad = createWorld(1);
    tents(sad, 2);
    sad.hope = 40;
    dusk(sad);
    expect(sad.drifter).toBeNull();
    const full = createWorld(1);
    tents(full, 6);
    while (full.colonists.length < 20) full.colonists.push({ ...full.colonists[0], id: full.nextId++, name: `Extra ${full.colonists.length}` });
    dusk(full);
    expect(full.drifter).toBeNull();
    const day4 = createWorld(1);
    tents(day4, 2);
    day4.dayTime = 299.95;
    day4.day = 4;
    seconds(day4, 0.3);
    expect(day4.drifter).toBeNull();
  });
});
