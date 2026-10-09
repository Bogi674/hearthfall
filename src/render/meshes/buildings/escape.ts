import * as THREE from 'three';
import type { BuildingType } from '../../../data/buildings';
import { at, crate, GEO, glowPart, link, MAT, part } from '../kit';
import { type Builder, drum, ladder as ladderMesh, lantern, pallet, rods, type V3, sheet, snowCap, tires } from './parts';

// The way out: a lookout that grows taller with each upgrade, and the airship dock,
// a scaffold gantry where the patched airship is put together piece by piece.

/** Guy ropes from a point down to stakes at the corners. */
function guys(g: THREE.Object3D, from: V3, r: number): void {
  for (const a of [0.8, 2.9, 5.0]) {
    const foot: V3 = [Math.cos(a) * r, 0, Math.sin(a) * r];
    g.add(link(MAT.rope, from, foot, 0.016));
  }
}

const lookoutPost: Builder = (g) => {
  // Stage 1: a mast with a drum crow's nest. Stage 2: a lashed tripod with a pallet deck.
  // Stage 3: a braced tower with a sheet roof, an antenna, and a flag.
  const s1 = new THREE.Group();
  s1.name = 'stage1';
  s1.add(at(tires(2), 0, 0, 0));
  s1.add(link(MAT.darkWood, [0, 0, 0], [0, 2.1, 0], 0.11));
  s1.add(ladderMesh([0.1, 0, 0.1], [0.08, 1.45, 0.08], 0.16, 5));
  s1.add(part(GEO.drum, MAT.rust, [0, 1.45, 0], [0.5, 0.35, 0.5]));
  s1.add(at(lantern(0.8).group, 0.2, 2.05, 0));
  s1.add(link(MAT.darkWood, [0, 2.06, 0], [0.22, 2.06, 0], 0.03));
  guys(s1, [0, 2.0, 0], 0.48);
  g.add(s1);

  const s2 = new THREE.Group();
  s2.name = 'stage2';
  const top2 = 2.5;
  for (const a of [0.6, 2.7, 4.8]) s2.add(link(MAT.rust, [Math.cos(a) * 0.44, 0, Math.sin(a) * 0.44], [Math.cos(a) * 0.14, top2, Math.sin(a) * 0.14], 0.07));
  s2.add(link(MAT.rope, [0.37, 1.2, 0.25], [-0.36, 1.2, 0.18], 0.03));
  s2.add(ladderMesh([0.0, 0, 0.46], [0.0, top2, 0.34], 0.18, 8));
  s2.add(at(pallet(), 0, top2, 0, 0.3));
  // Posts with a rail of planks and one sheet of metal as a windbreak.
  const post = (i: number): V3 => {
    const a = (i / 5) * Math.PI * 2 + 0.4;
    return [Math.cos(a) * 0.36, top2 + 0.1, Math.sin(a) * 0.36];
  };
  for (let i = 0; i < 5; i++) {
    const [x, y, z] = post(i);
    const [nx, , nz] = post(i + 1);
    s2.add(link(MAT.darkWood, [x, y, z], [x, y + 0.42, z], 0.04));
    s2.add(link(i === 1 ? MAT.sheet : MAT.wood, [x, y + 0.36, z], [nx, y + 0.36, nz], i === 1 ? 0.1 : 0.04));
  }
  s2.add(at(lantern(0.9).group, -0.25, top2 + 0.48, 0.2));
  guys(s2, [0, top2, 0], 0.5);
  g.add(s2);

  const s3 = new THREE.Group();
  s3.name = 'stage3';
  const top3 = 3.7;
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) s3.add(link(MAT.darkWood, [x * 0.42, 0, z * 0.42], [x * 0.3, top3, z * 0.3], 0.08));
  for (const y of [1.2, 2.5]) {
    const r = 0.42 - (0.12 * y) / top3;
    s3.add(link(MAT.iron, [r, y - 0.9, r], [-r, y, r], 0.035), link(MAT.iron, [r, y - 0.9, -r], [r, y, r], 0.035));
  }
  s3.add(ladderMesh([0, 0, 0.47], [0, top3, 0.36], 0.2, 12));
  s3.add(part(GEO.block, MAT.wood, [0, top3, 0], [0.86, 0.08, 0.86]));
  for (const [x, z, sx, sz, m] of [[0, 0.42, 0.86, 0.04, MAT.sheet], [0.42, 0, 0.04, 0.86, MAT.wood], [0, -0.42, 0.86, 0.04, MAT.wood]] as const) s3.add(part(GEO.block, m, [x, top3 + 0.08, z], [sx, 0.32, sz]));
  for (const [x, z] of [[-0.38, -0.38], [0.38, -0.38], [-0.38, 0.38], [0.38, 0.38]]) s3.add(part(GEO.block, MAT.darkWood, [x, top3, z], [0.05, 0.75, 0.05]));
  s3.add(sheet(MAT.rust, [0, top3 + 0.68, 0.45], 0.96, 1.0, [-Math.PI / 2 + 0.2, 0, 0]));
  s3.add(snowCap([0, top3 + 0.86, -0.15], 0.7, 0.4).rotateX(0.2));
  s3.add(link(MAT.iron, [0.35, top3 + 0.8, -0.35], [0.35, top3 + 1.6, -0.35], 0.03));
  s3.add(link(MAT.iron, [0.25, top3 + 1.4, -0.35], [0.45, top3 + 1.4, -0.35], 0.02));
  s3.add(part(GEO.centered, MAT.tarpRust, [0.2, top3 + 1.45, -0.35], [0.3, 0.2, 0.02], [0, 0, -0.08]));
  s3.add(glowPart(MAT.glow, [0, top3 + 0.25, 0], [0.12, 0.14, 0.12]));
  g.add(s3);
};

