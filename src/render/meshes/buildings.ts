import * as THREE from 'three';
import type { BuildingType } from '../../data/buildings';
import { mixPalette, PALETTE } from '../materials';

// Procedural buildings: a wooden body, a hip roof, and a glowing window. Tents are a single ridge.

const body = new THREE.MeshStandardMaterial({ color: PALETTE.oldWood, roughness: 0.9 });
const roof = new THREE.MeshStandardMaterial({ color: PALETTE.warmShadow, roughness: 1 });
const canvas = new THREE.MeshStandardMaterial({ color: mixPalette(PALETTE.oldWood, PALETTE.lantern, 0.35), roughness: 1 });
const stone = new THREE.MeshStandardMaterial({ color: mixPalette(PALETTE.nightBlue, PALETTE.frost, 0.45), roughness: 1 });
const glow = new THREE.MeshBasicMaterial({ color: PALETTE.lantern.clone().multiplyScalar(1.6) });
const ember = new THREE.MeshBasicMaterial({ color: PALETTE.ember.clone().multiplyScalar(2) });
const box = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
const pyramid = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4).rotateY(Math.PI / 4).translate(0, 0.5, 0);
// Triangular prism along x, one unit wide and long, apex up, base on the ground.
const R = 1 / Math.sqrt(3);
const ridge = new THREE.CylinderGeometry(R, R, 1, 3).rotateZ(Math.PI / 2).rotateX(-Math.PI / 2).translate(0, R / 2, 0);

/** Body height and whether the building has a smoking chimney. */
const LOOK: Record<BuildingType, { height: number; chimney?: boolean; stoneBody?: boolean }> = {
  tent: { height: 0 },
  bunkhouse: { height: 1.3 },
  storageShed: { height: 1.1 },
  woodcutterCamp: { height: 0.8 },
  salvageYard: { height: 0.7 },
  quarry: { height: 0.6, stoneBody: true },
  foragerHut: { height: 0.8 },
  kitchen: { height: 1, chimney: true },
  sawmill: { height: 1 },
  charcoalKiln: { height: 0.9, chimney: true, stoneBody: true },
};

function part(geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, sx: number, sy: number, sz: number) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  return m;
}

export function createBuildingMesh(type: BuildingType, w: number, h: number): THREE.Group {
  const g = new THREE.Group();
  const look = LOOK[type];
  const bw = w - 0.3;
  const bd = h - 0.3;
  if (type === 'tent') {
    g.add(part(ridge, canvas, 0, 0, 0, bw, 1.1, bd));
    g.add(part(box, glow, bw / 2 + 0.01, 0, 0, 0.02, 0.4, 0.3));
    return g;
  }
  g.add(part(box, look.stoneBody ? stone : body, 0, 0, 0, bw, look.height, bd));
  g.add(part(pyramid, roof, 0, look.height, 0, bw + 0.2, 0.7, bd + 0.2));
  g.add(part(box, glow, 0, look.height * 0.3, bd / 2 + 0.01, 0.35, 0.3, 0.02));
  if (look.chimney) {
    g.add(part(box, stone, bw / 3, look.height, -bd / 4, 0.3, 0.9, 0.3));
    g.add(part(box, ember, bw / 3, look.height + 0.9, -bd / 4, 0.22, 0.05, 0.22));
  }
  return g;
}

export function createColonistMesh(max: number): THREE.InstancedMesh {
  const geo = new THREE.CapsuleGeometry(0.2, 0.5, 3, 8).translate(0, 0.45, 0);
  const mesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: mixPalette(PALETTE.oldWood, PALETTE.lantern, 0.5) }), max);
  mesh.count = 0;
  return mesh;
}

export const GHOST_OK = PALETTE.lantern;
export const GHOST_BAD = mixPalette(PALETTE.ember, PALETTE.warmShadow, 0.4);

export function createGhost(): THREE.Mesh<THREE.BoxGeometry, THREE.MeshBasicMaterial> {
  const ghost = new THREE.Mesh(box, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.45, depthWrite: false }));
  ghost.visible = false;
  return ghost;
}
