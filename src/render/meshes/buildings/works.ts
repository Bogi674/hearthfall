import * as THREE from 'three';
import type { BuildingType } from '../../../data/buildings';
import { at, crate, GEO, glowPart, link, MAT, part } from '../kit';
import { bake, type Builder, drum, hangingPots, lantern, pallet, patch, type Piece, sheet, shedRoof, sign, smokePuffs, stringLights, tires } from './parts';

// Indoor production: kitchen, sawmill, smelter, and workshop. Workers stand inside the footprint
// around the center, so each one is an open lean-to with a tall back, a roof over the back strip
// only, and its main work prop low in the middle where people stay visible from the camera.

const kitchen: Builder = (g) => {
  // Back wall and a half wall on the left, built from planks with patches.
  g.add(part(GEO.block, MAT.wood, [0, 0, -0.9], [1.9, 1.3, 0.1]));
  g.add(patch(MAT.sheetWarm, [-0.5, 0.5, -0.84], 0.5, 0.4, 0.08));
  g.add(part(GEO.block, MAT.wood, [-0.92, 0, -0.35], [0.08, 0.6, 1.1]));
  // A striped canvas awning on poles over the back strip.
  for (const x of [-0.92, 0.92]) g.add(part(GEO.block, MAT.darkWood, [x, 0, -0.32], [0.07, 1.68, 0.07]), part(GEO.block, MAT.darkWood, [x, 0, -0.92], [0.07, 2.02, 0.07]));
  const stripes = (odd: number) => bake(`awning${odd}`, () => Array.from({ length: 3 }, (_, i): Piece => [GEO.centered, [-0.8 + (i * 2 + odd) * 0.32, 0, 0], [0.33, 0.04, 0.72]]));
  g.add(part(stripes(0), MAT.canvas, [0, 1.86, -0.63], [1, 1, 1], [0.48, 0, 0]));
  g.add(part(stripes(1), MAT.tarpRust, [0, 1.86, -0.63], [1, 1, 1], [0.48, 0, 0]));
  g.add(part(GEO.centered, MAT.snow, [0, 1.95, -0.74], [1.8, 0.03, 0.4], [0.48, 0, 0]));
  g.add(stringLights('kitchen', [[-0.92, 1.62, -0.3], [0.92, 1.62, -0.3]], 0.1));
  // Shelf of jars and hanging pots on the back wall.
  g.add(part(GEO.block, MAT.darkWood, [-0.35, 0.95, -0.8], [0.8, 0.04, 0.16]));
  g.add(part(bake('jars', () => [-0.6, -0.45, -0.3, -0.15].map((x, i): Piece => [GEO.cylinder, [x, 0, 0], [0.09, 0.12 + (i % 2) * 0.04, 0.09]])), MAT.paintYellow, [0.1, 0.99, -0.8], [1, 1, 1]));
  g.add(at(hangingPots(), -0.3, 0.5, -0.8));
  // A brick oven in the back corner with its pipe through the awning.
  g.add(part(GEO.block, MAT.brick, [0.62, 0, -0.68], [0.5, 0.6, 0.36]));
  g.add(glowPart(MAT.ember, [0.62, 0.22, -0.49], [0.22, 0.14, 0.02]));
  g.add(part(GEO.pipe, MAT.iron, [0.7, 0.6, -0.72], [0.12, 1.65, 0.12]));
  g.add(part(GEO.cone, MAT.iron, [0.7, 2.25, -0.72], [0.22, 0.1, 0.22]));
  g.add(smokePuffs([0.7, 2.3, -0.72], 2));
  // The cook stove in the middle: half a drum with a big pot of soup and a ladle.
  g.add(part(GEO.drum, MAT.rust, [0, 0, -0.02], [0.34, 0.3, 0.34]));
  g.add(glowPart(MAT.ember, [0, 0.12, 0.15], [0.14, 0.06, 0.02]));
  g.add(part(GEO.cylinder, MAT.iron, [0, 0.3, -0.02], [0.3, 0.18, 0.3]));
  g.add(part(GEO.cylinder, MAT.paintYellow, [0, 0.47, -0.02], [0.24, 0.02, 0.24]));
  g.add(link(MAT.iron, [0.04, 0.45, -0.02], [0.18, 0.7, 0.06], 0.025));
  g.add(smokePuffs([0, 0.5, -0.02], 2));
  // A counter, sacks of potatoes, and a water drum.
  g.add(part(GEO.block, MAT.wood, [0.8, 0, 0.55], [0.3, 0.5, 0.6]));
  g.add(part(GEO.block, MAT.darkWood, [0.8, 0.5, 0.55], [0.34, 0.04, 0.64]));
  g.add(part(GEO.pillow, MAT.burlap, [-0.78, 0.13, 0.62], [0.3, 0.26, 0.26], [0, 0.3, 0]));
  g.add(part(GEO.pillow, MAT.burlap, [-0.6, 0.11, 0.8], [0.26, 0.22, 0.22], [0, -0.4, 0]));
  g.add(at(drum(MAT.paintBlue), -0.78, 0, 0.2));
  g.add(at(sign(MAT.paintRed, MAT.cloth, 0.38, 0.2, 0), 0.0, 1.1, -0.83));
};

