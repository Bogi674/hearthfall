// Worker and bed assignment, and colonist movement. Colonists walk in straight lines to their target.
import { BALANCE } from '../../data/balance';
import { BUILDINGS } from '../../data/buildings';
import { center, currentPhase } from '../query';
import type { World } from '../world';

const C = BALANCE.colonist;

export function jobsSystem(world: World, dt: number): void {
  const byId = new Map(world.buildings.map((b) => [b.id, b]));
  for (const c of world.colonists) {
    if (c.job !== null && !byId.has(c.job)) c.job = null;
    if (c.bed !== null && !byId.has(c.bed)) c.bed = null;
    if (c.duty !== null && !byId.has(c.duty)) c.duty = null;
  }

  for (const b of world.buildings) {
    // Night duty posts take defenders, who keep their day job.
    const slot = BUILDINGS[b.type].nightDuty ? 'duty' : 'job';
    const assigned = world.colonists.filter((c) => c[slot] === b.id);
    for (const c of assigned.slice(b.workers)) c[slot] = null;
    for (let n = assigned.length; n < b.workers; n++) {
      const idle = world.colonists.find((c) => c[slot] === null);
      if (!idle) break;
      idle[slot] = b.id;
    }
    const beds = BUILDINGS[b.type].beds ?? 0;
    let used = world.colonists.filter((c) => c.bed === b.id).length;
    for (const c of world.colonists) {
      if (used >= beds) break;
      if (c.bed === null) {
        c.bed = b.id;
        used++;
      }
    }
  }

  const work = currentPhase(world).work;
  for (const c of world.colonists) {
    const place = work ? c.job : (c.duty ?? c.bed);
    const b = place === null ? undefined : byId.get(place);
    const a = c.id * 2.4;
    const target = b ? center(b) : { x: world.hearth.x + Math.cos(a) * 2.5, y: world.hearth.y + Math.sin(a) * 2.5 };
    c.px = c.x;
    c.py = c.y;
    const dx = target.x - c.x;
    const dy = target.y - c.y;
    const d = Math.hypot(dx, dy);
    const step = Math.min(d, C.speed * dt);
    if (d > 0) {
      c.x += (dx / d) * step;
      c.y += (dy / d) * step;
    }
    c.asleep = !work && c.duty === null && b !== undefined && d - step < C.arriveDistance;
  }
}
