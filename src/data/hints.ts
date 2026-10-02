import type { BuildingType } from './buildings';
import type { World } from '../sim/world';

// Tutorial hints for the first two days (M6). One goal shows at a time, in order, until it is done.

export interface Hint {
  text: string;
  done: (w: World) => boolean;
}

const has = (w: World, type: BuildingType, n = 1) => w.buildings.filter((b) => b.type === type).length >= n;

export const HINT_DAYS = 2;

export const HINTS: Hint[] = [
  { text: 'Build a Woodcutter Camp near trees. Open Production in the build menu and click a spot.', done: (w) => has(w, 'woodcutterCamp') },
  { text: 'Build two Tents inside the warm circle. Colonists only rest in beds on warm tiles.', done: (w) => has(w, 'tent', 2) },
  { text: 'The hearth burns fuel every second. Build a Quarry by the ruins for stone.', done: (w) => has(w, 'quarry') },
  { text: 'Build a Charcoal Kiln. It turns wood into fuel. If the hearth stays out for a minute, the run is lost.', done: (w) => has(w, 'charcoalKiln') },
  { text: 'Build a Forager Hut and a Kitchen so colonists have meals.', done: (w) => has(w, 'foragerHut') && has(w, 'kitchen') },
  { text: 'Click any building to see why it is blocked and to change its workers.', done: (w) => w.day > 1 || w.dayTime > 200 },
  { text: 'Monsters attack from night 2. Build a Sawmill for planks.', done: (w) => has(w, 'sawmill') },
  { text: 'Build a Watchtower inside the warm circle. Its defender guards it at night.', done: (w) => has(w, 'watchtower') },
  { text: 'Ring the hearth with Wooden Barricades. Monsters break the weakest wall, so leave no gaps.', done: (w) => has(w, 'woodenBarricade', 12) },
  { text: 'Build a Gate. Expeditions leave through it to find the four rare items the airship needs.', done: (w) => has(w, 'gate') },
  { text: 'Open the Expeditions tab, pick a place and a squad, and send them out by day.', done: (w) => w.expeditions.length > 0 || Object.keys(w.items).length > 0 },
];

/** The hint to show now, or null once the first days are over or every goal is met. */
export function currentHint(w: World): Hint | null {
  if (w.day > HINT_DAYS) return null;
  return HINTS.find((h) => !h.done(w)) ?? null;
}
