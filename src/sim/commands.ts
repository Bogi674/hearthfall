// Player command queue. UI pushes commands here and the world applies them at the start of a tick.
import { BUILDINGS, type BuildingType } from '../data/buildings';
import { placeBuilding } from './placement';
import type { World } from './world';

export type Command =
  | { type: 'place'; building: BuildingType; x: number; y: number; rotated: boolean }
  | { type: 'setWorkers'; id: number; count: number };

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
  }
  world.commands.length = 0;
}