/** A scaffold tower of pipes with braces and rungs: legs in one mesh, braces in another. */
function tower(g: THREE.Group, x: number, h: number): void {
  g.add(rods(`towerLegs${x}${h}`, MAT.rust, () => [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([dx, dz]): [V3, V3, number] => [[x + dx * 0.28, 0.12, dz * 0.4], [x + dx * 0.22, h, dz * 0.3], 0.07])));
  g.add(rods(`towerBraces${x}`, MAT.iron, () => [1.0, 2.0].flatMap((y): [V3, V3, number][] => [
    [[x - 0.26, y - 0.9, 0.38], [x + 0.25, y, 0.36], 0.04],
    [[x + 0.26, y - 0.9, -0.38], [x + 0.25, y, 0.36], 0.04],
    [[x - 0.26, y, 0.37], [x + 0.26, y, 0.37], 0.04],
  ])));
  g.add(part(GEO.block, MAT.wood, [x, h, 0], [0.6, 0.08, 0.76]));
}

const airshipDock: Builder = (root) => {
  // The pad is drawn for a 4 by 4 footprint and scaled up to the 6 by 6 launch pad (section 11.2).
  const g = new THREE.Group();
  g.scale.setScalar(1.5);
  root.add(g);
  // A concrete pad with pallets, two scaffold towers, and cradle beams the gondola rests on.
  g.add(part(GEO.block, MAT.darkStone, [0, 0, 0], [3.9, 0.12, 3.9]));
  g.add(at(pallet(), -0.7, 0.12, 1.3), at(pallet(), 0.1, 0.12, 1.5, 0.2));
  const h = 2.95;
  tower(g, -1.62, h);
  tower(g, 1.62, h);
  for (const z of [-0.32, 0.32]) g.add(part(GEO.centered, MAT.iron, [0, h - 0.02, z], [3.5, 0.1, 0.08]));
  g.add(ladderMesh([1.62, 0.12, 0.55], [1.62, h, 0.42], 0.22, 10));
  // A crane arm on the left tower with a crate on its hook.
  g.add(link(MAT.rust, [-1.62, h, 0.3], [-0.95, h + 0.95, 1.0], 0.07));
  g.add(link(MAT.rope, [-0.95, h + 0.95, 1.0], [-0.95, 1.2, 1.0], 0.02));
  g.add(at(crate(0.3), -0.95, 0.9, 1.0, 0.3));
  // Fuel drums, crates, a tarp pile, tires, and a floodlight on a pole.
  g.add(at(drum(MAT.paintRed), 1.4, 0.12, 1.4), at(drum(MAT.rust), 1.65, 0.12, 1.1), at(drum(MAT.paintBlue), 1.15, 0.12, 1.65));
  g.add(at(crate(0.34), -1.55, 0.12, 1.45, 0.2), at(crate(0.26), -1.25, 0.12, 1.6, -0.3), at(crate(0.24), -1.5, 0.46, 1.45, 0.5));
  g.add(part(GEO.pillow, MAT.tarpOlive, [-1.4, 0.32, -1.4], [0.8, 0.4, 0.6], [0, 0.3, 0]));
  g.add(at(tires(3), 1.5, 0.12, -1.5));
  g.add(link(MAT.iron, [0.6, 0.12, 1.7], [0.6, 2.1, 1.7], 0.05));
  g.add(part(GEO.cone, MAT.iron, [0.6, 2.0, 1.62], [0.3, 0.2, 0.3], [0.6, 0, 0]));
  g.add(glowPart(MAT.glow, [0.6, 2.0, 1.55], [0.18, 0.18, 0.05]));
  g.add(createAirship());
};

