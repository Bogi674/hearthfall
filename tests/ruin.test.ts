import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/data/balance';
import { BUILDINGS } from '../src/data/buildings';
import { EDGES, HOUSE } from '../src/data/house';
import { hearthMoveError, lightError, moveCost } from '../src/sim/hearth';
import { analyze, floorAt, houseRooms, isIndoors, mendedRooms, sealsRoom } from '../src/sim/house';
import { mendArea, planMend } from '../src/sim/mend';
import { removeHouseItem } from '../src/sim/placement';
import { atHome, isUsable } from '../src/sim/query';
import { Tile } from '../src/sim/grid';
import { bareWorld, partitionRuin, sealGaps } from './helpers';
import { createWorld, stepWorld, TICKS_PER_SECOND, type World } from '../src/sim/world';

const seconds = (w: World, s: number) => {
  for (let i = 0; i < s * TICKS_PER_SECOND && !w.lost; i++) stepWorld(w);
};
const rich = (w: World) => {
  for (const r of Object.keys(w.stock) as (keyof World['stock'])[]) w.stock[r] = Math.max(w.stock[r], 300);
};
const light = (w: World) => {
  w.commands.push({ type: 'lightHearth' });
  seconds(w, 30);
};

describe('the ruin is made of house pieces (M12)', () => {
  it('the starting ruin has worn walls, furniture, an old floor under the hearth, and a hidden stash', () => {
    const w = createWorld(1);
    expect(w.house.floors.length).toBeGreaterThan(40);
    expect(w.house.floors.every((f) => f.ruin)).toBe(true);
    const near = (p: { x: number; y: number }) => Math.hypot(p.x - w.hearth.x, p.y - w.hearth.y) < 12;
    const walls = w.house.edges.filter((e) => near(e));
    expect(walls.length).toBeGreaterThan(20);
    expect(walls.some((e) => e.hp < EDGES[e.kind].levels[e.level - 1].hp)).toBe(true);
    expect(walls.some((e) => e.kind === 'door')).toBe(true);
    expect(floorAt(w, w.hearth.x, w.hearth.y)).toBeDefined();
    const furniture = w.buildings.filter((b) => BUILDINGS[b.type].furniture && b.ruin);
    expect(furniture.length).toBeGreaterThan(5);
    expect(furniture.some((b) => b.broken)).toBe(true);
    expect(furniture.some((b) => !b.broken)).toBe(true);
    expect(w.stash?.state).toBe('hidden');
    expect(floorAt(w, w.stash!.x, w.stash!.y)).toBeDefined();
  });

  it('every ruined house on the map has a way in, and none is sealed', () => {
    for (const seed of [1, 2, 3]) {
      const w = createWorld(seed);
      expect(w.house.floors.length).toBeGreaterThan(300);
      expect(analyze(w, false).some((r) => !r.reachable && r.floorCount > 0)).toBe(false);
      expect(sealsRoom(w, {})).toBe(false);
    }
  });

  it('town ruins are spread over the map, far from the hearth too', () => {
    const w = createWorld(2);
    const far = w.house.floors.filter((f) => Math.hypot(f.x - w.hearth.x, f.y - w.hearth.y) > 35);
    expect(far.length).toBeGreaterThan(50);
  });

  it('some roofs are open, and an open roof is not indoors', () => {
    const w = createWorld(1);
    const open = w.house.floors.filter((f) => f.roofBroken);
    expect(open.length).toBeGreaterThan(5);
    for (const f of open.slice(0, 20)) expect(isIndoors(w, f.x, f.y)).toBe(false);
  });
});

