// Plain text about colonists and the things they work on, shared by the colonist list and the selection panel.
import { BUILDINGS } from '../data/buildings';
import { EDGES } from '../data/house';
import { currentPhase } from '../sim/query';
import type { Colonist, World } from '../sim/world';

/** The name of a building, a house floor, or a wall piece, by id. */
export function nameOf(w: World, id: number | null): string {
  const b = w.buildings.find((b) => b.id === id);
  if (b) return BUILDINGS[b.type].name;
  if (w.house.floors.some((f) => f.id === id)) return 'house floor';
  const e = w.house.edges.find((e) => e.id === id);
  return e ? EDGES[e.kind].name.toLowerCase() : '';
}

/** What a colonist is doing right now, in a few words. */
export function taskText(w: World, c: Colonist): string {
  if (c.expedition !== null) return 'On expedition';
  switch (c.task) {
    case 'sleep': return c.bed === null ? 'Sleeping on a mat' : 'Sleeping';
    case 'shelter': return 'Taking shelter';
    case 'eat': return 'Eating at the table';
    case 'mingle': return 'Talking with the others';
    case 'hunt': return 'Hunting';
    case 'guard': return `On watch at the ${nameOf(w, c.duty)}`;
    case 'build': return `Building the ${nameOf(w, c.site)}`;
    default:
      if (c.site !== null) return `Building the ${nameOf(w, c.site)}`;
      return c.job !== null && currentPhase(w).work ? nameOf(w, c.job) : 'Idle';
  }
}
