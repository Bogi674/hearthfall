import { BALANCE } from '../../data/balance';
import { DAY_SECONDS } from '../query';
import { addLog, type World } from '../world';

export function timeSystem(world: World, dt: number): void {
  world.tick += 1;
  world.dayTime += dt;
  if (world.dayTime >= DAY_SECONDS) {
    world.dayTime -= DAY_SECONDS;
    world.day += 1;
    world.temperature = BALANCE.temperature.day1 - (world.day - 1) * BALANCE.temperature.dropPerDay;
    addLog(world, `Day ${world.day} begins. It is ${world.temperature} degrees.`);
  }
}
