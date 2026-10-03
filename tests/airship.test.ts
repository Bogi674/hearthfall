import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/data/balance';
import { COMPONENT_IDS, LAST_NIGHT } from '../src/data/vehicle';
import { componentError, launchError } from '../src/sim/commands';
import { placementError } from '../src/sim/placement';
import { currentPhase } from '../src/sim/query';
import { createWorld, stepWorld, type World } from '../src/sim/world';
import { build } from './helpers';

const seconds = (w: World, s: number, each?: () => void) => {
  for (let i = 0; i < s * 10 && !w.lost && !w.won; i++) {
    each?.();
    stepWorld(w);
  }
};
const rich = (seed = 1) => {
  const w = createWorld(seed);
  Object.assign(w.stock, { wood: 0, scrap: 0, rawFood: 0, planks: 0, fuel: 60, meals: 0, metal: 0, parts: 0 });
  build(w, 'storageShed');
  return w;
};
const fill = (w: World, amounts: Partial<World['stock']>) => Object.assign(w.stock, amounts);

describe('M5 production', () => {
  it('a smelter turns scrap and fuel into metal, and a workshop turns planks and metal into parts', () => {
    const w = rich();
    fill(w, { planks: 80, stone: 20, metal: 30 });
    expect(build(w, 'smelter')).toBe(true);
    expect(build(w, 'workshop')).toBe(true);
    fill(w, { scrap: 40, fuel: 60, planks: 20, metal: 0, meals: 50 });
    seconds(w, 120);
    expect(w.stock.parts).toBeGreaterThan(0);
    expect(w.stock.scrap).toBeLessThan(40);
  });

  it('a heater warms a cold spot while it has fuel', () => {
    const w = rich();
    fill(w, { metal: 10, parts: 5, fuel: 30 });
    const y = w.hearth.y;
    let x = w.hearth.x + 14;
    while (placementError(w, 'heater', x, y, false)) x++;
    const i = y * w.map.width + x;
    const cold = w.warmth[i];
    expect(placementError(w, 'heater', x, y, false)).toBeNull();
    w.commands.push({ type: 'place', building: 'heater', x, y, rotated: false });
    seconds(w, 1);
    expect(w.warmth[i]).toBeGreaterThanOrEqual(BALANCE.warmth.warmThreshold);
    w.stock.fuel = 0;
    seconds(w, 1);
    expect(w.warmth[i]).toBe(cold);
    expect(w.buildings.find((b) => b.type === 'heater')!.status).toBe('noFuel');
  });
});

describe('airship', () => {
  it('needs a dock, the Frame first, the rare item, and materials', () => {
    const w = rich();
    expect(componentError(w, 'frame')).toBe('Build an Airship Dock first');
    fill(w, { planks: 100, metal: 80, parts: 20 });
    expect(build(w, 'airshipDock')).toBe(true);
    expect(componentError(w, 'envelope')).toBe('Needs the Frame');
    expect(componentError(w, 'frame')).toBe('Not enough planks');
    w.airship.built.push('frame');
    expect(componentError(w, 'envelope')).toBe('Needs the Silk Canopy');
    w.items.silkCanopy = 1;
    fill(w, { planks: 80, parts: 20 });
    expect(componentError(w, 'envelope')).toBeNull();
  });

  it('dock workers build a component and the Envelope raises hope by 10', () => {
    const w = rich();
    fill(w, { planks: 180, metal: 80, parts: 40, meals: 100, fuel: 100 });
    build(w, 'airshipDock');
    w.airship.built.push('frame');
    w.items.silkCanopy = 1;
    const hope = w.hope;
    w.commands.push({ type: 'buildComponent', component: 'envelope' });
    seconds(w, 200);
    expect(w.airship.built).toContain('envelope');
    expect(w.hope).toBeGreaterThanOrEqual(hope + 10);
  });
});

describe('hope', () => {
  it('falls with a death and makes a colonist desert at zero', () => {
    const w = rich();
    const start = w.hope;
    w.colonists[0].health = -1;
    w.colonists[0].hunger = 0;
    seconds(w, 0.1);
    expect(w.hope).toBe(start + BALANCE.hope.death);
    w.hope = 0;
    const before = w.colonists.length;
    while (currentPhase(w).name !== 'Dawn' && !w.lost) stepWorld(w);
    stepWorld(w);
    expect(w.lost).toBeNull();
    expect(w.colonists.length).toBe(before - 1);
    expect(w.dead.some((d) => d.cause === 'deserted the colony')).toBe(true);
  });
});

describe('The Last Night', () => {
  function readyColony(): World {
    const w = rich();
    fill(w, { planks: 100, metal: 80, parts: 20, meals: 200 });
    build(w, 'airshipDock');
    w.airship.built.push(...COMPONENT_IDS);
    w.hearth.hp = 1e9;
    return w;
  }

  it('needs every component and some fuel', () => {
    const w = readyColony();
    w.stock.fuel = 10;
    expect(launchError(w)).toMatch('Gather fuel first');
    w.airship.built.pop();
    w.stock.fuel = 200;
    expect(launchError(w)).toBe('Build every component first');
  });

  it('brings the final horde with the Horde Mother, loads fuel, boards, and launches', () => {
    const w = readyColony();
    w.stock.fuel = 250;
    const away = w.colonists[0];
    away.expedition = 999;
    w.commands.push({ type: 'launch' });
    seconds(w, 1);
    expect(currentPhase(w).name).toBe('Night');
    expect(w.wave.final).toBe(true);
    expect(w.wave.plan[0]).toBe('hordeMother');
    let sawBrood = false;
    seconds(w, LAST_NIGHT.seconds + 5, () => {
      w.colonists = w.colonists.filter((c) => c === away || c.health > 0);
      for (const c of w.colonists) c.health = 1;
      if (w.enemies.filter((e) => e.type === 'shambler').length > 0 && w.enemies.some((e) => e.type === 'hordeMother')) sawBrood = true;
      for (const b of w.buildings) b.hp = 1e9;
    });
    expect(sawBrood).toBe(true);
    expect(w.won).not.toBeNull();
    expect(w.won!.leftBehind).toContain(away.name);
    expect(w.won!.aboard.length).toBe(w.colonists.length - 1);
    expect(w.won!.score).toBeGreaterThan(0);
  });
});