const planks = bake('plankStack', () => Array.from({ length: 6 }, (_, i): Piece => [GEO.block, [0, Math.floor(i / 3) * 0.07, ((i % 3) - 1) * 0.15], [0.9, 0.06, 0.13], [0, ((i * 5) % 3 - 1) * 0.04, 0]]));
const sawLogs = bake('sawLogs', () => [0, 1, 2].map((i): Piece => [GEO.log, [0, 0.11 + (i > 1 ? 0.18 : 0), (i % 2) * 0.22 - 0.11 + (i > 1 ? 0.11 : 0)], [0.8, 0.22, 0.22]]));

const sawmill: Builder = (g, w, d) => {
  const s = new THREE.Group();
  if (d > w) s.rotation.y = Math.PI / 2;
  g.add(s);
  const L = Math.max(w, d) / 2;
  // A timber frame shed open to the front, with a low plank back wall and a sheet roof over the back.
  for (const x of [-L + 0.12, 0, L - 0.12]) s.add(part(GEO.block, MAT.darkWood, [x, 0, -0.88], [0.1, 1.95, 0.1]));
  for (const x of [-L + 0.12, L - 0.12]) s.add(part(GEO.block, MAT.darkWood, [x, 0, -0.35], [0.1, 1.7, 0.1]));
  s.add(part(GEO.block, MAT.wood, [0, 0, -0.9], [L * 2 - 0.2, 0.85, 0.08]));
  s.add(sheet(MAT.sheet, [-0.7, 0.85, -0.9], 0.9, 0.5));
  s.add(at(shedRoof([MAT.rust, MAT.sheet, MAT.sheetWarm, MAT.rust], L * 2, 0.75, 1.68, 1.98), 0, 0, -0.63));
  // The saw bench: a table with a big round blade and a log being fed through.
  s.add(part(GEO.block, MAT.wood, [0, 0, -0.02], [1.1, 0.34, 0.26]));
  s.add(part(GEO.block, MAT.darkWood, [0, 0.34, -0.02], [1.16, 0.04, 0.3]));
  s.add(part(GEO.wheel, MAT.iron, [0.18, 0.36, -0.02], [0.02, 0.44, 0.44], [0, Math.PI / 2, 0]));
  s.add(part(GEO.log, MAT.wood, [-0.25, 0.47, -0.02], [0.62, 0.18, 0.18]));
  s.add(part(GEO.dome, MAT.thatch, [0.42, 0, -0.08], [0.3, 0.12, 0.24]));
  // A scrap engine drives the blade with a belt.
  s.add(part(GEO.block, MAT.rustDark, [-L + 0.45, 0, -0.1], [0.4, 0.36, 0.34]));
  s.add(part(GEO.drum, MAT.paintRed, [-L + 0.45, 0.36, -0.1], [0.22, 0.2, 0.22]));
  s.add(part(GEO.wheel, MAT.iron, [-L + 0.45, 0.3, 0.09], [0.04, 0.26, 0.26], [0, Math.PI / 2, 0]));
  s.add(link(MAT.rubber, [-L + 0.45, 0.42, 0.11], [0.18, 0.5, 0.11], 0.03), link(MAT.rubber, [-L + 0.45, 0.18, 0.11], [0.18, 0.22, 0.11], 0.03));
  s.add(link(MAT.iron, [-L + 0.32, 0.36, -0.2], [-L + 0.32, 1.1, -0.25], 0.06));
  s.add(glowPart(MAT.ember, [-L + 0.32, 1.12, -0.25], [0.06, 0.02, 0.06]));
  // Logs waiting on one side and sawn planks on the other.
  s.add(part(sawLogs, MAT.wood, [-L + 0.5, 0, 0.6], [1, 1, 1]));
  s.add(part(planks, MAT.wood, [L - 0.55, 0, 0.6], [1, 1, 1]));
  s.add(part(planks, MAT.thatch, [L - 0.5, 0.14, 0.62], [0.9, 1, 1], [0, 0.1, 0]));
  s.add(at(lantern(0.9).group, L - 0.12, 1.62, -0.25));
};

