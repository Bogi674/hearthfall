// Hunger, rest, body warmth, health, and death (section 6.3).
import { BALANCE } from '../../data/balance';
import { BUILDINGS } from '../../data/buildings';
import { isIndoors } from '../house';
import { bandAt, DAY_SECONDS, isBuilt } from '../query';
import { recordDeath, type World } from '../world';

const N = BALANCE.needs;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export function needsSystem(world: World, dt: number): void {
  const byId = new Map(world.buildings.map((b) => [b.id, b]));
  // With a table in the house colonists eat there in the evening instead of anywhere (section 5.7).
  const hasTable = world.buildings.some((b) => BUILDINGS[b.type].social === 'eat' && isBuilt(b));
  for (const c of world.colonists) {
    // A bed in a closed room, a sickbed, and a mat each change how fast sleepers rest and heal (section 5.6).
    const bed = c.asleep && c.bed !== null ? byId.get(c.bed) : undefined;
    const bonus = !c.asleep ? 1 : !bed ? BALANCE.house.matRest : BUILDINGS[bed.type].restBonus ?? (BUILDINGS[bed.type].furniture && isIndoors(world, bed.x, bed.y) ? BALANCE.house.roomRest : 1);
    c.hunger = clamp01(c.hunger - dt / (N.hungerDays * DAY_SECONDS));
    const mayEat = !hasTable || c.task === 'eat' || c.hunger < N.eatAnywhereBelow;
    if (c.hunger < N.eatBelow && mayEat && world.stock.meals >= 1) {
      world.stock.meals -= 1;
      c.hunger = clamp01(c.hunger + N.mealRestores);
    }

    const band = bandAt(world, c.x, c.y);
    const sleeping = c.asleep && band === 'warm';
    c.rest = clamp01(c.rest + (sleeping ? (dt * bonus) / N.sleepFillSeconds : -dt / (N.restDays * DAY_SECONDS)));

    const warmthRate = band === 'warm' ? 1 / N.warmFillSeconds : band === 'cold' ? -1 / N.coldDrainSeconds : -1 / N.freezingDrainSeconds;
    c.warmth = clamp01(c.warmth + warmthRate * dt);

    const starving = c.hunger <= 0;
    const freezing = c.warmth <= 0;
    if (starving) c.health -= dt / N.starveKillSeconds;
    if (freezing) c.health -= dt / N.freezeKillSeconds;
    if (!starving && !freezing) c.health = clamp01(c.health + (dt * bonus) / N.healSeconds);
    if (c.health <= 0) recordDeath(world, c, starving ? 'starved' : 'froze to death');
  }
  world.colonists = world.colonists.filter((c) => c.health > 0);
}
