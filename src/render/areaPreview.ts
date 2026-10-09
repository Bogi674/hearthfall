import * as THREE from 'three';
import type { PreviewItem } from '../input/areas';
import { STOREY_HEIGHT } from '../data/house';
import { GHOST_BAD, GHOST_OK } from './meshes/buildings';
import { PALETTE } from './materials';

// The shape being dragged with a house tool: every floor tile and wall piece it covers, green where it can go and red where it
// cannot, orange where something will come down. It only reads what the input layer hands it.

const CAPACITY = 900;
const CLEAR = PALETTE.ember.clone();
const WHITE = new THREE.Color(1, 1, 1);

export interface AreaPreview {
  show(items: PreviewItem[], storey: number, width: number, height: number, time: number): void;
  hide(): void;
}

export function createAreaPreview(scene: THREE.Scene): AreaPreview {
  const material = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.45, depthWrite: false });
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), material, CAPACITY);
  mesh.count = 0;
  mesh.frustumCulled = false;
  mesh.renderOrder = 9;
  mesh.visible = false;
  scene.add(mesh);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const p = new THREE.Vector3();
  const s = new THREE.Vector3();
  const color = new THREE.Color();
  return {
    show(items, storey, width, height, time) {
      const base = storey * STOREY_HEIGHT;
      let n = 0;
      for (const it of items.slice(0, CAPACITY)) {
        if (it.kind === 'tile') {
          m.compose(p.set(it.x - width / 2, base + 0.06, it.y - height / 2), q, s.set(0.92, 0.06, 0.92));
        } else if (it.side === 'n') {
          m.compose(p.set(it.x - width / 2, base + 0.3, it.y - 0.5 - height / 2), q, s.set(1.05, 0.7, 0.2));
        } else {
          m.compose(p.set(it.x - 0.5 - width / 2, base + 0.3, it.y - height / 2), q, s.set(0.2, 0.7, 1.05));
        }
        mesh.setMatrixAt(n, m);
        mesh.setColorAt(n, color.copy(it.state === 'ok' ? GHOST_OK : it.state === 'bad' ? GHOST_BAD : CLEAR));
        if (it.kind === 'edge') color.lerp(WHITE, 0.35), mesh.setColorAt(n, color);
        n++;
      }
      mesh.count = n;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      material.opacity = 0.42 + Math.sin(time * 6) * 0.08;
      mesh.visible = n > 0;
    },
    hide() {
      mesh.visible = false;
    },
  };
}
