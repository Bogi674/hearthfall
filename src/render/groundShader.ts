import * as THREE from 'three';
import { PALETTE } from './materials';

// Ground shader. Samples the warmth map and blends a warm palette with a cold one (section 12.2).

export interface GroundTextures {
  /** Warmth per tile in the red channel, 0 to 255 for 0 to 100. Linear filtered. */
  warmth: THREE.DataTexture;
  /** Red marks road tiles, green marks water tiles. Linear filtered for soft edges. */
  tiles: THREE.DataTexture;
  /** Fog of war depth: 0 on revealed tiles, rising to 255 deep in the unknown. Linear filtered. */
  fogDepth: THREE.DataTexture;
  /** Light from the hearth, lamps, and buildings, 0 to 255 per tile (section 5.3). Linear filtered. */
  light: THREE.DataTexture;
}

export function createGroundMaterial(
  textures: GroundTextures,
  mapSize: THREE.Vector2,
  warmThreshold: number,
  fog: THREE.Fog,
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uWarmth: { value: textures.warmth },
      uTiles: { value: textures.tiles },
      uFogDepth: { value: textures.fogDepth },
      uLight: { value: textures.light },
      uTime: { value: 0 },
      uMapSize: { value: mapSize },
      uWarmT: { value: warmThreshold / 100 },
      uFrost: { value: 0 },
      uEmber: { value: PALETTE.ember },
      uLantern: { value: PALETTE.lantern },
      uOldWood: { value: PALETTE.oldWood },
      uWarmShadow: { value: PALETTE.warmShadow },
      uFrostCol: { value: PALETTE.frost },
      uNightBlue: { value: PALETTE.nightBlue },
      uDeepCold: { value: PALETTE.deepCold },
      uFogColor: { value: fog.color },
      uFogNear: { value: fog.near },
      uFogFar: { value: fog.far },
    },
    vertexShader: /* glsl */ `
varying vec2 vXZ;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vXZ = world.xz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`,
    fragmentShader: /* glsl */ `
uniform sampler2D uWarmth;
uniform sampler2D uTiles;
uniform sampler2D uFogDepth;
uniform sampler2D uLight;
uniform float uTime;
uniform vec2 uMapSize;
uniform float uWarmT;
uniform float uFrost;
uniform vec3 uEmber;
uniform vec3 uLantern;
uniform vec3 uOldWood;
uniform vec3 uWarmShadow;
uniform vec3 uFrostCol;
uniform vec3 uNightBlue;
uniform vec3 uDeepCold;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;
varying vec2 vXZ;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}

void main() {
  // Tile i has its center at world i - size / 2, which is texel center (i + 0.5) / size.
  vec2 uv = (vXZ + uMapSize * 0.5 + 0.5) / uMapSize;
  float w = texture2D(uWarmth, uv).r;
  vec4 tiles = texture2D(uTiles, uv);
  float road = smoothstep(0.3, 0.7, tiles.r);
  float water = smoothstep(0.3, 0.7, tiles.g);
  float grain = noise(vXZ * 0.35) * 0.5 + noise(vXZ * 1.7) * 0.35 + noise(vXZ * 6.0) * 0.15;

  // Warm side: dry earth lit by the light map. Light is full in the core of each light and
  // fades to dark at its radius, in the same steps that protect people (section 5.3).
  float light = texture2D(uLight, uv).r;
  float heat = smoothstep(uWarmT, 1.0, w);
  vec3 earth = mix(uWarmShadow, uOldWood, 0.3 + 0.5 * grain);
  earth = mix(earth, uWarmShadow * 1.3, road * 0.6);
  vec3 warm = earth * (0.3 + 1.05 * light) + uLantern * 0.06 * light + uEmber * 0.22 * heat * heat * heat;

  // Cold side: blue ground under snow that grows with the frost amount.
  vec3 dirt = mix(uDeepCold, uNightBlue, 0.4 + 0.6 * grain);
  float nearWarm = smoothstep(uWarmT - 0.25, uWarmT, w);
  float snow = smoothstep(0.35, 0.6, grain + uFrost) * (1.0 - nearWarm * 0.7);
  snow *= 1.0 - road * 0.3;
  vec3 cold = mix(dirt, mix(uNightBlue, uFrostCol, 0.14), snow);
  cold += uFrostCol * 0.1 * step(0.992, hash(floor(vXZ * 9.0))) * snow;
  vec3 ice = mix(uNightBlue, uFrostCol, 0.1 + 0.08 * noise(vXZ * 0.8));
  cold = mix(cold, ice, water);

  // Lamps outside the warm circle light the snow too.
  cold = cold * (1.0 + 0.6 * light) + uEmber * 0.16 * light;
  float dry = smoothstep(uWarmT - 0.1, uWarmT + 0.02, w);
  vec3 color = mix(cold, warm, dry);

  color = mix(color, uFogColor, smoothstep(uFogNear, uFogFar, length(vXZ)));
  // Fog of war (section 4): close to the known land the ground shows through a grey drifting haze.
  // Deeper into the unknown it sinks to black. Noise breaks up the edge so it reads as mist.
  float depth = texture2D(uFogDepth, uv).r + (noise(vXZ * 0.45) - 0.5) * 0.05;
  float drift = noise(vXZ * 0.22 + vec2(uTime * 0.05, uTime * 0.03)) * 0.6 + noise(vXZ * 0.6 - vec2(uTime * 0.04, 0.0)) * 0.4;
  vec3 grey = vec3(dot(color, vec3(0.3, 0.59, 0.11)));
  vec3 haze = mix(uNightBlue, uFrostCol, 0.3) * (0.45 + 0.4 * drift);
  vec3 fogged = mix(grey * 0.5, haze, 0.65);
  fogged = mix(fogged, uDeepCold * 0.12, smoothstep(0.1, 1.0, depth));
  color = mix(color, fogged, smoothstep(0.0, 0.06, depth));
  gl_FragColor = vec4(color, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`,
  });
}
