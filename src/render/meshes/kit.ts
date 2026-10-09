import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mixPalette, PALETTE } from '../materials';

// Shared parts for the stylized low poly look (section 12.4): soft edged blocks, scavenged materials,
// and placement helpers. Every color is a palette color or a mix of two.

/** Profile of a ridged sheet: a zigzag strip one unit wide, extruded along y. */
function corrugatedGeometry(ridges: number): THREE.BufferGeometry {
  const top: THREE.Vector2[] = [];
  for (let i = 0; i <= ridges * 2; i++) top.push(new THREE.Vector2(-0.5 + i / (ridges * 2), i % 2 ? 0.5 : -0.5));
  const bottom = top.map((p) => new THREE.Vector2(p.x, p.y - 0.6)).reverse();
  const geo = new THREE.ExtrudeGeometry(new THREE.Shape([...top, ...bottom]), { depth: 1, bevelEnabled: false });
  // The shape lies in x and y. Turn it so the extrusion runs up y and the ridges stick out along z.
  return geo.rotateX(-Math.PI / 2).translate(0, 0, -0.3).scale(1, 1, 1 / 1.6);
}

/** An oil drum: a cylinder with two raised rims, base on the ground. */
function drumGeometry(): THREE.BufferGeometry {
  const pts = [[0, 0], [0.5, 0], [0.5, 0.3], [0.53, 0.32], [0.5, 0.34], [0.5, 0.64], [0.53, 0.66], [0.5, 0.68], [0.5, 1], [0, 1]];
  return new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), 10);
}

/**
 * Darkens a surface near the ground so buildings sit in the snow instead of floating on it (section 12.4).
 * It scales the albedo by height, so lighting still works as before.
 */
function grounded<T extends THREE.MeshStandardMaterial>(mat: T): T {
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying float vGroundY;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGroundY = (modelMatrix * vec4(transformed, 1.0)).y;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vGroundY;')
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb *= mix(0.6, 1.0, smoothstep(0.0, 0.5, vGroundY));');
  };
  return mat;
}

const std = (color: THREE.Color, roughness = 0.85) => grounded(new THREE.MeshStandardMaterial({ color, roughness, flatShading: true }));
const metal = (color: THREE.Color) => grounded(new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.25, flatShading: true }));

