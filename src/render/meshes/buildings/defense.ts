import * as THREE from 'three';
import type { BuildingType } from '../../../data/buildings';
import { GEO, glowPart, link, MAT, part } from '../kit';
import { bake, type Builder, drum, ladder, lantern, lightPool, pallet, type Piece, sandbags, sign, snowCap, tires } from './parts';

// Defenses (section 9.1): junk palisades, sheet and concrete walls, a gate, spike traps, a sandbagged
// gun tower, and salvaged lights. Walls take a neighbor mask so a line of them reads as one wall.

/** Neighbor bits for walls: east, west, south, north. */
export const WALL_EAST = 1;
export const WALL_WEST = 2;
export const WALL_SOUTH = 4;
export const WALL_NORTH = 8;
export const WALL_TYPES: BuildingType[] = ['woodenBarricade', 'reinforcedWall', 'gate'];

/**
 * Wall pieces from the center toward each neighbor. Each piece is built along x in its own group
 * and turned to face its neighbor. The variant number lets each side look a little different.
 */
function wallRun(g: THREE.Group, mask: number, piece: (p: THREE.Group, len: number, variant: number) => void): void {
  const dirs: [number, number, number][] = [[WALL_EAST, 1, 0], [WALL_WEST, -1, 0], [WALL_SOUTH, 0, 1], [WALL_NORTH, 0, -1]];
  let any = false;
  dirs.forEach(([bit, dx, dz], i) => {
    if (!(mask & bit)) return;
    const p = new THREE.Group();
    p.position.set(dx * 0.25, 0, dz * 0.25);
    if (dz) p.rotation.y = Math.PI / 2;
    piece(p, 0.5, i);
    g.add(p);
    any = true;
  });
  if (!any) {
    const p = new THREE.Group();
    piece(p, 0.8, 0);
    g.add(p);
  }
}

/** A sharpened stake leaning sideways by lean per unit of height. */
function stake(p: THREE.Group, x: number, h: number, lean: number): void {
  p.add(link(MAT.wood, [x, 0, 0], [x + lean * h, h, 0], 0.13));
  p.add(part(GEO.cone, MAT.wood, [x + lean * h, h - 0.02, 0], [0.13, 0.2, 0.13], [0, 0, -Math.atan(lean)]));
}

const woodenBarricade: Builder = (g, _w, _d, mask) => {
  // Sharpened stakes lashed with planks, plugged with whatever was found: a car door, tires, a pallet.
  stake(g, 0, 1.0, 0);
  wallRun(g, mask, (p, len, v) => {
    stake(p, len * 0.25, 0.78 + (v % 2) * 0.12, (v % 2 ? 1 : -1) * 0.06);
    p.add(part(GEO.centered, MAT.darkWood, [0, 0.55, 0.08], [len + 0.1, 0.07, 0.04], [0, 0, (v % 2 ? 1 : -1) * 0.12]));
    p.add(part(GEO.centered, MAT.wood, [0, 0.3, 0.08], [len + 0.06, 0.08, 0.04], [0, 0, (v % 2 ? -1 : 1) * 0.05]));
    if (v === 0) {
      p.add(part(GEO.block, MAT.paintBlue, [0, 0.04, 0.14], [len * 0.85, 0.5, 0.06], [-0.08, 0, 0.04]));
      p.add(part(GEO.block, MAT.soot, [0, 0.33, 0.15], [len * 0.6, 0.16, 0.03], [-0.08, 0, 0.04]));
    } else if (v === 1) {
      p.add(part(GEO.tire, MAT.rubber, [0, 0.22, 0.16], [0.5, 0.5, 0.5], [Math.PI / 2 + 0.2, 0, 0]));
    } else if (v === 2) {
      p.add(part(GEO.corrugated, MAT.rust, [0, 0, 0.14], [len, 0.6, 0.06], [-0.08, 0, 0.03]));
    } else {
      const pl = pallet();
      pl.position.set(0, 0.26, 0.16);
      pl.rotation.x = -Math.PI / 2 - 0.08;
      pl.scale.x = len / 0.62;
      p.add(pl);
    }
  });
};