const coal = bake('coal', () => Array.from({ length: 5 }, (_, i): Piece => [GEO.rock, [((i % 3) - 1) * 0.14, 0.06 + Math.floor(i / 3) * 0.1, ((i * 2) % 3 - 1) * 0.08], [0.16, 0.12, 0.15], [i, i * 2, 0]]));
const ingots = bake('ingots', () => Array.from({ length: 5 }, (_, i): Piece => [GEO.block, [((i % 3) - 1) * 0.12 + (i > 2 ? 0.06 : 0), i > 2 ? 0.05 : 0, 0], [0.1, 0.05, 0.24]]));

const smelter: Builder = (g) => {
  // A brick back wall with a big furnace built into it and a tall chimney.
  g.add(part(GEO.block, MAT.brick, [0, 0, -0.88], [1.9, 1.15, 0.2]));
  g.add(part(GEO.block, MAT.brick, [-0.45, 0, -0.62], [0.8, 0.95, 0.42]));
  g.add(glowPart(MAT.ember, [-0.45, 0.3, -0.4], [0.32, 0.24, 0.02]));
  g.add(part(GEO.centered, MAT.soot, [-0.45, 0.48, -0.39], [0.42, 0.06, 0.03]));
  g.add(part(GEO.block, MAT.brick, [-0.55, 0.95, -0.72], [0.38, 1.55, 0.38]));
  g.add(part(GEO.block, MAT.iron, [-0.55, 2.5, -0.72], [0.46, 0.08, 0.46]));
  g.add(glowPart(MAT.ember, [-0.55, 2.59, -0.72], [0.24, 0.02, 0.24]));
  g.add(smokePuffs([-0.55, 2.62, -0.72], 3));
  g.add(sheet(MAT.sheet, [0.95, 0, -0.55], 0.75, 1.15, [0, Math.PI / 2, 0]));
  g.add(at(shedRoof([MAT.sheet, MAT.rust], 1.0, 0.6, 1.4, 1.6), 0.45, 0, -0.7));
  // In the middle: a small crucible furnace and an anvil on a stump.
  g.add(part(GEO.cylinder, MAT.brick, [0, 0, -0.05], [0.32, 0.32, 0.32]));
  g.add(glowPart(MAT.ember, [0, 0.32, -0.05], [0.2, 0.02, 0.2], GEO.cylinder));
  g.add(glowPart(MAT.ember, [0, 0.12, 0.11], [0.1, 0.08, 0.02]));
  g.add(part(GEO.cylinder, MAT.wood, [0, 0, 0.38], [0.2, 0.2, 0.2]));
  g.add(part(GEO.block, MAT.soot, [0, 0.2, 0.38], [0.3, 0.1, 0.12]));
  g.add(part(GEO.block, MAT.iron, [0.06, 0.3, 0.38], [0.34, 0.06, 0.13]));
  // Bellows, coal, a quench drum, and ingots on a pallet.
  g.add(part(GEO.wedge, MAT.darkWood, [-0.68, 0.05, 0.0], [0.4, 0.14, 0.22], [0, Math.PI, 0]));
  g.add(link(MAT.darkWood, [-0.88, 0.12, 0], [-1.0 + 0.05, 0.3, 0], 0.03));
  g.add(part(coal, MAT.soot, [0.62, 0, -0.62], [1.4, 1.2, 1.4]));
  g.add(at(drum(MAT.rustDark), 0.75, 0, -0.08));
  g.add(part(GEO.cylinder, MAT.paintBlue, [0.75, 0.44, -0.08], [0.26, 0.01, 0.26]));
  g.add(at(pallet(), 0.62, 0, 0.68));
  g.add(part(ingots, MAT.iron, [0.6, 0.13, 0.68], [1, 1, 1]));
  g.add(part(ingots, MAT.paintYellow, [0.62, 0.22, 0.7], [0.8, 1, 0.8], [0, 0.3, 0]));
  g.add(part(coal, MAT.soot, [-0.62, 0, 0.62], [1, 1, 1]));
};

const tools = bake('pegTools', () => [
  [GEO.centered, [-0.3, 0, 0], [0.05, 0.3, 0.02], [0, 0, 0.2]],
  [GEO.centered, [-0.15, 0.08, 0], [0.16, 0.06, 0.02]],
  [GEO.centered, [-0.15, -0.05, 0], [0.04, 0.24, 0.02]],
  [GEO.centered, [0.05, 0, 0], [0.24, 0.12, 0.02]],
  [GEO.centered, [0.25, 0.02, 0], [0.04, 0.32, 0.02], [0, 0, -0.3]],
  [GEO.wheel, [0.35, -0.12, 0], [0.02, 0.12, 0.12], [0, Math.PI / 2, 0]],
]);
const gear = bake('gear', () => [
  [GEO.wheel, [0, 0, 0], [0.06, 0.34, 0.34], [0, Math.PI / 2, 0]],
  ...Array.from({ length: 8 }, (_, i): Piece => {
    const a = (i / 8) * Math.PI * 2;
    return [GEO.centered, [Math.cos(a) * 0.19, Math.sin(a) * 0.19, 0], [0.08, 0.08, 0.06], [0, 0, a]];
  }),
]);

