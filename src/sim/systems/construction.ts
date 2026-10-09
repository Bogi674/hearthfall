// Construction (section 8.2): a placed building is a site until builders put in its build time.
// Every builder standing at the site adds work. Tired builders work slower, like any worker.
import { BALANCE } from '../../data/balance';
import { BUILDINGS } from '../../data/buildings';
import { center, hopeSpeed } from '../query';
import { addLog, type World } from '../world';

export function constructionSystem(world: World, dt: number): void {
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
}
