import { BALANCE } from '../../data/balance';
import { currentPhase, DAY_SECONDS } from '../query';
import { nextWeather, temperatureFor } from '../weather';
import { addLog, type World } from '../world';

export function timeSystem(world: World, dt: number): void {
  world.tick += 1;
  world.dayTime += dt;
  if (world.dayTime >= DAY_SECONDS) {
    world.dayTime -= DAY_SECONDS;
    world.day += 1;
    world.weather = world.weatherNext;
    world.weatherNext = nextWeather(world.seed, world.day, world.weather);
    addLog(world, `Day ${world.day} begins. ${BALANCE.weather.kinds[world.weather].name}, ${temperatureFor(world.day, world.weather, 'Day')} degrees.`);
  }
  world.temperature = temperatureFor(world.day, world.weather, currentPhase(world).name);
}
