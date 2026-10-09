import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { BUILDINGS } from '../data/buildings';
import { STOREY_HEIGHT } from '../data/house';
import { covered, flanks, isHearthTile, isLanding, storedEdgeAt } from '../sim/house';
import type { World } from '../sim/world';
import { PALETTE } from './materials';

// Dressing for the house (M11): balcony rails on open upper floors, small clutter on bare floor, and things on the inner face of
// walls such as shelves, hanging clothes, and lamps. It is all a pure function of the layout, so it looks the same on every
// load, and it never touches the simulation.

const CAPACITY = 2500;

type Piece = { w: number; h: number; d: number; x: number; y: number; z: number; color: THREE.Color; glow?: boolean };

const c = (hex: string) => new THREE.Color(hex);
const INK = { wood: c('#7a5436'), dark: c('#3a2618'), rust: c('#8a4a2a'), iron: c('#4a4f58'), cream: c('#d8cbb0'), moss: c('#5a7a3a'), leaf: c('#6d8f40'), red: c('#a8412a'), blue: c('#38557a'), mustard: c('#c4932f'), plum: c('#6a3a58'), teal: c('#2f6a64'), bulb: PALETTE.lantern.clone().multiplyScalar(2.4) };

function geometry(pieces: Piece[]): THREE.BufferGeometry {
  const parts = pieces.map((p) => {
    const g = new THREE.BoxGeometry(p.w, p.h, p.d).translate(p.x, p.y + p.h / 2, p.z);
    const colors = new Float32Array(g.attributes.position.count * 3);
    for (let i = 0; i < g.attributes.position.count; i++) [colors[i * 3], colors[i * 3 + 1], colors[i * 3 + 2]] = [p.color.r, p.color.g, p.color.b];
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return g;
  });
  return mergeGeometries(parts);
}

const piece = (x: number, y: number, z: number, w: number, h: number, d: number, color: THREE.Color, glow = false): Piece => ({ x, y, z, w, h, d, color, glow });

/** Floor clutter, drawn on the ground around the origin of a tile. */
const CLUTTER: Record<string, Piece[]> = {
  books: [piece(0, 0, 0, 0.2, 0.05, 0.15, INK.red), piece(0.01, 0.05, 0, 0.18, 0.05, 0.14, INK.blue), piece(-0.01, 0.1, 0, 0.19, 0.04, 0.13, INK.mustard)],
  jars: [piece(-0.08, 0, 0, 0.1, 0.16, 0.1, INK.cream), piece(0.07, 0, 0.03, 0.09, 0.12, 0.09, INK.moss), piece(0, 0, -0.09, 0.08, 0.1, 0.08, INK.rust)],
  boots: [piece(-0.07, 0, 0, 0.1, 0.14, 0.2, INK.dark), piece(0.07, 0, 0.02, 0.1, 0.14, 0.2, INK.dark)],
  box: [piece(0, 0, 0, 0.3, 0.22, 0.26, INK.wood), piece(0, 0.22, 0, 0.32, 0.03, 0.28, INK.dark)],
  sacks: [piece(-0.1, 0, 0, 0.22, 0.22, 0.2, c('#a89264')), piece(0.12, 0, 0.04, 0.2, 0.18, 0.2, c('#988458'))],
  shrub: [piece(0, 0, 0, 0.22, 0.14, 0.22, INK.rust), piece(0, 0.14, 0, 0.3, 0.2, 0.3, INK.leaf), piece(0.05, 0.3, 0.02, 0.2, 0.16, 0.2, INK.moss)],
  mug: [piece(0, 0, 0, 0.1, 0.1, 0.1, INK.cream), piece(0.07, 0.03, 0, 0.04, 0.05, 0.03, INK.cream)],
  bucket: [piece(0, 0, 0, 0.24, 0.24, 0.24, INK.iron), piece(0, 0.24, 0, 0.2, 0.02, 0.2, c('#2a2c32'))],
};
const CLUTTER_KEYS = Object.keys(CLUTTER);

