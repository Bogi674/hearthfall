import * as THREE from 'three';
import type { BuildingType } from '../../../data/buildings';
import { at, crate, GEO, glowPart, link, MAT, part } from '../kit';
import { bake, boardedWindow, type Builder, drum, lantern, lightPool, pallet, patch, type Piece, rods, sandbags, shedRoof, sheet, sign, snowCap, stringLights, tires, type V3 } from './parts';

// Shelter buildings: the supply cart, a patched tarp tent, a bunkhouse made of two shipping
// containers, a plank and sheet storage shed, and an oil drum heater.

/** Builds a long building along x. A footprint deeper than wide is turned a quarter. */
function along(g: THREE.Group, w: number, d: number, build: (inner: THREE.Group, long: number, short: number) => void): void {
  const inner = new THREE.Group();
  if (d > w) inner.rotation.y = Math.PI / 2;
  build(inner, Math.max(w, d), Math.min(w, d));
  g.add(inner);
}

/** A tire standing on edge, facing z. */
function wheel(x: number, z: number, r: number): THREE.Mesh {
  return part(GEO.tire, MAT.rubber, [x, r, z], [r * 1.9, r * 1.9, r * 1.9], [Math.PI / 2, 0, 0]);
}

const supplyCart: Builder = (g, w, d) =>
  along(g, w, d, (c) => {
    // A flatbed hand cart on two car tires, heaped with the colony's first supplies.
    c.add(part(GEO.block, MAT.wood, [-0.1, 0.3, 0], [1.5, 0.08, 0.74]));
    for (const z of [-0.35, 0.35]) c.add(part(GEO.block, MAT.darkWood, [-0.1, 0.36, z], [1.5, 0.16, 0.05]));
    c.add(part(GEO.block, MAT.darkWood, [-0.84, 0.36, 0], [0.05, 0.22, 0.74]));
    for (const z of [-0.43, 0.43]) c.add(wheel(0.1, z, 0.25));
    c.add(link(MAT.iron, [0.1, 0.25, -0.46], [0.1, 0.25, 0.46], 0.05));
    // Handles and a prop leg so it stands level.
    for (const z of [-0.26, 0.26]) c.add(link(MAT.darkWood, [0.6, 0.34, z], [0.96, 0.52, z], 0.05));
    c.add(link(MAT.darkWood, [0.94, 0.51, -0.28], [0.94, 0.51, 0.28], 0.05));
    c.add(link(MAT.darkWood, [-0.7, 0.3, 0], [-0.74, 0, 0], 0.06));
    // The load: crates, sacks, a rolled mattress, a jerrycan, and a tarp tied over the back.
    c.add(part(GEO.pillow, MAT.tarpBlue, [-0.5, 0.6, 0], [0.66, 0.48, 0.72], [0, 0, 0.06]));
    c.add(part(GEO.block, MAT.tarpOlive, [-0.62, 0.8, 0.05], [0.3, 0.06, 0.32], [0.1, 0.3, 0.12]));
    for (const x of [-0.68, -0.34]) c.add(link(MAT.rope, [x, 0.4, -0.38], [x + 0.03, 0.86, 0], 0.025), link(MAT.rope, [x + 0.03, 0.86, 0], [x, 0.4, 0.38], 0.025));
    c.add(at(crate(0.26), -0.02, 0.38, -0.17, 0.2));
    c.add(part(GEO.block, MAT.paintBlue, [-0.04, 0.38, 0.17], [0.26, 0.22, 0.26], [0, 0.4, 0]));
    c.add(part(GEO.pillow, MAT.burlap, [0.02, 0.72, -0.12], [0.3, 0.16, 0.22], [0, 0.3, 0.1]));
    c.add(part(GEO.pillow, MAT.burlap, [0.32, 0.48, 0.12], [0.3, 0.2, 0.24], [0, -0.4, 0]));
    c.add(part(GEO.log, MAT.tarpRust, [0.32, 0.48, -0.18], [0.42, 0.2, 0.2], [0, 0.2, 0]));
    c.add(part(GEO.block, MAT.paintRed, [0.52, 0.38, 0.24], [0.1, 0.2, 0.15]));
    // A lantern on a stick at the front so the cart still glows.
    c.add(link(MAT.darkWood, [-0.82, 0.36, 0.3], [-0.82, 1.15, 0.3], 0.04));
    c.add(at(lantern(0.9).group, -0.82, 1.12, 0.38));
  });

