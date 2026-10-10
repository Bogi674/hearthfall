import { describe, expect, it } from 'vitest';
import { expeditionError } from '../src/sim/commands';
import { hearthUpgradeError } from '../src/sim/hearth';
import { isIndoors } from '../src/sim/house';
import { placeEdge, placeFloor } from '../src/sim/placement';
import { stepWorld, type World } from '../src/sim/world';
import { bareWorld, finish, build } from './helpers';

const dist = (w: World, p: { x: number; y: number }) => Math.hypot(p.x - w.hearth.x, p.y - w.hearth.y);

describe('fog of war and discovery (M7)', () => {
  it('starts with the start area revealed and only the 3 closest places known', () => {
    const w = bareWorld(1);
    const known = w.pois.filter((p) => p.seen === 'known');
    expect(known.length).toBe(3);
    const farthestKnown = Math.max(...known.map((p) => dist(w, p)));
    for (const p of w.pois.filter((p) => p.seen === 'hidden')) expect(dist(w, p)).toBeGreaterThanOrEqual(farthestKnown);
    expect(w.revealed[w.hearth.y * w.map.width + w.hearth.x]).toBe(1);
    expect(w.revealed[0]).toBe(0);
  });

  it('a squad cannot be sent to a hidden place', () => {
    const w = bareWorld(1);
    w.stock.planks = 30;
    build(w, 'gate');
    const hidden = w.pois.findIndex((p) => p.seen === 'hidden');
    expect(expeditionError(w, hidden, [w.colonists[0].id])).toBe('Nobody knows where that is yet');
  });

  it('a lookout spots far places as rumors, and stages see further', () => {
    const w = bareWorld(1);
    Object.assign(w.stock, { wood: 100, planks: 100, stone: 20, metal: 20 });
    expect(build(w, 'lookoutPost')).toBe(true);
    const rumorsAt1 = w.pois.filter((p) => p.seen === 'rumored').length;
    const lookout = w.buildings.find((b) => b.type === 'lookoutPost')!;
    for (let i = 0; i < 2; i++) {
      w.commands.push({ type: 'upgradeBuilding', id: lookout.id });
      stepWorld(w);
    }
    expect(lookout.level).toBe(3);
    expect(w.pois.filter((p) => p.seen === 'rumored').length).toBeGreaterThan(rumorsAt1);
    expect(w.pois.every((p) => p.seen !== 'hidden')).toBe(true);
    expect(w.log.some((l) => l.text.startsWith('The lookout spotted something to the'))).toBe(true);
  });

  it('a squad confirms a rumor when it arrives and reveals land as it walks', () => {
    const w = bareWorld(1);
    Object.assign(w.stock, { wood: 100, planks: 60, meals: 60, fuel: 60 });
    build(w, 'gate');
    build(w, 'lookoutPost');
    const target = w.pois.findIndex((p) => p.seen === 'rumored');
    expect(target).toBeGreaterThanOrEqual(0);
    const revealedBefore = w.revealed.reduce((s, r) => s + r, 0);
    w.commands.push({ type: 'sendExpedition', poi: target, members: w.colonists.slice(0, 3).map((c) => c.id) });
    for (let i = 0; i < 1500 && w.pois[target].seen !== 'known'; i++) {
      stepWorld(w);
      w.enemies = [];
    }
    expect(w.pois[target].seen).toBe('known');
    expect(w.revealed.reduce((s, r) => s + r, 0)).toBeGreaterThan(revealedBefore);
  });
});

describe('the hearth object (M12)', () => {
  it('the first upgrade works on open ground, the stove needs a house floor, and the fireplace needs a closed room', () => {
    const w = bareWorld(1);
    Object.assign(w.stock, { wood: 200, planks: 200, stone: 50, metal: 100, parts: 20 });
    const hp = w.hearth.hp;
    w.commands.push({ type: 'upgradeHearth' });
    stepWorld(w);
    expect(w.hearth.level).toBe(2);
    expect(w.hearth.hp).toBe(hp + 500);
    expect(hearthUpgradeError(w)).toBe('This stage needs a house floor under it');
    w.commands.push({ type: 'upgradeHearth' });
    stepWorld(w);
    expect(w.hearth.level).toBe(2);
    // A floor under the hearth is enough for the stove.
    placeFloor(w, w.hearth.x, w.hearth.y, 'boards');
    expect(hearthUpgradeError(w)).toBeNull();
    w.commands.push({ type: 'upgradeHearth' });
    stepWorld(w);
    expect(w.hearth.level).toBe(3);
    // The fireplace needs the room around it closed and roofed.
    expect(hearthUpgradeError(w)).toBe('This stage needs a closed room with a whole roof');
  });

  it('a fireplace stands in a closed room and warms a wider area', () => {
    const w = bareWorld(1);
    Object.assign(w.stock, { wood: 600, planks: 300, stone: 100, metal: 200, parts: 40, scrap: 100 });
    const { x, y } = w.hearth;
    w.hearth.level = 3;
    // A 3 by 3 room around the hearth with a door on the south side.
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) placeFloor(w, x + dx, y + dy, 'boards');
    for (let dx = -1; dx <= 1; dx++) {
      placeEdge(w, x + dx, y - 1, 'n', 'wall', 1);
      placeEdge(w, x + dx, y + 2, 'n', dx === 0 ? 'door' : 'wall', 1);
    }
    for (let dy = -1; dy <= 1; dy++) {
      placeEdge(w, x - 1, y + dy, 'w', 'wall', 1);
      placeEdge(w, x + 2, y + dy, 'w', 'wall', 1);
    }
    finish(w);
    expect(isIndoors(w, x, y)).toBe(true);
    expect(hearthUpgradeError(w)).toBeNull();
    w.commands.push({ type: 'upgradeHearth' });
    stepWorld(w);
    expect(w.hearth.level).toBe(4);
    // An open roof stops the room holding a fireplace.
    w.house.floors[0].roofBroken = true;
    w.buildRev++;
    expect(isIndoors(w, x, y)).toBe(false);
    expect(hearthUpgradeError(w)).toBe('This stage needs a closed room with a whole roof');
  });
});
