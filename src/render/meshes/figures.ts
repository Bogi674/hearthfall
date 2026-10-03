import * as THREE from 'three';
import type { EnemyType } from '../../data/enemies';
import { mixPalette, PALETTE } from '../materials';

// Procedural characters built from simple parts. Each part is one InstancedMesh, so a crowd stays cheap.
// Limbs hang from a pivot at their top and swing while the figure walks.

type Vec = [number, number, number];

interface Part {
  geo: THREE.BufferGeometry;
  mat: THREE.Material;
  at: Vec;
  size: Vec;
  rot?: Vec;
  /** Swing amplitude in radians around the x axis while walking. The sign sets the phase. */
  swing?: number;
  /** Per figure color from instance colors. */
  tinted?: boolean;
}

export interface Figure {
  id: number;
  x: number;
  z: number;
  yaw: number;
  moving: boolean;
}

const box = new THREE.BoxGeometry(1, 1, 1);
const limb = new THREE.BoxGeometry(1, 1, 1).translate(0, -0.5, 0);
const ball = new THREE.SphereGeometry(0.5, 12, 8);
const spike = new THREE.ConeGeometry(0.5, 1, 6).translate(0, 0.5, 0);

const std = (color: THREE.Color) => new THREE.MeshStandardMaterial({ color, roughness: 0.9 });
// Monster eyes and wounds glow and ignore fog so they read in the dark (sections 12.3 and 12.5).
const blight = new THREE.MeshBasicMaterial({ color: PALETTE.blight.clone().multiplyScalar(3), fog: false });
// Wounds and sacs glow less than eyes, so bloom does not swallow the body.
const wound = new THREE.MeshBasicMaterial({ color: mixPalette(PALETTE.blight, PALETTE.deepCold, 0.35) });

const coat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
const skin = std(mixPalette(PALETTE.lantern, PALETTE.oldWood, 0.35));
const trousers = std(mixPalette(PALETTE.warmShadow, PALETTE.nightBlue, 0.4));
const knit = std(mixPalette(PALETTE.ember, PALETTE.warmShadow, 0.35));
const scarf = std(mixPalette(PALETTE.lantern, PALETTE.ember, 0.4));
const pack = std(mixPalette(PALETTE.oldWood, PALETTE.warmShadow, 0.5));

/** Coat colors, picked per colonist so the group reads as different people. */
export const COAT_COLORS = [
  PALETTE.oldWood,
  mixPalette(PALETTE.oldWood, PALETTE.ember, 0.35),
  mixPalette(PALETTE.nightBlue, PALETTE.frost, 0.35),
  mixPalette(PALETTE.warmShadow, PALETTE.lantern, 0.3),
];

export const COLONIST_RIG: Part[] = [
  { geo: limb, mat: trousers, at: [-0.07, 0.34, 0], size: [0.09, 0.33, 0.1], swing: 0.6 },
  { geo: limb, mat: trousers, at: [0.07, 0.34, 0], size: [0.09, 0.33, 0.1], swing: -0.6 },
  { geo: box, mat: coat, at: [0, 0.5, 0], size: [0.28, 0.34, 0.18], tinted: true },
  { geo: box, mat: pack, at: [0, 0.52, -0.13], size: [0.2, 0.24, 0.09] },
  { geo: limb, mat: coat, at: [-0.18, 0.65, 0], size: [0.075, 0.3, 0.085], swing: -0.5, tinted: true },
  { geo: limb, mat: coat, at: [0.18, 0.65, 0], size: [0.075, 0.3, 0.085], swing: 0.5, tinted: true },
  { geo: box, mat: scarf, at: [0, 0.69, 0.01], size: [0.24, 0.06, 0.2] },
  { geo: ball, mat: skin, at: [0, 0.79, 0], size: [0.19, 0.2, 0.19] },
  { geo: ball, mat: knit, at: [0, 0.85, -0.01], size: [0.2, 0.13, 0.2] },
];

