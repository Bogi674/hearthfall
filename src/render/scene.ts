import * as THREE from 'three';
import { CameraRig } from './camera';
import { addAmbientLights } from './lighting';
import { installHearthFog, PALETTE } from './materials';
import { createPost } from './post';

// Fog distances are measured from the hearth, in world units.
const FOG_NEAR = 10;
const FOG_FAR = 52;

export interface View {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  fog: THREE.Fog;
  rig: CameraRig;
  render(time: number): void;
}

export function createView(container: HTMLElement, mapSize: number): View {
  installHearthFog();

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(PALETTE.deepCold);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const fog = new THREE.Fog(PALETTE.deepCold, FOG_NEAR, FOG_FAR);
  scene.fog = fog;
  addAmbientLights(scene);

  const rig = new CameraRig(mapSize / 2);
  const post = createPost(renderer, scene, rig.camera);

  const resize = () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    renderer.setSize(w, h, false);
    post.setSize(w, h);
    rig.setAspect(w / h);
  };
  window.addEventListener('resize', resize);
  resize();

  return { renderer, scene, fog, rig, render: (time) => post.render(time) };
}
