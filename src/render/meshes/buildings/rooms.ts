import * as THREE from 'three';
import type { BuildingType } from '../../../data/buildings';
import { at, crate, GEO, glowPart, link, MAT, part } from '../kit';
import { bake, boardedWindow, hangingPots, type Builder, drum, lantern, pallet, patch, type Piece, rods, sandbags, sheet, shedRoof, sign, smokePuffs, tires, type V3 } from './parts';

// House rooms (section 5.5): annexes built onto the patched Hearth House. Each one is a plank and
// sheet lean-to whose high back wall rests against the house. The house sits at the world origin,
// so once the room is placed its inner group turns its back toward the origin.

const FRONT = 0.45;
const BACK = -1.0;
const DEPTH = FRONT - BACK;
const MID = (FRONT + BACK) / 2;

const worldPos = new THREE.Vector3();

/**
 * Turns the room so its back wall faces the house at the world origin. Purely visual.
 * The renderer may wrap the mesh before placing it, so the turn waits for the first frame
 * the footing is drawn, when the world position is known.
 */
function faceHouse(g: THREE.Group, inner: THREE.Group, probe: THREE.Object3D): void {
  probe.onBeforeRender = () => {
    probe.onBeforeRender = () => {};
    const { x, z } = g.getWorldPosition(worldPos);
    inner.rotation.y = Math.abs(x) > Math.abs(z) ? (x > 0 ? Math.PI / 2 : -Math.PI / 2) : z >= 0 ? 0 : Math.PI;
  };
}

/** The shared lean-to shell: footing, walls, side gables under a shed roof. Front faces +z. */
function annex(wall: THREE.Material, roof: THREE.Material[], hFront = 1.0, hBack = 1.55): THREE.Group {
  const r = new THREE.Group();
  r.add(part(GEO.block, MAT.concrete, [0, 0, MID], [1.9, 0.08, DEPTH + 0.1]));
  r.add(part(GEO.block, wall, [0, 0.08, MID], [1.8, hFront, DEPTH]));
  for (const x of [-0.88, 0.88]) r.add(part(GEO.wedge, wall, [x, hFront + 0.08, MID], [DEPTH, hBack - hFront, 0.05], [0, -Math.PI / 2, 0]));
  r.add(part(GEO.block, wall, [0, hFront + 0.08, BACK + 0.05], [1.8, hBack - hFront, 0.1]));
  r.add(at(shedRoof(roof, 1.96, DEPTH + 0.1, hFront + 0.08, hBack + 0.08), 0, 0, MID));
  // Corner posts so the shell reads as built, not cast.
  for (const x of [-0.9, 0.9]) r.add(part(GEO.block, MAT.darkWood, [x, 0.08, FRONT], [0.08, hFront, 0.08]));
  return r;
}

function room(g: THREE.Group, build: (r: THREE.Group) => void): void {
  const inner = new THREE.Group();
  build(inner);
  g.add(inner);
  // Every room starts with its footing, which serves as the probe for the first frame.
  faceHouse(g, inner, inner.getObjectsByProperty('isMesh', true)[0]);
}