const hide = std(mixPalette(PALETTE.deepCold, PALETTE.warmShadow, 0.55));
const pale = std(mixPalette(PALETTE.nightBlue, PALETTE.frost, 0.25));
const bulk = std(mixPalette(PALETTE.warmShadow, PALETTE.nightBlue, 0.5));

export const ENEMY_RIGS: Record<EnemyType, Part[]> = {
  shambler: [
    { geo: limb, mat: hide, at: [-0.08, 0.4, 0], size: [0.1, 0.4, 0.12], swing: 0.35 },
    { geo: limb, mat: hide, at: [0.08, 0.4, 0], size: [0.1, 0.4, 0.12], swing: -0.35 },
    { geo: box, mat: hide, at: [0, 0.6, 0.05], size: [0.32, 0.42, 0.2], rot: [0.45, 0, 0] },
    { geo: box, mat: wound, at: [0.06, 0.6, 0.16], size: [0.1, 0.08, 0.02], rot: [0.45, 0, 0] },
    { geo: limb, mat: pale, at: [-0.2, 0.74, 0.12], size: [0.08, 0.46, 0.08], rot: [-1.15, 0, 0], swing: 0.15 },
    { geo: limb, mat: pale, at: [0.2, 0.74, 0.12], size: [0.08, 0.46, 0.08], rot: [-1.15, 0, 0], swing: -0.15 },
    { geo: ball, mat: pale, at: [0, 0.86, 0.2], size: [0.2, 0.21, 0.2] },
    { geo: box, mat: blight, at: [-0.05, 0.88, 0.3], size: [0.05, 0.03, 0.02] },
    { geo: box, mat: blight, at: [0.05, 0.88, 0.3], size: [0.05, 0.03, 0.02] },
  ],
  runner: [
    { geo: limb, mat: hide, at: [-0.07, 0.45, 0], size: [0.07, 0.46, 0.08], swing: 0.9 },
    { geo: limb, mat: hide, at: [0.07, 0.45, 0], size: [0.07, 0.46, 0.08], swing: -0.9 },
    { geo: box, mat: hide, at: [0, 0.6, 0.1], size: [0.22, 0.32, 0.14], rot: [0.9, 0, 0] },
    { geo: limb, mat: pale, at: [-0.13, 0.68, 0.12], size: [0.05, 0.36, 0.05], rot: [0.7, 0, 0], swing: -0.4 },
    { geo: limb, mat: pale, at: [0.13, 0.68, 0.12], size: [0.05, 0.36, 0.05], rot: [0.7, 0, 0], swing: 0.4 },
    { geo: ball, mat: pale, at: [0, 0.71, 0.3], size: [0.16, 0.16, 0.2] },
    { geo: box, mat: blight, at: [-0.04, 0.73, 0.4], size: [0.04, 0.03, 0.02] },
    { geo: box, mat: blight, at: [0.04, 0.73, 0.4], size: [0.04, 0.03, 0.02] },
  ],
  brute: [
    { geo: limb, mat: bulk, at: [-0.17, 0.45, 0], size: [0.2, 0.45, 0.22], swing: 0.3 },
    { geo: limb, mat: bulk, at: [0.17, 0.45, 0], size: [0.2, 0.45, 0.22], swing: -0.3 },
    { geo: box, mat: bulk, at: [0, 0.8, 0], size: [0.75, 0.6, 0.45], rot: [0.2, 0, 0] },
    { geo: box, mat: wound, at: [-0.15, 0.85, 0.24], size: [0.16, 0.12, 0.02], rot: [0.2, 0, 0] },
    { geo: limb, mat: hide, at: [-0.5, 1.02, 0.05], size: [0.22, 0.75, 0.24], rot: [-0.3, 0, 0], swing: 0.3 },
    { geo: limb, mat: hide, at: [0.5, 1.02, 0.05], size: [0.22, 0.75, 0.24], rot: [-0.3, 0, 0], swing: -0.3 },
    { geo: spike, mat: pale, at: [-0.3, 1.08, -0.05], size: [0.1, 0.22, 0.1] },
    { geo: spike, mat: pale, at: [0.3, 1.08, -0.05], size: [0.1, 0.22, 0.1] },
    { geo: ball, mat: pale, at: [0, 1.17, 0.2], size: [0.22, 0.22, 0.22] },
    { geo: box, mat: blight, at: [-0.06, 1.19, 0.31], size: [0.06, 0.03, 0.02] },
    { geo: box, mat: blight, at: [0.06, 1.19, 0.31], size: [0.06, 0.03, 0.02] },
  ],
  hordeMother: [
    ...[-1, 1].flatMap((sx) =>
      [-1, 1].map((sz): Part => ({ geo: limb, mat: hide, at: [sx * 0.55, 1.0, sz * 0.45], size: [0.18, 1.05, 0.18], rot: [sz * 0.45, 0, sx * 0.45], swing: sx * sz * 0.25 })),
    ),
    { geo: ball, mat: bulk, at: [0, 1.35, 0], size: [1.5, 1.25, 1.8] },
    { geo: ball, mat: wound, at: [-0.45, 1.75, -0.45], size: [0.3, 0.3, 0.3] },
    { geo: ball, mat: wound, at: [0.4, 1.65, -0.6], size: [0.26, 0.26, 0.26] },
    { geo: ball, mat: wound, at: [0.1, 1.95, -0.2], size: [0.22, 0.22, 0.22] },
    ...[-0.5, -0.15, 0.2, 0.5].map((z, i): Part => ({ geo: spike, mat: pale, at: [i % 2 ? 0.15 : -0.15, 1.85, z], size: [0.14, 0.55, 0.14], rot: [-0.3, 0, 0] })),
    { geo: ball, mat: pale, at: [0, 1.55, 0.95], size: [0.55, 0.45, 0.5] },
    ...[-0.16, -0.06, 0.06, 0.16].map((x): Part => ({ geo: box, mat: blight, at: [x, 1.6, 1.2], size: [0.06, 0.05, 0.02] })),
  ],
};

