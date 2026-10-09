// The airship (section 11): dock work on components, and The Last Night launch with fuel loading and boarding.
import { BALANCE } from '../../data/balance';
import { BUILDINGS } from '../../data/buildings';
import { BERTH, BLUEPRINT, COMPONENTS, LAST_NIGHT, SCORE } from '../../data/vehicle';
import { bandAt, center, hopeSpeed, phaseStarted, seatCount } from '../query';
import { addLog, type World } from '../world';

export function vehicleSystem(world: World, dt: number): void {
  const air = world.airship;
  // The old owner's blueprint turns up in the attic once the house is repaired and hope is up (section 11.2).
  if (!air.blueprint && phaseStarted(world, 'Dawn', dt) && world.hearth.level >= BLUEPRINT.hearthLevel && world.hope >= BLUEPRINT.hope) {
    air.blueprint = true;
    const finder = world.colonists.find((c) => c.expedition === null) ?? world.colonists[0];
    addLog(world, `${finder?.name ?? 'Someone'} found the old owner's blueprints in the attic. A small balloon craft, never finished. The crew can build it.`, world.hearth);
  }

  // The crew works at the Launch Pad and at any Drafting Table. Every station adds its crew's work.
  const stations = world.buildings.filter((b) => (b.type === 'airshipDock' || b.type === 'draftingTable') && b.construct <= 0);
  if (stations.length > 0 && !air.launch) {
    let work = 0;
    for (const s of stations) {
      const at = center(s);
      const crew = world.colonists.filter((c) => c.job === s.id && c.task === 'work');
      const band = bandAt(world, at.x, at.y);
      s.status = !air.building ? 'ok' : crew.length === 0 ? 'noWorkers' : band === 'freezing' ? 'tooCold' : 'ok';
      if (air.building && s.status === 'ok') work += crew.reduce((n, c) => n + (c.rest > 0 ? 1 : BALANCE.needs.tiredWorkSpeed), 0) * (band === 'cold' ? BALANCE.production.coldSpeed : 1);
    }
    if (air.building && work > 0) {
      air.progress += dt * (work / BUILDINGS.airshipDock.workers) * hopeSpeed(world);
      const def = air.building === 'berth' ? BERTH : COMPONENTS[air.building];
      if (air.progress >= def.seconds) {
        const at = center(stations[0]);
        if (air.building === 'berth') air.berths++;
        else {
          air.built.push(air.building);
          world.hope = Math.min(100, world.hope + COMPONENTS[air.building].hope);
        }
        addLog(world, `The ${def.name} is finished.`, at);
        air.building = null;
        air.progress = 0;
      }
    }
  }

  const launch = air.launch;
  const dock = world.buildings.find((b) => b.type === 'airshipDock');
  if (!launch) return;
  if (!dock) {
    world.lost = 'The airship was destroyed.';
    return;
  }
  launch.elapsed += dt;
  // The hearth must not starve while the airship drinks, so some fuel stays in the stockpile.
  const reserve = (BALANCE.hearth.levels[world.hearth.level - 1].fuelPerMinute / 60) * LAST_NIGHT.hearthReserveSeconds;
  const load = Math.max(0, Math.min(world.stock.fuel - reserve, (LAST_NIGHT.fuel / LAST_NIGHT.seconds) * dt, LAST_NIGHT.fuel - launch.fuel));
  world.stock.fuel -= load;
  launch.fuel += load;
  if (launch.elapsed < LAST_NIGHT.seconds || launch.fuel < LAST_NIGHT.fuel) return;

  const at = center(dock);
  const isAboard = (c: World['colonists'][number]) => c.expedition === null && Math.hypot(c.x - at.x, c.y - at.y) <= LAST_NIGHT.boardRadius;
  // Only the seats are filled. The rest of the crew is left behind, however close they stand.
  const near = world.colonists.filter(isAboard);
  const aboard = near.slice(0, seatCount(world)).map((c) => c.name);
  const leftBehind = world.colonists.filter((c) => !aboard.includes(c.name)).map((c) => c.name);
  const score = aboard.length * SCORE.perSurvivor * SCORE.difficulty + Math.max(0, SCORE.targetDays - world.day) * SCORE.perDayLeft;
  world.won = { score, aboard, leftBehind };
  addLog(world, `The airship launched with ${aboard.length} aboard.`, at);
}
