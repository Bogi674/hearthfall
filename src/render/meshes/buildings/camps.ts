import * as THREE from 'three';
import type { BuildingType } from '../../../data/buildings';
import { at, GEO, glowPart, link, MAT, part } from '../kit';
import { bake, type Builder, drum, lantern, pallet, type Piece, shedRoof, sheet, sign, smokePuffs, tires } from './parts';

// Gatherer camps and the charcoal kiln. Workers walk out to trees, ruins, rocks, and bushes,
// so each camp shows its trade: logs and axes, scrap heaps, a stone pile and crane, drying racks.

const hutCone = new THREE.ConeGeometry(0.5, 1, 7).translate(0, 0.5, 0);
const basketGeo = new THREE.CylinderGeometry(0.5, 0.38, 1, 8).translate(0, 0.5, 0);
const moundGeo = new THREE.SphereGeometry(0.5, 9, 4, 0, Math.PI * 2, 0, Math.PI / 2);

/** Logs lying along z, stacked in rows, and their pale cut ends facing +z. */
function logRows(ends: boolean): Piece[] {
  const out: Piece[] = [];
  [3, 2, 1].forEach((n, r) => {
    for (let i = 0; i < n; i++) {
      const at: [number, number, number] = [(i - (n - 1) / 2) * 0.24, 0.12 + r * 0.2, ((i + r) % 2) * 0.05];
      const len = 1.0 - r * 0.08;
      if (ends) out.push([GEO.log, [at[0], at[1], at[2] + len / 2], [0.02, 0.2, 0.2], [0, Math.PI / 2, 0]]);
      else out.push([GEO.log, at, [len, 0.24, 0.24], [0, Math.PI / 2, 0]]);
    }
  });
  return out;
}
const logStack = bake('woodcutterLogs', () => logRows(false));
const logEnds = bake('woodcutterLogEnds', () => logRows(true));

const splitWood = bake('splitWood', () => Array.from({ length: 8 }, (_, i): Piece => [GEO.block, [((i % 4) - 1.5) * 0.17, Math.floor(i / 4) * 0.13, ((i * 3) % 2) * 0.03], [0.13, 0.12, 0.42], [0, 0, ((i % 3) - 1) * 0.3]]));

const toolHandles = bake('toolHandles', () => [
  [GEO.rod, [-0.2, 0.42, 0.04], [0.04, 0.8, 0.04], [0.15, 0, 0.12]],
  [GEO.rod, [0.02, 0.4, 0.04], [0.04, 0.76, 0.04], [0.15, 0, -0.08]],
  [GEO.rod, [0.22, 0.38, 0.04], [0.04, 0.74, 0.04], [0.15, 0, 0.1]],
]);
const toolHeads = bake('toolHeads', () => [
  [GEO.centered, [-0.25, 0.78, 0.0], [0.05, 0.12, 0.18], [0.15, 0, 0.12]],
  [GEO.centered, [0.0, 0.76, 0.0], [0.24, 0.07, 0.07], [0.15, 0, -0.08]],
  [GEO.centered, [0.26, 0.72, 0.0], [0.07, 0.07, 0.2], [0.15, 0, 0.1]],
]);

