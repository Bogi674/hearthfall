import * as THREE from 'three';
import { GEO, MAT, part } from '../kit';
import { at, box, drum, gable, pane, snowCap, tube, wreck } from './parts';

// The places in and near town: the farmhouse, the hardware store, and the clinic (section 10.1).
// Every builder fills `site` with the building and `loot` with what a squad can still carry off.

export interface Place {
  site: THREE.Group;
  loot: THREE.Group;
}

export function farmhouse({ site, loot }: Place): void {
  // The house, with a roof that has lost its far slope.
  box(site, MAT.plaster, [-1.2, 0, 0], [2.4, 1.1, 1.8]);
  gable(site, MAT.roofRed, [-1.2, 1.1, 0], 2.6, 0.75, 2.0);
  snowCap(site, [-1.2, 1.12, 0.5], 2.4, 0.6);
  box(site, MAT.brick, [-0.4, 1.0, -0.4], [0.25, 1.1, 0.25]);
  pane(site, [-1.9, 0.45, 0.91], [0.4, 0.3, 0.04]);
  pane(site, [-0.7, 0.45, 0.91], [0.4, 0.3, 0.04]);
  box(site, MAT.darkWood, [-1.3, 0, 0.92], [0.4, 0.75, 0.05]);
  box(site, MAT.wood, [-1.3, 0.25, 1.25], [1.2, 0.12, 0.5]);
  // The barn: bigger, rust red, with a hay door.
  box(site, MAT.rust, [1.6, 0, -0.2], [2.2, 1.5, 2.6]);
  gable(site, MAT.roofSlate, [1.6, 1.5, -0.2], 2.4, 0.9, 2.8, Math.PI / 2);
  box(site, MAT.darkWood, [1.6, 0, 1.12], [0.9, 1.1, 0.06]);
  box(site, MAT.wood, [1.6, 1.05, 1.13], [0.5, 0.35, 0.05]);
  // The silo.
  tube(site, MAT.sheet, [3.1, 0, -1.2], 0.42, 2.3);
  site.add(part(GEO.dome, MAT.iron, [3.1, 2.3, -1.2], [0.9, 0.9, 0.9]));
  // A sagging fence.
  for (let i = 0; i < 5; i++) box(site, MAT.darkWood, [-2.6 + i * 0.55, 0, 1.9], [0.08, 0.5 + (i % 2) * 0.1, 0.08]);
  site.add(part(GEO.block, MAT.wood, [-1.9, 0.35, 1.9], [2.2, 0.06, 0.04], [0, 0, 0.06]));
  // Loot: a hay bale, crates of food, and a pile of firewood.
  loot.add(at(part(GEO.pillow, MAT.thatch, [0, 0.25, 0], [0.7, 0.5, 0.5]), 0.4, 0, 1.4));
  loot.add(at(part(GEO.pillow, MAT.thatch, [0, 0.25, 0], [0.7, 0.5, 0.5]), 0.9, 0, 1.6, 0.5));
  loot.add(at(part(GEO.block, MAT.wood, [0, 0, 0], [0.35, 0.3, 0.35]), -0.3, 0, 1.5));
  loot.add(at(part(GEO.block, MAT.wood, [0, 0, 0], [0.3, 0.25, 0.3]), -0.55, 0, 1.2));
}

export function hardwareStore({ site, loot }: Place): void {
  // A long brick shop with a flat roof and a big sign.
  box(site, MAT.brick, [0, 0, 0], [4.2, 1.5, 1.9]);
  box(site, MAT.concrete, [0, 1.5, 0], [4.35, 0.12, 2.05]);
  snowCap(site, [0, 1.62, 0], 4.2, 1.9);
  box(site, MAT.paintYellow, [0, 1.62, 1.0], [2.6, 0.5, 0.08]);
  box(site, MAT.rustDark, [0, 1.66, 1.05], [2.3, 0.1, 0.04]);
  // The shopfront: three dim windows, a door, and a sagging awning.
  for (const x of [-1.5, -0.6, 1.5]) pane(site, [x, 0.4, 0.96], [0.6, 0.55, 0.04]);
  box(site, MAT.darkWood, [0.6, 0, 0.97], [0.55, 1.0, 0.05]);
  site.add(part(GEO.block, MAT.tarpBlue, [0.6, 1.25, 1.3], [1.6, 0.06, 0.7], [0.18, 0, 0]));
  // A fenced yard at the back with stacked lumber and a rusted container.
  box(site, MAT.rust, [-1.4, 0, -1.8], [1.6, 0.8, 0.7]);
  box(site, MAT.rustDark, [-1.4, 0.8, -1.8], [1.65, 0.05, 0.75]);
  for (let i = 0; i < 4; i++) box(site, MAT.darkWood, [1.0 + i * 0.5, 0, -1.7], [0.08, 0.7, 0.08]);
  site.add(part(GEO.block, MAT.wood, [1.75, 0.5, -1.7], [1.7, 0.06, 0.04]));
  // Loot: planks, a pallet of blocks, and a few drums.
  for (let i = 0; i < 4; i++) loot.add(at(part(GEO.block, MAT.wood, [0, i * 0.08, 0], [1.1, 0.07, 0.3]), 1.6, 0, -1.2 + (i % 2) * 0.05));
  loot.add(at(part(GEO.block, MAT.concrete, [0, 0, 0], [0.6, 0.3, 0.5]), 2.5, 0, 1.4));
  loot.add(at(part(GEO.block, MAT.concrete, [0, 0.3, 0], [0.5, 0.25, 0.45]), 2.5, 0, 1.4));
  loot.add(at(drum(MAT.rust), -2.5, 0, 1.3));
  loot.add(at(drum(MAT.paintBlue), -2.1, 0, 1.5));
}

