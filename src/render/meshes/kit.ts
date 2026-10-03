import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mixPalette, PALETTE } from '../materials';

// Shared parts for the stylized low poly look (section 12.4): soft edged blocks, palette materials,
// and a timber framed house builder. Every color is a palette color or a mix of two.

const std = (color: THREE.Color, roughness = 0.85) => new THREE.MeshStandardMaterial({ color, roughness, flatShading: true });

export const MAT = {
  wood: std(PALETTE.oldWood),
  darkWood: std(mixPalette(PALETTE.oldWood, PALETTE.warmShadow, 0.55)),
  plaster: std(mixPalette(PALETTE.lantern, PALETTE.oldWood, 0.45), 0.95),
  roofRed: std(mixPalette(PALETTE.ember, PALETTE.warmShadow, 0.5)),
  roofSlate: std(mixPalette(PALETTE.nightBlue, PALETTE.frost, 0.3)),
  thatch: std(mixPalette(PALETTE.lantern, PALETTE.oldWood, 0.55)),
  canvas: std(mixPalette(PALETTE.lantern, PALETTE.frost, 0.35), 1),
  stone: std(mixPalette(PALETTE.nightBlue, PALETTE.frost, 0.5)),
  darkStone: std(mixPalette(PALETTE.nightBlue, PALETTE.frost, 0.25)),
  iron: std(mixPalette(PALETTE.deepCold, PALETTE.frost, 0.3), 0.6),
  snow: std(PALETTE.frost, 1),
  glow: new THREE.MeshBasicMaterial({ color: PALETTE.lantern.clone().multiplyScalar(1.7) }),
  ember: new THREE.MeshBasicMaterial({ color: PALETTE.ember.clone().multiplyScalar(2.2) }),
};

export const GEO = {
  /** Unit block with soft edges, base on the ground. */
  block: new RoundedBoxGeometry(1, 1, 1, 2, 0.08).translate(0, 0.5, 0),
  /** Unit block centered on its origin. */
  centered: new RoundedBoxGeometry(1, 1, 1, 2, 0.08),
  cylinder: new THREE.CylinderGeometry(0.5, 0.5, 1, 12).translate(0, 0.5, 0),
  log: new THREE.CylinderGeometry(0.5, 0.5, 1, 9).rotateZ(Math.PI / 2),
  cone: new THREE.ConeGeometry(0.5, 1, 10).translate(0, 0.5, 0),
  sphere: new THREE.SphereGeometry(0.5, 16, 12),
  dome: new THREE.SphereGeometry(0.5, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
  /** Triangular gable end: base 1 wide on the ground, apex 1 high, thin in z. */
  gable: (() => {
    const shape = new THREE.Shape([new THREE.Vector2(-0.5, 0), new THREE.Vector2(0.5, 0), new THREE.Vector2(0, 1)]);
    return new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false }).translate(0, 0, -0.5);
  })(),
};

type V3 = [number, number, number];

/** A mesh that casts and receives shadows. Rotation is in radians around x, y, z. */
export function part(geo: THREE.BufferGeometry, mat: THREE.Material, at: V3, size: V3, rot: V3 = [0, 0, 0]): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(...at);
  m.scale.set(...size);
  m.rotation.set(...rot);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export interface HouseStyle {
  /** Wall height above the footing. */
  wall: number;
  roof: THREE.Material;
  walls?: THREE.Material;
  chimney?: boolean;
  windows?: number;
  door?: boolean;
  /** Roof pitch as height over half depth. */
  pitch?: number;
  /** Window material, so one house can go dark without dimming every house. */
  glow?: THREE.Material;
}