const reinforcedWall: Builder = (g, _w, _d, mask) => {
  // Concrete blocks below, ridged sheets bolted above, and a row of sandbags at the foot.
  g.add(part(GEO.block, MAT.concrete, [0, 0, 0], [0.46, 0.55, 0.46]));
  g.add(part(GEO.block, MAT.concrete, [0, 0.55, 0], [0.42, 0.68, 0.42], [0, 0.1, 0]));
  g.add(snowCap([0, 1.24, 0], 0.4, 0.4));
  wallRun(g, mask, (p, len, v) => {
    p.add(part(GEO.block, MAT.concrete, [0, 0, 0], [len, 0.45, 0.4]));
    p.add(part(GEO.corrugated, v % 2 ? MAT.rust : MAT.sheet, [0, 0.42, 0.06], [len + 0.02, 0.76, 0.07], [0, 0, (v % 2 ? 1 : -1) * 0.015]));
    p.add(part(GEO.corrugated, MAT.sheetWarm, [0, 0.42, -0.08], [len + 0.02, 0.72, 0.07]));
    p.add(part(GEO.block, MAT.iron, [0, 1.16, 0], [len + 0.04, 0.05, 0.22]));
    p.add(part(GEO.centered, MAT.snow, [0, 1.22, 0], [len, 0.04, 0.2]));
    p.add(sandbags(len, 2).translateZ(0.28));
  });
};

const gate: Builder = (g, _w, _d, mask) => {
  const alongZ = (mask & (WALL_NORTH | WALL_SOUTH)) !== 0 && (mask & (WALL_EAST | WALL_WEST)) === 0;
  const inner = new THREE.Group();
  inner.rotation.y = alongZ ? Math.PI / 2 : 0;
  g.add(inner);
  // Concrete posts with sandbags, a steel beam across, and a warning sign.
  for (const x of [-0.4, 0.4]) {
    inner.add(part(GEO.block, MAT.concrete, [x, 0, 0], [0.2, 1.4, 0.34]));
    inner.add(part(GEO.pillow, MAT.burlap, [x, 0.08, 0.26], [0.22, 0.16, 0.16], [0, 0.3, 0]));
  }
  inner.add(part(GEO.block, MAT.iron, [0, 1.3, 0], [1.0, 0.12, 0.16]));
  inner.add(part(GEO.centered, MAT.paintYellow, [0, 1.2, 0.1], [0.4, 0.16, 0.03]));
  inner.add(part(GEO.centered, MAT.paintRed, [0, 1.2, 0.12], [0.3, 0.05, 0.02], [0, 0, 0.3]));
  // Two leaves: plank frames faced with sheet metal and cross braced, chained in the middle.
  for (const [x, m] of [[-0.16, MAT.sheet], [0.16, MAT.rust]] as const) {
    inner.add(part(GEO.block, MAT.wood, [x, 0.04, 0], [0.3, 1.04, 0.06]));
    inner.add(part(GEO.corrugated, m, [x, 0.08, 0.04], [0.28, 0.96, 0.05]));
    inner.add(part(GEO.centered, MAT.darkWood, [x, 0.56, 0.08], [0.06, 1.1, 0.04], [0, 0, x > 0 ? 0.28 : -0.28]));
  }
  inner.add(part(GEO.centered, MAT.iron, [0, 0.58, 0.1], [0.14, 0.05, 0.05]));
  inner.add(part(GEO.centered, MAT.paintYellow, [0, 0.52, 0.12], [0.05, 0.07, 0.04]));
};

const rebar = bake('rebar', () => Array.from({ length: 13 }, (_, i): Piece => {
  const x = ((i * 7) % 5 - 2) * 0.17 + ((i % 2) * 0.05);
  const z = (Math.floor(i / 5) - 1) * 0.26 + ((i * 3) % 2) * 0.06;
  return [GEO.spike, [x, 0.05, z], [0.05, 0.24 + ((i * 5) % 4) * 0.05, 0.05], [((i % 3) - 1) * 0.2, 0, ((i % 4) - 1.5) * 0.12]];
}));
const stakes = bake('trapStakes', () => [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z]): Piece => [GEO.spike, [x * 0.34, 0, z * 0.34], [0.09, 0.42, 0.09], [z * 0.5, 0, -x * 0.5]]));

const spikeTrap: Builder = (g) => {
  // A plank bed studded with rusty rebar, sharpened stakes leaning out at the corners.
  g.add(part(GEO.block, MAT.darkWood, [0, 0, 0], [0.86, 0.05, 0.86]));
  g.add(part(GEO.block, MAT.wood, [0.12, 0.05, -0.1], [0.5, 0.02, 0.14], [0, 0.4, 0]));
  g.add(part(rebar, MAT.rust, [0, 0, 0], [1, 1, 1]));
  g.add(part(stakes, MAT.wood, [0, 0, 0], [1, 1, 1]));
};

