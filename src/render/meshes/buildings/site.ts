import * as THREE from 'three';
import { GEO, link, MAT, part } from '../kit';
import { bake, type Piece } from './parts';

// A construction site: corner stakes with string, a low scaffold, a lumber and scrap pile,
// and a sawhorse. It stays low and open so the real building can rise inside it.

const lumber = bake('siteLumber', () => Array.from({ length: 7 }, (_, i): Piece => [GEO.block, [((i % 4) - 1.5) * 0.11 + (i > 3 ? 0.05 : 0), (i > 3 ? 0.06 : 0), ((i * 3) % 2) * 0.03], [0.1, 0.055, 0.8], [0, ((i * 7) % 3 - 1) * 0.05, 0]]));
const scrap = bake('siteScrap', () => [
  [GEO.corrugated, [0, 0.02, 0], [0.5, 0.45, 0.05], [-1.35, 0.3, 0]],
  [GEO.corrugated, [0.08, 0.08, 0.05], [0.4, 0.4, 0.05], [-1.2, -0.4, 0.1]],
  [GEO.rod, [-0.1, 0.1, 0.1], [0.04, 0.6, 0.04], [0, 0.4, Math.PI / 2]],
]);

export function createConstructionSite(w: number, h: number): THREE.Group {
  const g = new THREE.Group();
  const small = w * h <= 1;
  const hx = w / 2 - 0.08;
  const hz = h / 2 - 0.08;
  // Stakes at the corners with a string run between them.
  const corners: [number, number][] = [[-hx, -hz], [hx, -hz], [hx, hz], [-hx, hz]];
  for (const [x, z] of corners) g.add(part(GEO.block, MAT.darkWood, [x, 0, z], [0.05, 0.42, 0.05]));
  corners.forEach(([x, z], i) => {
    const [nx, nz] = corners[(i + 1) % 4];
    g.add(link(MAT.rope, [x, 0.36, z], [nx, 0.36, nz], 0.015));
  });
  // A scaffold along the back and the left side: poles, a walk plank, and braces.
  const sh = small ? 0.8 : 1.15;
  const back = -hz + 0.12;
  const xs = small ? [-hx + 0.12, hx - 0.12] : [-hx + 0.12, 0, hx - 0.12];
  for (const x of xs) g.add(link(MAT.darkWood, [x, 0, back], [x, sh, back], 0.05));
  g.add(part(GEO.block, MAT.wood, [0, sh * 0.55, back], [hx * 2 - 0.1, 0.04, 0.16]));
  g.add(link(MAT.darkWood, [xs[0], 0.05, back], [xs[1], sh * 0.95, back], 0.03));
  if (!small) {
    const left = -hx + 0.12;
    g.add(link(MAT.darkWood, [left, 0, hz - 0.12], [left, sh, hz - 0.12], 0.05));
    g.add(part(GEO.block, MAT.wood, [left, sh * 0.55, 0], [0.16, 0.04, hz * 2 - 0.1]));
    g.add(link(MAT.darkWood, [left, 0.05, hz - 0.12], [left, sh * 0.95, back], 0.03));
  }
  // Materials piled at the front right, and a sawhorse.
  const s = small ? 0.55 : 1;
  const pile = part(lumber, MAT.wood, [hx - 0.35 * s, 0, hz - 0.45 * s], [s, s, s], [0, 0.2, 0]);
  g.add(pile);
  g.add(part(scrap, MAT.rust, [hx - 0.3 * s, 0, -0.05], [s, s, s], [0, -0.5, 0]));
  if (!small) {
    const horse = new THREE.Group();
    horse.position.set(-0.2, 0, hz - 0.3);
    horse.rotation.y = 0.3;
    for (const x of [-0.22, 0.22]) {
      horse.add(link(MAT.darkWood, [x, 0, -0.1], [x, 0.38, 0], 0.035));
      horse.add(link(MAT.darkWood, [x, 0, 0.1], [x, 0.38, 0], 0.035));
    }
    horse.add(part(GEO.block, MAT.wood, [0, 0.36, 0], [0.6, 0.06, 0.08]));
    horse.add(part(GEO.block, MAT.wood, [0.05, 0.42, 0.02], [0.7, 0.04, 0.12], [0, 0.1, 0]));
    g.add(horse);
  }
  return g;
}