/** A timber framed house on a stone footing with a gabled roof. Front faces +z. Width along x, depth along z. */
export function house(w: number, d: number, s: HouseStyle): THREE.Group {
  const g = new THREE.Group();
  const foot = 0.18;
  const top = foot + s.wall;
  g.add(part(GEO.block, MAT.stone, [0, 0, 0], [w + 0.1, foot, d + 0.1]));
  g.add(part(GEO.block, s.walls ?? MAT.plaster, [0, foot, 0], [w, s.wall, d]));
  // Timber frame: corner posts and a beam around the top of the walls.
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.add(part(GEO.block, MAT.darkWood, [(x * w) / 2, foot, (z * d) / 2], [0.1, s.wall, 0.1]));
  g.add(part(GEO.block, MAT.darkWood, [0, top - 0.08, d / 2], [w + 0.04, 0.08, 0.08]));
  g.add(part(GEO.block, MAT.darkWood, [0, top - 0.08, -d / 2], [w + 0.04, 0.08, 0.08]));
  if (w > 1.4) g.add(part(GEO.block, MAT.darkWood, [0, foot, d / 2 + 0.01], [0.08, s.wall, 0.04]));

  // Gabled roof: two thick slabs, gable ends, and a ridge beam. The ridge runs along x.
  const rise = (s.pitch ?? 0.75) * (d / 2);
  const slope = Math.atan2(rise, d / 2);
  const len = Math.hypot(rise, d / 2) + 0.18;
  for (const side of [-1, 1]) {
    g.add(part(GEO.centered, s.roof, [0, top + rise / 2 + 0.04, (side * d) / 4], [w + 0.35, 0.09, len], [side * slope, 0, 0]));
  }
  for (const x of [-w / 2 + 0.02, w / 2 - 0.02]) {
    g.add(part(GEO.gable, s.walls ?? MAT.plaster, [x, top, 0], [d, rise, 0.04], [0, Math.PI / 2, 0]));
  }
  g.add(part(GEO.log, MAT.darkWood, [0, top + rise + 0.07, 0], [w + 0.45, 0.1, 0.1]));

  if (s.door !== false) {
    const dx = w > 1.4 ? -w / 4 : 0;
    g.add(part(GEO.block, MAT.darkWood, [dx, foot, d / 2 + 0.02], [0.4, 0.62, 0.05]));
    g.add(part(GEO.block, MAT.wood, [dx, foot, d / 2 + 0.04], [0.3, 0.55, 0.04]));
    g.add(part(GEO.block, MAT.stone, [dx, 0, d / 2 + 0.15], [0.45, 0.1, 0.2]));
  }
  // Windows sit beside the door on wide houses, or centered when there is no door.
  const wide = w > 1.4;
  const xs = s.door === false ? (wide && (s.windows ?? 1) > 1 ? [-w / 4, w / 4] : [0]) : wide ? [w / 4] : [];
  for (const wx of xs.slice(0, s.windows ?? 1)) {
    g.add(part(GEO.block, MAT.darkWood, [wx, foot + s.wall * 0.42, d / 2 + 0.02], [0.32, 0.3, 0.04]));
    g.add(part(GEO.block, s.glow ?? MAT.glow, [wx, foot + s.wall * 0.45, d / 2 + 0.03], [0.22, 0.22, 0.03]));
  }
  // A side window so the house glows from more than one angle.
  g.add(part(GEO.block, s.glow ?? MAT.glow, [w / 2 + 0.02, foot + s.wall * 0.45, 0], [0.03, 0.2, 0.2]));

  if (s.chimney) {
    g.add(part(GEO.block, MAT.stone, [w / 3, top + rise * 0.3, -d / 5], [0.24, rise * 0.9 + 0.35, 0.24]));
    g.add(part(GEO.block, MAT.ember, [w / 3, top + rise * 1.2 + 0.36, -d / 5], [0.16, 0.03, 0.16]));
  }
  return g;
}

/** A stack of logs lying along x. */
export function logPile(n = 3): THREE.Group {
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) {
    const row = i < 2 ? 0 : 1;
    g.add(part(GEO.log, MAT.wood, [0, 0.1 + row * 0.17, (i % 2) * 0.2 - 0.1 + row * 0.1], [0.8, 0.18, 0.18]));
  }
  return g;
}

export function crate(size = 0.3): THREE.Mesh {
  return part(GEO.block, MAT.wood, [0, 0, 0], [size, size, size]);
}

export function barrel(): THREE.Group {
  const g = new THREE.Group();
  g.add(part(GEO.cylinder, MAT.wood, [0, 0, 0], [0.26, 0.34, 0.26]));
  g.add(part(GEO.cylinder, MAT.iron, [0, 0.08, 0], [0.28, 0.04, 0.28]));
  g.add(part(GEO.cylinder, MAT.iron, [0, 0.24, 0], [0.28, 0.04, 0.28]));
  return g;
}

/** Moves an object and returns it, for one line placement inside builders. */
export function at<T extends THREE.Object3D>(o: T, x: number, y: number, z: number, ry = 0): T {
  o.position.set(x, y, z);
  o.rotation.y = ry;
  return o;
}