const bedroom: Builder = (g) =>
  room(g, (r) => {
    r.add(annex(MAT.wood, [MAT.sheet, MAT.rust, MAT.sheetWarm]));
    // A wide window with bunk beds in silhouette against the warm light.
    r.add(part(GEO.centered, MAT.darkWood, [-0.3, 0.6, FRONT + 0.01], [0.86, 0.6, 0.04]));
    r.add(glowPart(MAT.glow, [-0.3, 0.6, FRONT + 0.03], [0.74, 0.48, 0.02]));
    for (const y of [0.45, 0.72]) r.add(part(GEO.centered, MAT.soot, [-0.26, y, FRONT + 0.05], [0.62, 0.07, 0.02]));
    r.add(part(GEO.centered, MAT.soot, [-0.58, 0.6, FRONT + 0.05], [0.05, 0.48, 0.02]));
    r.add(part(GEO.centered, MAT.tarpRust, [-0.2, 0.5, FRONT + 0.055], [0.3, 0.08, 0.02], [0, 0, 0.1]));
    r.add(part(GEO.centered, MAT.wood, [-0.12, 0.82, FRONT + 0.07], [0.5, 0.07, 0.03], [0, 0, -0.25]));
    r.add(patch(MAT.sheetWarm, [0.55, 0.32, FRONT + 0.02], 0.5, 0.5, 0.06));
    r.add(part(GEO.block, MAT.darkWood, [0.45, 0.08, FRONT + 0.03], [0.34, 0.74, 0.04]));
    r.add(glowPart(MAT.leak, [0.63, 0.45, FRONT + 0.05], [0.03, 0.66, 0.03]));
    r.add(at(boardedWindow(MAT.glow, 0.24, 0.2), 0.92, 0.6, -0.35, Math.PI / 2));
    // Stovepipe through the roof.
    r.add(part(GEO.pipe, MAT.iron, [0.5, 1.2, -0.55], [0.11, 1.0, 0.11]));
    r.add(part(GEO.cone, MAT.iron, [0.5, 2.2, -0.55], [0.22, 0.1, 0.22]));
    r.add(smokePuffs([0.5, 2.25, -0.55], 2));
    // A tarp tied over a leak in the roof, held down by tires.
    const roofY = (z: number) => 1.08 + ((FRONT + 0.05 - z) / (DEPTH + 0.1)) * 0.55 + 0.06;
    const slope = Math.atan2(0.55, DEPTH + 0.1);
    r.add(part(GEO.centered, MAT.tarpBlue, [-0.4, roofY(-0.25), -0.25], [0.9, 0.04, 1.0], [slope, 0, 0.02]));
    r.add(at(tires(1), -0.6, roofY(-0.1), -0.1).rotateX(slope), at(tires(1), -0.2, roofY(-0.5), -0.5).rotateX(slope));
    r.add(link(MAT.rope, [-0.85, roofY(0.25), 0.25], [0.05, roofY(-0.75), -0.75], 0.02));
    r.add(at(drum(MAT.sheet), 0.75, 0, 0.75));
    r.add(part(GEO.block, MAT.wood, [-0.4, 0, 0.72], [0.7, 0.2, 0.18]));
  });

const storeroom: Builder = (g) =>
  room(g, (r) => {
    r.add(annex(MAT.sheet, [MAT.rust, MAT.sheet, MAT.rustDark], 1.25, 1.45));
    // A hoist beam over the door with a net of goods on its rope.
    r.add(link(MAT.darkWood, [0.45, 1.3, FRONT - 0.3], [0.45, 1.42, FRONT + 0.45], 0.07));
    r.add(link(MAT.darkWood, [0.45, 1.0, FRONT + 0.02], [0.45, 1.38, FRONT + 0.3], 0.04));
    r.add(link(MAT.rope, [0.45, 1.38, FRONT + 0.42], [0.45, 0.72, FRONT + 0.42], 0.02));
    r.add(part(GEO.pillow, MAT.burlap, [0.45, 0.62, FRONT + 0.42], [0.26, 0.24, 0.24]));
    r.add(sheet(MAT.sheet, [0.55, 0.08, FRONT + 0.01], 0.7, 1.0));
    // A roll up door pulled half way, crates and light behind it.
    r.add(part(GEO.block, MAT.soot, [-0.3, 0.08, FRONT + 0.01], [0.9, 0.82, 0.03]));
    r.add(glowPart(MAT.leak, [-0.3, 0.12, FRONT + 0.03], [0.86, 0.06, 0.02]));
    r.add(at(crate(0.3), -0.5, 0.08, FRONT - 0.1, 0.1), at(crate(0.26), -0.15, 0.08, FRONT - 0.08, -0.2), at(crate(0.22), -0.45, 0.38, FRONT - 0.12, 0.3));
    r.add(sheet(MAT.paintBlue, [-0.3, 0.92, FRONT + 0.05], 0.48, 0.96, [0, 0, Math.PI / 2]));
    r.add(part(GEO.log, MAT.iron, [-0.3, 0.98, FRONT + 0.08], [1.0, 0.13, 0.13]));
    r.add(at(sign(MAT.paintYellow, MAT.soot, 0.5, 0.18, 0), -0.3, 1.0, FRONT + 0.16));
    // Overflow outside: a pallet of crates, sacks, and a drum.
    r.add(at(pallet(), 0.55, 0, 0.72, 0.1));
    r.add(at(crate(0.28), 0.45, 0.12, 0.7), at(crate(0.24), 0.72, 0.12, 0.78, 0.4), at(crate(0.2), 0.52, 0.4, 0.7, -0.3));
    r.add(part(GEO.pillow, MAT.burlap, [-0.72, 0.12, 0.7], [0.3, 0.22, 0.4], [0, 0.3, 0]));
    r.add(part(GEO.pillow, MAT.burlap, [-0.62, 0.3, 0.72], [0.28, 0.18, 0.36], [0, -0.2, 0.1]));
    r.add(at(drum(MAT.paintRed), 0.08, 0, 0.8));
  });

