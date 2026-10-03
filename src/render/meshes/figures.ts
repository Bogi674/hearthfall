import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { EnemyType } from '../../data/enemies';
import { mixPalette, PALETTE } from '../materials';

// Procedural characters in the chunky low poly style (section 12.4). Each part is one InstancedMesh,
// so a crowd stays cheap. Limbs hang from a pivot and swing while the figure walks. A part with an
// offset rides on its pivot, so gloves, boots, and claws follow the limb they belong to.

type Vec = [number, number, number];

interface Part {
  geo: THREE.BufferGeometry;
  mat: THREE.Material;
  /** Pivot position. */
  at: Vec;
  size: Vec;
  rot?: Vec;
  /** Position relative to the pivot after rotation, for parts at the end of a limb. */
  offset?: Vec;
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

const block = new RoundedBoxGeometry(1, 1, 1, 2, 0.12);
const limb = new THREE.CapsuleGeometry(0.5, 0.6, 3, 8).scale(1, 0.62, 1).translate(0, -0.5, 0);
const ball = new THREE.SphereGeometry(0.5, 16, 12);
const cone = new THREE.ConeGeometry(0.5, 1, 12).translate(0, 0.5, 0);
const tunic = new THREE.CylinderGeometry(0.42, 0.5, 1, 12);
const flare = new THREE.CylinderGeometry(0.5, 0.62, 1, 12);
const disc = new THREE.CylinderGeometry(0.5, 0.5, 1, 14);

const std = (color: THREE.Color) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, flatShading: true });
// Monster eyes glow and ignore fog so they read in the dark (sections 12.3 and 12.5).
const blight = new THREE.MeshBasicMaterial({ color: PALETTE.blight.clone().multiplyScalar(3), fog: false });
// Wounds and sacs glow less than eyes, so bloom does not swallow the body.
const wound = new THREE.MeshBasicMaterial({ color: mixPalette(PALETTE.blight, PALETTE.deepCold, 0.35) });
// Colonist eyes are two bright dots under the hood, like the reference character.
const eye = new THREE.MeshBasicMaterial({ color: PALETTE.frost.clone().multiplyScalar(1.4) });

const cloth = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, flatShading: true });
const face = std(mixPalette(PALETTE.warmShadow, PALETTE.oldWood, 0.3));
const trousers = std(mixPalette(PALETTE.warmShadow, PALETTE.nightBlue, 0.35));
const leather = std(mixPalette(PALETTE.oldWood, PALETTE.warmShadow, 0.55));
const brass = std(mixPalette(PALETTE.lantern, PALETTE.oldWood, 0.35));
const pack = std(mixPalette(PALETTE.oldWood, PALETTE.lantern, 0.2));

/** Tunic and hat colors, picked per colonist so the group reads as different people. */
export const COAT_COLORS = [
  mixPalette(PALETTE.ember, PALETTE.warmShadow, 0.3),
  mixPalette(PALETTE.nightBlue, PALETTE.frost, 0.4),
  PALETTE.oldWood,
  mixPalette(PALETTE.lantern, PALETTE.oldWood, 0.45),
];

const pair = (make: (side: number) => Part): Part[] => [make(-1), make(1)];

export const COLONIST_RIG: Part[] = [
  ...pair((s) => ({ geo: limb, mat: trousers, at: [s * 0.07, 0.38, 0], size: [0.1, 0.3, 0.1], swing: s * 0.6 })),
  ...pair((s) => ({ geo: block, mat: leather, at: [s * 0.07, 0.38, 0], offset: [0, -0.34, 0.025], size: [0.12, 0.09, 0.17], swing: s * 0.6 })),
  { geo: flare, mat: cloth, at: [0, 0.37, 0], size: [0.34, 0.1, 0.26], tinted: true },
  { geo: tunic, mat: cloth, at: [0, 0.54, 0], size: [0.31, 0.33, 0.23], tinted: true },
  { geo: disc, mat: leather, at: [0, 0.43, 0], size: [0.33, 0.045, 0.25] },
  { geo: block, mat: brass, at: [0, 0.43, 0.125], size: [0.07, 0.055, 0.025] },
  { geo: block, mat: leather, at: [0, 0.55, 0.115], size: [0.035, 0.38, 0.02], rot: [0, 0, 0.65] },
  { geo: block, mat: pack, at: [0, 0.55, -0.15], size: [0.2, 0.22, 0.09] },
  ...pair((s) => ({ geo: limb, mat: cloth, at: [s * 0.19, 0.68, 0], size: [0.085, 0.27, 0.085], rot: [0, 0, s * 0.18], swing: -s * 0.5, tinted: true })),
  ...pair((s) => ({ geo: ball, mat: leather, at: [s * 0.19, 0.68, 0], offset: [0, -0.3, 0], size: [0.1, 0.1, 0.1], rot: [0, 0, s * 0.18], swing: -s * 0.5 })),
  { geo: ball, mat: face, at: [0, 0.81, 0.01], size: [0.23, 0.22, 0.22] },
  { geo: ball, mat: cloth, at: [0, 0.83, -0.03], size: [0.27, 0.26, 0.26], tinted: true },
  { geo: disc, mat: cloth, at: [0, 0.92, -0.01], size: [0.4, 0.03, 0.4], tinted: true },
  { geo: cone, mat: cloth, at: [0, 0.92, -0.02], size: [0.27, 0.32, 0.27], rot: [-0.3, 0, 0], tinted: true },
  ...pair((s) => ({ geo: ball, mat: eye, at: [s * 0.045, 0.81, 0.115], size: [0.04, 0.055, 0.02] })),
];

