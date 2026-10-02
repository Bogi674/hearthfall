import * as THREE from 'three';
import { PALETTE } from '../materials';

// Health bars, shown only on damaged entities (section 12.5). One instanced mesh for all of them.

export interface Bar {
  x: number;
  z: number;
  y: number;
  /** Remaining health from 0 to 1. */
  fraction: number;
  enemy: boolean;
}

export function createBars(max = 600): { mesh: THREE.InstancedMesh; update(bars: Bar[], yaw: number): void } {
  const mesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 0.08, 0.08).translate(0.5, 0, 0),
    new THREE.MeshBasicMaterial({ depthTest: false }),
    max,
  );
  mesh.renderOrder = 10;
  mesh.frustumCulled = false;
  mesh.count = 0;
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const pos = new THREE.Vector3();
  const scale = new THREE.Vector3();
  const color = { enemy: PALETTE.blight.clone().multiplyScalar(1.5), ally: PALETTE.lantern.clone().multiplyScalar(1.5) };
  return {
    mesh,
    update(bars, yaw) {
      // Bars run along the camera's right vector so they read flat on screen.
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(q);
      const shown = bars.slice(0, max);
      shown.forEach((b, i) => {
        pos.set(b.x - right.x * 0.4, b.y, b.z - right.z * 0.4);
        scale.set(0.8 * Math.max(0.05, b.fraction), 1, 1);
        mesh.setMatrixAt(i, m4.compose(pos, q, scale));
        mesh.setColorAt(i, b.enemy ? color.enemy : color.ally);
      });
      mesh.count = shown.length;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    },
  };
}
