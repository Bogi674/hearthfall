// Worker and bed assignment, and colonist movement. Colonists walk in straight lines to their target.
import { BALANCE } from '../../data/balance';
import { BUILDINGS } from '../../data/buildings';
import { LAST_NIGHT } from '../../data/vehicle';
import { bandAt, center, currentPhase } from '../query';
import type { World } from '../world';

const C = BALANCE.colonist;
/** Idle colonists wait in a ring just outside the Hearth House. */
const IDLE_RADIUS = 3.3;

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
      const idle = world.colonists.find((c) => c[slot] === null && c.expedition === null);
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
  const launch = world.airship.launch;
  const dock = world.buildings.find((b) => b.type === 'airshipDock');
  // Colonists board in the final seconds of The Last Night (section 11.1).
  // Defenders on night duty hold their post, so the player chooses who stays behind.
  const boardingTime = launch && dock && launch.elapsed >= LAST_NIGHT.seconds - LAST_NIGHT.boardSeconds;
  for (const c of world.colonists) {
    if (c.expedition !== null) continue;
    const boarding = boardingTime && c.duty === null;
    const place = boarding ? dock!.id : work ? c.job : (c.duty ?? c.bed);
    let b = place === null ? undefined : byId.get(place);
    // Nobody stands at a job that is too cold to work. They wait by the hearth.
    if (b && work && !boarding && bandAt(world, center(b).x, center(b).y) === 'freezing') b = undefined;
    const a = c.id * 2.4;
    const target = b ? center(b) : { x: world.hearth.x + Math.cos(a) * IDLE_RADIUS, y: world.hearth.y + Math.sin(a) * IDLE_RADIUS };
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
    c.asleep = !boarding && !work && c.duty === null && b !== undefined && d - step < C.arriveDistance;
  }
}
