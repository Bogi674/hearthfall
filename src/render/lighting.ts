import * as THREE from 'three';
import { PALETTE } from './materials';

// Real point light budget is 8 (section 12.4). The hearth uses one.

export function addAmbientLights(scene: THREE.Scene): void {
  scene.add(new THREE.HemisphereLight(PALETTE.nightBlue, PALETTE.deepCold, 1.6));
  const moon = new THREE.DirectionalLight(PALETTE.frost, 0.7);
  moon.position.set(-30, 50, 20);
  scene.add(moon);
}

export function createHearthLight(): THREE.PointLight {
  const light = new THREE.PointLight(PALETTE.ember, 60, 0, 1.6);
  light.position.set(0, 2.2, 0);
  return light;
}
