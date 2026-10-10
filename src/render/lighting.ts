import * as THREE from 'three';
import { PALETTE } from './materials';

// Real point light budget is 8 (section 12.4). The hearth uses one.
// The moon is the only shadow caster. Its shadow box follows the camera so it stays sharp.

const MOON_OFFSET = new THREE.Vector3(-22, 40, 14);
const SHADOW_HALF = 24;

export interface AmbientLights {
  hemi: THREE.HemisphereLight;
  moon: THREE.DirectionalLight;
}

export function addAmbientLights(scene: THREE.Scene): AmbientLights {
  const hemi = new THREE.HemisphereLight(PALETTE.frost, PALETTE.deepCold, 0.9);
  scene.add(hemi);
  const moon = new THREE.DirectionalLight(PALETTE.frost, 1.3);
  moon.castShadow = true;
  moon.shadow.mapSize.set(4096, 4096);
  Object.assign(moon.shadow.camera, { left: -SHADOW_HALF, right: SHADOW_HALF, top: SHADOW_HALF, bottom: -SHADOW_HALF, near: 1, far: 120 });
  moon.shadow.camera.updateProjectionMatrix();
  moon.shadow.bias = -0.0005;
  moon.shadow.normalBias = 0.03;
  scene.add(moon, moon.target);
  return { hemi, moon };
}

export function followWithShadow(moon: THREE.DirectionalLight, target: THREE.Vector3): void {
  moon.target.position.copy(target);
  moon.position.copy(target).add(MOON_OFFSET);
}

export function createHearthLight(): THREE.PointLight {
  const light = new THREE.PointLight(PALETTE.ember, 46, 0, 1.4);
  light.position.set(0, 3.4, 0.8);
  // The fire throws warm shadows of the walls and furniture around it, which is most of what makes a room feel lived in.
  light.castShadow = true;
  light.shadow.mapSize.set(1024, 1024);
  light.shadow.camera.near = 0.4;
  light.shadow.camera.far = 22;
  light.shadow.bias = -0.002;
  light.shadow.normalBias = 0.05;
  light.shadow.radius = 4;
  return light;
}
