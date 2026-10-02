import * as THREE from 'three';

const VIEW_HEIGHT = 30;

export function createCamera(aspect: number): THREE.OrthographicCamera {
  const h = VIEW_HEIGHT / 2;
  const camera = new THREE.OrthographicCamera(-h * aspect, h * aspect, h, -h, 0.1, 500);
  camera.position.set(50, 50, 50);
  camera.lookAt(0, 0, 0);
  return camera;
}
