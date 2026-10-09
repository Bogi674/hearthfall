import type { BuildingType } from '../../../data/buildings';
import { STOREY_HEIGHT } from '../../../data/house';
import { GEO, glowPart, MAT, part } from '../kit';
import type { Builder } from './parts';

// House furniture (section 5.6). Each piece fits inside its floor tiles. The footprint w by h is
// already turned by the placement rotation, so a piece lays out along its longer side.

const bed: Builder = (g, w, h) => {
  g.add(part(GEO.block, MAT.darkWood, [0, 0, 0], [w * 0.86, 0.2, h * 0.9]));
  g.add(part(GEO.block, MAT.sheetWarm, [0, 0.2, h * 0.06], [w * 0.76, 0.1, h * 0.7]));
  g.add(part(GEO.block, MAT.sheet, [0, 0.3, -h * 0.34], [w * 0.62, 0.08, h * 0.2]));
  g.add(part(GEO.block, MAT.darkWood, [0, 0.2, -h * 0.45], [w * 0.86, 0.34, 0.07]));
};

/**
 * A steep flight of rough planks that rises one storey through its tile, climbing toward -z. The scene turns it
 * to face the floor above. The treads sit between two stringers and the top meets the upper floor.
 */
const stairs: Builder = (g) => {
  const steps = 7;
  const run = 0.9;
  for (let i = 0; i < steps; i++) {
    const top = ((i + 1) / steps) * STOREY_HEIGHT;
    g.add(part(GEO.block, MAT.wood, [0, 0, run / 2 - ((i + 0.5) * run) / steps], [0.72, top, run / steps + 0.01]));
  }
  for (const s of [-1, 1]) {
    g.add(part(GEO.block, MAT.darkWood, [s * 0.4, STOREY_HEIGHT * 0.5, 0], [0.07, 0.07, 1.25], [Math.atan2(STOREY_HEIGHT, run), 0, 0]));
    g.add(part(GEO.block, MAT.darkWood, [s * 0.4, 0, -run / 2 + 0.03], [0.07, STOREY_HEIGHT + 0.5, 0.07]));
    g.add(part(GEO.block, MAT.darkWood, [s * 0.4, 0, run / 2 - 0.03], [0.07, 0.55, 0.07]));
  }
};

const sickbed: Builder = (g, w, h) => {
  g.add(part(GEO.block, MAT.sheet, [0, 0, 0], [w * 0.8, 0.22, h * 0.9]));
  g.add(part(GEO.block, MAT.cloth, [0, 0.22, h * 0.05], [w * 0.7, 0.1, h * 0.7]));
  g.add(part(GEO.block, MAT.paintRed, [0, 0.32, h * 0.05], [w * 0.2, 0.02, h * 0.3]));
  g.add(part(GEO.block, MAT.sheet, [0, 0.22, -h * 0.4], [w * 0.7, 0.3, 0.06]));
};

const shelf: Builder = (g, w, h) => {
  g.add(part(GEO.block, MAT.darkWood, [0, 0, 0], [w * 0.8, 1.1, h * 0.5]));
  for (const y of [0.35, 0.7]) g.add(part(GEO.block, MAT.wood, [0, y, 0.02], [w * 0.74, 0.05, h * 0.54]));
  g.add(part(GEO.block, MAT.rust, [-0.15, 0.4, 0.05], [0.18, 0.2, 0.2]));
  g.add(part(GEO.block, MAT.sheet, [0.15, 0.75, 0.05], [0.2, 0.18, 0.2]));
};

