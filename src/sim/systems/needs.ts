// Hunger, rest, body warmth, health, and death (section 6.3).
import { BALANCE } from '../../data/balance';
import { bandAt, DAY_SECONDS } from '../query';
import { addLog, type World } from '../world';

const N = BALANCE.needs;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export function needsSystem(world: World, dt: number): void {
  for (const c of world.colonists) {
    c.hunger = clamp01(c.hunger - dt / (N.hungerDays * DAY_SECONDS));
    if (c.hunger < N.eatBelow && world.stock.meals >= 1) {
      world.stock.meals -= 1;
      c.hunger = clamp01(c.hunger + N.mealRestores);
    }

    const band = bandAt(world, c.x, c.y);
    const sleeping = c.asleep && band === 'warm';
    c.rest = clamp01(c.rest + (sleeping ? dt / N.sleepFillSeconds : -dt / (N.restDays * DAY_SECONDS)));

    const warmthRate = band === 'warm' ? 1 / N.warmFillSeconds : band === 'cold' ? -1 / N.coldDrainSeconds : -1 / N.freezingDrainSeconds;
    c.warmth = clamp01(c.warmth + warmthRate * dt);

    const starving = c.hunger <= 0;
    const freezing = c.warmth <= 0;
    if (starving) c.health -= dt / N.starveKillSeconds;
    if (freezing) c.health -= dt / N.freezeKillSeconds;
    if (!starving && !freezing) c.health = clamp01(c.health + dt / N.healSeconds);
    if (c.health <= 0) addLog(world, `${c.name} ${starving ? 'starved' : 'froze to death'}.`);
  }
  world.colonists = world.colonists.filter((c) => c.health > 0);
}
