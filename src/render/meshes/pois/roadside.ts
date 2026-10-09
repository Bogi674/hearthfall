import * as THREE from 'three';
import { GEO, MAT, link, part } from '../kit';
import { at, box, drum, pane, snowCap, tube, wreck } from './parts';
import type { Place } from './town';

// The places along the roads: the gas station, the rail depot, and the old airfield (section 10.1).

export function gasStation({ site, loot }: Place): void {
  // A slab, a small shop, and a canopy on four pillars over two pumps.
  box(site, MAT.concrete, [0, 0, 0.3], [4.6, 0.05, 3.6]);
  box(site, MAT.concrete, [-1.4, 0.05, -0.9], [1.9, 1.0, 1.2]);
  box(site, MAT.paintRed, [-1.4, 1.05, -0.9], [2.0, 0.1, 1.3]);
  snowCap(site, [-1.4, 1.15, -0.9], 2.0, 1.3);
  pane(site, [-1.4, 0.45, -0.29], [1.2, 0.4, 0.04]);
  box(site, MAT.darkWood, [-0.7, 0.05, -0.29], [0.35, 0.75, 0.05]);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(site, MAT.sheet, [0.9 + sx * 1.0, 0.05, 0.7 + sz * 0.7], [0.1, 1.3, 0.1]);
  box(site, MAT.paintRed, [0.9, 1.35, 0.7], [2.4, 0.12, 1.8]);
  box(site, MAT.paintYellow, [0.9, 1.35, 1.62], [2.4, 0.12, 0.04]);
  snowCap(site, [0.9, 1.47, 0.7], 2.4, 1.8);
  // Two pumps with dim readouts.
  for (const x of [0.5, 1.3]) {
    box(site, MAT.paintRed, [x, 0.05, 0.7], [0.3, 0.85, 0.28]);
    pane(site, [x, 0.6, 0.85], [0.2, 0.18, 0.03]);
    box(site, MAT.iron, [x, 0.85, 0.7], [0.34, 0.08, 0.32]);
  }
  // The tall price sign, with a glowing panel.
  box(site, MAT.sheet, [2.6, 0.05, 1.5], [0.1, 2.4, 0.1]);
  box(site, MAT.paintYellow, [2.6, 2.1, 1.5], [0.8, 0.6, 0.08]);
  const sign = part(GEO.block, MAT.leak, [2.6, 2.2, 1.55], [0.6, 0.4, 0.04]);
  sign.castShadow = false;
  site.add(sign);
  // Loot: fuel cans, a drum, and a wrecked car with the hood up.
  for (const [x, z] of [[2.0, -0.2], [2.3, -0.3], [-0.3, 1.9]]) loot.add(at(part(GEO.block, MAT.paintRed, [0, 0, 0], [0.22, 0.3, 0.14]), x, 0.05, z, x));
  loot.add(at(drum(MAT.rust, 0.5), -2.1, 0.1, 1.6));
  loot.add(at(wreck(MAT.rust, 0.04), 2.2, 0.05, 1.0, -0.4));
}

export function railDepot({ site, loot }: Place): void {
  // Two rails, a locomotive wreck, a boxcar, a shed, and a water tower.
  for (const z of [0.55, 1.1]) for (const x of [0]) site.add(part(GEO.block, MAT.iron, [x, 0.05, z], [6, 0.05, 0.06]));
  for (let i = 0; i < 12; i++) box(site, MAT.darkWood, [-2.7 + i * 0.5, 0, 0.82], [0.14, 0.05, 0.85]);
  // The locomotive: boiler, cab, funnel, and wheels.
  const loco = at(new THREE.Group(), -1.3, 0.1, 0.82);
  loco.add(part(GEO.log, MAT.rustDark, [0.2, 0.62, 0], [1.4, 0.72, 0.72]));
  box(loco, MAT.rust, [-0.75, 0.2, 0], [0.7, 1.0, 0.8]);
  box(loco, MAT.concrete, [-0.75, 1.2, 0], [0.82, 0.06, 0.9]);
  tube(loco, MAT.iron, [0.7, 0.9, 0], 0.1, 0.5);
  pane(loco, [-0.75, 0.75, 0.41], [0.3, 0.25, 0.04]);
  for (const x of [-0.7, 0.0, 0.5, 0.85]) for (const z of [-0.38, 0.38]) loco.add(part(GEO.wheel, MAT.iron, [x, 0.2, z], [0.08, x < -0.5 ? 0.4 : 0.5, x < -0.5 ? 0.4 : 0.5]));
  site.add(loco);
  // A boxcar behind it, tilted off the track.
  const car = at(new THREE.Group(), 1.4, 0.1, 0.82, 0.04);
  box(car, MAT.rust, [0, 0.15, 0], [1.8, 0.95, 0.8]);
  box(car, MAT.rustDark, [0, 1.1, 0], [1.9, 0.08, 0.88]);
  box(car, MAT.darkWood, [0, 0.2, 0.41], [0.6, 0.8, 0.04]);
  snowCap(car, [0, 1.18, 0], 1.9, 0.88);
  site.add(car);
  // The ticket shed.
  box(site, MAT.brick, [-1.6, 0, -1.4], [1.7, 1.0, 1.1]);
  box(site, MAT.roofSlate, [-1.6, 1.0, -1.4], [1.9, 0.1, 1.3]);
  snowCap(site, [-1.6, 1.1, -1.4], 1.9, 1.3);
  pane(site, [-1.6, 0.4, -0.84], [0.5, 0.35, 0.04]);
  // The water tower.
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) site.add(link(MAT.darkWood, [2.4 + sx * 0.35, 0, -1.4 + sz * 0.35], [2.4 + sx * 0.25, 2.0, -1.4 + sz * 0.25], 0.09));
  tube(site, MAT.wood, [2.4, 2.0, -1.4], 0.55, 0.9);
  site.add(part(GEO.cone, MAT.roofSlate, [2.4, 2.9, -1.4], [1.3, 0.55, 1.3]));
  // A signal post.
  box(site, MAT.iron, [0.2, 0, -0.7], [0.07, 1.3, 0.07]);
  site.add(part(GEO.sphere, MAT.ember, [0.2, 1.4, -0.7], [0.14, 0.14, 0.14]));
  // Loot: coal, rail scrap, and crates by the boxcar.
  loot.add(at(part(GEO.rock, MAT.soot, [0, 0.15, 0], [0.8, 0.45, 0.7]), 0.6, 0, -0.1));
  for (let i = 0; i < 3; i++) loot.add(at(part(GEO.block, MAT.iron, [0, i * 0.06, 0], [0.9, 0.05, 0.08]), 2.0, 0, 1.6 + i * 0.1));
  loot.add(at(part(GEO.block, MAT.wood, [0, 0, 0], [0.4, 0.35, 0.4]), 0.8, 0, 1.6));
}

