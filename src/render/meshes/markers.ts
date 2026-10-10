import * as THREE from 'three';
import { PALETTE } from '../materials';
import { GEO, glowPart, MAT, part } from './kit';

// Small map markers (M12): the locked tin box of the stash, and the half built place for a moved hearth.

const glowMat = new THREE.MeshBasicMaterial({ color: PALETTE.lantern.clone().multiplyScalar(1.6), transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false });

export interface StashMesh {
  group: THREE.Group;
  update(time: number, state: 'hidden' | 'found' | 'opened'): void;
}

/** A tin box with a lid, a glint above it while it waits, and the lid tipped open once it is opened. */
export function createStashMesh(): StashMesh {
  const group = new THREE.Group();
  group.add(part(GEO.block, MAT.iron, [0, 0, 0], [0.5, 0.26, 0.36]));
  const lid = new THREE.Group();
  lid.position.set(0, 0.26, -0.18);
  lid.add(part(GEO.block, MAT.darkStone, [0, 0, 0.18], [0.52, 0.06, 0.38]));
  group.add(lid);
  const glint = glowPart(glowMat, [0, 0.8, 0], [0.12, 0.12, 0.12], GEO.sphere);
  group.add(glint);
  return {
    group,
    update(time, state) {
      group.visible = state !== 'hidden';
      lid.rotation.x = state === 'opened' ? -1.1 : 0;
      glint.visible = state === 'found';
      glint.position.y = 0.7 + Math.sin(time * 3) * 0.08;
    },
  };
}

export interface HearthSiteMesh {
  group: THREE.Group;
  update(time: number, show: boolean, done: number): void;
}

/** Stones laid out in a ring where the hearth will stand, rising as the crew works. */
export function createHearthSiteMesh(): HearthSiteMesh {
  const group = new THREE.Group();
  const stones: THREE.Mesh[] = [];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const s = part(GEO.centered, MAT.stone, [Math.cos(a) * 0.4, 0.07, Math.sin(a) * 0.4], [0.18, 0.14, 0.16], [0, a, 0]);
    stones.push(s);
    group.add(s);
  }
  group.add(glowPart(glowMat, [0, 0.03, 0], [0.7, 0.03, 0.7], GEO.cylinder));
  group.visible = false;
  return {
    group,
    update(_time, show, done) {
      group.visible = show;
      stones.forEach((s, i) => (s.visible = i / stones.length <= done + 0.01));
    },
  };
}
