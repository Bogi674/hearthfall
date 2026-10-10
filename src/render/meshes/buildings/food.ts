import * as THREE from 'three';
import type { BuildingType } from '../../../data/buildings';
import { mixPalette, PALETTE } from '../../materials';
import { at, GEO, glowPart, link, MAT, part } from '../kit';
import { type Builder, lantern, shedRoof } from './parts';

// Food buildings (M13): the hunting lodge of a trapper, and the hydroponic farm of a survivor who kept a few tricks.

const growLight = new THREE.MeshBasicMaterial({ color: mixPalette(PALETTE.blight, PALETTE.lantern, 0.35).multiplyScalar(1.5) });
const leaf = new THREE.MeshStandardMaterial({ color: mixPalette(PALETTE.blight, PALETTE.nightBlue, 0.45), roughness: 0.9, flatShading: true });

/** A log lodge with antlers over the door, a skin rack, and a spear leaning on the wall. */
const huntingLodge: Builder = (g) => {
  g.add(part(GEO.block, MAT.darkWood, [0, 0, -0.1], [1.7, 0.75, 1.2]));
  for (let i = 0; i < 5; i++) g.add(part(GEO.log, MAT.wood, [0, 0.1 + i * 0.15, 0.52], [1.74, 0.17, 0.17]));
  g.add(at(shedRoof([MAT.tarpOlive, MAT.canvas], 1.9, 1.5, 0.5, 0.95), 0, 0.75, -0.1));
  // The door, with warm light leaking out around it.
  g.add(part(GEO.block, MAT.wood, [-0.3, 0, 0.62], [0.36, 0.55, 0.05]));
  g.add(glowPart(MAT.leak, [-0.3, 0.3, 0.65], [0.42, 0.02, 0.02]));
  // Antlers over the door.
  for (const s of [-1, 1]) {
    g.add(link(MAT.stone, [-0.3 + s * 0.04, 0.68, 0.64], [-0.3 + s * 0.2, 0.9, 0.66], 0.025));
    g.add(link(MAT.stone, [-0.3 + s * 0.14, 0.8, 0.65], [-0.3 + s * 0.3, 0.84, 0.66], 0.02));
  }
  // A drying rack with hides, and a stack of firewood.
  for (const x of [0.38, 0.9]) g.add(part(GEO.block, MAT.darkWood, [x, 0, 0.62], [0.06, 0.9, 0.06]));
  g.add(part(GEO.block, MAT.darkWood, [0.64, 0.82, 0.62], [0.6, 0.05, 0.05]));
  for (const [x, tone] of [[0.5, MAT.burlap], [0.72, MAT.tarpRust]] as const) g.add(part(GEO.block, tone, [x, 0.38, 0.62], [0.18, 0.46, 0.03], [0, 0, x > 0.6 ? 0.08 : -0.06]));
  g.add(link(MAT.darkWood, [1.0, 0.0, 0.1], [0.86, 0.95, 0.15], 0.03));
  g.add(link(MAT.iron, [0.86, 0.95, 0.15], [0.84, 1.1, 0.15], 0.02));
  g.add(at(lantern(0.8).group, 0.68, 0.0, -0.4));
};

/** A frame of growing trays under pale grow lights, in a closed room. */
const hydroponics: Builder = (g) => {
  for (const [x, z] of [[-0.45, -0.4], [0.45, -0.4], [-0.45, 0.4], [0.45, 0.4]]) g.add(part(GEO.block, MAT.iron, [x, 0, z], [0.05, 1.05, 0.05]));
  for (let level = 0; level < 3; level++) {
    const y = 0.2 + level * 0.38;
    g.add(part(GEO.block, MAT.sheet, [0, y, 0], [1.0, 0.05, 0.9]));
    g.add(part(GEO.block, MAT.rustDark, [0, y + 0.05, 0], [0.92, 0.07, 0.82]));
    // Rows of leaves.
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) g.add(part(GEO.dome, leaf, [-0.34 + c * 0.23, y + 0.1, -0.3 + r * 0.3], [0.16, 0.13, 0.16]));
    g.add(glowPart(growLight, [0, y + 0.3, 0], [0.88, 0.025, 0.1]));
  }
  g.add(part(GEO.block, MAT.iron, [0, 1.08, 0], [1.1, 0.05, 0.98]));
  // A water pipe and a small pump on the side.
  g.add(part(GEO.cylinder, MAT.rust, [0.56, 0, 0.6], [0.14, 0.3, 0.14]));
  g.add(link(MAT.sheet, [0.56, 0.3, 0.6], [0.56, 1.0, 0.45], 0.03));
};

export const FOOD = { huntingLodge, hydroponics } satisfies Partial<Record<BuildingType, Builder>>;
