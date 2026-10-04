import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { PALETTE } from '../../materials';
import { GEO, glowPart, link, MAT, part } from '../kit';

// Scavenged junk shared by the building builders: ridged sheets, shed roofs, boarded windows,
// sandbags, tires, drums, pallets, signs, and string lights. Repeated small pieces are baked into
// one cached geometry so a building stays under its mesh budget.

export type V3 = [number, number, number];

/** Builds one building type into the group. w and d are the footprint in tiles along x and z. */
export type Builder = (g: THREE.Group, w: number, d: number, mask: number) => void;

/** One piece of a baked mesh: geometry, position, scale, and rotation. */
export type Piece = [THREE.BufferGeometry, V3, V3, V3?];

const baked = new Map<string, THREE.BufferGeometry>();

/** Merges pieces into one geometry, cached by key, so many small parts cost one mesh. */
export function bake(key: string, pieces: () => Piece[]): THREE.BufferGeometry {
  let geo = baked.get(key);
  if (!geo) {
    const o = new THREE.Object3D();
    const parts = pieces().map(([g, at, size, rot = [0, 0, 0]]) => {
      o.position.set(...at);
      o.scale.set(...size);
      o.rotation.set(...rot);
      o.updateMatrix();
      const c = g.index ? g.toNonIndexed() : g.clone();
      return c.applyMatrix4(o.matrix);
    });
    geo = mergeGeometries(parts)!;
    baked.set(key, geo);
  }
  return geo;
}

const poolMat = new THREE.ShaderMaterial({
  uniforms: { uColor: { value: PALETTE.lantern } },
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: 'uniform vec3 uColor; varying vec2 vUv; void main() { float r = length(vUv - 0.5) * 2.0; gl_FragColor = vec4(uColor * pow(max(0.0, 1.0 - r), 2.0) * 0.35, 1.0); }',
});
const poolGeo = new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2);

/** Additive light pool on the ground that fakes a light source (section 12.4). */
export function lightPool(radius: number): THREE.Mesh {
  const m = new THREE.Mesh(poolGeo, poolMat);
  m.scale.setScalar(radius);
  m.position.y = 0.03;
  return m;
}

/** A standing ridged sheet: width along x, height up y, ridges facing z. */
export function sheet(mat: THREE.Material, at: V3, w: number, h: number, rot: V3 = [0, 0, 0]): THREE.Mesh {
  return part(GEO.corrugated, mat, at, [w, h, 0.06], rot);
}

/**
 * A shed roof of mismatched ridged sheets. It covers w along x and d along z,
 * rising from hLow at the front (+z) to hHigh at the back (-z). Optional snow on the upper part.
 */
export function shedRoof(mats: THREE.Material[], w: number, d: number, hLow: number, hHigh: number, snow = true): THREE.Group {
  const g = new THREE.Group();
  const slope = Math.atan2(hHigh - hLow, d);
  const len = Math.hypot(hHigh - hLow, d) + 0.12;
  const n = mats.length;
  for (let i = 0; i < n; i++) {
    const pw = w / n + 0.06;
    const x = -w / 2 + (i + 0.5) * (w / n);
    // Every other sheet sits a hair higher and shifted, like sheets nailed on one at a time.
    const lift = (i % 2) * 0.025;
    const shift = ((i * 37) % 5) * 0.012;
    g.add(part(GEO.corrugated, mats[i], [x, hLow - 0.04 + lift, d / 2 + 0.06 - shift], [pw, len, 0.06], [slope - Math.PI / 2, 0, (i % 3 - 1) * 0.015]));
  }
  if (snow) g.add(part(GEO.centered, MAT.snow, [0.05, hLow + (hHigh - hLow) * 0.9 + 0.07, -d * 0.4], [w * 0.82, 0.03, d * 0.18], [slope, 0, 0]));
  return g;
}

/** A boarded window facing +z: dark frame, warm light behind, and two planks nailed across. */
export function boardedWindow(glow: THREE.Material, w = 0.34, h = 0.3): THREE.Group {
  const g = new THREE.Group();
  g.add(part(GEO.centered, MAT.darkWood, [0, 0, 0], [w + 0.08, h + 0.08, 0.04]));
  g.add(glowPart(glow, [0, 0, 0.02], [w, h, 0.02]));
  g.add(part(GEO.centered, MAT.wood, [0, h * 0.18, 0.05], [w + 0.14, 0.06, 0.03], [0, 0, 0.32]));
  g.add(part(GEO.centered, MAT.sheetWarm, [0, -h * 0.22, 0.05], [w + 0.1, 0.06, 0.03], [0, 0, -0.18]));
  return g;
}