/** Wall dressing on the inner face. The model faces +z, with its back on the wall plane. */
const WALL: Record<string, Piece[]> = {
  shelf: [
    piece(0, 0.62, 0.1, 0.8, 0.04, 0.18, INK.wood),
    piece(-0.25, 0.66, 0.1, 0.1, 0.14, 0.1, INK.cream), piece(-0.08, 0.66, 0.1, 0.09, 0.1, 0.09, INK.rust), piece(0.1, 0.66, 0.1, 0.12, 0.16, 0.1, INK.moss), piece(0.28, 0.66, 0.1, 0.08, 0.1, 0.1, INK.mustard),
    piece(0, 0.92, 0.1, 0.8, 0.04, 0.18, INK.wood),
    piece(-0.2, 0.96, 0.1, 0.07, 0.2, 0.12, INK.red), piece(-0.12, 0.96, 0.1, 0.07, 0.17, 0.12, INK.blue), piece(-0.04, 0.96, 0.1, 0.07, 0.2, 0.12, INK.mustard), piece(0.2, 0.96, 0.1, 0.14, 0.12, 0.1, INK.teal),
  ],
  clothes: [
    piece(0, 1.0, 0.07, 0.86, 0.018, 0.018, INK.dark),
    piece(-0.28, 0.58, 0.07, 0.2, 0.42, 0.03, INK.plum), piece(0, 0.62, 0.07, 0.18, 0.38, 0.03, INK.cream), piece(0.27, 0.6, 0.07, 0.19, 0.4, 0.03, INK.teal),
  ],
  poster: [
    piece(0, 0.55, 0.03, 0.5, 0.4, 0.03, INK.dark), piece(0, 0.58, 0.05, 0.42, 0.32, 0.02, c('#c9b88a')), piece(0.06, 0.66, 0.06, 0.16, 0.14, 0.01, INK.teal), piece(-0.1, 0.62, 0.06, 0.12, 0.1, 0.01, INK.red),
  ],
  tools: [
    piece(0, 0.9, 0.06, 0.7, 0.04, 0.05, INK.wood),
    piece(-0.22, 0.45, 0.07, 0.04, 0.45, 0.03, INK.wood), piece(-0.2, 0.42, 0.07, 0.14, 0.06, 0.03, INK.iron),
    piece(0.02, 0.5, 0.07, 0.04, 0.4, 0.03, INK.wood), piece(0.02, 0.84, 0.07, 0.05, 0.08, 0.03, INK.iron),
    piece(0.24, 0.55, 0.07, 0.12, 0.34, 0.03, INK.rust),
  ],
  sconce: [piece(0, 0.78, 0.04, 0.1, 0.16, 0.06, INK.iron), piece(0, 0.9, 0.08, 0.1, 0.1, 0.08, INK.bulb, true)],
  vines: [
    piece(-0.2, 0.0, 0.03, 0.2, 0.6, 0.04, INK.leaf), piece(0.05, 0.2, 0.03, 0.26, 0.7, 0.04, INK.moss), piece(0.3, 0.1, 0.03, 0.16, 0.5, 0.04, INK.leaf), piece(-0.05, 0.7, 0.04, 0.3, 0.2, 0.05, INK.moss),
  ],
};
const WALL_KEYS = Object.keys(WALL);

/** A steady pseudo random value in [0, 1) for a place in the house. */
const hash = (a: number, b: number, c2: number): number => {
  const s = Math.sin(a * 127.1 + b * 311.7 + c2 * 74.7) * 43758.5453;
  return s - Math.floor(s);
};

export interface HouseDecor {
  update(world: World, shownStorey: number, wallUp: (edgeId: number) => number): void;
}

function bank(scene: THREE.Scene, source: Record<string, Piece[]>) {
  const keys = Object.keys(source);
  const solid = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true });
  const light = new THREE.MeshBasicMaterial({ vertexColors: true });
  const meshes = new Map<string, { solid: THREE.InstancedMesh; glow: THREE.InstancedMesh | null }>();
  for (const k of keys) {
    const solidPieces = source[k].filter((p) => !p.glow);
    const glowPieces = source[k].filter((p) => p.glow);
    const make = (pieces: Piece[], material: THREE.Material, cast: boolean) => {
      const m = new THREE.InstancedMesh(geometry(pieces), material, CAPACITY);
      m.count = 0;
      m.castShadow = cast;
      m.frustumCulled = false;
      scene.add(m);
      return m;
    };
    meshes.set(k, { solid: make(solidPieces, solid, true), glow: glowPieces.length ? make(glowPieces, light, false) : null });
  }
  return meshes;
}

