// The airship (section 11): dock work on components, and The Last Night launch with fuel loading and boarding.
import { BALANCE } from '../../data/balance';
import { COMPONENTS, LAST_NIGHT, SCORE } from '../../data/vehicle';
import { bandAt, center, hopeSpeed } from '../query';
import { addLog, type World } from '../world';

export function vehicleSystem(world: World, dt: number): void {
  const air = world.airship;
  const dock = world.buildings.find((b) => b.type === 'airshipDock');
  if (dock && !air.launch) {
    const at = center(dock);
    const crew = world.colonists.filter((c) => c.job === dock.id && Math.hypot(c.x - at.x, c.y - at.y) < 2);
    dock.status = !air.building ? 'ok' : crew.length === 0 ? 'noWorkers' : bandAt(world, at.x, at.y) === 'freezing' ? 'tooCold' : 'ok';
    if (air.building && dock.status === 'ok') {
      const cold = bandAt(world, at.x, at.y) === 'cold' ? BALANCE.production.coldSpeed : 1;
      air.progress += dt * (crew.reduce((s, c) => s + (c.rest > 0 ? 1 : BALANCE.needs.tiredWorkSpeed), 0) / dock.workers || 0) * cold * hopeSpeed(world);
      const def = COMPONENTS[air.building];
      if (air.progress >= def.seconds) {
        air.built.push(air.building);
        world.hope = Math.min(100, world.hope + def.hope);
        addLog(world, `The ${def.name} is finished.`, at);
        air.building = null;
        air.progress = 0;
      }
    }
  }

  const launch = air.launch;
  if (!launch) return;
  if (!dock) {
    world.lost = 'The airship was destroyed.';
    return;
  }
  launch.elapsed += dt;
  const load = Math.min(world.stock.fuel, (LAST_NIGHT.fuel / LAST_NIGHT.seconds) * dt, LAST_NIGHT.fuel - launch.fuel);
  world.stock.fuel -= load;
  launch.fuel += load;
  if (launch.elapsed < LAST_NIGHT.seconds || launch.fuel < LAST_NIGHT.fuel) return;

  const at = center(dock);
  const isAboard = (c: World['colonists'][number]) => c.expedition === null && Math.hypot(c.x - at.x, c.y - at.y) <= LAST_NIGHT.boardRadius;
  const aboard = world.colonists.filter(isAboard).map((c) => c.name);
  const leftBehind = world.colonists.filter((c) => !isAboard(c)).map((c) => c.name);
  const score = aboard.length * SCORE.perSurvivor * SCORE.difficulty + Math.max(0, SCORE.targetDays - world.day) * SCORE.perDayLeft;
  world.won = { score, aboard, leftBehind };
  addLog(world, `The airship launched with ${aboard.length} aboard.`, at);
}
