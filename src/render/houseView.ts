import * as THREE from 'three';
import { EDGES, FLOORS } from '../data/house';
import type { World } from '../sim/world';
import { mixPalette, PALETTE } from './materials';

// Floors, walls, doors, and windows of the house layer (M10.1). Reads the world and never writes to it.
// Pieces rise out of the ground as builders work on them. Rebuilt every frame since the counts are small.

const CAPACITY = 900;
const WALL_HEIGHT = 1.15;
const THICK = 0.14;

const FLOOR_COLOR = { boards: mixPalette(PALETTE.oldWood, PALETTE.lantern, 0.3), stone: mixPalette(PALETTE.nightBlue, PALETTE.frost, 0.45) };
const WALL_COLOR = [
  mixPalette(PALETTE.oldWood, PALETTE.lantern, 0.12),
  mixPalette(mixPalette(PALETTE.ember, PALETTE.oldWood, 0.6), PALETTE.warmShadow, 0.35),
  mixPalette(PALETTE.nightBlue, PALETTE.frost, 0.5),
  mixPalette(PALETTE.deepCold, PALETTE.frost, 0.4),
];
const DOOR_COLOR = mixPalette(PALETTE.oldWood, PALETTE.warmShadow, 0.45);
const WINDOW_COLOR = PALETTE.lantern.clone().multiplyScalar(1.4);

function instanced(geometry: THREE.BufferGeometry, material: THREE.Material, shadow: boolean): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(geometry, material, CAPACITY);
  mesh.count = 0;
  mesh.castShadow = shadow;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  return mesh;
}

export interface HouseView {
  update(world: World): void;
}

export function createHouseView(scene: THREE.Scene): HouseView {
  const block = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
  const solid = new THREE.MeshStandardMaterial({ roughness: 0.9 });
  const glass = new THREE.MeshBasicMaterial();
  const floors = instanced(block, solid, false);
  const walls = instanced(block, solid, true);
  const doors = instanced(block, solid, true);
  const windows = instanced(block, glass, false);
  scene.add(floors, walls, doors, windows);

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const p = new THREE.Vector3();
  const s = new THREE.Vector3();
  const tint = new THREE.Color();

  const put = (mesh: THREE.InstancedMesh, x: number, y: number, z: number, sx: number, sy: number, sz: number, color: THREE.Color) => {
    if (mesh.count >= CAPACITY) return;
    m.compose(p.set(x, y, z), q, s.set(sx, sy, sz));
    mesh.setMatrixAt(mesh.count, m);
    mesh.setColorAt(mesh.count, color);
    mesh.count++;
  };

  return {
    update(w) {
      const ox = w.map.width / 2;
      const oy = w.map.height / 2;
      for (const mesh of [floors, walls, doors, windows]) mesh.count = 0;
      for (const f of w.house.floors) {
        const done = 1 - f.construct / FLOORS[f.kind].build;
        put(floors, f.x - ox, 0, f.y - oy, 1, 0.03 + 0.05 * done, 1, f.construct > 0 ? tint.copy(FLOOR_COLOR[f.kind]).multiplyScalar(0.6) : FLOOR_COLOR[f.kind]);
      }
      for (const e of w.house.edges) {
        const level = EDGES[e.kind].levels[e.level - 1];
        const rise = e.construct > 0 ? 0.08 + 0.92 * (1 - e.construct / level.build) : 1;
        const x = e.side === 'w' ? e.x - 0.5 - ox : e.x - ox;
        const z = e.side === 'n' ? e.y - 0.5 - oy : e.y - oy;
        const [sx, sz] = e.side === 'n' ? [1 + THICK, THICK] : [THICK, 1 + THICK];
        if (e.kind === 'window') put(windows, x, 0.25 * rise, z, sx * 0.96, 0.6 * rise, sz * 0.96, WINDOW_COLOR);
        const color = tint.copy(e.kind === 'door' ? DOOR_COLOR : WALL_COLOR[e.kind === 'wall' ? e.level - 1 : e.level === 1 ? 0 : 1]);
        if (e.construct > 0) color.multiplyScalar(0.7);
        if (e.kind === 'door') put(doors, x, 0, z, sx * 0.7, 0.95 * rise, sz * 0.7, color);
        else if (e.kind === 'window') {
          // Sill and lintel around the glass.
          put(walls, x, 0, z, sx, 0.25 * rise, sz, color);
          put(walls, x, 0.85 * rise, z, sx, 0.3 * rise, sz, color);
        } else put(walls, x, 0, z, sx, WALL_HEIGHT * rise, sz, color);
      }
      for (const mesh of [floors, walls, doors, windows]) {
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      }
    },
  };
}
