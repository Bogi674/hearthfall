// The hidden stash (M12). Once enough rooms are mended and hope is up, someone notices a loose board and a locked tin box
// under it. The crew opens it, and the old owner's blueprint is inside. This replaces the old rule that tied the blueprint
// to a hearth stage.
import { BLUEPRINT, STASH_SITE } from '../../data/vehicle';
import { mendedRooms } from '../house';
import { hopeSpeed, phaseStarted } from '../query';
import { addLog, type World } from '../world';

export function stashSystem(world: World, dt: number): void {
  const stash = world.stash;
  if (!stash || stash.state === 'opened') return;
  if (stash.state === 'hidden') {
    if (phaseStarted(world, 'Dawn', dt) && world.hope >= BLUEPRINT.hope && mendedRooms(world) >= BLUEPRINT.rooms) {
      stash.state = 'found';
      const finder = world.colonists.find((c) => c.expedition === null) ?? world.colonists[0];
      addLog(world, `${finder?.name ?? 'Someone'} found a loose board and a locked tin box under it. The crew gathers to open it.`, stash);
    }
    return;
  }
  const crew = world.colonists.filter((c) => c.site === STASH_SITE && c.task === 'build');
  stash.open -= dt * crew.length * hopeSpeed(world);
  if (stash.open > 0) return;
  stash.state = 'opened';
  world.airship.blueprint = true;
  addLog(world, "The tin box holds the old owner's blueprints. A small balloon craft, never finished. The crew can build it.", stash);
}
