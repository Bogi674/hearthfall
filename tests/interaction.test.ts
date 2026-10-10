import { describe, expect, it } from 'vitest';
import { pick, targetOf } from '../src/input/pick';
import { placeBuilding } from '../src/sim/placement';
import { createWorld, stepWorld, type World } from '../src/sim/world';
import { EDGES } from '../src/data/house';
import { planArea } from '../src/input/areas';
import { selectionHtml } from '../src/ui/selection';
import { taskText } from '../src/ui/people';
import { buildMenuHtml } from '../src/ui/build';
import { bareWorld, closedRoom, finish } from './helpers';

const rich = (w: World) => Object.assign(w.stock, { wood: 500, scrap: 100, planks: 100, metal: 50, stone: 50, parts: 20 });

function roomWorld(): World {
  const w = bareWorld(1);
  rich(w);
  closedRoom(w);
  placeBuilding(w, 'bed', w.hearth.x + 2, w.hearth.y, false);
  finish(w);
  // The crew stands well away, so the cursor tests below see only the room.
  for (const c of w.colonists) [c.x, c.y, c.px, c.py] = [c.x - 30, c.y, c.px - 30, c.py];
  return w;
}

describe('what is under the cursor (section 14.2)', () => {
  it('picks a colonist before a building, a building before the house, and the house before the ground', () => {
    const w = roomWorld();
    const { x, y } = w.hearth;
    const c = w.colonists[0];
    [c.x, c.y, c.task, c.asleep] = [x + 2, y, 'idle', false];
    // The colonist stands on the bed. The bed tile is the building under them.
    expect(pick(w, x + 2, y)?.kind).toBe('colonist');
    c.asleep = true;
    expect(pick(w, x + 2, y)).toMatchObject({ kind: 'building', w: 1, h: 1 });
    expect(pick(w, x, y)?.kind).toBe('hearth');
    expect(pick(w, x + 30, y)).toBeNull();
  });

  it('picks a wall piece near a tile border and a floor tile away from it', () => {
    const w = roomWorld();
    const { x, y } = w.hearth;
    // The north wall of the room sits on the border between rows y - 1 and y at x + 2.
    const wall = pick(w, x + 2, y - 0.5 + 0.05);
    expect(wall?.kind).toBe('edge');
    expect(wall).toMatchObject({ w: 1.1, h: 0.24 });
    // The middle of the floor tile next to the bed is a floor.
    expect(pick(w, x + 2, y + 1)?.kind).toBe('floor');
    expect(pick(w, x + 2, y + 0.2)?.kind).toBe('building');
    w.buildings = w.buildings.filter((b) => b.type !== 'bed');
    w.buildRev++;
    expect(pick(w, x + 2, y + 0.05)?.kind).toBe('floor');
  });

  it('finds the thing again by id, and loses it once it is gone', () => {
    const w = roomWorld();
    const bed = w.buildings.find((b) => b.type === 'bed')!;
    expect(targetOf(w, bed.id)).toMatchObject({ kind: 'building' });
    expect(targetOf(w, w.house.edges[0].id)?.kind).toBe('edge');
    expect(targetOf(w, w.house.floors[0].id)?.kind).toBe('floor');
    expect(targetOf(w, w.colonists[0].id)?.kind).toBe('colonist');
    expect(targetOf(w, 'hearth')?.kind).toBe('hearth');
    expect(targetOf(w, 99999)).toBeNull();
  });
});

describe('the selection panel for the house (section 14)', () => {
  it('shows a colonist, a wall piece, and a floor tile, each with the action that makes sense', () => {
    const w = roomWorld();
    const c = w.colonists[0];
    expect(selectionHtml(w, c.id)).toContain(c.name);
    expect(selectionHtml(w, c.id)).toMatch(/Hunger/);
    const wall = w.house.edges.find((e) => e.kind === 'wall')!;
    const wallHtml = selectionHtml(w, wall.id);
    expect(wallHtml).toContain('Wood Wall');
    expect(wallHtml).toContain(`data-act="edge:${wall.id}:gunPort:1"`);
    expect(wallHtml).toContain(`data-act="remove:edge:${wall.id}"`);
    const door = w.house.edges.find((e) => e.kind === 'door')!;
    expect(selectionHtml(w, door.id)).toMatch(/weakest piece/);
    const floor = w.house.floors[0];
    const floorHtml = selectionHtml(w, floor.id);
    expect(floorHtml).toContain('Plank Floor');
    expect(floorHtml).toMatch(/Bedroom/);
    expect(floorHtml).toMatch(/Closed. People inside are safe/);
    expect(selectionHtml(w, 424242)).toBe('');
  });

  it('a gun port names its defender, and furniture can be removed', () => {
    const w = roomWorld();
    const { x, y } = w.hearth;
    w.commands.push({ type: 'buildEdge', x: x + 3, y, side: 'w', kind: 'gunPort', level: 1 });
    stepWorld(w);
    finish(w);
    stepWorld(w);
    const port = w.house.edges.find((e) => e.kind === 'gunPort')!;
    const html = selectionHtml(w, port.id);
    expect(html).toContain('Gun Port');
    expect(html).toMatch(/fires it at night/);
    const bed = w.buildings.find((b) => b.type === 'bed')!;
    expect(selectionHtml(w, bed.id)).toContain(`data-act="remove:furniture:${bed.id}"`);
  });

  it('says what a colonist is doing in plain words', () => {
    const w = roomWorld();
    const c = w.colonists[0];
    expect(taskText(w, { ...c, task: 'eat', expedition: null })).toBe('Eating at the table');
    expect(taskText(w, { ...c, task: 'mingle', expedition: null })).toBe('Talking with the others');
    expect(taskText(w, { ...c, task: 'sleep', bed: null, expedition: null })).toBe('Sleeping on a mat');
    expect(taskText(w, { ...c, expedition: 4 })).toBe('On expedition');
  });

  it('the build menu offers rotation only while placing, and says why a pad cannot go down', () => {
    const w = bareWorld(1);
    expect(buildMenuHtml(w, 'Furniture', null, null, false)).not.toContain('data-act="rotate"');
    expect(buildMenuHtml(w, 'Furniture', 'bed', null, false)).toContain('data-act="rotate"');
    expect(buildMenuHtml(w, 'Escape', null, null, false)).toMatch(/Needs the old owner/);
    w.airship.blueprint = true;
    expect(buildMenuHtml(w, 'Escape', null, null, false)).toMatch(/Choose the site in the Airship tab/);
    expect(buildMenuHtml(w, 'Defense', null, null, false)).toContain('Gun Port');
    expect(buildMenuHtml(w, 'Structure', null, null, false)).toContain('Wood Room');
  });
});

