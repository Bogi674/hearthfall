// Drifters (section 6.6). On the dusk of a few days one survivor walks in from the dark toward the hearth light and
// joins the colony. They come only when hope is up and a bed is free, and never past the crew limit.
import { BALANCE } from '../../data/balance';
import { BUILDINGS } from '../../data/buildings';
import { atHome, isUsable, phaseStarted } from '../query';
import { nextFloat } from '../rng';
import { addColonist, addLog, type World } from '../world';

const A = BALANCE.arrivals;

export function arrivalsSystem(world: World, dt: number): void {
  const beds = world.buildings.reduce((n, b) => n + (isUsable(b) && atHome(world, b) ? (BUILDINGS[b.type].beds ?? 0) : 0), 0);
  if (!world.drifter && phaseStarted(world, 'Dusk', dt) && (A.days as readonly number[]).includes(world.day)) {
    if (world.hope >= A.minHope && world.colonists.length < A.maxColonists && beds > world.colonists.length) {
      const a = nextFloat(world.rng) * Math.PI * 2;
      const [x, y] = [world.hearth.x + Math.cos(a) * A.distance, world.hearth.y + Math.sin(a) * A.distance];
      world.drifter = { x, y, px: x, py: y };
      addLog(world, 'Someone is walking toward the light.', world.drifter);
    }
  }
  const d = world.drifter;
  if (!d) return;
  [d.px, d.py] = [d.x, d.y];
  const dist = Math.hypot(world.hearth.x - d.x, world.hearth.y - d.y);
  const step = Math.min(dist, A.speed * dt);
  d.x += ((world.hearth.x - d.x) / dist) * step;
  d.y += ((world.hearth.y - d.y) / dist) * step;
  // They join when they reach the light, or at dawn at the latest.
  if (dist - step > A.joinDistance && !phaseStarted(world, 'Dawn', dt)) return;
  const c = addColonist(world, d.x, d.y);
  world.drifter = null;
  addLog(world, `${c.name} walks in from the cold and joins the colony.`, c);
}