const tent: Builder = (g, w, d) => {
  // A ridge tent of patched tarps along z, door facing +z.
  const hw = Math.min(w, d) * 0.38;
  const ridge = 0.95;
  const slant = Math.hypot(ridge, hw);
  const angle = Math.atan2(ridge, hw);
  const len = d * 0.68;
  const patchMats = [MAT.tarpOlive, MAT.tarpRust, MAT.canvas];
  for (const side of [-1, 1]) {
    const panel = new THREE.Group();
    panel.position.set((side * hw) / 2, ridge / 2, 0);
    panel.rotation.z = -side * angle;
    panel.add(part(GEO.centered, side < 0 ? MAT.tarpOlive : MAT.tarpBlue, [0, 0, 0], [slant + 0.08, 0.05, len]));
    panel.add(part(GEO.centered, MAT.canvas, [side * 0.28, 0.035, 0.32], [0.3, 0.03, 0.42], [0, -0.15 * side, 0]));
    panel.add(link(MAT.rope, [-slant / 2, 0.04, -0.1 * side], [slant / 2, 0.04, 0.05 * side], 0.02));
    panel.add(part(GEO.centered, patchMats[side < 0 ? 0 : 1], [side * 0.1, 0.035, side * 0.2], [0.34, 0.03, 0.3], [0, 0.3 * side, 0]));
    panel.add(part(GEO.centered, patchMats[2], [-side * 0.25, 0.035, -side * 0.35], [0.22, 0.03, 0.26], [0, -0.2, 0]));
    panel.add(part(GEO.centered, MAT.snow, [-side * (slant / 2 - 0.12), 0.04, -0.05], [0.2, 0.03, len * 0.85]));
    g.add(panel);
  }
  // Closed back, dark open door with a lantern inside, and the flaps tied back.
  g.add(part(GEO.gable, MAT.tarpOlive, [0, 0, -len / 2 + 0.02], [hw * 2, ridge, 0.04]));
  g.add(part(GEO.gable, MAT.soot, [0, 0, len / 2 - 0.08], [hw * 1.5, ridge * 0.8, 0.03]));
  g.add(glowPart(MAT.leak, [0, 0.18, len / 2 - 0.14], [0.12, 0.16, 0.12]));
  for (const side of [-1, 1]) g.add(part(GEO.centered, MAT.tarpBlue, [side * hw * 0.62, 0.32, len / 2 + 0.02], [0.18, 0.6, 0.06], [0, 0, side * 0.55]));
  g.add(link(MAT.darkWood, [0, ridge + 0.05, -len / 2 - 0.12], [0, ridge + 0.05, len / 2 + 0.12], 0.06));
  for (const z of [-len / 2 - 0.08, len / 2 + 0.08]) g.add(part(GEO.block, MAT.darkWood, [0, 0, z], [0.05, ridge + 0.05, 0.05]));
  // Guy ropes from the ridge to stakes.
  for (const z of [-len / 2 - 0.08, len / 2 + 0.08]) {
    const zs = z + Math.sign(z) * 0.2;
    g.add(link(MAT.rope, [0, ridge + 0.02, z], [0, 0.05, zs], 0.018));
    g.add(part(GEO.block, MAT.darkWood, [0, 0, zs], [0.04, 0.1, 0.04]));
  }
  for (const side of [-1, 1]) for (const z of [-len / 3, len / 3]) g.add(link(MAT.rope, [side * hw * 0.85, 0.15, z], [side * (hw + 0.18), 0, z], 0.018));
  // A bedroll, a tire seat, a crate, and a lantern hung at the door.
  g.add(part(GEO.log, MAT.tarpRust, [hw * 0.55, 0.08, len / 2 + 0.14], [0.5, 0.15, 0.15], [0, 0.4, 0]));
  g.add(at(tires(2), -hw * 0.72, 0, len / 2 + 0.06));
  g.add(at(crate(0.22), hw + 0.06, 0, -len / 2 + 0.2, 0.3));
  g.add(at(lantern(0.8).group, 0.08, ridge - 0.02, len / 2 + 0.12));
};