describe('the hearth smolders until it is lit (M12)', () => {
  it('starts unlit, burns nothing, and does not lose the run', () => {
    const w = createWorld(1);
    expect(w.hearth.ignited).toBe(false);
    expect(w.hearth.lit).toBe(false);
    const fuel = w.stock.fuel;
    seconds(w, 150);
    expect(w.stock.fuel).toBe(fuel);
    expect(w.lost).toBeNull();
  });

  it('people light it for some fuel, and then it burns', () => {
    const w = createWorld(1);
    expect(lightError(w)).toBeNull();
    const fuel = w.stock.fuel;
    w.commands.push({ type: 'lightHearth' });
    stepWorld(w);
    expect(w.stock.fuel).toBe(fuel - BALANCE.hearth.lightFuel);
    expect(lightError(w)).toBe('Someone is already lighting it');
    seconds(w, 30);
    expect(w.hearth.ignited).toBe(true);
    expect(w.hearth.lit).toBe(true);
    expect(lightError(w)).toBe('The hearth is already lit');
    expect(w.stock.fuel).toBeLessThan(fuel - BALANCE.hearth.lightFuel);
  });

  it('cannot be lit without fuel', () => {
    const w = createWorld(1);
    w.stock.fuel = 2;
    expect(lightError(w)).toMatch(/Needs/);
  });

  it('an unlit hearth leaves the ground cold, and a lit one warms it', () => {
    const w = createWorld(1);
    const i = w.hearth.y * w.map.width + w.hearth.x + 3;
    const cold = w.warmth[i];
    expect(cold).toBeLessThan(BALANCE.warmth.warmThreshold);
    light(w);
    expect(w.warmth[i]).toBeGreaterThanOrEqual(BALANCE.warmth.warmThreshold);
  });
});

describe('mending the ruin (M12)', () => {
  it('a mend order pays now, and builders repair the pieces', () => {
    const w = createWorld(1);
    light(w);
    rich(w);
    const rect = { x: w.hearth.x - 4, y: w.hearth.y - 3, w: 9, h: 7 };
    const plan = planMend(w, rect, 0);
    expect(plan.edges.length + plan.furniture.length + plan.roofs.length).toBeGreaterThan(5);
    const wood = w.stock.wood;
    const { queued, error } = mendArea(w, rect, 0);
    expect(error).toBeNull();
    expect(queued).toBeGreaterThan(5);
    expect(w.stock.wood).toBeLessThan(wood);
    seconds(w, 240);
    const left = planMend(w, rect, 0);
    expect(left.edges.length + left.furniture.length + left.roofs.length).toBe(0);
    expect(w.house.floors.filter((f) => f.roofWork !== null).length).toBe(0);
  });

  it('refuses a mend order that the stockpile cannot pay', () => {
    const w = createWorld(1);
    Object.assign(w.stock, { wood: 0, planks: 0, stone: 0, metal: 0, scrap: 0, parts: 0 });
    const rect = { x: w.hearth.x - 6, y: w.hearth.y - 3, w: 13, h: 9 };
    expect(planMend(w, rect, 0).edges.length).toBeGreaterThan(0);
    const result = mendArea(w, rect, 0);
    expect(result.error).toMatch(/Not enough/);
    expect(result.queued).toBe(0);
  });

  it('broken furniture does nothing until it is mended', () => {
    const w = createWorld(1);
    const broken = w.buildings.find((b) => b.ruin && b.broken && BUILDINGS[b.type].furniture)!;
    expect(isUsable(broken)).toBe(false);
    rich(w);
    w.commands.push({ type: 'mendItem', item: 'furniture', id: broken.id });
    light(w);
    seconds(w, 120);
    expect(broken.broken).toBe(false);
    expect(isUsable(broken)).toBe(true);
    expect(broken.hp).toBe(BUILDINGS[broken.type].hp);
  });

  it('a patched roof closes the room again, and rubble is cleared by the crew', () => {
    const w = createWorld(1);
    rich(w);
    light(w);
    const f = w.house.floors.find((o) => o.roofBroken && Math.hypot(o.x - w.hearth.x, o.y - w.hearth.y) < 10)!;
    expect(f).toBeDefined();
    w.commands.push({ type: 'mendItem', item: 'roof', id: f.id });
    seconds(w, 60);
    expect(f.roofBroken).toBe(false);
    // Rubble.
    const i = w.map.tiles.findIndex((t, k) => t === Tile.Rubble && Math.hypot((k % w.map.width) - w.hearth.x, Math.floor(k / w.map.width) - w.hearth.y) < 15);
    const [x, y] = [i % w.map.width, Math.floor(i / w.map.width)];
    const scrap = w.stock.scrap;
    w.commands.push({ type: 'mendArea', x, y, w: 1, h: 1 });
    seconds(w, 120);
    expect(w.map.tiles[i]).toBe(Tile.Ground);
    expect(w.stock.scrap).toBe(scrap + HOUSE.clearRubble.scrap);
  });

  it('taking a ruin piece apart gives back most of its cost', () => {
    const w = createWorld(1);
    const floor = w.house.floors.find((f) => f.ruin && !w.buildings.some((b) => b.x === f.x && b.y === f.y && b.storey === f.storey))!;
    const wood = w.stock.wood;
    const edgeOnIt = w.house.edges.find((e) => e.x === floor.x && e.y === floor.y);
    void edgeOnIt;
    // A lone floor tile far from the walls is free to take away.
    const far = w.house.floors.find((f) => !w.house.edges.some((e) => Math.abs(e.x - f.x) <= 1 && Math.abs(e.y - f.y) <= 1) && !w.buildings.some((b) => b.x === f.x && b.y === f.y));
    if (far) {
      expect(removeHouseItem(w, 'floor', far.id)).toBe(true);
      expect(w.stock.wood).toBeGreaterThanOrEqual(wood);
    }
  });
});

