import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/data/balance';
import { fuelFactor } from '../src/sim/query';

import { nextWeather, temperatureFor, WEATHER_KINDS, type WeatherKind } from '../src/sim/weather';
import { warmthSystem } from '../src/sim/systems/warmth';
import { expeditionRisk } from '../src/sim/systems/expeditions';
import { createWorld, stepWorld } from '../src/sim/world';

function chainOf(seed: number, days: number): WeatherKind[] {
  const out: WeatherKind[] = [BALANCE.weather.firstDay];
  for (let d = 1; d < days; d++) out.push(nextWeather(seed, d, out[d - 1]));
  return out;
}

describe('weather', () => {
  it('starts clear and forecasts tomorrow', () => {
    const w = createWorld(3);
    expect(w.weather).toBe('clear');
    expect(WEATHER_KINDS).toContain(w.weatherNext);
  });

  it('is deterministic for a seed and varies across seeds', () => {
    expect(chainOf(5, 30)).toEqual(chainOf(5, 30));
    const kinds = new Set(chainOf(5, 40).concat(chainOf(9, 40)));
    expect(kinds.size).toBeGreaterThanOrEqual(3);
    expect(chainOf(5, 30)).not.toEqual(chainOf(6, 30));
  });

  it('has no blizzard before the first allowed day', () => {
    for (let seed = 1; seed < 60; seed++) {
      chainOf(seed, BALANCE.weather.blizzardFromDay - 1).forEach((k) => expect(k).not.toBe('blizzard'));
    }
  });

  it('moves the forecast into today at dawn of the next day', () => {
    const w = createWorld(4);
    const tomorrow = w.weatherNext;
    for (let i = 0; i < 10 * 575; i++) stepWorld(w);
    expect(w.day).toBe(2);
    expect(w.weather).toBe(tomorrow);
    expect(w.weatherNext).toBe(nextWeather(w.seed, 2, w.weather));
  });

  it('makes nights colder than days', () => {
    for (const k of WEATHER_KINDS) expect(temperatureFor(3, k, 'Night')).toBeLessThan(temperatureFor(3, k, 'Day'));
    expect(temperatureFor(3, 'blizzard', 'Day')).toBeLessThan(temperatureFor(3, 'clear', 'Day'));
  });

  it('burns more fuel when it is colder', () => {
    const warm = createWorld(1);
    const cold = createWorld(1);
    warm.stock.fuel = cold.stock.fuel = 100;
    warm.temperature = 0;
    cold.temperature = -20;
    expect(fuelFactor(cold)).toBeGreaterThan(fuelFactor(warm));
    warthTick(warm);
    warthTick(cold);
    expect(cold.stock.fuel).toBeLessThan(warm.stock.fuel);
  });

  it('a blizzard pulls the heat in outdoors', () => {
    const calm = createWorld(1);
    const storm = createWorld(1);
    storm.weather = 'blizzard';
    warthTick(calm);
    warthTick(storm);
    const at = (w: typeof calm) => w.warmth[w.hearth.y * w.map.width + w.hearth.x + 8];
    expect(at(storm)).toBeLessThan(at(calm));
  });

  it('a blizzard raises expedition risk', () => {
    const w = createWorld(1);
    const clear = expeditionRisk(w, 2, 3);
    w.weather = 'blizzard';
    expect(expeditionRisk(w, 2, 3)).toBeGreaterThan(clear);
  });
});

function warthTick(w: ReturnType<typeof createWorld>) {
  w.warmthKey = '';
  warmthSystem(w, 1);
}
