// Hope (section 6.5). Deaths and destroyed buildings lower it as they happen.
// At 0 hope one colonist deserts at dawn. Then dawn rewards a night without deaths and fed colonists,
// and punishes hunger and cold.
import { BALANCE } from '../../data/balance';
import { BUILDINGS } from '../../data/buildings';
import { isIndoors } from '../house';
import { isUsable, phaseStarted } from '../query';
import { recordDeath, type World } from '../world';

const H = BALANCE.hope;

export function hopeSystem(world: World, dt: number): void {
  if (phaseStarted(world, 'Dusk', dt)) {
    world.deathsTonight = 0;
    world.socialSeconds = 0;
    world.matSleepers = 0;
  }
  if (!phaseStarted(world, 'Dawn', dt)) return;
  const cs = world.colonists;
  if (world.hope <= 0 && cs.length > 0) {
    const leaver = cs.find((c) => c.expedition === null) ?? cs[0];
    recordDeath(world, leaver, 'deserted the colony');
    world.colonists = cs.filter((c) => c !== leaver);
  }
  let change = 0;
  // The evening in the house: sitting together lifts hope. Lamps, rugs, and plants lift the most it can give.
  const comfort = world.buildings.filter((b) => BUILDINGS[b.type].decor && isUsable(b) && isIndoors(world, b.x, b.y, b.storey)).length;
  const mingleMax = H.mingleMax + Math.min(H.decorMax, comfort * H.decorBonus);
  change += Math.min(mingleMax, world.socialSeconds / H.mingleSecondsPerPoint);
  world.socialSeconds = 0;
  // Colonists with no bed slept on mats by the hearth.
  change += Math.max(H.matMax, world.matSleepers * H.matSleeper);
  world.matSleepers = 0;
  if (world.wave.threat > 0 && world.deathsTonight === 0) change += H.nightWithoutDeaths;
  if (world.colonists.every((c) => c.hunger >= 0.5)) change += H.fedDawn;
  if (world.colonists.some((c) => c.hunger <= 0)) change += H.hungryDawn;
  if (world.colonists.some((c) => c.warmth <= 0)) change += H.frozenDawn;
  world.hope = Math.min(100, Math.max(0, world.hope + change));
}