const woodcutterCamp: Builder = (g) => {
  // A tarp lean-to over split firewood, open to the front.
  for (const x of [-0.88, 0.02]) g.add(part(GEO.block, MAT.darkWood, [x, 0, -0.22], [0.08, 1.1, 0.08]));
  g.add(at(shedRoof([MAT.tarpBlue, MAT.canvas], 1.04, 0.78, 0.66, 1.12), -0.43, 0, -0.6, Math.PI));
  g.add(part(splitWood, MAT.wood, [-0.43, 0, -0.68], [1, 1, 1]));
  g.add(at(lantern(0.9).group, 0.02, 1.08, -0.15));
  // The big log pile held by stakes.
  g.add(part(logStack, MAT.wood, [0.58, 0, -0.35], [1, 1, 1]));
  g.add(part(logEnds, MAT.thatch, [0.58, 0, -0.35], [1, 1, 1]));
  for (const x of [0.22, 0.94]) g.add(link(MAT.darkWood, [x, 0, 0.1], [x, 0.62, 0.12], 0.05));
  // A chopping block with an axe in it, split halves, and chips.
  g.add(part(GEO.cylinder, MAT.wood, [0.15, 0, 0.5], [0.36, 0.28, 0.36]));
  g.add(part(GEO.centered, MAT.iron, [0.12, 0.33, 0.5], [0.05, 0.1, 0.16], [0, 0, 0.5]));
  g.add(link(MAT.darkWood, [0.12, 0.33, 0.5], [0.42, 0.58, 0.58], 0.045));
  g.add(part(GEO.block, MAT.wood, [0.45, 0, 0.72], [0.18, 0.1, 0.12], [0.3, 0.6, 1.3]));
  g.add(part(GEO.block, MAT.thatch, [-0.05, 0, 0.75], [0.12, 0.06, 0.1], [0, 0.6, 0]));
  // A tool rack with an axe, a saw, and a sledge.
  for (const x of [-0.95, -0.4]) g.add(part(GEO.block, MAT.darkWood, [x, 0, 0.55], [0.07, 0.9, 0.07]));
  g.add(part(GEO.block, MAT.darkWood, [-0.67, 0.78, 0.55], [0.66, 0.07, 0.07]));
  g.add(part(toolHandles, MAT.darkWood, [-0.67, 0, 0.6], [1, 1, 1]));
  g.add(part(toolHeads, MAT.iron, [-0.67, 0, 0.6], [1, 1, 1]));
  g.add(at(sign(MAT.wood, MAT.rust, 0.34, 0.18, 0.0), -0.67, 0.98, 0.56));
};

const junk = bake('junkRust', () => [
  [GEO.block, [0, 0, 0], [0.6, 0.18, 0.5], [0, 0.3, 0]],
  [GEO.centered, [-0.1, 0.28, 0.05], [0.4, 0.22, 0.3], [0.4, 0.8, 0.2]],
  [GEO.centered, [0.18, 0.3, -0.05], [0.3, 0.3, 0.06], [0.2, -0.3, 0.6]],
  [GEO.rod, [0.05, 0.45, 0.1], [0.06, 0.7, 0.06], [0.2, 0, 1.2]],
  [GEO.drum, [-0.25, 0.1, -0.18], [0.24, 0.32, 0.24], [1.3, 0, 0.3]],
  [GEO.centered, [0.05, 0.52, -0.05], [0.24, 0.12, 0.2], [0.6, 0.2, 0.3]],
]);
const junkSheet = bake('junkSheet', () => [
  [GEO.corrugated, [0.25, 0.05, 0.15], [0.5, 0.5, 0.06], [-1.1, 0.4, 0.2]],
  [GEO.corrugated, [-0.3, 0.05, 0.2], [0.45, 0.4, 0.06], [-0.6, -0.5, -0.3]],
  [GEO.tire, [0.1, 0.42, 0.18], [0.36, 0.36, 0.36], [1.2, 0, 0.3]],
]);