const bunkhouse: Builder = (g, w, d) => {
  const s = Math.min(w, d) / 3;
  const b = new THREE.Group();
  b.scale.setScalar(s);
  g.add(b);
  // Bottom container along x on cinder blocks, with windows cut into its side.
  for (const x of [-1.25, 0.65]) for (const z of [-1.0, -0.1]) b.add(part(GEO.block, MAT.concrete, [x, 0, z], [0.22, 0.12, 0.22]));
  b.add(part(GEO.block, MAT.rust, [-0.3, 0.12, -0.55], [2.2, 1.0, 1.0]));
  for (const x of [-0.85, 0.25]) b.add(sheet(MAT.rust, [x, 0.14, -0.04], 1.1, 0.96));
  for (const x of [-0.95, 0.15]) b.add(at(boardedWindow(MAT.glow, 0.36, 0.26), x, 0.68, 0.02));
  // Top container crosses along z and hangs out over the porch on two posts.
  b.add(part(GEO.block, MAT.paintBlue, [-0.75, 1.12, -0.25], [0.9, 0.85, 2.3]));
  b.add(sheet(MAT.paintBlue, [-0.29, 1.14, -0.25], 2.2, 0.8, [0, Math.PI / 2, 0]));
  b.add(at(boardedWindow(MAT.glow, 0.28, 0.22), -0.28, 1.6, 0.2, Math.PI / 2));
  b.add(snowCap([-0.78, 1.99, -0.6], 0.7, 1.3));
  for (const x of [-1.12, -0.38]) b.add(link(MAT.iron, [x, 0, 0.82], [x, 1.12, 0.82], 0.07));
  // A ladder up to the roof of the top container.
  b.add(rods('bunkLadder', MAT.darkWood, () => [
    ...[0.45, 0.65].map((z): [V3, V3, number] => [[0.3, 0, z], [-0.27, 2.05, z], 0.05]),
    ...[1, 2, 3, 4, 5, 6, 7].map((i): [V3, V3, number] => [[0.3 - (0.57 * i) / 8, (2.05 * i) / 8, 0.45], [0.3 - (0.57 * i) / 8, (2.05 * i) / 8, 0.65], 0.035]),
  ]));
  // A plank lean-to built onto the +x end with its own sheet roof and a stovepipe.
  const shack = new THREE.Group();
  shack.position.set(1.15, 0, -0.55);
  shack.add(part(GEO.block, MAT.wood, [0, 0, 0], [0.6, 0.85, 1.0]));
  shack.add(patch(MAT.sheetWarm, [0.31, 0.45, 0.2], 0.04, 0.5, 0).rotateY(Math.PI / 2));
  shack.add(at(boardedWindow(MAT.glow, 0.24, 0.22), 0.31, 0.55, -0.2, Math.PI / 2));
  shack.add(part(GEO.block, MAT.darkWood, [0.05, 0, 0.51], [0.32, 0.66, 0.04]));
  shack.add(glowPart(MAT.leak, [0.23, 0.33, 0.52], [0.03, 0.6, 0.03]));
  const roof = shedRoof([MAT.sheet, MAT.rust], 1.1, 0.7, 0.85, 1.12);
  roof.rotation.y = Math.PI / 2;
  shack.add(roof);
  shack.add(part(GEO.pipe, MAT.iron, [-0.05, 0.9, -0.3], [0.1, 1.2, 0.1]));
  shack.add(part(GEO.cone, MAT.iron, [-0.05, 2.08, -0.3], [0.2, 0.1, 0.2]));
  b.add(shack);
  // Porch: pallets, a drum bench, a sign, laundry, and string lights along the overhang.
  b.add(at(pallet(), -0.75, 0, 0.55), at(pallet(), 0.75, 0, 0.75, 0.2));
  b.add(at(drum(MAT.sheet), 0.95, 0, 1.1), at(drum(MAT.rust), 1.25, 0, 0.9));
  b.add(part(GEO.block, MAT.wood, [0.6, 0, 0.3], [0.5, 0.25, 0.18]));
  b.add(link(MAT.rope, [-1.12, 0.85, 0.82], [-0.38, 0.85, 0.82], 0.015));
  for (const [x, m] of [[-0.95, MAT.cloth], [-0.75, MAT.tarpRust], [-0.55, MAT.paintBlue]] as const) b.add(part(GEO.block, m, [x, 0.55, 0.82], [0.16, 0.28, 0.02], [0, 0, (x + 0.75) * 0.3]));
  b.add(stringLights('bunk', [[-0.38, 1.08, 0.85], [0.86, 0.86, -0.02]], 0.15));
  b.add(at(sign(MAT.paintYellow, MAT.soot, 0.5, 0.22, 0.5), 1.25, 0, 0.2, -0.3));
};

