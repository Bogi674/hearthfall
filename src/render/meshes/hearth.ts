import * as THREE from 'three';
import { PALETTE } from '../materials';
import { at, barrel, GEO, house, logPile, MAT, part } from './kit';

// The Hearth House (section 5.2): a fireplace in a run down house that the colony repairs in five stages.
// Each stage is its own group and only the current one shows. Flames, windows, and smoke follow the fire.

export interface HearthMesh {
  group: THREE.Group;
  update(time: number, lit: boolean, stage: number): void;
}

/** Window glow for this house only, so it can go dark when the fire is out. */
const windowGlow = new THREE.MeshBasicMaterial({ color: PALETTE.lantern.clone().multiplyScalar(1.7) });
const lanternLit = PALETTE.lantern.clone().multiplyScalar(1.7);
const lanternOut = PALETTE.warmShadow.clone();

function flame(color: THREE.Color, strength: number, r: number, h: number): THREE.Mesh {
  const m = new THREE.Mesh(
    new THREE.ConeGeometry(r, h, 8).translate(0, h / 2, 0),
    new THREE.MeshBasicMaterial({ color: color.clone().multiplyScalar(strength), transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  return m;
}

/** Stone hearth with an ember bed and flames. */
function fireplace(): { group: THREE.Group; flames: THREE.Mesh[]; embers: THREE.Mesh } {
  const group = new THREE.Group();
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    group.add(part(GEO.centered, MAT.stone, [Math.cos(a) * 0.42, 0.08, Math.sin(a) * 0.42], [0.2, 0.16, 0.18], [0, a, 0]));
  }
  const embers = part(GEO.cylinder, MAT.ember, [0, 0, 0], [0.62, 0.08, 0.62]);
  group.add(embers);
  for (let i = 0; i < 4; i++) group.add(part(GEO.log, MAT.darkWood, [0, 0.12, 0], [0.6, 0.09, 0.09], [0, (i * Math.PI) / 4, 0.25]));
  const flames = [flame(PALETTE.ember, 1.8, 0.28, 0.9), flame(PALETTE.lantern, 2, 0.17, 0.7), flame(PALETTE.lantern, 2.4, 0.13, 0.5)];
  flames[1].position.set(0.1, 0.05, 0.06);
  flames[2].position.set(-0.09, 0.05, -0.07);
  for (const f of flames) group.add(f);
  return { group, flames, embers };
}

function ruinedHouse(stage: number): THREE.Group {
  const g = new THREE.Group();
  g.add(part(GEO.block, MAT.stone, [0, 0, -0.2], [2.7, 0.16, 2.1]));
  // Broken wall stubs. Stage 2 walls stand a little higher.
  const lift = stage === 2 ? 0.25 : 0;
  const stubs: [number, number, number, number, number][] = [
    [-1.3, -1.2, 0.12, 2.0, 0.9], [1.3, -0.2, 0.12, 2.0, 0.55], [-0.6, -1.25, 1.3, 0.12, 1.05], [0.75, -1.25, 1.0, 0.12, 0.7], [-1.0, 0.85, 0.7, 0.12, 0.45],
  ];
  for (const [x, z, w, d, h] of stubs) g.add(part(GEO.block, MAT.plaster, [x, 0.16, z + (d > 1 ? 0.8 : 0)], [w, h + lift, d]));
  for (const [x, z] of [[-1.3, -1.25], [1.3, -1.25], [-1.3, 0.85]]) g.add(part(GEO.block, MAT.darkWood, [x, 0.16, z], [0.13, stage === 2 ? 1.25 : 1.1, 0.13]));
  // Chimney at the back.
  g.add(part(GEO.block, MAT.stone, [0.6, 0.16, -1.15], [0.45, stage === 2 ? 2.3 : 1.6, 0.4]));
  if (stage === 1) {
    for (const x of [-0.9, -0.2, 0.5]) g.add(part(GEO.log, MAT.darkWood, [x, 1.2, -0.3], [0.1, 0.1, 2.3], [0, Math.PI / 2, 0.35]));
    g.add(part(GEO.centered, MAT.roofRed, [-0.8, 0.55, 0.9], [1.1, 0.08, 0.8], [0.6, 0.4, 0.2]));
    for (let i = 0; i < 6; i++) g.add(part(GEO.centered, MAT.darkStone, [-1.6 + (i % 3) * 1.4, 0.08, 1.15 - Math.floor(i / 3) * 2.6], [0.28, 0.16, 0.24], [i, i * 2, 0]));
  } else {
    // A patched roof: one side red tile, the other a quilt of tiles and thatch.
    g.add(part(GEO.centered, MAT.roofRed, [0, 1.8, -0.75], [2.9, 0.1, 1.35], [-0.65, 0, 0]));
    g.add(part(GEO.centered, MAT.roofRed, [-0.6, 1.8, 0.35], [1.7, 0.1, 1.35], [0.65, 0, 0]));
    g.add(part(GEO.centered, MAT.thatch, [0.85, 1.8, 0.35], [1.2, 0.11, 1.35], [0.65, 0, 0]));
    g.add(part(GEO.log, MAT.darkWood, [0, 2.2, -0.2], [3.1, 0.1, 0.1]));
    for (const x of [-1.3, 1.3]) g.add(part(GEO.block, MAT.darkWood, [x, 0.16, 0.85], [0.13, 1.25, 0.13]));
  }
  return g;
}

function restoredHouse(stage: number): THREE.Group {
  const g = new THREE.Group();
  const body = house(2.6, 2.0, { wall: 1.05, roof: MAT.roofRed, chimney: true, windows: 1, glow: windowGlow });
  body.position.z = -0.35;
  g.add(body);
  if (stage >= 4) {
    // A porch with lanterns, and a second chimney for the new stove.
    for (const x of [-1.2, 1.2]) g.add(part(GEO.block, MAT.darkWood, [x, 0, 1.15], [0.1, 1.05, 0.1]));
    g.add(part(GEO.centered, MAT.roofSlate, [0, 1.12, 1.0], [2.7, 0.08, 0.6], [0.35, 0, 0]));
    for (const x of [-1.2, 1.2]) g.add(part(GEO.block, windowGlow, [x, 0.75, 1.25], [0.12, 0.16, 0.12]));
    g.add(part(GEO.block, MAT.stone, [-0.8, 1.6, -0.9], [0.28, 1.0, 0.28]));
  }
  if (stage >= 5) {
    const wing = house(1.4, 1.4, { wall: 0.9, roof: MAT.roofRed, windows: 1, door: false, glow: windowGlow });
    wing.position.set(-1.75, 0, -0.5);
    wing.rotation.y = Math.PI / 2;
    g.add(wing);
    for (let i = 0; i < 5; i++) g.add(part(GEO.block, MAT.wood, [0.4 + i * 0.25, 0, 1.45], [0.06, 0.45, 0.06]));
    g.add(part(GEO.block, MAT.wood, [0.9, 0.3, 1.45], [1.15, 0.05, 0.04]));
    g.add(part(GEO.block, MAT.darkWood, [1.4, 2.3, -0.9], [0.04, 0.7, 0.04]));
    g.add(part(GEO.block, MAT.roofRed, [1.55, 2.82, -0.9], [0.3, 0.2, 0.02]));
  }
  g.add(at(logPile(4), 1.05, 0, 1.0, Math.PI / 2));
  g.add(at(barrel(), -1.15, 0, 0.9));
  return g;
}

export function createHearthMesh(): HearthMesh {
  const group = new THREE.Group();
  const stages = [1, 2, 3, 4, 5].map((stage) => (stage <= 2 ? ruinedHouse(stage) : restoredHouse(stage)));
  for (const s of stages) group.add(s);

  // The fire sits inside the ruin, and in a stone fire bowl by the door once the house is whole.
  const fire = fireplace();
  group.add(fire.group);

  const smokeMat = Array.from({ length: 6 }, () => new THREE.MeshBasicMaterial({ color: PALETTE.frost, transparent: true, depthWrite: false }));
  const smoke = smokeMat.map((m) => new THREE.Mesh(GEO.sphere, m));
  for (const p of smoke) group.add(p);

  return {
    group,
    update(time, lit, stage) {
      stages.forEach((s, i) => (s.visible = i === stage - 1));
      fire.group.position.set(stage <= 2 ? -0.1 : 0.55, stage <= 2 ? 0.16 : 0, stage <= 2 ? 0.1 : 1.15);
      fire.embers.visible = lit;
      windowGlow.color.copy(lit ? lanternLit : lanternOut);
      fire.flames.forEach((f, i) => {
        f.visible = lit;
        const flicker = 1 + Math.sin(time * 9 + i * 1.7) * 0.12 + Math.sin(time * 23 + i * 3.4) * 0.06;
        f.scale.set(1 / Math.sqrt(flicker), flicker, 1 / Math.sqrt(flicker));
        f.rotation.y = time * 0.8 + i;
      });
      // Smoke puffs rise from the chimney and fade.
      const chimney = stage <= 2 ? new THREE.Vector3(0.6, stage === 2 ? 2.5 : 1.8, -1.15) : new THREE.Vector3(0.87, 2.75, -0.75);
      smoke.forEach((p, i) => {
        const t = (time * 0.25 + i / smoke.length) % 1;
        p.visible = lit;
        p.position.set(chimney.x + Math.sin(t * 6 + i) * 0.15 + t * 0.6, chimney.y + t * 2.2, chimney.z - t * 0.3);
        p.scale.setScalar(0.18 + t * 0.5);
        smokeMat[i].opacity = 0.35 * (1 - t);
      });
    },
  };
}