const rags = std(mixPalette(PALETTE.deepCold, PALETTE.warmShadow, 0.55));
const pale = std(mixPalette(PALETTE.nightBlue, PALETTE.frost, 0.28));
const bulk = std(mixPalette(PALETTE.warmShadow, PALETTE.nightBlue, 0.5));
const horn = std(mixPalette(PALETTE.lantern, PALETTE.frost, 0.5));

const eyes = (y: number, z: number, gap: number, size = 0.045): Part[] => pair((s) => ({ geo: ball, mat: blight, at: [s * gap, y, z], size: [size, size * 0.8, 0.02] }));

export const ENEMY_RIGS: Record<EnemyType, Part[]> = {
  shambler: [
    ...pair((s) => ({ geo: limb, mat: pale, at: [s * 0.08, 0.4, 0], size: [0.1, 0.38, 0.11], swing: s * 0.35 })),
    ...pair((s) => ({ geo: block, mat: rags, at: [s * 0.08, 0.4, 0], offset: [0, -0.38, 0.03], size: [0.12, 0.07, 0.17], swing: s * 0.35 })),
    { geo: flare, mat: rags, at: [0, 0.42, 0.02], size: [0.36, 0.16, 0.26], rot: [0.2, 0, 0] },
    { geo: block, mat: rags, at: [0, 0.6, 0.06], size: [0.32, 0.38, 0.21], rot: [0.45, 0, 0] },
    { geo: block, mat: wound, at: [0.07, 0.6, 0.18], size: [0.1, 0.08, 0.02], rot: [0.45, 0, 0] },
    ...pair((s) => ({ geo: limb, mat: pale, at: [s * 0.2, 0.74, 0.12], size: [0.08, 0.44, 0.08], rot: [-1.15, 0, 0], swing: s * 0.15 })),
    ...pair((s) => ({ geo: ball, mat: horn, at: [s * 0.2, 0.74, 0.12], offset: [0, -0.47, 0], size: [0.1, 0.12, 0.1], rot: [-1.15, 0, 0], swing: s * 0.15 })),
    { geo: ball, mat: pale, at: [0, 0.87, 0.2], size: [0.21, 0.21, 0.21] },
    { geo: ball, mat: rags, at: [0, 0.9, 0.17], size: [0.25, 0.22, 0.24] },
    ...eyes(0.88, 0.3, 0.05),
  ],
  runner: [
    ...pair((s) => ({ geo: limb, mat: pale, at: [s * 0.07, 0.45, 0], size: [0.07, 0.44, 0.08], swing: s * 0.9 })),
    { geo: block, mat: rags, at: [0, 0.6, 0.1], size: [0.22, 0.32, 0.15], rot: [0.9, 0, 0] },
    ...pair((s) => ({ geo: limb, mat: pale, at: [s * 0.13, 0.68, 0.12], size: [0.05, 0.36, 0.05], rot: [0.7, 0, 0], swing: -s * 0.4 })),
    { geo: ball, mat: pale, at: [0, 0.71, 0.3], size: [0.17, 0.16, 0.21] },
    ...pair((s) => ({ geo: cone, mat: horn, at: [s * 0.06, 0.78, 0.26], size: [0.04, 0.14, 0.04], rot: [-0.9, 0, s * 0.4] })),
    ...eyes(0.73, 0.4, 0.04, 0.04),
  ],
  brute: [
    ...pair((s) => ({ geo: limb, mat: bulk, at: [s * 0.17, 0.45, 0], size: [0.2, 0.44, 0.22], swing: s * 0.3 })),
    { geo: block, mat: bulk, at: [0, 0.8, 0], size: [0.75, 0.6, 0.45], rot: [0.2, 0, 0] },
    { geo: block, mat: rags, at: [0, 0.55, 0.03], size: [0.62, 0.22, 0.42] },
    { geo: block, mat: wound, at: [-0.15, 0.85, 0.24], size: [0.16, 0.12, 0.02], rot: [0.2, 0, 0] },
    ...pair((s) => ({ geo: block, mat: pale, at: [s * 0.36, 1.08, 0], size: [0.3, 0.14, 0.34] })),
    ...pair((s) => ({ geo: limb, mat: bulk, at: [s * 0.5, 1.02, 0.05], size: [0.22, 0.72, 0.24], rot: [-0.3, 0, 0], swing: -s * 0.3 })),
    ...pair((s) => ({ geo: ball, mat: pale, at: [s * 0.5, 1.02, 0.05], offset: [0, -0.78, 0], size: [0.3, 0.28, 0.3], rot: [-0.3, 0, 0], swing: -s * 0.3 })),
    { geo: ball, mat: pale, at: [0, 1.17, 0.2], size: [0.24, 0.23, 0.24] },
    ...pair((s) => ({ geo: cone, mat: horn, at: [s * 0.1, 1.24, 0.18], size: [0.07, 0.26, 0.07], rot: [-0.3, 0, s * 0.7] })),
    ...eyes(1.19, 0.32, 0.06, 0.05),
  ],
  hordeMother: [
    ...[-1, 1].flatMap((sx) =>
      [-1, 1].map((sz): Part => ({ geo: limb, mat: pale, at: [sx * 0.55, 1.0, sz * 0.45], size: [0.18, 1.05, 0.18], rot: [sz * 0.45, 0, sx * 0.45], swing: sx * sz * 0.25 })),
    ),
    { geo: ball, mat: bulk, at: [0, 1.35, 0], size: [1.5, 1.25, 1.8] },
    { geo: block, mat: rags, at: [0, 1.1, 0], size: [1.3, 0.35, 1.5] },
    { geo: ball, mat: wound, at: [-0.45, 1.75, -0.45], size: [0.3, 0.3, 0.3] },
    { geo: ball, mat: wound, at: [0.4, 1.65, -0.6], size: [0.26, 0.26, 0.26] },
    { geo: ball, mat: wound, at: [0.1, 1.95, -0.2], size: [0.22, 0.22, 0.22] },
    ...[-0.5, -0.15, 0.2, 0.5].map((z, i): Part => ({ geo: cone, mat: horn, at: [i % 2 ? 0.15 : -0.15, 1.85, z], size: [0.14, 0.55, 0.14], rot: [-0.3, 0, 0] })),
    { geo: ball, mat: pale, at: [0, 1.55, 0.95], size: [0.55, 0.45, 0.5] },
    ...pair((s) => ({ geo: cone, mat: horn, at: [s * 0.2, 1.75, 0.95], size: [0.1, 0.4, 0.1], rot: [-0.5, 0, s * 0.6] })),
    ...[-0.16, -0.06, 0.06, 0.16].map((x): Part => ({ geo: ball, mat: blight, at: [x, 1.6, 1.2], size: [0.06, 0.05, 0.02] })),
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
    m.castShadow = !(p.mat instanceof THREE.MeshBasicMaterial);
    group.add(m);
    return m;
  });
  const base = new THREE.Matrix4();
  const local = new THREE.Matrix4();
  const tail = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const none = new THREE.Quaternion();
  const e = new THREE.Euler();
  const v = new THREE.Vector3();
  const size = new THREE.Vector3();
  const one = new THREE.Vector3(1, 1, 1);
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
          // Pivot, then rotation, then the offset along the limb, then the part's own size.
          local.compose(v.set(...p.at), q.setFromEuler(e), one);
          tail.compose(v.set(...(p.offset ?? [0, 0, 0])), none, size.set(...p.size));
          meshes[k].setMatrixAt(i, local.multiply(tail).premultiply(base));
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
