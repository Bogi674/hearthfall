import { describe, expect, it } from 'vitest';
import { pick, targetOf } from '../src/input/pick';
import { placeBuilding } from '../src/sim/placement';
import { createWorld, stepWorld, type World } from '../src/sim/world';
import { selectionHtml } from '../src/ui/selection';
import { taskText } from '../src/ui/people';
import { buildMenuHtml } from '../src/ui/build';
import { closedRoom, finish } from './helpers';

const rich = (w: World) => Object.assign(w.stock, { wood: 500, scrap: 100, planks: 100, metal: 50, stone: 50, parts: 20 });

function roomWorld(): World {
  const w = createWorld(1);
  rich(w);
  closedRoom(w);
  placeBuilding(w, 'bed', w.hearth.x + 2, w.hearth.y, false);
  finish(w);
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
    expect(pick(w, x + 2, y)).toMatchObject({ kind: 'building', w: 1, h: 2 });
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
    expect(pick(w, x + 2, y + 1)?.kind).toBe('building');
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
    const w = createWorld(1);
    expect(buildMenuHtml(w, 'Furniture', null, null, false)).not.toContain('data-act="rotate"');
    expect(buildMenuHtml(w, 'Furniture', 'bed', null, false)).toContain('data-act="rotate"');
    expect(buildMenuHtml(w, 'Escape', null, null, false)).toMatch(/Needs the old owner/);
    w.airship.blueprint = true;
    expect(buildMenuHtml(w, 'Escape', null, null, false)).toMatch(/Choose the site in the Airship tab/);
    expect(buildMenuHtml(w, 'Structure', null, null, false)).toContain('Gun Port');
  });
});