export function oldAirfield({ site, loot }: Place): void {
  // A strip of cracked runway with faded stripes.
  site.add(part(GEO.block, MAT.darkStone, [0, 0, 0.2], [6.4, 0.04, 1.6]));
  for (let i = 0; i < 6; i++) site.add(part(GEO.block, MAT.cloth, [-2.5 + i, 0.045, 0.2], [0.5, 0.01, 0.08]));
  // The hangar, an arched shell with a wide dark door.
  box(site, MAT.sheet, [-1.6, 0, -1.6], [3.0, 1.0, 2.4]);
  site.add(part(GEO.gable, MAT.roofSlate, [-1.6, 1.0, -1.6], [2.5, 0.9, 3.1], [0, Math.PI / 2, 0]));
  box(site, MAT.soot, [-1.6, 0, -0.38], [1.7, 0.85, 0.05]);
  snowCap(site, [-1.6, 1.0, -1.6], 3.1, 2.5);
  // The control tower: a stem, a glass cab, and a railing.
  box(site, MAT.concrete, [2.0, 0, -1.3], [0.9, 1.8, 0.9]);
  box(site, MAT.concrete, [2.0, 1.8, -1.3], [1.3, 0.1, 1.3]);
  pane(site, [2.0, 1.9, -1.3], [1.1, 0.5, 1.1]);
  box(site, MAT.roofSlate, [2.0, 2.4, -1.3], [1.4, 0.08, 1.4]);
  site.add(link(MAT.iron, [2.0, 2.4, -1.3], [2.0, 3.0, -1.3], 0.04));
  // A plane wreck on the runway: fuselage, wings, and a tail, nose down.
  const plane = at(new THREE.Group(), 0.4, 0.15, 0.2, 0.5);
  plane.add(part(GEO.log, MAT.sheet, [0, 0.25, 0], [1.9, 0.38, 0.38]));
  box(plane, MAT.sheet, [0.1, 0.3, 0], [0.5, 0.05, 2.2]);
  box(plane, MAT.paintRed, [-0.85, 0.35, 0], [0.3, 0.55, 0.05]);
  box(plane, MAT.sheet, [-0.9, 0.38, 0], [0.3, 0.04, 0.7]);
  site.add(part(GEO.cone, MAT.iron, [1.0, 0.25, 0], [0.3, 0.35, 0.3], [0, 0, -Math.PI / 2]));
  plane.rotation.z = -0.08;
  site.add(plane);
  // A windsock pole.
  box(site, MAT.iron, [-0.2, 0, 1.6], [0.06, 1.4, 0.06]);
  site.add(part(GEO.cone, MAT.paintRed, [0.05, 1.3, 1.6], [0.2, 0.5, 0.2], [0, 0, -Math.PI / 2]));
  // Loot: fuel drums and spare parts at the hangar door.
  loot.add(at(drum(MAT.rust), -0.2, 0, -0.1));
  loot.add(at(drum(MAT.paintBlue), 0.15, 0, -0.2));
  loot.add(at(part(GEO.block, MAT.iron, [0, 0, 0], [0.5, 0.3, 0.4]), -0.8, 0, 0.0));
  loot.add(at(part(GEO.wheel, MAT.rubber, [0, 0.25, 0], [0.12, 0.5, 0.5]), -0.45, 0, 0.0));
}