const hearthKitchen: Builder = (g) =>
  room(g, (r) => {
    r.add(annex(MAT.wood, [MAT.sheetWarm, MAT.rust, MAT.sheet]));
    r.add(part(GEO.block, MAT.brick, [0, 0.08, FRONT + 0.01], [1.82, 0.45, 0.04]));
    // A serving hatch with its flap propped open and pots hanging under it.
    r.add(part(GEO.centered, MAT.darkWood, [-0.25, 0.72, FRONT + 0.02], [0.8, 0.42, 0.04]));
    r.add(glowPart(MAT.glow, [-0.25, 0.72, FRONT + 0.04], [0.68, 0.3, 0.02]));
    r.add(part(GEO.block, MAT.wood, [-0.25, 0.5, FRONT + 0.1], [0.84, 0.05, 0.2]));
    r.add(part(GEO.centered, MAT.sheetWarm, [-0.25, 1.0, FRONT + 0.2], [0.9, 0.04, 0.42], [0.45, 0, 0]));
    r.add(link(MAT.darkWood, [-0.62, 0.52, FRONT + 0.18], [-0.62, 0.98, FRONT + 0.36], 0.03));
    r.add(link(MAT.darkWood, [0.12, 0.52, FRONT + 0.18], [0.12, 0.98, FRONT + 0.36], 0.03));
    r.add(at(hangingPots(), -0.25, 0.64, FRONT + 0.3));
    r.add(part(GEO.block, MAT.darkWood, [0.55, 0.08, FRONT + 0.03], [0.3, 0.72, 0.04]));
    // A brick flue at the back with a pipe on top, smoking.
    r.add(part(GEO.block, MAT.brick, [0.55, 1.0, -0.72], [0.34, 1.05, 0.34]));
    r.add(part(GEO.pipe, MAT.iron, [0.55, 2.05, -0.72], [0.14, 0.35, 0.14]));
    r.add(glowPart(MAT.ember, [0.55, 2.4, -0.72], [0.1, 0.02, 0.1]));
    r.add(smokePuffs([0.55, 2.4, -0.72], 3));
    // Firewood along the side and a water barrel.
    const wood = bake('kitchenWood', () => Array.from({ length: 6 }, (_, i): Piece => [GEO.log, [0, 0.08 + Math.floor(i / 3) * 0.14, ((i % 3) - 1) * 0.15], [0.55, 0.14, 0.14]]));
    r.add(part(wood, MAT.wood, [0.72, 0, 0.75], [1, 1, 1], [0, 0.15, 0]));
    r.add(at(drum(MAT.paintBlue), -0.75, 0, 0.75));
  });

const infirmary: Builder = (g) =>
  room(g, (r) => {
    r.add(annex(MAT.cloth, [MAT.sheet, MAT.sheetWarm, MAT.sheet]));
    r.add(patch(MAT.wood, [-0.7, 0.3, FRONT + 0.02], 0.3, 0.4, -0.1));
    // A red cross painted on a white board, a curtained window, and a door.
    r.add(part(GEO.centered, MAT.cloth, [0.4, 0.68, FRONT + 0.03], [0.52, 0.52, 0.03]));
    r.add(part(GEO.centered, MAT.paintRed, [0.4, 0.68, FRONT + 0.05], [0.36, 0.11, 0.02]));
    r.add(part(GEO.centered, MAT.paintRed, [0.4, 0.68, FRONT + 0.05], [0.11, 0.36, 0.02]));
    r.add(part(GEO.centered, MAT.darkWood, [-0.3, 0.62, FRONT + 0.02], [0.46, 0.38, 0.03]));
    r.add(glowPart(MAT.glow, [-0.3, 0.62, FRONT + 0.035], [0.36, 0.28, 0.02]));
    r.add(part(GEO.centered, MAT.cloth, [-0.4, 0.66, FRONT + 0.05], [0.14, 0.3, 0.02]));
    // A cloth flag with a cross on the roof so the sick know where to go.
    r.add(link(MAT.iron, [-0.6, 1.2, -0.3], [-0.6, 2.35, -0.3], 0.04));
    r.add(part(GEO.centered, MAT.cloth, [-0.38, 2.15, -0.3], [0.42, 0.3, 0.02], [0, 0, -0.06]));
    r.add(part(GEO.centered, MAT.paintRed, [-0.38, 2.15, -0.285], [0.2, 0.06, 0.02]));
    r.add(part(GEO.centered, MAT.paintRed, [-0.38, 2.15, -0.285], [0.06, 0.2, 0.02]));
    // A stretcher leaning on the wall and a medicine crate.
    r.add(link(MAT.darkWood, [-0.98, 0.0, 0.75], [-0.92, 1.0, 0.5], 0.04), link(MAT.darkWood, [-0.68, 0.0, 0.75], [-0.62, 1.0, 0.5], 0.04));
    r.add(part(GEO.centered, MAT.canvas, [-0.8, 0.52, 0.62], [0.28, 0.8, 0.02], [-0.25, 0, 0]));
    r.add(part(GEO.block, MAT.cloth, [0.55, 0, 0.75], [0.36, 0.26, 0.3], [0, 0.2, 0]));
    r.add(part(GEO.centered, MAT.paintRed, [0.55, 0.27, 0.75], [0.2, 0.02, 0.06], [0, 0.2, 0]));
    r.add(part(GEO.centered, MAT.paintRed, [0.55, 0.27, 0.75], [0.06, 0.02, 0.2], [0, 0.2, 0]));
    r.add(at(boardedWindow(MAT.glow, 0.22, 0.2), 0.92, 0.6, -0.35, Math.PI / 2));
  });

