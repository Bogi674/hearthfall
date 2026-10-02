import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ENEMY_TYPES, type EnemyType } from '../../data/enemies';
import type { Enemy } from '../../sim/world';
import { mixPalette, PALETTE } from '../materials';

// Monsters: hunched dark bodies with glowing Blight eyes that read in darkness (section 12.5).

const SIZE: Record<EnemyType, [number, number, number]> = {
  shambler: [0.45, 0.9, 0.35],
  runner: [0.3, 0.7, 0.3],
  brute: [0.9, 1.5, 0.7],
};
const MAX = 300;

export interface EnemyMeshes {
  group: THREE.Group;
  update(enemies: Enemy[], alpha: number, ox: number, oz: number): void;
}

export function createEnemyMeshes(): EnemyMeshes {
  const group = new THREE.Group();
  const bodyGeo = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
  const eyeGeo = mergeGeometries([
    new THREE.BoxGeometry(0.16, 0.1, 0.05).translate(-0.2, 0.8, 0.5),
    new THREE.BoxGeometry(0.16, 0.1, 0.05).translate(0.2, 0.8, 0.5),
  ]);
  const skin = new THREE.MeshStandardMaterial({ color: mixPalette(PALETTE.deepCold, PALETTE.warmShadow, 0.5), roughness: 1 });
  // Eyes ignore fog so they glow even at the dark map edges.
  const eyes = new THREE.MeshBasicMaterial({ color: PALETTE.blight.clone().multiplyScalar(3), fog: false });
  const bodies = Object.fromEntries(ENEMY_TYPES.map((t) => [t, new THREE.InstancedMesh(bodyGeo, skin, MAX)])) as Record<EnemyType, THREE.InstancedMesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>>;
  const eyeMesh = new THREE.InstancedMesh(eyeGeo, eyes, MAX);
  for (const m of [...Object.values(bodies), eyeMesh]) {
    m.count = 0;
    m.frustumCulled = false;
    group.add(m);
  }

  const heading = new Map<number, number>();
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const pos = new THREE.Vector3();
  const scale = new THREE.Vector3();

  return {
    group,
    update(enemies, alpha, ox, oz) {
      const counts = Object.fromEntries(ENEMY_TYPES.map((t) => [t, 0])) as Record<EnemyType, number>;
      let eyesN = 0;
      for (const e of enemies) {
        const dx = e.x - e.px;
        const dy = e.y - e.py;
        if (dx || dy) heading.set(e.id, Math.atan2(dx, dy));
        pos.set(e.px + dx * alpha - ox, 0, e.py + dy * alpha - oz);
        q.setFromAxisAngle(up, heading.get(e.id) ?? 0);
        scale.set(...SIZE[e.type]);
        m4.compose(pos, q, scale);
        bodies[e.type].setMatrixAt(counts[e.type]++, m4);
        eyeMesh.setMatrixAt(eyesN++, m4);
      }
      for (const t of ENEMY_TYPES) {
        bodies[t].count = counts[t];
        bodies[t].instanceMatrix.needsUpdate = true;
      }
      eyeMesh.count = eyesN;
      eyeMesh.instanceMatrix.needsUpdate = true;
      if (heading.size > MAX * 2) heading.clear();
    },
  };
}