const salvageYard: Builder = (g) => {
  // A fence of mismatched sheets at the back and left, with a painted sign.
  const fence: [THREE.Material, number, number, number][] = [[MAT.sheet, -0.62, 1.0, 0.04], [MAT.rust, 0.0, 0.88, -0.05], [MAT.paintBlue, 0.6, 1.06, 0.03]];
  for (const [m, x, h, tilt] of fence) g.add(sheet(m, [x, 0, -0.9], 0.66, h, [0, 0, tilt]));
  for (const [m, z, h] of [[MAT.sheetWarm, -0.4, 0.9], [MAT.rust, 0.15, 0.76]] as const) g.add(sheet(m, [-0.92, 0, z], 0.58, h, [0, Math.PI / 2, 0.03]));
  for (const x of [-0.92, 0.3, 0.92]) g.add(part(GEO.block, MAT.darkWood, [x, 0, -0.95], [0.07, 1.15, 0.07]));
  g.add(at(sign(MAT.paintYellow, MAT.rustDark, 0.5, 0.22, 0), 0.0, 1.0, -0.84));
  g.add(at(lantern().group, 0.92, 1.12, -0.86));
  // Scrap heaps, a car door, and tires.
  g.add(part(junk, MAT.rust, [-0.42, 0, -0.42], [1, 1, 1]));
  g.add(part(junkSheet, MAT.sheet, [-0.4, 0, -0.38], [1, 1, 1]));
  g.add(part(junk, MAT.rustDark, [0.4, 0, -0.5], [0.8, 0.7, 0.8], [0, 2.1, 0]));
  g.add(part(GEO.block, MAT.paintBlue, [0.05, 0, -0.18], [0.46, 0.5, 0.05], [-0.25, 0.4, 0]));
  g.add(part(GEO.block, MAT.soot, [0.06, 0.28, -0.13], [0.34, 0.18, 0.02], [-0.25, 0.4, 0]));
  g.add(at(tires(3), 0.78, 0, -0.05), at(tires(1), 0.55, 0, 0.12));
  // A sorting table on drums with parts laid out.
  g.add(at(drum(MAT.rust, 0.95), 0.25, 0, 0.55), at(drum(MAT.sheet, 0.95), 0.78, 0, 0.55));
  g.add(part(GEO.block, MAT.wood, [0.52, 0.42, 0.55], [0.82, 0.05, 0.38]));
  g.add(part(bake('scrapParts', () => [
    [GEO.block, [-0.25, 0, 0], [0.12, 0.08, 0.1], [0, 0.3, 0]],
    [GEO.wheel, [-0.05, 0.05, 0.05], [0.04, 0.12, 0.12]],
    [GEO.rod, [0.12, 0.03, -0.05], [0.04, 0.24, 0.04], [0, 0, Math.PI / 2]],
    [GEO.block, [0.25, 0, 0.06], [0.14, 0.1, 0.12]],
  ]), MAT.iron, [0.52, 0.47, 0.55], [1, 1, 1]));
  // A wheelbarrow loaded with scrap.
  g.add(part(GEO.block, MAT.rust, [-0.5, 0.18, 0.55], [0.42, 0.18, 0.36], [0, 0.1, 0.1]));
  g.add(part(GEO.tire, MAT.rubber, [-0.78, 0.13, 0.52], [0.3, 0.3, 0.3], [Math.PI / 2, 0, 0.1]));
  for (const z of [0.42, 0.66]) g.add(link(MAT.darkWood, [-0.75, 0.2, z], [-0.18, 0.36, z + 0.04], 0.04));
  g.add(part(GEO.centered, MAT.sheet, [-0.5, 0.4, 0.55], [0.3, 0.06, 0.24], [0.3, 0.4, 0.2]));
};

const rocks = bake('quarryRocks', () => [
  [GEO.rock, [0, 0.2, 0], [0.5, 0.42, 0.48], [0.3, 0.2, 0]],
  [GEO.rock, [0.32, 0.14, 0.1], [0.34, 0.3, 0.32], [0, 0.8, 0.4]],
  [GEO.rock, [-0.3, 0.15, 0.12], [0.36, 0.3, 0.34], [0.5, 0, 0.2]],
  [GEO.rock, [0.1, 0.12, 0.35], [0.28, 0.24, 0.26], [0.2, 1.1, 0]],
  [GEO.rock, [-0.15, 0.1, -0.3], [0.3, 0.22, 0.28], [0.1, 0.4, 0.6]],
  [GEO.rock, [0.08, 0.46, 0.05], [0.26, 0.22, 0.24], [0.7, 0.2, 0.1]],
]);

