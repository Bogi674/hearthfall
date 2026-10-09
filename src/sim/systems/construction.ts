// Construction (section 8.2): a placed building is a site until builders put in its build time.
// Every builder standing at the site adds work. Tired builders work slower, like any worker.
// Also handles house rooms and wall modules.
import { BALANCE } from '../../data/balance';
import { BUILDINGS } from '../../data/buildings';
import { ROOMS, WALL_MODULES } from '../../data/rooms';
import { center, hopeSpeed } from '../query';
import { addLog, type World, type Room } from '../world';

export function constructionSystem(world: World, dt: number): void {
  // Buildings
  for (const b of world.buildings) {
    if (b.construct <= 0) continue;
    const builders = world.colonists.filter((c) => c.site === b.id && c.task === 'build');
    b.status = 'building';
    const speed = builders.reduce((s, c) => s + (c.rest > 0 ? 1 : BALANCE.needs.tiredWorkSpeed), 0);
    b.construct = Math.max(0, b.construct - dt * speed * hopeSpeed(world));
    if (b.construct > 0) continue;
    b.status = 'ok';
    world.buildRev++;
    if (BUILDINGS[b.type].build >= 10) addLog(world, `The ${BUILDINGS[b.type].name} is built.`, center(b));
  }

  // Rooms
  for (const r of world.rooms) {
    if (r.construct <= 0) continue;
    const builders = world.colonists.filter((c) => c.site === r.id && c.task === 'build');
    const roomDef = ROOMS.find(rd => rd.id === r.roomId);
    if (!roomDef) continue;
    const speed = builders.reduce((s, c) => s + (c.rest > 0 ? 1 : BALANCE.needs.tiredWorkSpeed), 0);
    r.construct = Math.max(0, r.construct - dt * speed * hopeSpeed(world));
    if (r.construct > 0) continue;
    // Room finished - apply its effects
    applyRoomEffects(world, r, roomDef);
    world.buildRev++;
    addLog(world, `The ${roomDef.name} is complete.`, { x: r.x + r.w / 2, y: r.y + r.h / 2 });
  }

  // Wall modules
  for (const wm of world.wallModules) {
    if (wm.construct <= 0) continue;
    const builders = world.colonists.filter((c) => c.site === wm.id && c.task === 'build');
    const modDef = WALL_MODULES.find(md => md.id === wm.moduleId);
    if (!modDef) continue;
    const speed = builders.reduce((s, c) => s + (c.rest > 0 ? 1 : BALANCE.needs.tiredWorkSpeed), 0);
    wm.construct = Math.max(0, wm.construct - dt * speed * hopeSpeed(world));
    if (wm.construct > 0) continue;
    world.buildRev++;
    addLog(world, `The ${modDef.name} is installed.`, { x: wm.x, y: wm.y });
  }
}

function applyRoomEffects(_world: World, _room: Room, _def: typeof ROOMS[0]): void {
  // Room provides beds, storage, warmth, workers, etc.
  // Workers are assigned via the UI setWorkers command
  // Storage is added to capacity via query.ts
  // Warmth bonus is added via warmth system
  // Production is handled by production system
  // For now, just mark as built (construct = 0)
}
