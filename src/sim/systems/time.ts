import type { World } from '../world';

export function timeSystem(world: World, _dt: number): void {
  world.tick += 1;
}