export const MAT = {
  wood: std(PALETTE.oldWood),
  darkWood: std(mixPalette(PALETTE.oldWood, PALETTE.warmShadow, 0.55)),
  plaster: std(mixPalette(mixPalette(PALETTE.lantern, PALETTE.oldWood, 0.5), PALETTE.nightBlue, 0.3), 0.95),
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
  // Scavenged materials for the patched up post collapse look.
  rust: std(mixPalette(mixPalette(PALETTE.ember, PALETTE.oldWood, 0.6), PALETTE.warmShadow, 0.55), 0.9),
  rustDark: std(mixPalette(PALETTE.ember, PALETTE.warmShadow, 0.8), 0.9),
  sheet: metal(mixPalette(PALETTE.frost, PALETTE.nightBlue, 0.5)),
  sheetWarm: metal(mixPalette(PALETTE.frost, PALETTE.oldWood, 0.45)),
  paintBlue: std(mixPalette(PALETTE.nightBlue, PALETTE.frost, 0.5)),
  paintRed: std(mixPalette(PALETTE.ember, PALETTE.warmShadow, 0.3)),
  paintYellow: std(mixPalette(PALETTE.lantern, PALETTE.oldWood, 0.25)),
  tarpBlue: std(mixPalette(PALETTE.nightBlue, PALETTE.frost, 0.4), 1),
  tarpOlive: std(mixPalette(PALETTE.lantern, PALETTE.nightBlue, 0.62), 1),
  tarpRust: std(mixPalette(PALETTE.ember, PALETTE.oldWood, 0.55), 1),
  cloth: std(mixPalette(PALETTE.frost, PALETTE.lantern, 0.3), 1),
  burlap: std(mixPalette(mixPalette(PALETTE.lantern, PALETTE.oldWood, 0.5), PALETTE.frost, 0.12), 1),
  rope: std(mixPalette(PALETTE.lantern, PALETTE.oldWood, 0.4), 1),
  rubber: std(mixPalette(PALETTE.warmShadow, PALETTE.deepCold, 0.5), 1),
  concrete: std(mixPalette(PALETTE.frost, PALETTE.warmShadow, 0.42), 1),
  brick: std(mixPalette(mixPalette(PALETTE.oldWood, PALETTE.ember, 0.35), PALETTE.warmShadow, 0.3), 0.95),
  earth: std(mixPalette(PALETTE.oldWood, PALETTE.nightBlue, 0.25), 1),
  herb: std(mixPalette(PALETTE.lantern, PALETTE.nightBlue, 0.5), 1),
  soot: std(mixPalette(PALETTE.warmShadow, PALETTE.nightBlue, 0.3), 1),
  /** Dim warm light leaking through gaps, softer than a lamp so it does not bloom as hard. */
  leak: new THREE.MeshBasicMaterial({ color: PALETTE.lantern.clone().multiplyScalar(1.15) }),
  smoke: new THREE.MeshBasicMaterial({ color: mixPalette(PALETTE.frost, PALETTE.nightBlue, 0.25), transparent: true, opacity: 0.3, depthWrite: false }),
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
  /** Right triangle prism: 1 long in x, rising to 1 high at the -x end, 1 deep in z centered. */
  wedge: (() => {
    const shape = new THREE.Shape([new THREE.Vector2(-0.5, 0), new THREE.Vector2(0.5, 0), new THREE.Vector2(-0.5, 1)]);
    return new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false }).translate(0, 0, -0.5);
  })(),
  /** Ridged metal sheet: 1 wide in x, 1 tall in y from the ground, ridges about 1 deep in z before scaling. */
  corrugated: corrugatedGeometry(5),
  /** A thin rod centered on its origin along y, for ropes, pipes, poles, and braces. */
  rod: new THREE.CylinderGeometry(0.5, 0.5, 1, 6),
  /** A pipe with its base on the ground. */
  pipe: new THREE.CylinderGeometry(0.5, 0.5, 1, 8).translate(0, 0.5, 0),
  drum: drumGeometry(),
  /** A tire lying flat, centered on its origin. */
  tire: new THREE.TorusGeometry(0.36, 0.16, 5, 10).rotateX(Math.PI / 2),
  /** A soft pillow block for sandbags and sacks, centered on its origin. */
  pillow: new RoundedBoxGeometry(1, 1, 1, 2, 0.32),
  rock: new THREE.DodecahedronGeometry(0.5, 0),
  /** A wheel with its axle along x, centered on its origin. */
  wheel: new THREE.CylinderGeometry(0.5, 0.5, 1, 10).rotateZ(Math.PI / 2),
  /** A four sided spike or pyramid, base on the ground. */
  spike: new THREE.ConeGeometry(0.5, 1, 4).translate(0, 0.5, 0),
  /** A small bulb for string lights. */
  bulb: new THREE.OctahedronGeometry(0.5, 0),
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

/** Moves an object and returns it, for one line placement inside builders. */
export function at<T extends THREE.Object3D>(o: T, x: number, y: number, z: number, ry = 0): T {
  o.position.set(x, y, z);
  o.rotation.y = ry;
  return o;
}

const UP = new THREE.Vector3(0, 1, 0);

/** A rod of the given thickness from point a to point b, for ropes, pipes, poles, and braces. */
export function link(mat: THREE.Material, a: V3, b: V3, thick: number, geo: THREE.BufferGeometry = GEO.rod): THREE.Mesh {
  const from = new THREE.Vector3(...a);
  const dir = new THREE.Vector3(...b).sub(from);
  const m = part(geo, mat, [0, 0, 0], [thick, dir.length(), thick]);
  m.position.copy(from).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(UP, dir.normalize());
  return m;
}

/** A glowing part that does not cast shadows. */
export function glowPart(mat: THREE.Material, at: V3, size: V3, geo: THREE.BufferGeometry = GEO.centered): THREE.Mesh {
  const m = part(geo, mat, at, size);
  m.castShadow = false;
  return m;
}
