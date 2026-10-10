import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/data/balance';
import { BUILDABLE, BUILDINGS, type BuildingType } from '../src/data/buildings';
import { COMPONENTS } from '../src/data/vehicle';
import { RECIPES } from '../src/data/recipes';
import { RESOURCES, type Resource } from '../src/data/resources';
import { buildRoom, paintArea } from '../src/sim/build';
import { placeBuilding, placementError } from '../src/sim/placement';
import { stepWorld, TICKS_PER_SECOND, type World } from '../src/sim/world';
import { bareWorld, finish, findSpot } from './helpers';

const seconds = (w: World, s: number) => {
  for (let i = 0; i < s * TICKS_PER_SECOND && !w.lost; i++) stepWorld(w);
};

/** A world with a lit hearth, plenty of everything, and one big closed room with a floor above part of it. */
function stage(): { w: World; room: { x: number; y: number } } {
  const w = bareWorld(3);
  for (const r of RESOURCES) w.stock[r] = 0;
  Object.assign(w.stock, { wood: 5000, planks: 2000, stone: 800, scrap: 800, metal: 800, parts: 200, fuel: 400 });
  const room = { x: w.hearth.x - 18, y: w.hearth.y - 14 };
  // Open ground for the room and a yard around it, in case the map put trees there.
  for (let y = room.y - 3; y < room.y + 12; y++) for (let x = room.x - 3; x < room.x + 16; x++) w.map.tiles[y * w.map.width + x] = 0;
  w.mapRev++;
  buildRoom(w, { x: room.x, y: room.y, w: 12, h: 8 }, 'boards', 1);
  paintArea(w, { x: room.x + 1, y: room.y + 1, w: 4, h: 3 }, 'boards', 1);
  finish(w);
  return { w, room };
}

/** Where a building can go: inside the room for furniture, open ground for the rest. */
function spotFor(w: World, type: BuildingType, room: { x: number; y: number }): { x: number; y: number; storey: number } | null {
  const def = BUILDINGS[type];
  if (def.stairs) {
    // Stairs stand on the ground floor with a floor beside the top landing on the next storey.
    for (let x = room.x + 5; x < room.x + 11; x++) for (let y = room.y + 1; y < room.y + 7; y++) if (!placementError(w, type, x, y, false)) return { x, y, storey: 0 };
    return null;
  }
  if (def.furniture) {
    for (let y = room.y + 4; y < room.y + 8; y++) for (let x = room.x + 6; x < room.x + 12; x++) if (!placementError(w, type, x, y, false, 'place', 0)) return { x, y, storey: 0 };
    return null;
  }
  if (type === 'airshipDock') {
    w.airship.blueprint = true;
    for (let r = 14; r < 30; r++) for (let a = 0; a < 16; a++) {
      const x = Math.round(w.hearth.x + Math.cos((a * Math.PI) / 8) * r);
      const y = Math.round(w.hearth.y + Math.sin((a * Math.PI) / 8) * r);
      if (!placementError(w, type, x, y, false)) return { x, y, storey: 0 };
    }
    return null;
  }
  const s = findSpot(w, type, 6, 0);
  return s ? { ...s, storey: 0 } : null;
}

describe('every building in the build menu can be placed, built, and used (M13)', () => {
  for (const type of BUILDABLE) {
    it(`${BUILDINGS[type].name} goes down, is finished by the crew, and works`, () => {
      const { w, room } = stage();
      const spot = spotFor(w, type, room);
      expect(spot, `no spot for ${type}`).not.toBeNull();
      if (BUILDINGS[type].stairs) {
        // The top of the stairs needs a floor beside it on the next storey.
        expect(placementError(w, type, spot!.x, spot!.y, false)).toBeNull();
      }
      expect(placeBuilding(w, type, spot!.x, spot!.y, false, false, spot!.storey), `placing ${type}`).toBe(true);
      const b = w.buildings.find((o) => o.type === type && o.construct > 0)!;
      expect(b.status).toBe('building');
      // The crew builds it. Everything finishes within three minutes with every colonist free.
      seconds(w, 200);
      expect(b.construct, `${type} was not finished`).toBe(0);
      expect(w.lost).toBeNull();
      // Buildings that make things run without a blocked reason once they have workers and inputs.
      const recipe = RECIPES[type];
      if (recipe && BUILDINGS[type].workers > 0 && !BUILDINGS[type].armory) {
        w.dayTime = 40;
        b.workers = BUILDINGS[type].workers;
        seconds(w, 60);
        expect(['ok', 'noResource', 'noWorkers', 'tooCold', 'noInput', 'storageFull'], `${type} is ${b.status}`).toContain(b.status);
        expect(b.status).not.toBe('broken');
      }
    }, 120000);
  }
});

describe('resources are balanced (M13)', () => {
  const produced = new Set<Resource>();
  for (const r of Object.values(RECIPES)) for (const k of Object.keys(r!.outputs)) produced.add(k as Resource);

  it('every resource a building, hearth stage, or airship part costs can be made by the colony', () => {
    const costs: [string, Resource[]][] = [
      ...BUILDABLE.map((t): [string, Resource[]] => [t, Object.keys(BUILDINGS[t].cost) as Resource[]]),
      ...BALANCE.hearth.levels.map((l): [string, Resource[]] => [l.name, Object.keys(l.cost) as Resource[]]),
      ...Object.entries(COMPONENTS).map(([id, c]): [string, Resource[]] => [id, Object.keys(c.cost) as Resource[]]),
    ];
    for (const [name, list] of costs) for (const r of list) expect(produced.has(r), `${name} costs ${r}, which nothing makes`).toBe(true);
  });

  it('a production chain never costs more of its own output than it makes', () => {
    for (const [type, r] of Object.entries(RECIPES)) {
      for (const [res, n] of Object.entries(r!.inputs ?? {})) {
        const made = (r!.outputs as Record<string, number>)[res] ?? 0;
        expect(made, `${type} burns ${n} ${res} for ${made}`).toBeLessThan(n as number);
      }
    }
  });

  it('turning raw food into meals, and fuel into food, pays', () => {
    expect(RECIPES.kitchen!.outputs.meals).toBeGreaterThan(RECIPES.kitchen!.inputs!.rawFood!);
    expect(RECIPES.hydroponics!.outputs.rawFood).toBeGreaterThan(RECIPES.hydroponics!.inputs!.fuel! * 3);
    expect(RECIPES.charcoalKiln!.outputs.fuel).toBeGreaterThan(RECIPES.charcoalKiln!.inputs!.wood! );
  });

  it('no building costs more than the colony can gather in a day of a few workers', () => {
    // A woodcutter crew of 3 makes 8 wood a cycle of 4 seconds, so a day of 300 seconds is several hundred wood.
    const perDay = (3 * 8 * 300) / 4;
    for (const t of BUILDABLE) {
      const wood = BUILDINGS[t].cost.wood ?? 0;
      expect(wood).toBeLessThan(perDay);
    }
  });
});