const storageShed: Builder = (g) => {
  // A plank shed with a sheet roof, an open door full of crates, and overflow stacked outside.
  g.add(part(GEO.block, MAT.wood, [-0.15, 0, -0.3], [1.4, 0.95, 1.05]));
  g.add(sheet(MAT.sheet, [-0.65, 0.05, 0.24], 0.4, 0.85, [0, 0, 0.03]));
  g.add(patch(MAT.darkWood, [0.3, 0.55, 0.23], 0.36, 0.08, 0.2));
  g.add(part(GEO.block, MAT.soot, [0.05, 0, 0.21], [0.55, 0.78, 0.04]));
  g.add(at(crate(0.26), -0.02, 0, 0.12, 0.1), at(crate(0.2), 0.1, 0.26, 0.12, -0.2));
  g.add(glowPart(MAT.leak, [0.05, 0.82, 0.24], [0.4, 0.04, 0.03]));
  g.add(part(GEO.block, MAT.darkWood, [0.4, 0, 0.32], [0.28, 0.78, 0.04], [0, -1.0, 0]));
  g.add(part(GEO.block, MAT.darkWood, [-0.26, 0, 0.24], [0.06, 0.82, 0.06]), part(GEO.block, MAT.darkWood, [0.36, 0, 0.24], [0.06, 0.82, 0.06]));
  g.add(at(boardedWindow(MAT.glow, 0.22, 0.2), 0.56, 0.6, -0.4, Math.PI / 2));
  g.add(at(shedRoof([MAT.sheet, MAT.rust, MAT.sheetWarm], 1.6, 1.2, 0.95, 1.3), -0.15, 0, -0.3));
  // Outside: a pallet of crates, a tarp tied over a pile, drums, and a sign.
  g.add(at(pallet(), 0.58, 0, 0.62));
  g.add(at(crate(0.28), 0.48, 0.12, 0.6, 0.1), at(crate(0.22), 0.72, 0.12, 0.7, -0.3), at(crate(0.2), 0.55, 0.4, 0.62, 0.5));
  g.add(part(GEO.pillow, MAT.tarpOlive, [-0.5, 0.18, 0.62], [0.65, 0.38, 0.5], [0, 0.2, 0]));
  g.add(link(MAT.rope, [-0.78, 0.05, 0.85], [-0.3, 0.38, 0.62], 0.02), link(MAT.rope, [-0.3, 0.38, 0.62], [-0.2, 0.05, 0.4], 0.02));
  g.add(at(drum(MAT.paintBlue), 0.82, 0, -0.1), at(drum(MAT.rust), 0.78, 0, -0.62));
  g.add(at(sign(MAT.paintYellow, MAT.rustDark, 0.4, 0.2, 0), -0.15, 1.02, 0.26));
};

const heater: Builder = (g) => {
  // An oil drum stove on bricks with glowing slits, a stovepipe, and a kettle on top.
  for (const [x, z] of [[-0.16, -0.16], [0.16, -0.16], [-0.16, 0.16], [0.16, 0.16]]) g.add(part(GEO.block, MAT.brick, [x, 0, z], [0.14, 0.1, 0.14]));
  g.add(part(GEO.drum, MAT.rust, [0, 0.1, 0], [0.5, 0.62, 0.5]));
  // The slits, the hot top, and the glow on the ground go dark when the heater is out.
  const light = new THREE.Group();
  light.name = 'light';
  for (let i = 0; i < 3; i++) {
    const a = 0.3 + i * 0.5;
    light.add(glowPart(MAT.ember, [Math.sin(a) * 0.255, 0.3 + (i % 2) * 0.14, Math.cos(a) * 0.255], [0.12, 0.035, 0.12]));
  }
  light.add(glowPart(MAT.ember, [0, 0.71, 0], [0.4, 0.02, 0.4], GEO.cylinder));
  light.add(lightPool(4));
  g.add(light);
  g.add(part(GEO.block, MAT.iron, [0.06, 0.62, 0.1], [0.12, 0.16, 0.12]));
  g.add(link(MAT.iron, [-0.12, 0.7, -0.1], [-0.12, 1.4, -0.1], 0.11));
  g.add(link(MAT.iron, [-0.12, 1.4, -0.1], [-0.2, 1.6, -0.25], 0.11));
  g.add(part(GEO.cone, MAT.iron, [-0.2, 1.62, -0.25], [0.2, 0.1, 0.2]));
  const wood = bake('heaterWood', () => [0, 1, 2].map((i): Piece => [GEO.log, [0, 0.06 + (i > 1 ? 0.1 : 0), (i % 2) * 0.1 - 0.05 + (i > 1 ? 0.05 : 0)], [0.3, 0.1, 0.1]]));
  g.add(part(wood, MAT.wood, [0.3, 0, 0.28], [1, 1, 1], [0, 0.7, 0]));
  g.add(at(sandbags(0.6, 1), 0, 0, -0.4));
};

export const SHELTER = { supplyCart, tent, bunkhouse, storageShed, heater } satisfies Partial<Record<BuildingType, Builder>>;