/** The airship above the dock. Each component is a named part the renderer shows once it is built. */
function createAirship(): THREE.Group {
  const ship = new THREE.Group();
  ship.name = 'airship';
  ship.position.y = 3.3;
  const named = (name: string, ...parts: THREE.Object3D[]) => {
    const g = new THREE.Group();
    g.name = name;
    g.add(...parts);
    ship.add(g);
  };
  // The gondola: a patched boat hull with rigging posts.
  named(
    'frame',
    part(GEO.centered, MAT.wood, [0, -0.15, 0], [2.3, 0.34, 0.78]),
    part(GEO.centered, MAT.darkWood, [0, -0.36, 0], [1.9, 0.1, 0.4]),
    part(GEO.wedge, MAT.wood, [1.32, -0.32, 0], [0.36, 0.34, 0.78], [0, Math.PI, 0]),
    part(GEO.centered, MAT.darkWood, [0, 0.04, 0], [2.4, 0.06, 0.84]),
    part(GEO.centered, MAT.sheet, [-0.4, -0.15, 0.4], [0.5, 0.22, 0.02], [0, 0, 0.08]),
    part(GEO.centered, MAT.wood, [0.55, -0.12, 0.4], [0.4, 0.2, 0.02], [0, 0, -0.1]),
    ...[-0.8, 0, 0.8].map((x) => part(GEO.centered, MAT.darkWood, [x, 0.55, 0], [0.06, 1, 0.06])),
  );
  // The envelope: a patched balloon in a rope net, with tail fins.
  const bands = [-0.9, -0.3, 0.3, 0.9].map((x) => part(GEO.cylinder, MAT.rope, [x, 1.05, 0], [1.24, 0.04, 1.24], [0, 0, Math.PI / 2]));
  const patches = [
    part(GEO.centered, MAT.tarpBlue, [0.5, 2.2, 0.35], [0.5, 0.06, 0.4], [0.55, 0, -0.15]),
    part(GEO.centered, MAT.tarpRust, [-0.6, 1.95, 0.55], [0.45, 0.4, 0.06], [-0.3, 0, 0]),
    part(GEO.centered, MAT.tarpOlive, [-0.2, 2.25, -0.2], [0.5, 0.05, 0.4], [-0.3, 0, 0.05]),
  ];
  const fins = [part(GEO.wedge, MAT.canvas, [-1.6, 1.65, 0], [0.6, 0.55, 0.04], [0, 0, 0]), part(GEO.wedge, MAT.canvas, [-1.6, 1.62, 0], [0.6, 0.5, 0.04], [Math.PI / 2, 0, 0])];
  const ropes = [[-0.8, 1], [0.8, 1], [-0.8, -1], [0.8, -1]].map(([x, z]) => link(MAT.rope, [x, 0.04, z * 0.4], [x * 1.2, 1.25, z * 0.5], 0.015));
  named('envelope', part(GEO.sphere, MAT.canvas, [0, 1.65, 0], [3.1, 1.2, 1.2]), ...bands, ...patches, ...fins, ...ropes);
  // The engine: a scrap motor at the stern with a wooden propeller and a glowing exhaust.
  named(
    'engine',
    part(GEO.centered, MAT.rustDark, [-1.42, -0.1, 0], [0.42, 0.34, 0.36]),
    part(GEO.log, MAT.iron, [-1.68, -0.1, 0], [0.14, 0.12, 0.12]),
    part(GEO.centered, MAT.wood, [-1.76, -0.1, 0], [0.04, 0.8, 0.1], [0.5, 0, 0]),
    part(GEO.centered, MAT.wood, [-1.76, -0.1, 0], [0.04, 0.8, 0.1], [-1.07, 0, 0]),
    link(MAT.iron, [-1.3, 0.05, 0.15], [-1.3, 0.38, 0.2], 0.06),
    glowPart(MAT.ember, [-1.3, 0.4, 0.2], [0.07, 0.03, 0.07]),
  );
  // The fuel tank: a drum slung under the hull in straps.
  named(
    'fuelTank',
    part(GEO.log, MAT.rust, [0.25, -0.5, 0], [1.0, 0.3, 0.3]),
    part(GEO.cylinder, MAT.rope, [-0.05, -0.5, 0], [0.33, 0.05, 0.33], [0, 0, Math.PI / 2]),
    part(GEO.cylinder, MAT.rope, [0.55, -0.5, 0], [0.33, 0.05, 0.33], [0, 0, Math.PI / 2]),
  );
  // Navigation: a bow lamp, a compass dish, and an antenna.
  named(
    'navigation',
    glowPart(MAT.glow, [1.25, 0.18, 0], [0.16, 0.16, 0.16]),
    part(GEO.cone, MAT.iron, [1.25, 0.28, 0], [0.16, 0.12, 0.16]),
    link(MAT.iron, [0.9, 0.04, -0.3], [0.9, 0.8, -0.3], 0.025),
    part(GEO.dome, MAT.sheet, [0.6, 0.08, 0.25], [0.24, 0.1, 0.24]),
  );
  return ship;
}

export const ESCAPE = { lookoutPost, airshipDock } satisfies Partial<Record<BuildingType, Builder>>;