export function createHouseDecor(scene: THREE.Scene): HouseDecor {
  const rails = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), new THREE.MeshStandardMaterial({ roughness: 0.9, color: 0xffffff }), CAPACITY);
  rails.count = 0;
  rails.castShadow = true;
  rails.frustumCulled = false;
  scene.add(rails);
  const clutter = bank(scene, CLUTTER);
  const wall = bank(scene, WALL);

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const p = new THREE.Vector3();
  const s = new THREE.Vector3(1, 1, 1);
  const up = new THREE.Vector3(0, 1, 0);
  const tint = new THREE.Color();

  const put = (mesh: THREE.InstancedMesh, x: number, y: number, z: number, yaw: number, sx = 1, sy = 1, sz = 1, shade = 1) => {
    if (mesh.count >= CAPACITY) return;
    m.compose(p.set(x, y, z), q.setFromAxisAngle(up, yaw), s.set(sx, sy, sz));
    mesh.setMatrixAt(mesh.count, m);
    mesh.setColorAt(mesh.count, tint.setScalar(shade));
    mesh.count++;
  };

  return {
    update(w, shownStorey, wallUp) {
      const ox = w.map.width / 2;
      const oy = w.map.height / 2;
      rails.count = 0;
      for (const set of [clutter, wall]) {
        for (const e of set.values()) {
          e.solid.count = 0;
          if (e.glow) e.glow.count = 0;
        }
      }
      const furnished = new Set<number>();
      const N = w.map.width * w.map.height;
      for (const b of w.buildings) {
        if (!BUILDINGS[b.type].furniture) continue;
        for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) furnished.add(b.storey * N + y * w.map.width + x);
      }

      for (const f of w.house.floors) {
        if (f.storey > shownStorey || f.construct > 0) continue;
        const base = f.storey * STOREY_HEIGHT;
        const x = f.x - ox;
        const z = f.y - oy;
        // Rails along the open sides of an upper floor.
        if (f.storey > 0) {
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = f.x + dx;
            const ny = f.y + dy;
            if (covered(w, nx, ny, f.storey)) continue;
            const edge = dx !== 0 ? storedEdgeAt(w, Math.max(f.x, nx), f.y, 'w', f.storey) : storedEdgeAt(w, f.x, Math.max(f.y, ny), 'n', f.storey);
            if (edge) continue;
            const yaw = dx !== 0 ? Math.PI / 2 : 0;
            const ex = x + dx * 0.46;
            const ez = z + dy * 0.46;
            put(rails, ex, base + 0.5, ez, yaw, 1.0, 0.05, 0.05, 1);
            put(rails, ex, base + 0.25, ez, yaw, 1.0, 0.04, 0.04, 1);
            for (const t of [-0.46, 0.46]) put(rails, ex + (dx !== 0 ? 0 : t), base, ez + (dx !== 0 ? t : 0), 0, 0.05, 0.56, 0.05, 1);
          }
        }
        // Clutter on bare floor.
        if (isHearthTile(w, f.x, f.y) || isLanding(w, f.x, f.y, f.storey) || furnished.has(f.storey * N + f.y * w.map.width + f.x)) continue;
        const r = hash(f.x, f.y, f.storey);
        if (r > 0.4) continue;
        const kind = CLUTTER_KEYS[Math.floor(hash(f.y, f.x, f.storey + 3) * CLUTTER_KEYS.length)];
        const spot = clutter.get(kind)!;
        const ang = hash(f.x + 1, f.y + 2, f.storey) * Math.PI * 2;
        const off = 0.28;
        const [cx, cz] = [x + Math.cos(ang) * off, z + Math.sin(ang) * off];
        const yaw = hash(f.x, f.y + 5, 1) * Math.PI * 2;
        put(spot.solid, cx, base + 0.03, cz, yaw, 1, 1, 1, 0.85 + hash(f.x, f.y, 9) * 0.3);
      }

      // Things on the inner face of walls. A wall only carries them while it stands up.
      for (const e of w.house.edges) {
        if (e.storey > shownStorey || e.construct > 0 || e.kind !== 'wall') continue;
        if (wallUp(e.id) < 0.95) continue;
        const r = hash(e.x, e.y, e.storey * 2 + (e.side === 'n' ? 1 : 0));
        if (r > 0.55) continue;
        const [a, b] = flanks(e.x, e.y, e.side);
        const base = e.storey * STOREY_HEIGHT;
        // Hang it on each side that has floor, so rooms on both sides get something.
        for (const [from, to] of [[a, b], [b, a]] as const) {
          if (!covered(w, from[0], from[1], e.storey)) continue;
          if (hash(from[0], from[1], e.x + e.y) > 0.7) continue;
          const nx = from[0] - to[0];
          const nz = from[1] - to[1];
          const kind = WALL_KEYS[Math.floor(hash(e.x + nx, e.y + nz, e.storey + 5) * WALL_KEYS.length)];
          const mid = { x: (from[0] + to[0]) / 2 - ox, z: (from[1] + to[1]) / 2 - oy };
          put(wall.get(kind)!.solid, mid.x + nx * 0.085, base, mid.z + nz * 0.085, Math.atan2(nx, nz), 1, 1, 1, 0.9 + hash(e.x, e.y, 4) * 0.2);
          const glow = wall.get(kind)!.glow;
          if (glow) put(glow, mid.x + nx * 0.085, base, mid.z + nz * 0.085, Math.atan2(nx, nz));
        }
      }

      const all = [rails, ...[...clutter.values(), ...wall.values()].flatMap((e) => (e.glow ? [e.solid, e.glow] : [e.solid]))];
      for (const mesh of all) {
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        mesh.visible = mesh.count > 0;
      }
    },
  };
}