/** A crooked plank patch nailed over a wall, facing +z. */
export function patch(mat: THREE.Material, at: V3, w: number, h: number, tilt = 0.1): THREE.Mesh {
  return part(GEO.centered, mat, at, [w, h, 0.03], [0, 0, tilt]);
}

/** A wall of sandbags along x, centered on its origin, as one mesh. */
export function sandbags(len: number, rows: number): THREE.Mesh {
  const geo = bake(`bags${len}x${rows}`, () => {
    const out: Piece[] = [];
    const per = Math.max(1, Math.round(len / 0.3));
    for (let r = 0; r < rows; r++) {
      const off = r % 2 ? 0.15 : 0;
      const count = r % 2 ? per - 1 : per;
      for (let i = 0; i < count; i++) {
        const x = -len / 2 + 0.15 + off + i * (len - 0.3) / Math.max(1, per - 1);
        out.push([GEO.pillow, [x, 0.06 + r * 0.1, ((i + r) % 2) * 0.02], [0.3, 0.12, 0.2], [0, ((i * 7 + r) % 3 - 1) * 0.12, 0]]);
      }
    }
    return out;
  });
  return part(geo, MAT.burlap, [0, 0, 0], [1, 1, 1]);
}

/** A stack of tires, as one mesh. */
export function tires(n: number): THREE.Mesh {
  const geo = bake(`tires${n}`, () => Array.from({ length: n }, (_, i): Piece => [GEO.tire, [((i * 3) % 2) * 0.02, 0.07 + i * 0.13, 0], [0.42, 0.42, 0.42], [((i % 2) - 0.5) * 0.08, 0, 0]]));
  return part(geo, MAT.rubber, [0, 0, 0], [1, 1, 1]);
}

/** An oil drum standing on the ground. */
export function drum(mat: THREE.Material = MAT.rust, s = 1): THREE.Mesh {
  return part(GEO.drum, mat, [0, 0, 0], [0.3 * s, 0.44 * s, 0.3 * s]);
}

/** A wooden pallet lying flat, as one mesh. */
export function pallet(): THREE.Mesh {
  const geo = bake('pallet', () => [
    ...[-0.18, 0, 0.18].map((z): Piece => [GEO.block, [0, 0, z], [0.6, 0.05, 0.08]]),
    ...[-0.22, 0.22].map((x): Piece => [GEO.block, [x, 0.05, 0], [0.07, 0.05, 0.48]]),
    ...[-0.2, -0.07, 0.07, 0.2].map((z): Piece => [GEO.block, [0, 0.1, z], [0.62, 0.03, 0.09]]),
  ]);
  return part(geo, MAT.wood, [0, 0, 0], [1, 1, 1]);
}

/** A hand painted sign board on a short stake, facing +z. */
export function sign(board: THREE.Material, mark: THREE.Material, w = 0.42, h = 0.24, post = 0.55): THREE.Group {
  const g = new THREE.Group();
  if (post > 0) g.add(part(GEO.block, MAT.darkWood, [0, 0, -0.03], [0.05, post, 0.04]));
  g.add(part(GEO.centered, board, [0, post, 0], [w, h, 0.03], [0, 0, 0.05]));
  g.add(part(GEO.centered, mark, [0, post, 0.02], [w * 0.6, h * 0.3, 0.02], [0, 0, -0.08]));
  return g;
}

/** An oil lantern hanging from its top at the origin. The glow part is returned for 'light' toggles. */
export function lantern(s = 1): { group: THREE.Group; glow: THREE.Mesh } {
  const group = new THREE.Group();
  group.add(part(GEO.cone, MAT.iron, [0, -0.1 * s, 0], [0.16 * s, 0.1 * s, 0.16 * s]));
  const glow = glowPart(MAT.glow, [0, -0.18 * s, 0], [0.1 * s, 0.14 * s, 0.1 * s]);
  group.add(glow);
  group.add(part(GEO.block, MAT.iron, [0, -0.29 * s, 0], [0.14 * s, 0.03 * s, 0.14 * s]));
  return { group, glow };
}