/** A plank top on legs, with a stool at each tile. */
const table: Builder = (g, w, h) => {
  const long = w >= h;
  g.add(part(GEO.block, MAT.wood, [0, 0.42, 0], [w * 0.9, 0.08, h * 0.7]));
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) g.add(part(GEO.block, MAT.darkWood, [sx * w * 0.38, 0, sz * h * 0.28], [0.08, 0.42, 0.08]));
  }
  g.add(part(GEO.cylinder, MAT.rust, [long ? -0.2 : 0, 0.5, long ? 0 : -0.2], [0.14, 0.06, 0.14]));
  g.add(part(GEO.cylinder, MAT.sheet, [long ? 0.25 : 0, 0.5, long ? 0.05 : 0.25], [0.11, 0.04, 0.11]));
  for (const s of [-1, 1]) g.add(part(GEO.cylinder, MAT.darkWood, long ? [s * w * 0.25, 0, h * 0.42] : [w * 0.42, 0, s * h * 0.25], [0.2, 0.25, 0.2]));
};

const sofa: Builder = (g, w, h) => {
  const long = w >= h;
  g.add(part(GEO.block, MAT.tarpRust, [0, 0, 0], [w * 0.88, 0.3, h * 0.7]));
  g.add(part(GEO.block, MAT.tarpRust, long ? [0, 0.3, -h * 0.28] : [-w * 0.28, 0.3, 0], long ? [w * 0.88, 0.4, h * 0.16] : [w * 0.16, 0.4, h * 0.88]));
  for (const s of [-1, 1]) g.add(part(GEO.block, MAT.rustDark, long ? [s * w * 0.42, 0.3, 0] : [0, 0.3, s * h * 0.42], long ? [w * 0.08, 0.22, h * 0.7] : [w * 0.7, 0.22, h * 0.08]));
  g.add(part(GEO.pillow, MAT.cloth, long ? [-0.25, 0.42, 0.02] : [0, 0.42, -0.25], [0.26, 0.14, 0.2]));
};

/** An iron stove with a pipe and a glowing door. */
const stove: Builder = (g) => {
  g.add(part(GEO.block, MAT.iron, [0, 0, 0], [0.7, 0.7, 0.6]));
  g.add(part(GEO.block, MAT.soot, [0, 0.7, 0], [0.74, 0.06, 0.64]));
  g.add(part(GEO.pipe, MAT.iron, [0.18, 0.7, -0.15], [0.12, 0.7, 0.12]));
  g.add(glowPart(MAT.ember, [0, 0.3, 0.31], [0.3, 0.2, 0.02]));
  g.add(part(GEO.block, MAT.rust, [-0.2, 0.76, 0.1], [0.2, 0.1, 0.2]));
};

/** A bench with a vise, a rack of tools, and a pegboard behind. */
const workbench: Builder = (g, w, h) => {
  g.add(part(GEO.block, MAT.wood, [0, 0.45, 0], [w * 0.9, 0.1, h * 0.6]));
  for (const sx of [-1, 1]) g.add(part(GEO.block, MAT.darkWood, [sx * w * 0.4, 0, 0], [0.1, 0.45, h * 0.5]));
  g.add(part(GEO.block, MAT.sheet, [0, 0.55, -h * 0.28], [w * 0.8, 0.6, 0.05]));
  for (const x of [-0.3, 0, 0.3]) g.add(part(GEO.block, MAT.iron, [x, 0.85, -h * 0.24], [0.04, 0.22, 0.03]));
  g.add(part(GEO.block, MAT.rust, [w * 0.25, 0.55, 0.05], [0.16, 0.12, 0.14]));
};

/** A standing lamp with a warm shade. */
const lamp: Builder = (g) => {
  g.add(part(GEO.cylinder, MAT.iron, [0, 0, 0], [0.22, 0.05, 0.22]));
  g.add(part(GEO.pipe, MAT.iron, [0, 0.05, 0], [0.05, 1.0, 0.05]));
  g.add(part(GEO.cone, MAT.paintYellow, [0, 1.0, 0], [0.34, 0.26, 0.34]));
  g.add(glowPart(MAT.glow, [0, 1.02, 0], [0.12, 0.12, 0.12], GEO.sphere));
};

