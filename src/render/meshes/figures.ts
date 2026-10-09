import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { WorkAnim } from '../../data/buildings';
import type { EnemyType } from '../../data/enemies';
import type { Look, LookColor } from '../../data/looks';
import { LOOK_COLORS, mixPalette, PALETTE } from '../materials';

// Procedural characters in the chunky low poly style (section 12.4). Each part is one InstancedMesh,
// so a crowd stays cheap. Limbs hang from a pivot and swing while the figure walks. A part with an
// offset rides on its pivot, so gloves, boots, and claws follow the limb they belong to.

type Vec = [number, number, number];
type LookSlot = { [K in keyof Look]: Look[K] extends LookColor ? K : never }[keyof Look];

export interface Part {
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
  /** Per figure color, taken from this slot of the figure's look. */
  tint?: LookSlot;
  /** Shown only for figures that match, such as a hair style, a kind of coat, or a tool in hand. */
  when?: (look: Look, f: Figure) => boolean;
  /** Arm side, 1 right and -1 left. Arms follow the figure's pose when it stands still. */
  arm?: number;
  /** Leg side, 1 right and -1 left. Legs fold forward when the figure sits. */
  leg?: number;
}

/** What a standing figure is doing. Work poses come from the building it works at (section 12.4). */
export type Pose = 'stand' | 'guard' | 'sit' | 'eat' | 'talk' | 'lie' | WorkAnim;

const SEATED: Pose[] = ['sit', 'eat', 'talk'];
/** Poses where the body leans into the work. */
const LEANING: Pose[] = ['chop', 'pick', 'hammer', 'saw', 'pry', 'gather'];

/** Rises fast and falls back, like a swing of an axe. */
const pulse = (t: number, rate: number) => ((Math.sin(t * rate) + 1) / 2) ** 2;

/** Arm angle around the x axis for each pose. Negative raises the arm forward and up. */
const ARM_POSES: Record<Pose, (side: number, t: number) => number> = {
  stand: (side, t) => 0.05 * Math.sin(t * 1.3 + side),
  guard: () => -1.35,
  sit: () => -0.65,
  eat: (side, t) => (side > 0 ? -0.55 - 1.15 * pulse(t, 1.7) : -0.6),
  talk: (side, t) => (side > 0 ? -0.95 + 0.45 * Math.sin(t * 3.1) : -0.6 + 0.2 * Math.sin(t * 2.3 + 1)),
  lie: (side) => 0.1 - side * 0.05,
  chop: (_, t) => -2.5 + 2 * pulse(t, 4.5),
  pick: (_, t) => -2.5 + 2.1 * pulse(t, 3.5),
  hammer: (side, t) => (side > 0 ? -1.9 + 1.2 * pulse(t, 6) : -0.7),
  saw: (_, t) => -1.25 + 0.3 * Math.sin(t * 6),
  stir: (side, t) => (side > 0 ? -1 + 0.25 * Math.sin(t * 4) : -0.5),
  pry: (_, t) => -0.8 + 0.35 * Math.sin(t * 3),
  gather: (side, t) => (side > 0 ? -0.7 + 0.5 * pulse(t, 2.5) : -0.9),
  tend: (side, t) => (side > 0 ? -1.1 + 0.4 * Math.sin(t * 2.5) : -0.3),
};

export interface Figure {
  id: number;
  x: number;
  /** Height above the ground, for guards up on a tower. */
  y?: number;
  z: number;
  yaw: number;
  moving: boolean;
  look?: Look;
  pose?: Pose;
  /** Tool or weapon in hand. Rig parts pick it up through their when test. */
  tool?: string;
}

export const block = new RoundedBoxGeometry(1, 1, 1, 2, 0.12);
export const limb = new THREE.CapsuleGeometry(0.5, 0.6, 3, 8).scale(1, 0.62, 1).translate(0, -0.5, 0);
export const ball = new THREE.SphereGeometry(0.5, 16, 12);
export const cone = new THREE.ConeGeometry(0.5, 1, 12).translate(0, 0.5, 0);
export const flare = new THREE.CylinderGeometry(0.5, 0.62, 1, 12);
export const disc = new THREE.CylinderGeometry(0.5, 0.5, 1, 14);

export const std = (color: THREE.Color) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, flatShading: true });
/** White base for parts colored per figure through instance colors. */
export const cloth = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, flatShading: true });
// Monster eyes glow and ignore fog so they read in the dark (sections 12.3 and 12.5).
const blight = new THREE.MeshBasicMaterial({ color: PALETTE.blight.clone().multiplyScalar(3), fog: false });
// Wounds and sacs glow less than eyes, so bloom does not swallow the body.
const wound = new THREE.MeshBasicMaterial({ color: mixPalette(PALETTE.blight, PALETTE.deepCold, 0.35) });

export const pair = (make: (side: number) => Part): Part[] => [make(-1), make(1)];

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
  update(figures: Figure[], time: number, stride: number): void;
}

