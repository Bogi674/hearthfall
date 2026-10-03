import * as THREE from 'three';
import { PALETTE } from './materials';

// Real point light budget is 8 (section 12.4). The hearth uses one.
// The moon is the only shadow caster. Its shadow box follows the camera so it stays sharp.

const MOON_OFFSET = new THREE.Vector3(-22, 40, 14);
const SHADOW_HALF = 24;

export function addAmbientLights(scene: THREE.Scene): THREE.DirectionalLight {
  scene.add(new THREE.HemisphereLight(PALETTE.frost, PALETTE.deepCold, 0.9));
  const moon = new THREE.DirectionalLight(PALETTE.frost, 1.3);
  moon.castShadow = true;
  moon.shadow.mapSize.set(2048, 2048);
  Object.assign(moon.shadow.camera, { left: -SHADOW_HALF, right: SHADOW_HALF, top: SHADOW_HALF, bottom: -SHADOW_HALF, near: 1, far: 120 });
  moon.shadow.camera.updateProjectionMatrix();
  moon.shadow.bias = -0.0005;
  moon.shadow.normalBias = 0.03;
  scene.add(moon, moon.target);
  return moon;
}

export function followWithShadow(moon: THREE.DirectionalLight, target: THREE.Vector3): void {
  moon.target.position.copy(target);
  moon.position.copy(target).add(MOON_OFFSET);
}

export function createHearthLight(): THREE.PointLight {
  const light = new THREE.PointLight(PALETTE.ember, 32, 0, 1.4);
  light.position.set(0, 3.4, 0.8);
  return light;
}