/** A makeshift gun: a pipe barrel taped to a stock on a post mount, pointing along +z. */
function makeshiftGun(): THREE.Group {
  const gun = new THREE.Group();
  gun.add(part(GEO.block, MAT.iron, [0, 0, 0], [0.05, 0.28, 0.05]));
  gun.add(part(GEO.block, MAT.darkWood, [0, 0.28, -0.12], [0.08, 0.08, 0.22]));
  gun.add(part(GEO.log, MAT.iron, [0, 0.34, 0.12], [0.42, 0.06, 0.06], [0, Math.PI / 2, 0]));
  gun.add(part(GEO.log, MAT.paintYellow, [0, 0.34, 0.06], [0.06, 0.08, 0.08], [0, Math.PI / 2, 0]));
  return gun;
}

const watchtower: Builder = (g) => {
  // Splayed pipe legs braced with rebar, a pallet deck, and a sandbag and sheet parapet.
  const top = 1.9;
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.add(link(MAT.rust, [x * 0.4, 0, z * 0.4], [x * 0.33, top, z * 0.33], 0.07));
  for (const [a, b] of [[[0.4, 0, 0.4], [-0.36, top * 0.55, 0.36]], [[-0.4, 0, 0.4], [0.36, top * 0.55, 0.36]], [[0.4, 0, -0.4], [0.36, top * 0.55, 0.36]], [[0.4, 0, 0.4], [0.36, top * 0.55, -0.36]]] as [[number, number, number], [number, number, number]][]) g.add(link(MAT.iron, a, b, 0.035));
  g.add(at0(tires(2), -0.28, 0.3));
  g.add(part(GEO.block, MAT.wood, [0, top, 0], [0.98, 0.1, 0.98]));
  g.add(sandbags(0.9, 2).translateY(top + 0.1).translateZ(0.42));
  g.add(part(GEO.corrugated, MAT.sheet, [0.46, top + 0.1, 0], [0.86, 0.32, 0.06], [0, Math.PI / 2, 0]));
  g.add(part(GEO.block, MAT.darkWood, [-0.46, top + 0.1, 0], [0.05, 0.3, 0.9]));
  g.add(part(GEO.block, MAT.darkWood, [0, top + 0.1, -0.46], [0.9, 0.3, 0.05]));
  // A ladder at the back and a flag on a pole.
  g.add(ladder([0, 0, -0.5], [0, top + 0.3, -0.48], 0.28, 7));
  g.add(link(MAT.darkWood, [-0.42, top, -0.42], [-0.42, top + 1.0, -0.42], 0.04));
  g.add(part(GEO.centered, MAT.tarpRust, [-0.28, top + 0.88, -0.42], [0.28, 0.18, 0.02], [0, 0, -0.1]));
  g.add(link(MAT.iron, [-0.42, top + 0.72, -0.42], [-0.26, top + 0.72, -0.42], 0.025));
  g.add(at0(lantern(0.8).group, -0.26, -0.42, top + 0.72));
  // Stage 1: two makeshift guns at two sides. Stage 2: one heavy gun with a shield and ammo.
  const s1 = new THREE.Group();
  s1.name = 'stage1';
  s1.add(at0(makeshiftGun(), 0.05, 0.2, top + 0.1));
  const side = makeshiftGun();
  side.rotation.y = Math.PI / 2;
  s1.add(at0(side, 0.2, -0.05, top + 0.1));
  g.add(s1);
  const s2 = new THREE.Group();
  s2.name = 'stage2';
  const heavy = new THREE.Group();
  heavy.position.set(0.08, top + 0.1, 0.08);
  heavy.rotation.y = Math.PI / 4;
  for (const [x, z] of [[-0.14, -0.14], [0.14, -0.14], [0, 0.12]]) heavy.add(link(MAT.iron, [x, 0, z], [0, 0.34, 0], 0.04));
  heavy.add(part(GEO.centered, MAT.iron, [0, 0.4, -0.04], [0.16, 0.14, 0.3]));
  heavy.add(part(GEO.log, MAT.soot, [0, 0.42, 0.25], [0.36, 0.1, 0.1], [0, Math.PI / 2, 0]));
  heavy.add(part(GEO.log, MAT.iron, [0, 0.42, 0.52], [0.3, 0.05, 0.05], [0, Math.PI / 2, 0]));
  heavy.add(part(GEO.corrugated, MAT.rust, [0, 0.22, 0.2], [0.42, 0.34, 0.05], [-0.15, 0, 0]));
  heavy.add(part(GEO.block, MAT.tarpOlive, [0.22, 0, -0.18], [0.16, 0.12, 0.12]));
  heavy.add(link(MAT.paintYellow, [0.2, 0.12, -0.14], [0.06, 0.4, -0.04], 0.025));
  s2.add(heavy);
  g.add(s2);
};

