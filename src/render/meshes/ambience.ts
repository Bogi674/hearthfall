import * as THREE from 'three';
import { PALETTE } from '../materials';

// The two ends of the mood (M13). Near the fire, sparks and dust drift up through the warm air. Out in the dark, pale eyes
// open between the trees, watch, and close. Both are drawn as points. Render only: nothing here touches the simulation.

const pointVertex = /* glsl */ `
attribute float aSeed;
attribute float aSize;
uniform float uTime;
uniform float uScale;
varying float vAlpha;
varying float vSeed;
#ifdef FIRE
void main() {
  float life = fract(uTime * (0.1 + aSeed * 0.12) + aSeed * 7.0);
  vec3 p = position;
  p.y += life * (2.2 + aSeed * 2.4);
  p.x += sin(uTime * (0.7 + aSeed) + aSeed * 40.0) * 0.35 * life;
  p.z += cos(uTime * (0.6 + aSeed) + aSeed * 23.0) * 0.35 * life;
  vAlpha = smoothstep(0.0, 0.1, life) * (1.0 - smoothstep(0.55, 1.0, life));
  vSeed = aSeed;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize * uScale / -mv.z;
}
#else
void main() {
  // Eyes blink on their own rhythm: open for a few seconds, then shut.
  float cycle = fract(uTime * (0.045 + aSeed * 0.03) + aSeed * 11.0);
  vAlpha = smoothstep(0.0, 0.05, cycle) * (1.0 - smoothstep(0.55, 0.62, cycle));
  vSeed = aSeed;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize * uScale / -mv.z;
}
#endif
`;

const pointFragment = /* glsl */ `
uniform vec3 uColor;
uniform float uStrength;
varying float vAlpha;
varying float vSeed;
void main() {
  vec2 d = gl_PointCoord - 0.5;
  float r = length(d);
  if (r > 0.5) discard;
  float core = smoothstep(0.5, 0.0, r);
  gl_FragColor = vec4(uColor * (0.6 + 1.4 * core) * uStrength, core * core * vAlpha * uStrength);
}
`;

function makePoints(count: number, spread: (i: number, p: THREE.Vector3) => void, color: THREE.Color, size: number, fire: boolean): THREE.Points {
  const pos = new Float32Array(count * 3);
  const seed = new Float32Array(count);
  const sz = new Float32Array(count);
  const v = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    spread(i, v);
    pos.set([v.x, v.y, v.z], i * 3);
    seed[i] = ((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1;
    sz[i] = size * (0.6 + seed[i] * 0.8);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  geo.setAttribute('aSize', new THREE.BufferAttribute(sz, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uScale: { value: 600 }, uColor: { value: color }, uStrength: { value: 1 } },
    vertexShader: pointVertex,
    fragmentShader: pointFragment,
    defines: fire ? { FIRE: '' } : {},
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  return points;
}

export interface Ambience {
  group: THREE.Group;
  /** Sparks follow the hearth and rise only while it burns. Eyes show at night, and fewer when the weather is thick. */
  update(time: number, state: { hearth: THREE.Vector3; burning: boolean; night: number; pixelsPerUnit: number }): void;
}

export function createAmbience(mapSize: number, seed: number): Ambience {
  const group = new THREE.Group();
  const sparks = makePoints(70, (i, p) => p.set((Math.sin(i * 3.1) * 0.5) * 0.7, 0.2, Math.cos(i * 5.7) * 0.5 * 0.7), PALETTE.ember.clone().multiplyScalar(1.6), 0.16, true);
  group.add(sparks);
  // Pairs of eyes in a ring beyond the camp, placed from the map seed so they stand in the same trees on every load.
  const rnd = (n: number) => ((Math.sin((n + seed * 7.13) * 91.7) * 43758.5453) % 1 + 1) % 1;
  const pairs = 46;
  const eyes = makePoints(
    pairs * 2,
    (i, p) => {
      const k = Math.floor(i / 2);
      const a = rnd(k * 2) * Math.PI * 2;
      const r = 34 + rnd(k * 2 + 1) * (mapSize * 0.42 - 34);
      const gap = 0.11;
      p.set(Math.cos(a) * r + (i % 2 ? gap : -gap) * Math.sin(a), 0.5 + rnd(k + 99) * 1.4, Math.sin(a) * r - (i % 2 ? gap : -gap) * Math.cos(a));
    },
    PALETTE.blight.clone(),
    0.22,
    false,
  );
  group.add(eyes);
  return {
    group,
    update(time, s) {
      const sm = sparks.material as THREE.ShaderMaterial;
      const em = eyes.material as THREE.ShaderMaterial;
      sparks.position.copy(s.hearth);
      sm.uniforms.uTime.value = time;
      sm.uniforms.uScale.value = s.pixelsPerUnit * 1.2;
      sm.uniforms.uStrength.value = s.burning ? 1 : 0.08;
      em.uniforms.uTime.value = time;
      em.uniforms.uScale.value = s.pixelsPerUnit * 1.2;
      em.uniforms.uStrength.value = 0.9 * s.night;
      eyes.visible = s.night > 0.02;
    },
  };
}
