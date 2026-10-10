// Managing buildings (M13): cancel a build in progress, move a finished building, and send the crew to scavenge a ruined house.
// The commands call these. The UI calls the error functions to show why something cannot be done.
import { BUILDINGS } from '../data/buildings';
import type { Resource } from '../data/resources';
import { placementError } from './placement';
import { isBuilt } from './query';
import { addLog, type Building, type World } from './world';

/** Share of the cost given back when a site is cancelled after work has begun. */
const CANCEL_REFUND = 0.5;

export function cancelBuildError(world: World, b: Building): string | null {
  if (isBuilt(b)) return 'It is already built. Take it apart instead';
  if (b.salvage !== null) return 'It is being taken apart';
  return world.buildings.includes(b) ? null : 'Nothing to cancel';
}

/** Cancels a site. An untouched one refunds all of its cost, one with work in it refunds half. */
export function cancelBuild(world: World, id: number): void {
  const b = world.buildings.find((o) => o.id === id);
  if (!b || cancelBuildError(world, b)) return;
  const def = BUILDINGS[b.type];
  const share = b.construct >= def.build ? 1 : CANCEL_REFUND;
  for (const [r, n] of Object.entries(def.cost) as [Resource, number][]) world.stock[r] += Math.floor(n * share);
  world.buildings = world.buildings.filter((o) => o !== b);
  for (const c of world.colonists) if (c.site === b.id) c.site = null;
  world.buildRev++;
  addLog(world, `Work on the ${def.name} was cancelled.`, b);
}

/** Why a finished building cannot move to this spot, or null. Cost does not count: the same materials go to the new place. */
export function moveError(world: World, b: Building, x: number, y: number, rotated: boolean): string | null {
  const def = BUILDINGS[b.type];
  if (!isBuilt(b)) return 'Finish it first, or cancel it';
  if (def.furniture || b.type === 'airshipDock') return 'It cannot be moved';
  if (b.salvage !== null) return 'It is being taken apart';
  const others = world.buildings.filter((o) => o !== b);
  const saved = world.buildings;
  world.buildings = others;
  const error = placementError(world, b.type, x, y, rotated, 'place', 0);
  world.buildings = saved;
  return error && !error.startsWith('Not enough') ? error : null;
}

/** Marks the building to be taken down by builders, and remembers where it goes next. */
export function moveBuilding(world: World, id: number, x: number, y: number, rotated: boolean): void {
  const b = world.buildings.find((o) => o.id === id);
  if (!b || moveError(world, b, x, y, rotated)) return;
  b.salvage = Math.max(3, BUILDINGS[b.type].build / 2);
  b.move = { x, y, rotated };
  addLog(world, `The crew will move the ${BUILDINGS[b.type].name}.`, b);
}

/** Called when the builders have taken a building down: the same building goes up at the new place as a site. */
export function finishMove(world: World, b: Building): void {
  const m = b.move!;
  const def = BUILDINGS[b.type];
  const error = placementError(world, b.type, m.x, m.y, m.rotated, 'place', 0);
  if (error && !error.startsWith('Not enough')) {
    for (const [r, n] of Object.entries(def.cost) as [Resource, number][]) world.stock[r] += Math.floor(n * 0.75);
    addLog(world, `The ${def.name} could not be rebuilt there: ${error}. The crew kept the materials.`, m);
    return;
  }
  world.buildings.push({ ...b, id: world.nextId++, x: m.x, y: m.y, w: rotatedSize(b, m.rotated)[0], h: rotatedSize(b, m.rotated)[1], construct: def.build, status: 'building', salvage: null, move: null, progress: 0, loaded: false, node: -1, lit: false, hp: def.hp });
  world.buildRev++;
}

const rotatedSize = (b: Building, rotated: boolean): [number, number] => {
  const [w, h] = BUILDINGS[b.type].size;
  return rotated ? [h, w] : [w, h];
};

export function scavengeError(world: World, houseId: number): string | null {
  const house = world.houses.find((h) => h.id === houseId);
  if (!house) return 'No house here';
  if (house.state === 'working') return 'The crew is searching it';
  if (house.state === 'looted') return 'Already searched. Nothing is left';
  const [cx, cy] = [Math.round(house.x + house.w / 2), Math.round(house.y + house.d / 2)];
  if (world.revealed[cy * world.map.width + cx] !== 1) return 'Not explored yet';
  return null;
}