describe('the ruin in the interface (M12)', () => {
  it('the hearth panel offers Light while it smolders, then Move and Upgrade', () => {
    const w = createWorld(1);
    const html = selectionHtml(w, 'hearth');
    expect(html).toContain('Fire Pit');
    expect(html).toMatch(/Smoldering/);
    expect(html).toContain('data-act="light"');
    expect(html).toContain('data-act="move"');
    w.hearth.ignited = true;
    w.hearth.lit = true;
    const lit = selectionHtml(w, 'hearth');
    expect(lit).not.toContain('data-act="light"');
    expect(lit).toMatch(/Burning/);
    Object.assign(w.stock, { wood: 100, planks: 100 });
    expect(selectionHtml(w, 'hearth')).toContain('data-act="upgrade"');
    w.hearthSite = { x: w.hearth.x + 5, y: w.hearth.y, construct: 5 };
    expect(selectionHtml(w, 'hearth')).toContain('data-act="cancelmove"');
  });

  it('a worn wall, a broken piece of furniture, and an open roof each offer Mend', () => {
    const w = createWorld(1);
    Object.assign(w.stock, { wood: 300, planks: 100, stone: 100 });
    const wall = w.house.edges.find((e) => e.ruin && e.kind === 'wall' && e.hp < EDGES.wall.levels[e.level - 1].hp)!;
    expect(selectionHtml(w, wall.id)).toContain(`data-act="mend:edge:${wall.id}"`);
    const broken = w.buildings.find((b) => b.ruin && b.broken)!;
    expect(selectionHtml(w, broken.id)).toContain(`data-act="mend:furniture:${broken.id}"`);
    expect(selectionHtml(w, broken.id)).toMatch(/Broken/);
    const open = w.house.floors.find((f) => f.roofBroken)!;
    expect(selectionHtml(w, open.id)).toContain(`data-act="mend:roof:${open.id}"`);
  });

  it('the stash can be picked once found, and its panel shows the progress', () => {
    const w = createWorld(1);
    const s = w.stash!;
    expect(pick(w, s.x, s.y)?.kind).not.toBe('stash');
    s.state = 'found';
    expect(pick(w, s.x, s.y)).toMatchObject({ kind: 'stash', w: 1, h: 1 });
    expect(selectionHtml(w, 'stash')).toMatch(/Locked tin box/);
    expect(targetOf(w, 'stash')?.kind).toBe('stash');
  });

  it('the hearth is one tile to pick', () => {
    const w = createWorld(1);
    const { x, y } = w.hearth;
    for (const c of w.colonists) c.x = c.px = x + 40;
    expect(pick(w, x, y)?.kind).toBe('hearth');
    expect(pick(w, x, y)).toMatchObject({ w: 1, h: 1 });
  });

  it('the mend tool previews the pieces and the cost', () => {
    const w = createWorld(1);
    Object.assign(w.stock, { wood: 300, planks: 100, stone: 100 });
    const a = { x: w.hearth.x - 3, y: w.hearth.y - 2 };
    const b = { x: w.hearth.x + 3, y: w.hearth.y + 2 };
    const plan = planArea(w, { kind: 'mend' }, a, b, 0);
    expect(plan.items.length).toBeGreaterThan(3);
    expect(plan.text).toMatch(/^Mend \d+ pieces/);
    expect(plan.command).toMatchObject({ type: 'mendArea' });
    expect(plan.blocked).toBe(false);
    w.stock.wood = 0;
    expect(planArea(w, { kind: 'mend' }, a, b, 0).blocked).toBe(true);
  });
});