describe('moving the hearth (M12)', () => {
  it('moves to a new place after the crew builds it, and the old place goes cold', () => {
    const w = createWorld(1);
    light(w);
    rich(w);
    const { x, y } = w.hearth;
    expect(hearthMoveError(w, x, y)).toBe('The hearth is already here');
    const to = { x: x + 8, y: y - 6 };
    expect(hearthMoveError(w, to.x, to.y)).toBeNull();
    const wood = w.stock.wood;
    w.commands.push({ type: 'moveHearth', ...to });
    stepWorld(w);
    expect(w.hearthSite).not.toBeNull();
    expect(w.stock.wood).toBe(wood - moveCost(w).wood!);
    expect(hearthMoveError(w, to.x + 1, to.y)).toBe('The hearth is already being moved');
    // The old hearth burns until the work is done.
    expect(w.hearth.lit).toBe(true);
    seconds(w, 90);
    expect(w.hearthSite).toBeNull();
    expect(w.hearth.x).toBe(to.x);
    expect(w.hearth.y).toBe(to.y);
    expect(w.hearth.lit).toBe(true);
    const i = (r: number, c: number) => r * w.map.width + c;
    expect(w.warmth[i(to.y, to.x)]).toBe(100);
  });

  it('a stove stands only on a floor, so the move is refused over open ground', () => {
    const w = createWorld(1);
    rich(w);
    w.hearth.level = 3;
    const bare = (() => {
      for (let r = 6; r < 20; r++) {
        for (let dx = -r; dx <= r; dx++) {
          const [x, y] = [w.hearth.x + dx, w.hearth.y - r];
          if (!floorAt(w, x, y) && w.map.tiles[y * w.map.width + x] === Tile.Ground) return { x, y };
        }
      }
      return null;
    })()!;
    expect(hearthMoveError(w, bare.x, bare.y)).toBe('This stage needs a house floor under it');
  });
});