const rifles = bake('rifles', () => [-0.27, -0.09, 0.09, 0.27].flatMap((x): Piece[] => [
  [GEO.block, [x, 0.1, 0.02], [0.07, 0.3, 0.05], [-0.12, 0, 0]],
  [GEO.rod, [x, 0.6, -0.04], [0.035, 0.6, 0.035], [-0.12, 0, 0]],
]));

const wire = bake('razorWire', () => Array.from({ length: 9 }, (_, i): Piece => [GEO.tire, [-0.8 + i * 0.2, 0, 0], [0.34, 0.15, 0.34], [0, 0, Math.PI / 2 + 0.3]]));

const armory: Builder = (g) =>
  room(g, (r) => {
    r.add(annex(MAT.iron, [MAT.rustDark, MAT.sheet, MAT.rustDark]));
    for (const [x, y, m] of [[-0.6, 0.35, MAT.rust], [0.62, 0.7, MAT.sheetWarm], [-0.62, 0.82, MAT.sheet]] as const) r.add(patch(m, [x, y, FRONT + 0.02], 0.5, 0.36, 0));
    // A reinforced door: plate, cross bars, and a padlock.
    r.add(part(GEO.block, MAT.rustDark, [0.05, 0.08, FRONT + 0.03], [0.46, 0.8, 0.05]));
    r.add(part(GEO.centered, MAT.iron, [0.05, 0.48, FRONT + 0.07], [0.6, 0.06, 0.03], [0, 0, 0.9]));
    r.add(part(GEO.centered, MAT.iron, [0.05, 0.48, FRONT + 0.07], [0.6, 0.06, 0.03], [0, 0, -0.9]));
    r.add(part(GEO.centered, MAT.iron, [0.05, 0.48, FRONT + 0.08], [0.56, 0.07, 0.03]));
    r.add(part(GEO.centered, MAT.paintYellow, [0.22, 0.48, FRONT + 0.11], [0.06, 0.08, 0.04]));
    // Gun slits with warm light.
    for (const x of [-0.55, 0.6]) r.add(glowPart(MAT.glow, [x, 0.78, FRONT + 0.04], [0.32, 0.05, 0.02]));
    // A weapon rack under a small awning, ammo crates, and sandbags.
    r.add(part(GEO.block, MAT.darkWood, [-0.55, 0, 0.72], [0.7, 0.08, 0.12]));
    r.add(part(GEO.block, MAT.darkWood, [-0.55, 0.62, 0.62], [0.7, 0.06, 0.08]));
    r.add(part(rifles, MAT.iron, [-0.55, 0.06, 0.74], [1, 1, 1]));
    r.add(part(GEO.centered, MAT.sheet, [-0.55, 1.0, 0.72], [0.8, 0.04, 0.4], [0.3, 0, 0]));
    r.add(link(MAT.iron, [-0.92, 0, 0.88], [-0.92, 0.98, 0.88], 0.04), link(MAT.iron, [-0.18, 0, 0.88], [-0.18, 0.98, 0.88], 0.04));
    r.add(part(GEO.block, MAT.tarpOlive, [0.55, 0, 0.72], [0.34, 0.2, 0.22], [0, 0.15, 0]));
    r.add(part(GEO.block, MAT.tarpOlive, [0.6, 0.2, 0.7], [0.3, 0.16, 0.2], [0, -0.2, 0]));
    r.add(part(GEO.block, MAT.paintYellow, [0.55, 0.1, 0.835], [0.2, 0.04, 0.01], [0, 0.15, 0]));
    r.add(at(sandbags(0.6, 2), 0.05, 0, 0.62));
    // Sandbags and a coil of wire along the roof edge.
    r.add(at(sandbags(1.8, 1), 0, 1.12, FRONT - 0.05));
    r.add(part(wire, MAT.iron, [0, 1.3, FRONT - 0.05], [1, 1, 1]));
  });

