import * as THREE from 'three';
import { PALETTE } from './materials';

export function addLights(scene: THREE.Scene): void {
  scene.add(new THREE.HemisphereLight(PALETTE.nightBlue, PALETTE.deepCold, 3));
  const moon = new THREE.DirectionalLight(PALETTE.frost, 2);
  moon.position.set(-20, 40, 10);
  scene.add(moon);
}
