import * as THREE from 'three';
import { createCamera } from './camera';
import { addLights } from './lighting';
import { PALETTE } from './materials';

export interface View {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  render(): void;
}

export function createView(container: HTMLElement): View {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(PALETTE.deepCold);
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = createCamera(1);
  addLights(scene);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: PALETTE.nightBlue }),
  );
  scene.add(ground);

  const marker = new THREE.Mesh(
    new THREE.BoxGeometry(2, 2, 2),
    new THREE.MeshStandardMaterial({ color: PALETTE.oldWood }),
  );
  marker.position.y = 1;
  scene.add(marker);

  const resize = () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    renderer.setSize(w, h, false);
    const aspect = w / h;
    const halfH = camera.top;
    camera.left = -halfH * aspect;
    camera.right = halfH * aspect;
    camera.updateProjectionMatrix();
  };
  window.addEventListener('resize', resize);
  resize();

  return { renderer, scene, camera, render: () => renderer.render(scene, camera) };
}
