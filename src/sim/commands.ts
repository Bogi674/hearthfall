// Player command queue. UI pushes commands here and the world applies them at the start of a tick.
import { BALANCE } from '../data/balance';
import { BUILDINGS, type BuildingType } from '../data/buildings';
import { placeBuilding } from './placement';
import { center } from './query';
import { recall } from './systems/expeditions';
import type { World } from './world';

export type Command =
  | { type: 'place'; building: BuildingType; x: number; y: number; rotated: boolean }
  | { type: 'setWorkers'; id: number; count: number }
  | { type: 'sendExpedition'; poi: number; members: number[] }
  | { type: 'recall'; id: number };

export function pushCommand(queue: Command[], command: Command): void {
  queue.push(command);
}

export function applyCommands(world: World): void {
  for (const c of world.commands) {
    if (c.type === 'place') placeBuilding(world, c.building, c.x, c.y, c.rotated);
    if (c.type === 'setWorkers') {
      const b = world.buildings.find((b) => b.id === c.id);
      if (b) b.workers = Math.max(0, Math.min(BUILDINGS[b.type].workers, c.count));
    }
    if (c.type === 'sendExpedition' && !expeditionError(world, c.poi, c.members)) sendExpedition(world, c.poi, c.members);
    if (c.type === 'recall') {
      const ex = world.expeditions.find((e) => e.id === c.id);
      if (ex) recall(world, ex);
    }
  }
  world.commands.length = 0;
}

/** Why this squad cannot leave, or null when it can (section 10.2). */
export function expeditionError(world: World, poi: number, members: number[]): string | null {
  if (!world.buildings.some((b) => b.type === 'gate')) return 'Build a Gate first';
  if (!world.pois[poi]) return 'Pick a place to search';
  if (members.length < 1 || members.length > BALANCE.expeditions.maxSquad) return `Pick 1 to ${BALANCE.expeditions.maxSquad} colonists`;
  for (const id of members) {
    const c = world.colonists.find((c) => c.id === id);
    if (!c || c.expedition !== null) return 'A picked colonist is not available';
  }
  return null;
}

function sendExpedition(world: World, poiIndex: number, members: number[]): void {
  const poi = world.pois[poiIndex];
  const gates = world.buildings.filter((b) => b.type === 'gate').map(center);
  const gate = gates.reduce((a, b) => (Math.hypot(b.x - poi.x, b.y - poi.y) < Math.hypot(a.x - poi.x, a.y - poi.y) ? b : a));
  const squad = world.colonists.filter((c) => members.includes(c.id));
  const id = world.nextId++;
  for (const c of squad) [c.expedition, c.job, c.duty, c.asleep] = [id, null, null, false];
  const x = squad.reduce((s, c) => s + c.x, 0) / squad.length;
  const y = squad.reduce((s, c) => s + c.y, 0) / squad.length;
  world.expeditions.push({
    id, poi: poiIndex, members: [...members], stage: 'out', x, y, px: x, py: y,
    route: [gate, { x: poi.x, y: poi.y }], gate, searchLeft: 0, rollTimer: 0, loot: {}, items: [], recruits: 0,
  });
}
