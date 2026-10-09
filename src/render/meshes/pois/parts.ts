import * as THREE from 'three';
import { GEO, MAT, part } from '../kit';

// Small helpers for the place buildings. Sizes are in tiles. Each helper adds one mesh to a group
// and returns the group, so a building reads as a list of pieces.

export type Spot = [number, number, number];

/** A block with its base at y. */
export function box(g: THREE.Object3D, mat: THREE.Material, at: Spot, size: Spot, ry = 0): THREE.Object3D {
  const m = part(GEO.block, mat, at, size, [0, ry, 0]);
  g.add(m);
  return g;
}

/** A gable roof over a w by d footprint. The ridge runs along x unless turned. */
export function gable(g: THREE.Object3D, mat: THREE.Material, at: Spot, w: number, rise: number, d: number, ry = 0): THREE.Object3D {
  g.add(part(GEO.gable, mat, at, [d, rise, w], [0, ry + Math.PI / 2, 0]));
  return g;
}

/** A tall cylinder with its base at y. */
export function tube(g: THREE.Object3D, mat: THREE.Material, at: Spot, radius: number, height: number): THREE.Object3D {
  g.add(part(GEO.cylinder, mat, at, [radius * 2, height, radius * 2]));
  return g;
}

/** A glowing window pane, set into a wall face. The glow is dim so it does not bloom. */
export function pane(g: THREE.Object3D, at: Spot, size: Spot): THREE.Object3D {
  const m = part(GEO.block, MAT.leak, at, size);
  m.castShadow = false;
  g.add(m);
  return g;
}

/** A thin layer of snow on a flat top. */
export function snowCap(g: THREE.Object3D, at: Spot, w: number, d: number): THREE.Object3D {
  g.add(part(GEO.block, MAT.snow, at, [w, 0.06, d]));
  return g;
}

/** A wrecked car body: a lower block, a cabin, and four tires. */
export function wreck(mat: THREE.Material, tilt = 0): THREE.Group {
  const g = new THREE.Group();
  box(g, mat, [0, 0.18, 0], [1.1, 0.26, 0.55]);
  box(g, mat, [-0.05, 0.44, 0], [0.55, 0.22, 0.48]);
  for (const sx of [-0.35, 0.35]) for (const sz of [-0.26, 0.26]) g.add(part(GEO.wheel, MAT.rubber, [sx, 0.16, sz], [0.14, 0.32, 0.32]));
  g.rotation.z = tilt;
  return g;
}

/** A tilted oil drum. */
export function drum(mat: THREE.Material, tilt = 0): THREE.Mesh {
  const m = part(GEO.drum, mat, [0, 0, 0], [0.3, 0.45, 0.3]);
  m.rotation.z = tilt;
  return m;
}

export function at<T extends THREE.Object3D>(o: T, x: number, y: number, z: number, ry = 0): T {
  o.position.add(new THREE.Vector3(x, y, z));
  o.rotation.y = ry;
  return o;
}
