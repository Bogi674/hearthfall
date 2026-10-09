import * as THREE from 'three';
import { CameraRig } from './camera';
import { addAmbientLights, followWithShadow, type AmbientLights } from './lighting';
import { installHearthFog, PALETTE } from './materials';
import { createPost } from './post';

// Fog distances are measured from the hearth, in world units.
const FOG_NEAR = 14;
const FOG_FAR = 78;

export interface View {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  fog: THREE.Fog;
  lights: AmbientLights;
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
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const fog = new THREE.Fog(PALETTE.deepCold, FOG_NEAR, FOG_FAR);
  scene.fog = fog;
  const lights = addAmbientLights(scene);
  // The ground uses its own shader, so a transparent catcher plane on top of it shows the shadows.
  const catcher = new THREE.Mesh(
    new THREE.PlaneGeometry(mapSize + 80, mapSize + 80).rotateX(-Math.PI / 2),
    new THREE.ShadowMaterial({ color: PALETTE.deepCold, opacity: 0.55 }),
  );
  catcher.position.y = 0.01;
  catcher.receiveShadow = true;
  scene.add(catcher);

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

  return {
    renderer,
    scene,
    fog,
    lights,
    rig,
    render: (time) => {
      followWithShadow(lights.moon, rig.target);
      post.render(time);
    },
  };
}
