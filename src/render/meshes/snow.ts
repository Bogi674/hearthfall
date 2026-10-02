import * as THREE from 'three';
import { PALETTE } from '../materials';

// Falling snow as GPU points. Each flake samples the warmth map and fades out over warm tiles,
// so snow falls only outside the warm radius (section 12.2).

const COUNT = 9000;
const HEIGHT = 10;

export interface Snow {
  points: THREE.Points;
  update(time: number, pixelsPerUnit: number, viewDir: THREE.Vector3): void;
}

export function createSnow(warmth: THREE.Texture, mapSize: THREE.Vector2, warmThreshold: number, fogFar: number): Snow {
  const area = Math.max(mapSize.x, mapSize.y) + 20;
  const positions = new Float32Array(COUNT * 3);
  const seeds = new Float32Array(COUNT);
  // Render side randomness is fine here. Snow placement does not affect the simulation.
  for (let i = 0; i < COUNT; i++) {
    positions[i * 3] = (Math.random() - 0.5) * area;
    positions[i * 3 + 1] = Math.random() * HEIGHT;
    positions[i * 3 + 2] = (Math.random() - 0.5) * area;
    seeds[i] = Math.random();
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, HEIGHT / 2, 0), area);

  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uViewDir: { value: new THREE.Vector3(0, -1, 0) },
      uPixelsPerUnit: { value: 20 },
      uWarmth: { value: warmth },
      uMapSize: { value: mapSize },
      uWarmT: { value: warmThreshold / 100 },
      uFogFar: { value: fogFar },
      uColor: { value: PALETTE.frost.clone().multiplyScalar(1.3) },
    },
    vertexShader: /* glsl */ `
attribute float aSeed;
uniform float uTime;
uniform vec3 uViewDir;
uniform float uPixelsPerUnit;
uniform sampler2D uWarmth;
uniform vec2 uMapSize;
uniform float uWarmT;
uniform float uFogFar;
varying float vAlpha;
void main() {
  vec3 p = position;
  p.y = mod(p.y - uTime * (0.9 + aSeed * 0.8), ${HEIGHT.toFixed(1)});
  p.x += sin(uTime * 0.6 + aSeed * 40.0) * 0.6 + uTime * 0.25;
  p.z += cos(uTime * 0.5 + aSeed * 25.0) * 0.4;
  p.x = mod(p.x + ${(area / 2).toFixed(1)}, ${area.toFixed(1)}) - ${(area / 2).toFixed(1)};
  // Fade by the warmth under the flake and under the ground point it overlaps on screen,
  // so no flake is drawn over the warm circle.
  vec2 screenGround = p.xz - uViewDir.xz * (p.y / uViewDir.y);
  float w = max(
    texture2D(uWarmth, (p.xz + uMapSize * 0.5 + 0.5) / uMapSize).r,
    texture2D(uWarmth, (screenGround + uMapSize * 0.5 + 0.5) / uMapSize).r
  );
  vAlpha = (1.0 - smoothstep(uWarmT - 0.12, uWarmT, w)) * (0.45 + aSeed * 0.5);
  vAlpha *= 1.0 - smoothstep(uFogFar * 0.7, uFogFar * 1.1, length(p.xz));
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = (0.06 + aSeed * 0.06) * uPixelsPerUnit;
}
`,
    fragmentShader: /* glsl */ `
uniform vec3 uColor;
varying float vAlpha;
void main() {
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;
  gl_FragColor = vec4(uColor, vAlpha * smoothstep(0.5, 0.15, d));
  #include <colorspace_fragment>
}
`,
  });

  const points = new THREE.Points(geometry, material);
  return {
    points,
    update(time, pixelsPerUnit, viewDir) {
      material.uniforms.uTime.value = time;
      material.uniforms.uViewDir.value.copy(viewDir);
      material.uniforms.uPixelsPerUnit.value = pixelsPerUnit;
    },
  };
}
