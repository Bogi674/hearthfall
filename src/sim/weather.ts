// Weather chain (M10.2). Each day's weather comes from the day before it and a hash of the seed and day.
// It never touches the world rng, so it cannot shift any other random roll.
import { BALANCE } from '../data/balance';
import { createRng, nextFloat } from './rng';

export type WeatherKind = keyof typeof BALANCE.weather.kinds;
export const WEATHER_KINDS = Object.keys(BALANCE.weather.kinds) as WeatherKind[];

/** The weather of day `day + 1`, given the weather of `day`. */
export function nextWeather(seed: number, day: number, current: WeatherKind): WeatherKind {
  const rng = createRng(Math.imul(seed ^ 0x9e3779b9, 31) + Math.imul(day + 1, 0x85ebca6b));
  nextFloat(rng);
  const odds = (BALANCE.weather.chain[current] as readonly number[]).map((p, i) => (WEATHER_KINDS[i] === 'blizzard' && day + 1 < BALANCE.weather.blizzardFromDay ? 0 : p));
  const total = odds.reduce((s, p) => s + p, 0);
  let roll = nextFloat(rng) * total;
  for (let i = 0; i < odds.length; i++) {
    roll -= odds[i];
    if (roll < 0) return WEATHER_KINDS[i];
  }
  return current;
}

/** Outdoor degrees for a day, weather, and phase. Dusk and night are colder than day and dawn. */
export function temperatureFor(day: number, weather: WeatherKind, phase: string): number {
  const kind = BALANCE.weather.kinds[weather];
  const night = phase === 'Dusk' || phase === 'Night';
  return BALANCE.temperature.day1 - (day - 1) * BALANCE.temperature.dropPerDay + (night ? kind.nightOffset : kind.dayOffset);
}
