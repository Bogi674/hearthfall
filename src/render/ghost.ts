import * as THREE from 'three';
import type { BuildingType } from '../data/buildings';
import { STOREY_HEIGHT } from '../data/house';
import { createBuildingMesh, GHOST_BAD, GHOST_OK } from './meshes/buildings';

// The ghost of a building being placed (section 14.2): a translucent copy of the real model on a footprint plate,
// green where it can go and red where it cannot. It pulses softly so it reads as a preview, not a building.

export interface BuildingGhost {
  show(type: BuildingType, w: number, h: number, x: number, z: number, ok: boolean, time: number, storey?: number): void;
  hide(): void;
}

export function createBuildingGhost(scene: THREE.Scene): BuildingGhost {
  const root = new THREE.Group();
  root.visible = false;
  scene.add(root);
  const mat = (color: THREE.Color) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5, depthWrite: false });
  const okMat = mat(GHOST_OK);
  const badMat = mat(GHOST_BAD);
  const plateMat = new THREE.MeshBasicMaterial({ color: GHOST_OK, transparent: true, opacity: 0.3, depthWrite: false });
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), plateMat);
  plate.position.y = 0.03;
  root.add(plate);

  const models = new Map<string, THREE.Group>();
  let current: THREE.Group | null = null;
  let currentOk: boolean | null = null;

  const model = (type: BuildingType, w: number, h: number): THREE.Group => {
    const key = `${type}|${w}|${h}`;
    let g = models.get(key);
    if (!g) {
      g = new THREE.Group();
      g.add(createBuildingMesh(type, w, h));
      g.traverse((o) => {
        if (o instanceof THREE.Mesh) o.castShadow = o.receiveShadow = false;
      });
      // Show the first stage of a building with stages, and no finished airship or lamp light in the preview.
      for (const name of ['airship', 'light', 'stage2', 'stage3']) {
        const part = g.getObjectByName(name);
        if (part) part.visible = false;
      }
      g.visible = false;
      root.add(g);
      models.set(key, g);
    }
    return g;
  };

  return {
    show(type, w, h, x, z, ok, time, storey = 0) {
      const g = model(type, w, h);
      if (current !== g) {
        if (current) current.visible = false;
        current = g;
        currentOk = null;
      }
      g.visible = true;
      if (currentOk !== ok) {
        currentOk = ok;
        g.traverse((o) => {
          if (o instanceof THREE.Mesh) o.material = ok ? okMat : badMat;
        });
        plateMat.color.copy(ok ? GHOST_OK : GHOST_BAD);
      }
      const pulse = Math.sin(time * 6);
      okMat.opacity = badMat.opacity = 0.45 + pulse * 0.08;
      plateMat.opacity = 0.28 + pulse * 0.1;
      plate.scale.set(w + 0.1, 1, h + 0.1);
      root.position.set(x, storey * STOREY_HEIGHT, z);
      root.visible = true;
    },
    hide() {
      root.visible = false;
    },
  };
}