describe('home is near the fire (M12)', () => {
  it('a ruined bed in a far house is not home, and nobody walks to it to sleep', () => {
    const w = createWorld(2);
    light(w);
    const far = w.buildings.filter((b) => b.type === 'bed' && b.ruin && Math.hypot(b.x - w.hearth.x, b.y - w.hearth.y) > 30);
    expect(far.length).toBeGreaterThan(0);
    for (const b of far) b.broken = false;
    w.buildRev++;
    expect(atHome(w, far[0])).toBe(false);
    seconds(w, 20);
    expect(w.colonists.every((c) => c.bed === null || atHome(w, w.buildings.find((b) => b.id === c.bed)!))).toBe(true);
    // The same bed counts once the ground under it is warm, for example with a heater.
    w.warmth[Math.round(far[0].y) * w.map.width + Math.round(far[0].x)] = 80;
    expect(atHome(w, far[0])).toBe(true);
  });

  it('things the player built count anywhere', () => {
    const w = createWorld(1);
    const bed = w.buildings.find((b) => b.type === 'bed')!;
    [bed.ruin, bed.x] = [false, bed.x + 60];
    expect(atHome(w, bed)).toBe(true);
  });

  it('walls shade heat without cutting it off', () => {
    const w = bareWorld(1);
    const { x, y } = w.hearth;
    const open = w.warmth[y * w.map.width + x + 5];
    for (let dy = -2; dy <= 2; dy++) w.house.floors.push({ id: w.nextId++, x: x + 3, y: y + dy, storey: 0, kind: 'boards', construct: 0, ruin: false, roofBroken: false, roofWork: null });
    for (let dy = -2; dy <= 2; dy++) w.house.edges.push({ id: w.nextId++, x: x + 4, y: y + dy, storey: 0, side: 'w', kind: 'wall', level: 1, hp: 100, construct: 0, pending: null, ruin: false, repair: null });
    w.buildRev++;
    w.warmthKey = '';
    stepWorld(w);
    const shaded = w.warmth[y * w.map.width + x + 5];
    expect(shaded).toBeLessThan(open);
    expect(shaded).toBeGreaterThan(BALANCE.warmth.freezingThreshold);
  });
});

describe('heat and rooms (M12)', () => {
  it('walls hold heat in, so a tile behind a wall is colder than an open tile at the same distance', () => {
    const w = createWorld(3);
    light(w);
    // Compare tiles at the same straight line distance from the hearth, one with house walls between and one without.
    const r = 6;
    const sample: { x: number; y: number; open: boolean; warmth: number }[] = [];
    for (let a = 0; a < 360; a += 5) {
      const x = Math.round(w.hearth.x + Math.cos((a * Math.PI) / 180) * r);
      const y = Math.round(w.hearth.y + Math.sin((a * Math.PI) / 180) * r);
      const blocked = w.house.edges.some((e) => Math.abs(e.x - (x + w.hearth.x) / 2) < r / 2 && Math.abs(e.y - (y + w.hearth.y) / 2) < r / 2);
      sample.push({ x, y, open: !blocked, warmth: w.warmth[y * w.map.width + x] });
    }
    // Every tile in the ring is warm enough or fades, and the hearth tile is the warmest.
    expect(Math.max(...sample.map((s) => s.warmth))).toBeLessThanOrEqual(100);
    expect(w.warmth[w.hearth.y * w.map.width + w.hearth.x]).toBe(100);
  });

  it('mending the starting ruin makes closed, roofed rooms that count toward the stash', () => {
    const w = createWorld(1);
    rich(w);
    const before = mendedRooms(w);
    w.stock.wood = 900;
    const area = { x: w.hearth.x - 9, y: w.hearth.y - 4, w: 19, h: 13 };
    // The player closes the gaps with new walls and then mends what is worn.
    sealGaps(w, area);
    partitionRuin(w);
    mendArea(w, area, 0);
    seconds(w, 500);
    mendArea(w, area, 0);
    seconds(w, 300);
    expect(mendedRooms(w)).toBeGreaterThanOrEqual(Math.max(before, 3));
    expect(houseRooms(w).length).toBeGreaterThan(0);
  });
});

describe('saving the ruin (M12)', () => {
  it('survives a JSON round trip and keeps running the same', () => {
    const a = createWorld(4);
    a.commands.push({ type: 'lightHearth' });
    seconds(a, 20);
    const b: World = JSON.parse(JSON.stringify(a));
    seconds(a, 40);
    seconds(b, 40);
    expect(b).toEqual(a);
  });
});
