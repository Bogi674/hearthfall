import * as THREE from 'three';
import { currentPhase } from '../sim/query';
import type { WeatherKind } from '../sim/weather';
import type { World } from '../sim/world';
import type { AmbientLights } from './lighting';
import { mixPalette, PALETTE } from './materials';
import type { Mist } from './meshes/mist';
import type { Snow } from './meshes/snow';

// Sky, fog, light, and snow follow the weather (M10.2). Every number eases toward its target over about twenty seconds,
// so a front rolls in instead of snapping. The warm hearth against the cold outside stays the same in every weather.

interface Look {
  fogColor: THREE.Color;
  fogNear: number;
  fogFar: number;
  hemi: number;
  moon: number;
  exposure: number;
  snowDensity: number;
  snowSpeed: number;
  wind: number;
  /** Multiplies the frost on the ground. */
  frost: number;
  /** Opacity of the low ground mist. */
  mist: number;
}

const LOOKS: Record<WeatherKind, Look> = {
  clear: { fogColor: mixPalette(PALETTE.deepCold, PALETTE.nightBlue, 0.45), fogNear: 24, fogFar: 100, hemi: 0.62, moon: 1.5, exposure: 1.08, snowDensity: 0, snowSpeed: 1, wind: 0.1, frost: 0.85, mist: 0.1 },
  overcast: { fogColor: mixPalette(PALETTE.nightBlue, PALETTE.frost, 0.32), fogNear: 12, fogFar: 62, hemi: 0.85, moon: 0.4, exposure: 1.06, snowDensity: 0, snowSpeed: 1, wind: 0.3, frost: 1, mist: 0.28 },
  snow: { fogColor: PALETTE.deepCold, fogNear: 14, fogFar: 78, hemi: 0.64, moon: 1.1, exposure: 1.06, snowDensity: 1, snowSpeed: 1, wind: 0.25, frost: 1.1, mist: 0.2 },
  blizzard: { fogColor: mixPalette(PALETTE.nightBlue, PALETTE.frost, 0.38), fogNear: 6, fogFar: 36, hemi: 0.78, moon: 0.35, exposure: 1.02, snowDensity: 2.2, snowSpeed: 3.2, wind: 5, frost: 1.4, mist: 0.4 },
};

/** Light level through the day. Night is darkest. */
const PHASE_LIGHT: Record<string, number> = { Dawn: 1.0, Day: 1.12, Dusk: 0.78, Night: 0.58 };

export interface Atmosphere {
  /** Returns the frost coverage the ground should show. */
  update(world: World, time: number): number;
}

export interface AtmosphereTargets {
  renderer: THREE.WebGLRenderer;
  fog: THREE.Fog;
  lights: AmbientLights;
  snow: Snow;
  mist: Mist;
  /** Ground shader fog uniforms. */
  ground: { uFogNear: { value: number }; uFogFar: { value: number } };
  /** Frost on the ground for the day. */
  frost(day: number): number;
}

export function createAtmosphere(t: AtmosphereTargets): Atmosphere {
  const now: Look = { ...LOOKS.snow, fogColor: LOOKS.snow.fogColor.clone() };
  let light = 1;
  let last = -1;
  return {
    update(w, time) {
      const dt = last < 0 ? 100 : Math.min(1, Math.max(0, time - last));
      last = time;
      const k = 1 - Math.exp(-dt / 6);
      const target = LOOKS[w.weather];
      for (const key of ['fogNear', 'fogFar', 'hemi', 'moon', 'exposure', 'snowDensity', 'snowSpeed', 'wind', 'frost', 'mist'] as const) now[key] += (target[key] - now[key]) * k;
      now.fogColor.lerp(target.fogColor, k);
      light += ((PHASE_LIGHT[currentPhase(w).name] ?? 1) - light) * k;

      t.fog.color.copy(now.fogColor).multiplyScalar(light);
      t.fog.near = now.fogNear;
      t.fog.far = now.fogFar;
      t.ground.uFogNear.value = now.fogNear;
      t.ground.uFogFar.value = now.fogFar;
      t.renderer.setClearColor(t.fog.color);
      t.renderer.toneMappingExposure = now.exposure;
      t.lights.hemi.intensity = now.hemi * light;
      t.lights.moon.intensity = now.moon * light;
      t.snow.setWeather(now.snowDensity, now.snowSpeed, now.wind);
      t.mist.setDensity(now.mist);
      return Math.min(0.95, t.frost(w.day) * now.frost);
    },
  };
}
