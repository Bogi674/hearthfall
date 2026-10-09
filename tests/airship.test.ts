import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/data/balance';
import { BUILDINGS } from '../src/data/buildings';
import { COMPONENT_IDS, LAST_NIGHT } from '../src/data/vehicle';
import { berthError, componentError, launchError } from '../src/sim/commands';
import { padError, placeBuilding, placementError } from '../src/sim/placement';
import { currentPhase } from '../src/sim/query';
import { createWorld, stepWorld, type World } from '../src/sim/world';
import { launchFuelNeeded, seatCount } from '../src/sim/query';
import { build, closedRoom, finish, findSpot } from './helpers';

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
  w.airship.blueprint = true;
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
    seconds(w, 0.1);
    finish(w);
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
    expect(componentError(w, 'frame')).toBe('Build a Drafting Table or the Launch Pad first');
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
    w.stock.fuel = launchFuelNeeded(w);
    expect(launchError(w)).toBe('Build every component first');
    w.airship.built.push(COMPONENT_IDS[COMPONENT_IDS.length - 1]);
    w.stock.fuel = LAST_NIGHT.fuel;
    expect(launchError(w)).toMatch('Gather fuel first');
    w.stock.fuel = launchFuelNeeded(w);
    expect(launchError(w)).toBeNull();
  });

  it('loading fuel leaves enough in the stockpile to keep the hearth burning', () => {
    const w = readyColony();
    w.stock.fuel = launchFuelNeeded(w);
    w.commands.push({ type: 'launch' });
    seconds(w, 1);
    // A burst of use drains the stockpile after the launch begins.
    w.stock.fuel = 205;
    seconds(w, 149, () => {
      w.enemies.length = 0;
    });
    const reserve = (BALANCE.hearth.levels[w.hearth.level - 1].fuelPerMinute / 60) * LAST_NIGHT.hearthReserveSeconds;
    // The airship takes only what is above the reserve, so the hearth never starves and the launch waits for more fuel.
    expect(w.airship.launch!.fuel).toBeLessThan(LAST_NIGHT.fuel);
    expect(w.stock.fuel).toBeGreaterThan(reserve - 3);
    expect(w.hearth.lit).toBe(true);
    expect(w.lost).toBeNull();
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


describe('the blueprint, the launch pad, and the crew (section 11.2)', () => {
  const dawn = (w: World) => {
    w.dayTime = 539.95;
    seconds(w, 0.3);
  };

  it('the blueprint turns up at dawn once the house is at stage 3 and hope is up', () => {
    const w = createWorld(1);
    expect(w.airship.blueprint).toBe(false);
    expect(componentError(w, 'frame')).toBe("Needs the old owner's blueprint");
    w.hearth.level = 2;
    w.hope = 90;
    dawn(w);
    expect(w.airship.blueprint).toBe(false);
    const w2 = createWorld(1);
    w2.hearth.level = 3;
    w2.hope = 40;
    dawn(w2);
    expect(w2.airship.blueprint).toBe(false);
    const w3 = createWorld(1);
    w3.hearth.level = 3;
    w3.hope = 60;
    dawn(w3);
    expect(w3.airship.blueprint).toBe(true);
    expect(w3.log.some((l) => l.text.includes('blueprints'))).toBe(true);
  });

  /** The nearest top left tile where the pad is allowed, found with the blueprint and plenty of stock. */
  const openSpot = (w: World, minDist = 0): { x: number; y: number } => {
    const had = w.airship.blueprint;
    w.airship.blueprint = true;
    const stock = { ...w.stock };
    fill(w, { planks: 500, metal: 500, parts: 100 });
    let best: { x: number; y: number; d: number } | null = null;
    for (let y = w.hearth.y - 20; y <= w.hearth.y + 20; y++) {
      for (let x = w.hearth.x - 20; x <= w.hearth.x + 20; x++) {
        const d = Math.hypot(x + 2.5 - w.hearth.x, y + 2.5 - w.hearth.y);
        if (d >= minDist && (!best || d < best.d) && !placementError(w, 'airshipDock', x, y, false)) best = { x, y, d };
      }
    }
    w.airship.blueprint = had;
    Object.assign(w.stock, stock);
    if (!best) throw new Error('no open ground');
    return best;
  };

  it('the pad needs the blueprint, ground near the house, and a clear ring around it', () => {
    const w = createWorld(1);
    fill(w, { planks: 200, metal: 200, parts: 50, wood: 200 });
    const { x, y } = w.hearth;
    const pad = openSpot(w);
    expect(placementError(w, 'airshipDock', pad.x, pad.y, false)).toMatch(/blueprint/);
    w.airship.blueprint = true;
    expect(placementError(w, 'airshipDock', pad.x, pad.y, false)).toBeNull();
    expect(padError(w, x + 30, y, 6, 6)).toMatch(/Too far from the house/);
    // A storage shed one tile from the deck is in the ring, so the pad is refused until it is cleared.
    fill(w, { wood: 200 });
    // The shed goes on whatever open ground is next to the pad, whichever side it is on.
    const side = [[6, 0], [-2, 0], [0, 6], [0, -2]].map(([dx, dy]) => ({ x: pad.x + dx, y: pad.y + dy })).find((p) => !placementError(w, 'storageShed', p.x, p.y, false))!;
    expect(placeBuilding(w, 'storageShed', side.x, side.y, false)).toBe(true);
    expect(placementError(w, 'airshipDock', pad.x, pad.y, false)).toMatch(/Clear the ground around the pad first. 1 building is in the way/);
    // A house floor in the ring also refuses it.
    const w2 = createWorld(1);
    fill(w2, { planks: 200, metal: 200, parts: 50, wood: 200 });
    w2.airship.blueprint = true;
    w2.hearth.level = 5;
    const pad2 = openSpot(w2);
    w2.hearth.level = 5;
    w2.house.floors.push({ id: 900, x: pad2.x - 1, y: pad2.y + 2, kind: 'boards', construct: 0 });
    w2.buildRev++;
    expect(placementError(w2, 'airshipDock', pad2.x, pad2.y, false)).toMatch(/House floors are in the way/);
  });

  it('clearing the area marks buildings, and colonists salvage them for most of their cost', () => {
    const w = createWorld(1);
    fill(w, { wood: 100 });
    const spot = findSpot(w, 'storageShed', 10, 0)!;
    placeBuilding(w, 'storageShed', spot.x, spot.y, false);
    finish(w);
    const shed = w.buildings.find((b) => b.type === 'storageShed')!;
    w.commands.push({ type: 'clearArea', x: spot.x - 2, y: spot.y - 2, w: 6, h: 6 });
    stepWorld(w);
    expect(shed.salvage).not.toBeNull();
    // The cart is never marked.
    expect(w.buildings.find((b) => b.type === 'supplyCart')!.salvage).toBeNull();
    const wood = w.stock.wood;
    seconds(w, 40);
    expect(w.buildings.includes(shed)).toBe(false);
    expect(w.stock.wood).toBe(wood + Math.floor(BUILDINGS.storageShed.cost.wood! * 0.75));
  });

  it('a Drafting Table in the house builds components with no pad yet', () => {
    const w = createWorld(1);
    w.airship.blueprint = true;
    fill(w, { planks: 300, metal: 100, parts: 40, wood: 100, meals: 200 });
    closedRoom(w);
    expect(placeBuilding(w, 'draftingTable', w.hearth.x + 2, w.hearth.y, true)).toBe(true);
    finish(w);
    expect(componentError(w, 'frame')).toBeNull();
    w.commands.push({ type: 'buildComponent', component: 'frame' });
    seconds(w, 200);
    expect(w.airship.built).toContain('frame');
    expect(launchError(w)).toBe('Build the Launch Pad first');
  });

  it('seats limit who flies, and a berth deck adds four more', () => {
    const w = rich();
    fill(w, { planks: 300, metal: 100, parts: 60, meals: 400, fuel: 400 });
    expect(seatCount(w)).toBe(0);
    w.airship.built.push('frame');
    expect(seatCount(w)).toBe(8);
    expect(berthError(w)).toMatch(/Build a Drafting Table or the Launch Pad first/);
    build(w, 'airshipDock');
    expect(berthError(w)).toBeNull();
    w.commands.push({ type: 'buildBerth' });
    seconds(w, 120);
    expect(w.airship.berths).toBe(1);
    expect(seatCount(w)).toBe(12);
    w.airship.berths = 3;
    expect(berthError(w)).toBe('Every berth is built');
    expect(seatCount(w)).toBe(20);
    w.airship.berths = 0;
    // Ten colonists, eight seats. Two are left behind.
    const dock = w.buildings.find((b) => b.type === 'airshipDock')!;
    while (w.colonists.length < 10) w.colonists.push({ ...w.colonists[0], id: w.nextId++, name: `Extra ${w.colonists.length}` });
    w.airship.built.push(...COMPONENT_IDS.filter((id) => id !== 'frame'));
    w.hearth.hp = 1e9;
    w.commands.push({ type: 'launch' });
    seconds(w, LAST_NIGHT.seconds + 5, () => {
      for (const c of w.colonists) [c.health, c.hunger, c.warmth] = [1, 1, 1];
      for (const b of w.buildings) b.hp = 1e9;
      w.enemies.length = 0;
    });
    expect(dock).toBeDefined();
    expect(w.won).not.toBeNull();
    expect(w.won!.aboard.length).toBe(8);
    expect(w.won!.leftBehind.length).toBe(2);
  });
});