const workshop: Builder = (g) => {
  // A sheet metal lean-to with a pegboard of tools and a gear sign on the roof.
  g.add(sheet(MAT.sheet, [-0.45, 0, -0.92], 1.0, 1.45));
  g.add(sheet(MAT.rust, [0.48, 0, -0.9], 0.95, 1.35, [0, 0, -0.02]));
  g.add(part(GEO.centered, MAT.wood, [-0.25, 0.95, -0.86], [0.95, 0.5, 0.03]));
  g.add(part(tools, MAT.iron, [-0.25, 0.95, -0.84], [1, 1, 1]));
  g.add(part(GEO.block, MAT.darkWood, [-0.25, 0.55, -0.82], [0.95, 0.04, 0.16]));
  g.add(part(bake('partBins', () => [-0.6, -0.35, -0.1, 0.15].map((x): Piece => [GEO.block, [x, 0, 0], [0.18, 0.12, 0.14]])), MAT.paintRed, [-0.25, 0.59, -0.82], [1, 1, 1]));
  g.add(part(GEO.block, MAT.wood, [-0.92, 0, -0.4], [0.08, 0.7, 1.0]));
  g.add(sheet(MAT.sheetWarm, [-0.94, 0.05, -0.15], 0.45, 0.6, [0, -Math.PI / 2, 0]));
  g.add(at(shedRoof([MAT.rust, MAT.sheet, MAT.sheetWarm], 1.95, 0.6, 1.5, 1.7), 0, 0, -0.65));
  for (const x of [-0.92, 0.92]) g.add(part(GEO.block, MAT.darkWood, [x, 0, -0.37], [0.07, 1.5, 0.07]));
  g.add(part(gear, MAT.paintYellow, [0, 1.75, -0.32], [1, 1, 1]));
  // A hanging work lamp at the front edge of the roof.
  g.add(link(MAT.soot, [0.5, 1.5, -0.36], [0.5, 1.3, -0.36], 0.015));
  g.add(part(GEO.cone, MAT.paintYellow, [0.5, 1.2, -0.36], [0.18, 0.12, 0.18]));
  g.add(glowPart(MAT.glow, [0.5, 1.2, -0.36], [0.1, 0.04, 0.1]));
  // The workbench with a vise in the middle.
  g.add(part(GEO.block, MAT.darkWood, [0, 0, -0.02], [0.5, 0.34, 0.26]));
  g.add(part(GEO.block, MAT.wood, [0, 0.34, -0.02], [0.56, 0.05, 0.3]));
  g.add(part(GEO.block, MAT.iron, [-0.18, 0.39, 0.06], [0.12, 0.1, 0.1]));
  g.add(part(GEO.block, MAT.iron, [-0.18, 0.42, 0.13], [0.06, 0.04, 0.08]));
  g.add(part(gear, MAT.iron, [0.12, 0.42, -0.02], [0.4, 0.4, 0.4], [Math.PI / 2, 0, 0]));
  // A drill press in the corner, an engine block on a stand, and tires.
  g.add(part(GEO.block, MAT.iron, [0.68, 0, -0.62], [0.26, 0.08, 0.26]));
  g.add(link(MAT.iron, [0.68, 0.08, -0.7], [0.68, 1.1, -0.7], 0.06));
  g.add(part(GEO.block, MAT.paintRed, [0.68, 0.9, -0.62], [0.16, 0.2, 0.24]));
  g.add(part(GEO.block, MAT.wood, [0.68, 0.45, -0.6], [0.24, 0.04, 0.22]));
  g.add(part(GEO.block, MAT.darkWood, [-0.7, 0, 0.65], [0.36, 0.28, 0.3]));
  g.add(part(GEO.block, MAT.rustDark, [-0.7, 0.28, 0.65], [0.3, 0.22, 0.26]));
  g.add(part(GEO.block, MAT.rustDark, [-0.7, 0.5, 0.65], [0.2, 0.06, 0.22]));
  g.add(at(tires(2), 0.75, 0, 0.7));
  g.add(at(crate(0.2), 0.75, 0, 0.3, 0.3));
};

export const WORKS = { kitchen, sawmill, smelter, workshop } satisfies Partial<Record<BuildingType, Builder>>;