const quarry: Builder = (g) => {
  g.add(part(GEO.block, MAT.darkStone, [-0.3, 0, -0.3], [1.2, 0.03, 1.1]));
  g.add(part(rocks, MAT.stone, [-0.45, 0, -0.42], [1, 1, 1]));
  g.add(part(rocks, MAT.darkStone, [-0.75, 0, 0.2], [0.6, 0.5, 0.6], [0, 2, 0]));
  // A crude crane: three poles lashed at the top, a pulley, and a stone hanging in a sling.
  const apex: [number, number, number] = [0.35, 1.75, -0.3];
  for (const foot of [[0.0, 0, -0.85], [0.92, 0, -0.62], [0.42, 0, 0.3]] as [number, number, number][]) g.add(link(MAT.darkWood, foot, apex, 0.07));
  g.add(part(GEO.wheel, MAT.iron, [apex[0], apex[1] - 0.12, apex[2]], [0.06, 0.2, 0.2]));
  g.add(link(MAT.rope, [apex[0] + 0.06, apex[1] - 0.12, apex[2]], [apex[0] + 0.06, 0.78, apex[2]], 0.02));
  g.add(link(MAT.rope, [apex[0] - 0.06, apex[1] - 0.12, apex[2]], [0.78, 0.3, -0.22], 0.02));
  g.add(part(GEO.block, MAT.stone, [apex[0] + 0.06, 0.48, apex[2]], [0.34, 0.26, 0.26], [0, 0.3, 0]));
  g.add(link(MAT.rope, [apex[0] - 0.08, 0.74, apex[2]], [apex[0] + 0.2, 0.74, apex[2]], 0.02));
  // The winch drum with a crank.
  g.add(part(GEO.log, MAT.darkWood, [0.78, 0.28, -0.12], [0.32, 0.16, 0.16], [0, Math.PI / 2, 0]));
  for (const z of [-0.3, 0.06]) g.add(part(GEO.block, MAT.darkWood, [0.78, 0, z], [0.06, 0.3, 0.06]));
  g.add(link(MAT.iron, [0.78, 0.28, 0.08], [0.88, 0.4, 0.12], 0.03));
  g.add(at(lantern(0.9).group, apex[0] - 0.2, 1.42, apex[2] + 0.12));
  // Cut blocks on a pallet, picks, a sledge, and a bucket.
  g.add(at(pallet(), 0.5, 0, 0.62));
  g.add(part(GEO.block, MAT.stone, [0.38, 0.12, 0.6], [0.26, 0.2, 0.36]));
  g.add(part(GEO.block, MAT.concrete, [0.66, 0.12, 0.62], [0.24, 0.2, 0.34]));
  g.add(part(GEO.block, MAT.stone, [0.5, 0.32, 0.6], [0.3, 0.18, 0.3], [0, 0.4, 0]));
  for (const [x, z, r] of [[-0.15, 0.45, 0.3], [-0.35, 0.58, -0.2]]) {
    g.add(link(MAT.darkWood, [x, 0, z], [x + 0.08, 0.62, z - 0.2], 0.04));
    g.add(part(GEO.centered, MAT.iron, [x + 0.08, 0.62, z - 0.2], [0.36, 0.05, 0.06], [0, r, 0.25]));
  }
  g.add(part(GEO.cylinder, MAT.iron, [0.0, 0, 0.78], [0.2, 0.2, 0.2]));
  g.add(part(GEO.rock, MAT.stone, [0.0, 0.2, 0.78], [0.14, 0.1, 0.14]));
};

const herbs = bake('herbs', () => {
  const out: Piece[] = [];
  for (let i = 0; i < 4; i++) for (const y of [0.89, 0.63]) out.push([GEO.cone, [(0.92 - y) * 0.2, y, -0.33 + i * 0.22 + (y > 0.7 ? 0 : 0.1)], [0.1, 0.2, 0.1], [Math.PI, 0, 0]]);
  return out;
});

const foragerHut: Builder = (g) => {
  // A conical hut of poles wrapped in patched canvas, with a burlap skirt and a lit doorway.
  g.add(part(hutCone, MAT.tarpOlive, [-0.35, 0, -0.35], [1.3, 1.35, 1.3]));
  g.add(part(basketGeo, MAT.burlap, [-0.35, 0.3, -0.35], [1.36, 0.3, 1.36], [Math.PI, 0, 0]));
  g.add(part(GEO.centered, MAT.canvas, [-0.62, 0.65, -0.24], [0.22, 0.26, 0.04], [0.4, -1.0, 0.1]));
  for (const a of [0.5, 2.6, 4.4]) g.add(link(MAT.darkWood, [-0.35 + Math.cos(a) * 0.14, 1.0, -0.35 + Math.sin(a) * 0.14], [-0.35 - Math.cos(a) * 0.16, 1.62, -0.35 - Math.sin(a) * 0.16], 0.05));
  const door = new THREE.Group();
  door.position.set(-0.35, 0, -0.35);
  door.rotation.y = Math.PI / 4;
  door.add(part(GEO.gable, MAT.soot, [0, 0, 0.665], [0.42, 0.6, 0.04], [-0.45, 0, 0]));
  door.add(glowPart(MAT.leak, [0, 0.12, 0.66], [0.1, 0.12, 0.08]));
  g.add(door);
  // A drying rack hung with herbs and roots.
  for (const z of [-0.45, 0.45]) {
    g.add(link(MAT.darkWood, [0.4, 0, z], [0.6, 0.95, z], 0.04));
    g.add(link(MAT.darkWood, [0.8, 0, z], [0.6, 0.95, z], 0.04));
  }
  for (const y of [0.92, 0.66]) g.add(link(MAT.darkWood, [0.6 + (0.92 - y) * 0.2, y, -0.48], [0.6 + (0.92 - y) * 0.2, y, 0.48], 0.035));
  g.add(part(herbs, MAT.herb, [0.6, 0, 0.02], [1, 1, 1]));
  g.add(part(herbs, MAT.thatch, [0.66, -0.05, -0.1], [1, 0.9, 0.5]));
  // Baskets of berries, mushrooms, and roots.
  g.add(part(basketGeo, MAT.rope, [0.1, 0, 0.62], [0.32, 0.22, 0.32]));
  g.add(part(GEO.pillow, MAT.paintRed, [0.1, 0.22, 0.62], [0.24, 0.06, 0.24]));
  g.add(part(basketGeo, MAT.burlap, [-0.3, 0, 0.72], [0.28, 0.18, 0.28]));
  g.add(part(GEO.dome, MAT.canvas, [-0.3, 0.17, 0.72], [0.22, 0.12, 0.22]));
  g.add(part(basketGeo, MAT.rope, [0.55, 0, 0.75], [0.26, 0.24, 0.26]));
  g.add(part(GEO.pillow, MAT.herb, [0.55, 0.24, 0.75], [0.2, 0.06, 0.2]));
  g.add(part(GEO.cylinder, MAT.wood, [-0.75, 0, 0.5], [0.24, 0.22, 0.24]));
  g.add(at(lantern(0.8).group, 0.6, 0.95, 0.48));
};