interface FigureState {
  /** Eased 0 to 1 amounts. */
  move: number;
  sit: number;
  lie: number;
  lean: number;
  /** Walk cycle angle. It only advances while the figure moves, so a stop never jumps. */
  phase: number;
  yaw: number;
  /** Eased arm angle for the left and right arm when the figure is not walking. */
  arm: [number, number];
  seen: number;
}

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const ease = (dt: number, rate: number) => 1 - Math.exp(-dt * rate);

export function createFigureSet(rig: Part[], max: number, scale = 1): FigureSet {
  const group = new THREE.Group();
  const meshes = rig.map((p) => {
    const m = new THREE.InstancedMesh(p.geo, p.mat, max);
    if (p.tint) m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3);
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
  const s = new THREE.Vector3();
  const hidden = new THREE.Matrix4().makeScale(0, 0, 0);
  const used = rig.map(() => false);
  const states = new Map<number, FigureState>();
  let last = -1;

  return {
    group,
    update(figures, time, stride) {
      const dt = last < 0 ? 0.016 : Math.min(0.1, Math.max(0, time - last));
      last = time;
      const shown = figures.slice(0, max);
      used.fill(false);
      shown.forEach((f, i) => {
        const look = f.look;
        const pose = f.pose ?? 'stand';
        let st = states.get(f.id);
        if (!st) {
          st = { move: f.moving ? 1 : 0, sit: SEATED.includes(pose) ? 1 : 0, lie: pose === 'lie' ? 1 : 0, lean: 0, phase: f.id * 1.7, yaw: f.yaw, arm: [0, 0], seen: time };
          states.set(f.id, st);
        }
        st.seen = time;
        st.move += ((f.moving ? 1 : 0) - st.move) * ease(dt, 9);
        st.sit += ((SEATED.includes(pose) ? 1 : 0) - st.sit) * ease(dt, 7);
        st.lie += ((pose === 'lie' ? 1 : 0) - st.lie) * ease(dt, 5);
        st.lean += ((LEANING.includes(pose) && !f.moving ? 0.11 : 0) - st.lean) * ease(dt, 6);
        st.phase += dt * stride * st.move;
        st.yaw += wrap(f.yaw - st.yaw) * ease(dt, 11);
        const walk = Math.sin(st.phase) * st.move;
        const anim = time + f.id * 0.37;
        // The arms ease toward their pose, so changing tasks never snaps.
        for (const side of [-1, 1] as const) {
          const k = side > 0 ? 1 : 0;
          st.arm[k] += (ARM_POSES[pose](side, anim) - st.arm[k]) * ease(dt, 16);
        }

        const sc = scale * (look?.height ?? 1);
        const breathe = 1 + 0.012 * Math.sin(time * (st.lie > 0.5 ? 1.4 : 2.3) + f.id * 2.1) * (1 - st.move);
        s.set(scale * (look?.build ?? 1), sc * breathe, scale * (look?.build ?? 1));
        // Bob in step with the stride, sink into a seat, and lie back on a bed.
        const y = (f.y ?? 0) + Math.abs(walk) * 0.035 * scale - st.sit * 0.2 * scale + st.lie * 0.12;
        e.set(st.lean + st.move * 0.07 - st.lie * Math.PI / 2, st.yaw, walk * 0.035, 'YXZ');
        base.compose(v.set(f.x, y, f.z), q.setFromEuler(e), s);
        rig.forEach((p, k) => {
          if (p.when && !(look && p.when(look, f))) {
            meshes[k].setMatrixAt(i, hidden);
            return;
          }
          used[k] = true;
          const r = p.rot ?? [0, 0, 0];
          let angle = (p.swing ?? 0) * walk;
          if (p.arm) angle += st.arm[p.arm > 0 ? 1 : 0] * (1 - st.move);
          if (p.leg) angle += -1.45 * st.sit;
          e.set(r[0] + angle, r[1], r[2], 'XYZ');
          // Pivot, then rotation, then the offset along the limb, then the part's own size.
          local.compose(v.set(...p.at), q.setFromEuler(e), one);
          tail.compose(v.set(...(p.offset ?? [0, 0, 0])), none, size.set(...p.size));
          meshes[k].setMatrixAt(i, local.multiply(tail).premultiply(base));
          if (p.tint && look) meshes[k].setColorAt(i, LOOK_COLORS[look[p.tint]]);
        });
      });
      // Forget figures that left the scene a while ago.
      if (states.size > shown.length + 24) for (const [id, st] of states) if (time - st.seen > 5) states.delete(id);
      meshes.forEach((m, k) => {
        // Parts no figure shows are skipped entirely.
        m.count = used[k] ? shown.length : 0;
        m.instanceMatrix.needsUpdate = true;
        if (m.instanceColor) m.instanceColor.needsUpdate = true;
      });
    },
  };
}
