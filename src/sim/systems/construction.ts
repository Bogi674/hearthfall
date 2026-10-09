// Construction (section 8.2): a placed building is a site until builders put in its build time.
// Every builder standing at the site adds work. Tired builders work slower, like any worker.
import { BALANCE } from '../../data/balance';
import { BUILDINGS } from '../../data/buildings';
import { EDGES } from '../../data/house';
import type { Resource } from '../../data/resources';
import { center, hopeSpeed } from '../query';
import { addLog, type World } from '../world';

/** Share of a building's cost returned when colonists take it apart. */
const SALVAGE_REFUND = 0.75;

export function constructionSystem(world: World, dt: number): void {
  // Buildings marked for salvage come down, and their builders hand back most of the cost.
  for (const b of [...world.buildings]) {
    if (b.salvage === null) continue;
    b.salvage = Math.max(0, b.salvage - dt * crew(world, b.id) * hopeSpeed(world));
    if (b.salvage > 0) continue;
    for (const [r, n] of Object.entries(BUILDINGS[b.type].cost) as [Resource, number][]) world.stock[r] += Math.floor(n * SALVAGE_REFUND);
    world.buildings = world.buildings.filter((o) => o !== b);
    world.buildRev++;
    addLog(world, `The ${BUILDINGS[b.type].name} was taken apart.`, center(b));
  }
  for (const b of world.buildings) {
    if (b.construct <= 0 || b.salvage !== null) continue;
    const builders = world.colonists.filter((c) => c.site === b.id && c.task === 'build');
    b.status = 'building';
    const speed = builders.reduce((s, c) => s + (c.rest > 0 ? 1 : BALANCE.needs.tiredWorkSpeed), 0);
    b.construct = Math.max(0, b.construct - dt * speed * hopeSpeed(world));
    if (b.construct > 0) continue;
    b.status = 'ok';
    world.buildRev++;
    if (BUILDINGS[b.type].build >= 10) addLog(world, `The ${BUILDINGS[b.type].name} is built.`, center(b));
  }
  // House floors and walls are built the same way.
  for (const f of world.house.floors) {
    if (f.construct <= 0) continue;
    f.construct = Math.max(0, f.construct - dt * crew(world, f.id) * hopeSpeed(world));
    if (f.construct <= 0) world.buildRev++;
  }
  for (const e of world.house.edges) {
    if (e.construct <= 0 && e.pending) {
      e.pending.left = Math.max(0, e.pending.left - dt * crew(world, e.id) * hopeSpeed(world));
      if (e.pending.left > 0) continue;
      [e.kind, e.level, e.pending] = [e.pending.kind, e.pending.level, null];
      e.hp = EDGES[e.kind].levels[e.level - 1].hp;
      world.buildRev++;
      continue;
    }
    if (e.construct <= 0) continue;
    e.construct = Math.max(0, e.construct - dt * crew(world, e.id) * hopeSpeed(world));
    if (e.construct > 0) continue;
    world.buildRev++;
    if (e.kind === 'door') addLog(world, 'A door is hung.', { x: e.x, y: e.y });
  }
}

/** Work per second from the builders standing at a site. Tired builders work slower. */
function crew(world: World, site: number): number {
  return world.colonists.filter((c) => c.site === site && c.task === 'build').reduce((s, c) => s + (c.rest > 0 ? 1 : BALANCE.needs.tiredWorkSpeed), 0);
}