const gunNest: Builder = (g) =>
  room(g, (r) => {
    // A short annex holds up a sandbagged deck with a heavy gun on top.
    r.add(part(GEO.block, MAT.concrete, [0, 0, MID], [1.9, 0.08, DEPTH + 0.1]));
    r.add(part(GEO.block, MAT.wood, [0, 0.08, MID], [1.8, 1.1, DEPTH]));
    r.add(sheet(MAT.rust, [-0.45, 0.1, FRONT + 0.01], 0.8, 1.0));
    r.add(at(boardedWindow(MAT.glow, 0.32, 0.22), 0.4, 0.62, FRONT + 0.02));
    for (const x of [-0.85, 0.85]) r.add(part(GEO.block, MAT.darkWood, [x, 0, 0.82], [0.1, 1.2, 0.1]));
    for (const x of [-0.85, 0.85]) r.add(link(MAT.darkWood, [x, 0.3, 0.8], [x, 1.1, FRONT], 0.05));
    r.add(part(GEO.block, MAT.darkWood, [0, 1.18, -0.08], [1.92, 0.1, 1.86]));
    r.add(sandbags(1.8, 3).translateZ(0.8).translateY(1.28));
    for (const x of [-0.84, 0.84]) r.add(sandbags(1.4, 2).rotateY(Math.PI / 2).translateZ(x).translateX(0.15).translateY(1.28));
    // The heavy gun on a tripod, a shield plate, and an ammo box.
    for (const [x, z] of [[-0.22, -0.2], [0.22, -0.2], [0, 0.22]]) r.add(link(MAT.iron, [x, 1.28, z], [0, 1.72, 0.05], 0.05));
    r.add(part(GEO.centered, MAT.iron, [0, 1.78, 0.02], [0.2, 0.18, 0.4]));
    r.add(part(GEO.log, MAT.soot, [0, 1.8, 0.4], [0.5, 0.11, 0.11], [0, Math.PI / 2, 0]));
    r.add(part(GEO.log, MAT.iron, [0, 1.8, 0.8], [0.4, 0.05, 0.05], [0, Math.PI / 2, 0]));
    r.add(part(GEO.centered, MAT.sheet, [0, 1.82, 0.5], [0.56, 0.36, 0.04], [-0.12, 0, 0]));
    r.add(part(GEO.block, MAT.tarpOlive, [0.42, 1.28, -0.05], [0.26, 0.18, 0.18], [0, 0.4, 0]));
    r.add(link(MAT.paintYellow, [0.36, 1.45, 0.0], [0.06, 1.76, 0.05], 0.03));
    // A ladder up the side and a lantern on a pole.
    r.add(rods('nestLadder', MAT.darkWood, () => [
      ...[0.25, 0.5].map((z): [V3, V3, number] => [[0.97, 0, z], [0.97, 1.65, z], 0.045]),
      ...[1, 2, 3, 4, 5, 6].map((i): [V3, V3, number] => [[0.97, i * 0.24, 0.25], [0.97, i * 0.24, 0.5], 0.03]),
    ]));
    r.add(link(MAT.iron, [-0.75, 1.28, -0.8], [-0.75, 2.2, -0.8], 0.04));
    r.add(at(lantern().group, -0.68, 2.15, -0.8));
    r.add(at(crate(0.26), -0.7, 0, 0.75, 0.3));
  });

export const ROOMS = { bedroom, storeroom, hearthKitchen, infirmary, armory, gunNest } satisfies Partial<Record<BuildingType, Builder>>;