export function clinic({ site, loot }: Place): void {
  // A two storey block with a red cross, a covered entrance, and an ambulance wreck.
  box(site, MAT.cloth, [0, 0, 0], [3.4, 1.4, 2.0]);
  box(site, MAT.concrete, [0, 1.4, 0], [3.5, 0.1, 2.1]);
  box(site, MAT.cloth, [0.7, 1.5, -0.2], [1.7, 0.8, 1.5]);
  box(site, MAT.concrete, [0.7, 2.3, -0.2], [1.8, 0.1, 1.6]);
  snowCap(site, [0.7, 2.4, -0.2], 1.8, 1.6);
  snowCap(site, [-0.6, 1.5, 0], 1.6, 2.0);
  for (const x of [-1.3, -0.5, 0.3, 1.1]) pane(site, [x, 0.55, 1.01], [0.4, 0.4, 0.04]);
  for (const x of [0.2, 1.2]) pane(site, [x, 1.7, 0.57], [0.4, 0.35, 0.04]);
  // The cross on the front of the upper floor.
  box(site, MAT.paintRed, [-1.0, 1.7, 1.02], [0.7, 0.2, 0.05]);
  box(site, MAT.paintRed, [-1.0, 1.45, 1.02], [0.2, 0.7, 0.05]);
  // The entrance canopy.
  box(site, MAT.concrete, [0, 0, 1.45], [1.0, 0.8, 0.9]);
  box(site, MAT.sheet, [0, 0.8, 1.45], [1.3, 0.08, 1.1]);
  pane(site, [0, 0.3, 1.9], [0.4, 0.4, 0.04]);
  // The ambulance.
  const van = at(new THREE.Group(), -2.5, 0, 0.8, 0.3);
  box(van, MAT.cloth, [0, 0.25, 0], [1.0, 0.6, 0.55]);
  box(van, MAT.cloth, [0.6, 0.2, 0], [0.4, 0.45, 0.5]);
  box(van, MAT.paintRed, [0, 0.45, 0.28], [0.9, 0.08, 0.02]);
  box(van, MAT.paintRed, [-0.1, 0.35, 0.285], [0.3, 0.08, 0.02]);
  for (const sx of [-0.35, 0.5]) for (const sz of [-0.27, 0.27]) van.add(part(GEO.wheel, MAT.rubber, [sx, 0.14, sz], [0.1, 0.28, 0.28]));
  site.add(van);
  // Loot: a stretcher, a supply cart, and medicine crates.
  loot.add(at(part(GEO.block, MAT.cloth, [0, 0.25, 0], [0.9, 0.08, 0.35]), 2.3, 0, 1.4));
  for (const x of [-0.25, 0.25]) loot.add(at(part(GEO.block, MAT.iron, [0, 0, 0], [0.04, 0.25, 0.04]), 2.3 + x, 0, 1.4));
  loot.add(at(part(GEO.block, MAT.paintRed, [0, 0, 0], [0.35, 0.28, 0.3]), 1.5, 0, 1.9));
  loot.add(at(part(GEO.block, MAT.cloth, [0, 0, 0], [0.3, 0.25, 0.3]), 1.1, 0, 2.0));
  loot.add(at(wreck(MAT.rustDark, 0.05), 2.8, 0, -1.1, 1.2));
}