/** Places an object at x, z and height y, returning it. */
function at0<T extends THREE.Object3D>(o: T, x: number, z: number, y = 0): T {
  o.position.set(x, y, z);
  return o;
}

const lanternPost: Builder = (g) => {
  // A scavenged pipe set in a concrete filled tire, with a crooked arm and a hanging oil lantern.
  g.add(part(GEO.tire, MAT.rubber, [0, 0.07, 0], [0.5, 0.5, 0.5]));
  g.add(part(GEO.cylinder, MAT.concrete, [0, 0, 0], [0.3, 0.12, 0.3]));
  g.add(link(MAT.rust, [0, 0, 0], [0.02, 1.6, 0], 0.07));
  g.add(link(MAT.darkWood, [0, 1.45, 0], [0.34, 1.52, 0], 0.05));
  g.add(link(MAT.darkWood, [0, 1.22, 0], [0.22, 1.5, 0], 0.035));
  g.add(part(GEO.centered, MAT.tarpRust, [0.04, 1.1, 0.04], [0.1, 0.16, 0.02], [0, 0.4, 0.2]));
  g.add(link(MAT.iron, [0.3, 1.52, 0], [0.3, 1.38, 0], 0.015));
  g.add(part(GEO.cone, MAT.iron, [0.3, 1.3, 0], [0.18, 0.1, 0.18]));
  g.add(part(GEO.block, MAT.iron, [0.3, 1.04, 0], [0.16, 0.03, 0.16]));
  for (const [x, z] of [[-0.06, -0.06], [0.06, 0.06]]) g.add(part(GEO.block, MAT.iron, [0.3 + x, 1.06, z], [0.015, 0.24, 0.015]));
  const light = new THREE.Group();
  light.name = 'light';
  light.add(glowPart(MAT.glow, [0.3, 1.18, 0], [0.11, 0.2, 0.11]));
  light.add(lightPool(4));
  g.add(light);
};

const lampPost: Builder = (g) => {
  // A salvaged street lamp on a sandbagged concrete base, wired to a car battery.
  g.add(part(GEO.block, MAT.concrete, [0, 0, 0], [0.4, 0.22, 0.4]));
  g.add(sandbags(0.6, 1).translateZ(0.3), sandbags(0.6, 1).rotateY(Math.PI / 2).translateZ(0.3));
  g.add(part(GEO.pipe, MAT.sheet, [0, 0.2, 0], [0.12, 2.5, 0.12]));
  g.add(part(GEO.pipe, MAT.sheet, [0, 0.2, 0], [0.18, 0.4, 0.18]));
  g.add(link(MAT.sheet, [0, 2.68, 0], [0.12, 2.86, 0], 0.08));
  g.add(link(MAT.sheet, [0.12, 2.86, 0], [0.42, 2.86, 0], 0.08));
  g.add(part(GEO.cone, MAT.iron, [0.45, 2.72, 0], [0.42, 0.18, 0.3]));
  g.add(part(GEO.block, MAT.paintYellow, [-0.07, 1.0, 0], [0.08, 0.22, 0.14]));
  g.add(link(MAT.soot, [-0.11, 1.0, -0.02], [-0.28, 0.14, -0.3], 0.02));
  g.add(part(GEO.block, MAT.soot, [-0.3, 0, -0.3], [0.2, 0.14, 0.14]));
  g.add(part(GEO.block, MAT.paintRed, [-0.24, 0.14, -0.3], [0.04, 0.03, 0.04]));
  g.add(at0(drum(MAT.rustDark, 0.7), 0.3, -0.3));
  g.add(at0(sign(MAT.paintYellow, MAT.soot, 0.24, 0.14, 0), 0, 0.07, 1.5));
  const light = new THREE.Group();
  light.name = 'light';
  light.add(glowPart(MAT.glow, [0.45, 2.66, 0], [0.34, 0.1, 0.24]));
  light.add(lightPool(6));
  g.add(light);
};

export const DEFENSE = { woodenBarricade, reinforcedWall, gate, spikeTrap, watchtower, lanternPost, lampPost } satisfies Partial<Record<BuildingType, Builder>>;