const kilnStones = bake('kilnStones', () => Array.from({ length: 11 }, (_, i): Piece => {
  const a = (i / 11) * Math.PI * 2;
  return [GEO.rock, [Math.sin(a) * 0.82, 0.05, Math.cos(a) * 0.82], [0.16, 0.12, 0.14], [i, i * 2, 0]];
}));

const charcoalKiln: Builder = (g) => {
  // An earth mound kiln with a smoking vent on top and embers glowing through its base vents.
  g.add(part(moundGeo, MAT.earth, [-0.1, 0, -0.1], [1.5, 1.15, 1.5]));
  for (const [x, z, r] of [[0.2, 0.2, 0.4], [-0.45, 0.05, -0.6], [0.0, -0.45, 1.2]]) g.add(part(GEO.centered, MAT.earth, [x, 0.42, z], [0.3, 0.06, 0.26], [0.3, r, 0.2]));
  g.add(part(GEO.cylinder, MAT.brick, [-0.1, 0.5, -0.1], [0.26, 0.16, 0.26]));
  g.add(glowPart(MAT.ember, [-0.1, 0.66, -0.1], [0.18, 0.02, 0.18], GEO.cylinder));
  g.add(smokePuffs([-0.1, 0.72, -0.1], 3));
  for (const a of [0.2, 0.9, 1.6, -0.5]) g.add(glowPart(MAT.ember, [-0.1 + Math.sin(a) * 0.79, 0.08, -0.1 + Math.cos(a) * 0.79], [0.24, 0.13, 0.06]).rotateY(a));
  g.add(part(kilnStones, MAT.stone, [-0.1, 0, -0.1], [1, 1, 1]));
  // Firewood waiting, sacks of charcoal, and a shovel.
  g.add(part(splitWood, MAT.wood, [-0.62, 0, 0.72], [1, 1, 0.7], [0, 0.2, 0]));
  g.add(part(GEO.pillow, MAT.soot, [0.82, 0.15, 0.25], [0.28, 0.3, 0.26], [0, 0.4, 0]));
  g.add(part(GEO.pillow, MAT.soot, [0.8, 0.13, -0.05], [0.26, 0.26, 0.24], [0, -0.3, 0]));
  g.add(part(GEO.pillow, MAT.burlap, [0.8, 0.36, 0.12], [0.24, 0.18, 0.22], [0, 0.1, 0.2]));
  g.add(link(MAT.darkWood, [0.55, 0.25, -0.35], [0.85, 0.95, -0.5], 0.04));
  g.add(part(GEO.centered, MAT.iron, [0.53, 0.2, -0.34], [0.16, 0.2, 0.04], [0, 0.45, 0.4]));
  g.add(at(drum(MAT.rustDark), 0.75, 0, -0.75));
};

export const CAMPS = { woodcutterCamp, salvageYard, quarry, foragerHut, charcoalKiln } satisfies Partial<Record<BuildingType, Builder>>;