/**
 * String lights hung through the given points, sagging between them. Bulbs are baked into one mesh
 * per key. The wire is one rod per span.
 */
export function stringLights(key: string, pts: V3[], sag = 0.12, glow: THREE.Material = MAT.glow): THREE.Group {
  const g = new THREE.Group();
  const mid = (a: V3, b: V3): V3 => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - sag, (a[2] + b[2]) / 2];
  const bulbs: Piece[] = [];
  for (let i = 0; i + 1 < pts.length; i++) {
    const m = mid(pts[i], pts[i + 1]);
    g.add(link(MAT.soot, pts[i], m, 0.015));
    g.add(link(MAT.soot, m, pts[i + 1], 0.015));
    for (const t of [0.25, 0.5, 0.75, 1]) {
      const [a, b, u] = t <= 0.5 ? [pts[i], m, t * 2] : [m, pts[i + 1], t * 2 - 1];
      bulbs.push([GEO.bulb, [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u - 0.04, a[2] + (b[2] - a[2]) * u], [0.06, 0.08, 0.06]]);
    }
  }
  const m = part(bake(`lights:${key}`, () => bulbs), glow, [0, 0, 0], [1, 1, 1]);
  m.castShadow = false;
  g.add(m);
  return g;
}

/** A thin layer of snow on a flat top. */
export function snowCap(at: V3, w: number, d: number): THREE.Mesh {
  return part(GEO.centered, MAT.snow, at, [w, 0.04, d]);
}

/** A few still smoke puffs rising from a flue. */
export function smokePuffs(at: V3, n = 3): THREE.Group {
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) {
    const s = 0.16 + i * 0.1;
    const m = part(GEO.sphere, MAT.smoke, [at[0] + i * 0.1, at[1] + 0.12 + i * 0.26, at[2] - i * 0.05], [s, s * 0.85, s]);
    m.castShadow = false;
    m.receiveShadow = false;
    g.add(m);
  }
  return g;
}

/** Three pots hanging on hooks, as one mesh. Their hooks top out at about 0.26. */
export function hangingPots(): THREE.Mesh {
  const geo = bake('pots', () => [
    [GEO.cylinder, [-0.25, 0, 0], [0.18, 0.14, 0.18]],
    [GEO.cylinder, [0.02, -0.04, 0], [0.24, 0.18, 0.24]],
    [GEO.cylinder, [0.28, 0.02, 0], [0.14, 0.12, 0.14]],
    [GEO.rod, [-0.25, 0.2, 0], [0.012, 0.12, 0.012]],
    [GEO.rod, [0.02, 0.2, 0], [0.012, 0.12, 0.012]],
    [GEO.rod, [0.28, 0.2, 0], [0.012, 0.12, 0.012]],
  ]);
  return part(geo, MAT.iron, [0, 0, 0], [1, 1, 1]);
}

/** Many rods between point pairs, baked into one mesh under a key. Each entry is from, to, and thickness. */
export function rods(key: string, mat: THREE.Material, segs: () => [V3, V3, number][]): THREE.Mesh {
  const geo = bake(`rods:${key}`, () =>
    segs().map(([a, b, t]): Piece => {
      const o = link(mat, a, b, t);
      return [GEO.rod, [o.position.x, o.position.y, o.position.z], [o.scale.x, o.scale.y, o.scale.z], [o.rotation.x, o.rotation.y, o.rotation.z]];
    }),
  );
  return part(geo, mat, [0, 0, 0], [1, 1, 1]);
}

/** A ladder from a to b with rails and rungs, baked into one mesh. Width runs along x. */
export function ladder(a: V3, b: V3, width: number, rungs: number): THREE.Mesh {
  return rods(`ladder${a}${b}${width}${rungs}`, MAT.darkWood, () => {
    const out: [V3, V3, number][] = [];
    for (const s of [-1, 1]) out.push([[a[0] + (s * width) / 2, a[1], a[2]], [b[0] + (s * width) / 2, b[1], b[2]], 0.04]);
    for (let i = 1; i <= rungs; i++) {
      const t = i / (rungs + 1);
      const p: V3 = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
      out.push([[p[0] - width / 2, p[1], p[2]], [p[0] + width / 2, p[1], p[2]], 0.028]);
    }
    return out;
  });
}