export interface FigureSet {
  group: THREE.Group;
  update(figures: Figure[], time: number, stride: number, colorOf?: (id: number) => THREE.Color): void;
}

export function createFigureSet(rig: Part[], max: number, scale = 1): FigureSet {
  const group = new THREE.Group();
  const meshes = rig.map((p) => {
    const m = new THREE.InstancedMesh(p.geo, p.mat, max);
    if (p.tinted) m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3);
    m.count = 0;
    m.frustumCulled = false;
    group.add(m);
    return m;
  });
  const base = new THREE.Matrix4();
  const local = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const v = new THREE.Vector3();
  const size = new THREE.Vector3();
  const s = new THREE.Vector3(scale, scale, scale);
  const up = new THREE.Vector3(0, 1, 0);

  return {
    group,
    update(figures, time, stride, colorOf) {
      const shown = figures.slice(0, max);
      shown.forEach((f, i) => {
        base.compose(v.set(f.x, 0, f.z), q.setFromAxisAngle(up, f.yaw), s);
        const phase = f.moving ? Math.sin(time * stride + f.id * 1.7) : 0;
        rig.forEach((p, k) => {
          const r = p.rot ?? [0, 0, 0];
          e.set(r[0] + (p.swing ?? 0) * phase, r[1], r[2]);
          local.compose(v.set(...p.at), q.setFromEuler(e), size.set(...p.size));
          meshes[k].setMatrixAt(i, local.premultiply(base));
          if (p.tinted && colorOf) meshes[k].setColorAt(i, colorOf(f.id));
        });
      });
      for (const m of meshes) {
        m.count = shown.length;
        m.instanceMatrix.needsUpdate = true;
        if (m.instanceColor) m.instanceColor.needsUpdate = true;
      }
    },
  };
}
