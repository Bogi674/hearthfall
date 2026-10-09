import * as THREE from 'three';
import { mixPalette, PALETTE } from '../materials';

// Low ground mist (M11): a slow drifting haze that hangs over the cold ground and thins out over the warm radius,
// like the fog in the valley below a cabin. Thicker in a blizzard and nearly gone on a clear day.

export interface Mist {
  mesh: THREE.Mesh;
  setDensity(value: number): void;
  update(time: number): void;
}

export function createMist(warmth: THREE.Texture, mapSize: THREE.Vector2, warmThreshold: number): Mist {
  const size = Math.max(mapSize.x, mapSize.y) + 60;
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uDensity: { value: 0.1 },
      uWarmth: { value: warmth },
      uMapSize: { value: mapSize },
      uWarmT: { value: warmThreshold / 100 },
      uColor: { value: mixPalette(PALETTE.frost, PALETTE.nightBlue, 0.45) },
    },
    vertexShader: /* glsl */ `
varying vec2 vXZ;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vXZ = w.xz;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`,
    fragmentShader: /* glsl */ `
uniform float uTime;
uniform float uDensity;
uniform sampler2D uWarmth;
uniform vec2 uMapSize;
uniform float uWarmT;
uniform vec3 uColor;
varying vec2 vXZ;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = p * 2.03 + vec2(7.3, 1.7);
    a *= 0.5;
  }
  return v;
}
void main() {
  vec2 drift = vec2(uTime * 0.18, uTime * 0.07);
  float n = fbm(vXZ * 0.09 + drift) * 0.7 + fbm(vXZ * 0.23 - drift * 1.7) * 0.3;
  float w = texture2D(uWarmth, (vXZ + uMapSize * 0.5 + 0.5) / uMapSize).r;
  float cold = 1.0 - smoothstep(uWarmT - 0.15, uWarmT, w);
  float a = smoothstep(0.35, 0.85, n) * uDensity * cold;
  gl_FragColor = vec4(uColor, a);
  #include <colorspace_fragment>
}
`,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size).rotateX(-Math.PI / 2), material);
  mesh.position.y = 0.45;
  mesh.renderOrder = 2;
  return {
    mesh,
    setDensity(v) {
      material.uniforms.uDensity.value = v;
    },
    update(time) {
      material.uniforms.uTime.value = time;
      mesh.visible = material.uniforms.uDensity.value > 0.01;
    },
  };
}
