import { describe, expect, it } from 'vitest';
import { expeditionError } from '../src/sim/commands';
import { createWorld, stepWorld, type World } from '../src/sim/world';
import { build } from './helpers';

const dist = (w: World, p: { x: number; y: number }) => Math.hypot(p.x - w.hearth.x, p.y - w.hearth.y);

describe('fog of war and discovery (M7)', () => {
  it('starts with the start area revealed and only the 3 closest places known', () => {
    const w = createWorld(1);
    const known = w.pois.filter((p) => p.seen === 'known');
    expect(known.length).toBe(3);
    const farthestKnown = Math.max(...known.map((p) => dist(w, p)));
    for (const p of w.pois.filter((p) => p.seen === 'hidden')) expect(dist(w, p)).toBeGreaterThanOrEqual(farthestKnown);
    expect(w.revealed[w.hearth.y * w.map.width + w.hearth.x]).toBe(1);
    expect(w.revealed[0]).toBe(0);
  });

  it('a squad cannot be sent to a hidden place', () => {
    const w = createWorld(1);
    w.stock.planks = 30;
    build(w, 'gate');
    const hidden = w.pois.findIndex((p) => p.seen === 'hidden');
    expect(expeditionError(w, hidden, [w.colonists[0].id])).toBe('Nobody knows where that is yet');
  });

  it('a lookout spots far places as rumors, and stages see further', () => {
    const w = createWorld(1);
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
    const w = createWorld(1);
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

describe('Hearth House stages (M7)', () => {
  it('each repair widens the warm radius and adds health', () => {
    const w = createWorld(1);
    Object.assign(w.stock, { wood: 50, planks: 50, stone: 20 });
    const hp = w.hearth.hp;
    w.commands.push({ type: 'upgradeHearth' });
    stepWorld(w);
    w.commands.push({ type: 'upgradeHearth' });
    stepWorld(w);
    expect(w.hearth.level).toBe(3);
    expect(w.hearth.hp).toBe(hp + 1000);
    const i = w.hearth.y * w.map.width + w.hearth.x + 12;
    expect(w.warmth[i]).toBeGreaterThanOrEqual(50);
  });
});