const rug: Builder = (g, w, h) => {
  g.add(part(GEO.block, MAT.tarpRust, [0, 0, 0], [w * 0.86, 0.025, h * 0.8]));
  g.add(part(GEO.block, MAT.paintYellow, [0, 0.025, 0], [w * 0.7, 0.01, h * 0.62]));
  g.add(part(GEO.block, MAT.tarpRust, [0, 0.035, 0], [w * 0.5, 0.01, h * 0.42]));
};

const plant: Builder = (g) => {
  g.add(part(GEO.cylinder, MAT.rust, [0, 0, 0], [0.3, 0.26, 0.3]));
  g.add(part(GEO.sphere, MAT.herb, [0, 0.42, 0], [0.42, 0.4, 0.42]));
  g.add(part(GEO.sphere, MAT.herb, [0.1, 0.62, 0.05], [0.26, 0.24, 0.26]));
};

/** A raised deck with sandbags and a mounted gun, for the roof of a closed room. */
const roofTurret: Builder = (g) => {
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(part(GEO.block, MAT.darkWood, [sx * 0.38, 0, sz * 0.38], [0.1, 1.0, 0.1]));
  g.add(part(GEO.block, MAT.wood, [0, 1.0, 0], [0.98, 0.1, 0.98]));
  for (const [x, z, sx, sz] of [[0, -0.4, 0.9, 0.18], [-0.4, 0, 0.18, 0.7], [0.4, 0, 0.18, 0.7]] as const) g.add(part(GEO.pillow, MAT.burlap, [x, 1.14, z], [sx, 0.24, sz]));
  g.add(part(GEO.block, MAT.iron, [0, 1.1, 0.05], [0.26, 0.2, 0.3]));
  g.add(part(GEO.rod, MAT.iron, [0, 1.3, 0.42], [0.07, 0.7, 0.07], [Math.PI / 2, 0, 0]));
  g.add(part(GEO.block, MAT.rust, [0, 1.2, -0.12], [0.2, 0.1, 0.2]));
};

/** A floodlight on a stand with a hot white lens. */
const spotlight: Builder = (g) => {
  g.add(part(GEO.cylinder, MAT.iron, [0, 0, 0], [0.3, 0.06, 0.3]));
  g.add(part(GEO.pipe, MAT.iron, [0, 0.06, 0], [0.06, 0.8, 0.06]));
  g.add(part(GEO.block, MAT.sheet, [0, 0.86, 0], [0.36, 0.26, 0.3]));
  g.add(glowPart(MAT.glow, [0, 0.99, 0.16], [0.28, 0.18, 0.03]));
};

/** A tilted drawing board on a stand, with a lamp and a roll of plans. */
const draftingTable: Builder = (g, w, h) => {
  const long = w >= h;
  for (const s of [-1, 1]) g.add(part(GEO.block, MAT.darkWood, long ? [s * w * 0.38, 0, 0] : [0, 0, s * h * 0.38], long ? [0.1, 0.55, h * 0.5] : [w * 0.5, 0.55, 0.1]));
  g.add(part(GEO.block, MAT.wood, [0, 0.55, 0], [w * 0.9, 0.07, h * 0.7], [-0.2, 0, 0]));
  g.add(part(GEO.block, MAT.cloth, [0, 0.62, 0], [w * 0.7, 0.02, h * 0.5], [-0.2, 0, 0]));
  g.add(part(GEO.block, MAT.paintBlue, [0, 0.64, 0], [w * 0.3, 0.01, h * 0.3], [-0.2, 0, 0]));
  g.add(part(GEO.rod, MAT.rope, [long ? w * 0.3 : 0, 0.7, long ? h * 0.3 : h * 0.3], [0.08, 0.5, 0.08], [0, 0, Math.PI / 2]));
};

export const FURNITURE = { bed, sickbed, stairs, shelf, table, sofa, stove, workbench, lamp, rug, plant, roofTurret, spotlight, draftingTable } satisfies Partial<Record<BuildingType, Builder>>;
