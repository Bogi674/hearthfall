import * as THREE from 'three';
import { PALETTE } from '../materials';
import { GEO, glowPart, link, MAT, part } from './kit';

// The hearth (section 5.2): one tile, five stages. A fire pit of stones, a stone hearth with a pot on a tripod, an iron stove
// with a pipe, a brick fireplace with a chimney, and a great hearth with an iron hood. It smolders until someone lights it.
// The house around it is made of ordinary house pieces, so none of it is drawn here.

export interface HearthMesh {
  group: THREE.Group;
  update(time: number, state: { lit: boolean; ignited: boolean; stage: number }): void;
}

/** The glow of the embers. Dull when the fire is smoldering or out, bright when it burns. */
const embersMat = new THREE.MeshBasicMaterial({ color: PALETTE.ember.clone().multiplyScalar(2.2) });
const emberLit = PALETTE.ember.clone().multiplyScalar(2.2);
const emberDull = PALETTE.warmShadow.clone().lerp(PALETTE.ember, 0.35);
const doorGlow = new THREE.MeshBasicMaterial({ color: PALETTE.ember.clone().multiplyScalar(2.4) });

function flame(color: THREE.Color, strength: number, r: number, h: number): THREE.Mesh {
  return new THREE.Mesh(
    new THREE.ConeGeometry(r, h, 8).translate(0, h / 2, 0),
    new THREE.MeshBasicMaterial({ color: color.clone().multiplyScalar(strength), transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
}

/** Stone ring with an ember bed and flames. */
function fireplace(): { group: THREE.Group; flames: THREE.Mesh[]; embers: THREE.Mesh } {
  const group = new THREE.Group();
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    group.add(part(GEO.centered, i % 3 ? MAT.stone : MAT.brick, [Math.cos(a) * 0.42, 0.08, Math.sin(a) * 0.42], [0.2, 0.16, 0.18], [0, a, 0]));
  }
  const embers = part(GEO.cylinder, embersMat, [0, 0, 0], [0.62, 0.08, 0.62]);
  group.add(embers);
  for (let i = 0; i < 4; i++) group.add(part(GEO.log, MAT.darkWood, [0, 0.12, 0], [0.6, 0.09, 0.09], [0, (i * Math.PI) / 4, 0.25]));
  const flames = [flame(PALETTE.ember, 1.8, 0.28, 0.9), flame(PALETTE.lantern, 2, 0.17, 0.7), flame(PALETTE.lantern, 2.4, 0.13, 0.5)];
  flames[1].position.set(0.1, 0.05, 0.06);
  flames[2].position.set(-0.09, 0.05, -0.07);
  for (const f of flames) group.add(f);
  return { group, flames, embers };
}

type Stage = { group: THREE.Group; chimney: number; fire: THREE.Vector3; scale: number };

/** The five hearths. Each is drawn inside one tile and shown only at its stage. */
function stages(): Stage[] {
  const pit = new THREE.Group();
  for (let i = 0; i < 3; i++) pit.add(part(GEO.rock, MAT.concrete, [Math.cos(i * 2.1) * 0.62, 0, Math.sin(i * 2.1) * 0.62], [0.2, 0.14, 0.2], [0, i, 0]));

  const stone = new THREE.Group();
  stone.add(part(GEO.cylinder, MAT.stone, [0, 0, 0], [0.98, 0.2, 0.98]));
  stone.add(part(GEO.cylinder, MAT.darkStone, [0, 0.2, 0], [0.82, 0.04, 0.82]));
  for (const a of [0, 2.1, 4.2]) stone.add(link(MAT.iron, [Math.cos(a) * 0.4, 0.2, Math.sin(a) * 0.4], [0, 1.15, 0], 0.04));
  stone.add(part(GEO.cylinder, MAT.iron, [0, 0.62, 0], [0.3, 0.2, 0.3]));

  const stove = new THREE.Group();
  stove.add(part(GEO.block, MAT.iron, [0, 0, 0], [0.8, 0.8, 0.7]));
  stove.add(part(GEO.block, MAT.soot, [0, 0.8, 0], [0.86, 0.06, 0.76]));
  stove.add(part(GEO.pipe, MAT.iron, [0.2, 0.86, -0.15], [0.14, 1.4, 0.14]));
  stove.add(glowPart(doorGlow, [0, 0.36, 0.36], [0.4, 0.26, 0.02]));
  stove.add(part(GEO.block, MAT.rust, [-0.24, 0.9, 0.08], [0.22, 0.1, 0.22]));

  const brick = new THREE.Group();
  brick.add(part(GEO.block, MAT.brick, [0, 0, -0.1], [0.96, 1.2, 0.7]));
  brick.add(part(GEO.block, MAT.darkStone, [0, 0.06, 0.26], [0.5, 0.52, 0.1]));
  brick.add(part(GEO.block, MAT.soot, [0, 0.58, 0.26], [0.5, 0.08, 0.1]));
  brick.add(part(GEO.block, MAT.wood, [0, 1.16, 0.18], [1.06, 0.1, 0.5]));
  brick.add(part(GEO.block, MAT.brick, [0, 1.2, -0.28], [0.5, 1.5, 0.34]));
  brick.add(part(GEO.block, MAT.darkWood, [-0.3, 1.26, 0.16], [0.06, 0.2, 0.06]));

  const great = new THREE.Group();
  great.add(part(GEO.block, MAT.stone, [0, 0, -0.1], [1.0, 1.0, 0.76]));
  great.add(part(GEO.block, MAT.soot, [0, 0.08, 0.3], [0.62, 0.56, 0.1]));
  great.add(part(GEO.cone, MAT.iron, [0, 1.0, -0.1], [0.96, 0.7, 0.7]));
  great.add(part(GEO.pipe, MAT.iron, [0, 1.62, -0.1], [0.3, 1.5, 0.3]));
  great.add(part(GEO.block, MAT.wood, [0, 0.96, 0.22], [1.06, 0.07, 0.34]));
  great.add(part(GEO.cylinder, MAT.rust, [0.22, 1.03, 0.22], [0.2, 0.14, 0.2]));

  return [
    { group: pit, chimney: 0.9, fire: new THREE.Vector3(0, 0, 0), scale: 1 },
    { group: stone, chimney: 1.6, fire: new THREE.Vector3(0, 0.1, 0), scale: 0.9 },
    { group: stove, chimney: 2.3, fire: new THREE.Vector3(0, 0.3, 0.2), scale: 0 },
    { group: brick, chimney: 2.9, fire: new THREE.Vector3(0, 0.1, 0.22), scale: 0.4 },
    { group: great, chimney: 3.4, fire: new THREE.Vector3(0, 0.1, 0.24), scale: 0.46 },
  ];
}

export function createHearthMesh(): HearthMesh {
  const group = new THREE.Group();
  const built = stages();
  for (const s of built) group.add(s.group);
  const fire = fireplace();
  group.add(fire.group);

  const smokeMat = Array.from({ length: 6 }, () => new THREE.MeshBasicMaterial({ color: PALETTE.frost, transparent: true, depthWrite: false }));
  const smoke = smokeMat.map((m) => new THREE.Mesh(GEO.sphere, m));
  for (const p of smoke) group.add(p);

  return {
    group,
    update(time, { lit, ignited, stage }) {
      built.forEach((s, i) => (s.group.visible = i === stage - 1));
      const cur = built[Math.min(built.length, Math.max(1, stage)) - 1];
      // An iron stove hides its fire behind the door, and the other hearths show it.
      fire.group.position.copy(cur.fire);
      fire.group.scale.setScalar(Math.max(0.001, cur.scale));
      fire.group.visible = cur.scale > 0;
      fire.embers.visible = true;
      embersMat.color.copy(lit ? emberLit : emberDull);
      doorGlow.color.copy(lit ? emberLit : emberDull);
      fire.flames.forEach((f, i) => {
        f.visible = lit;
        const flicker = 1 + Math.sin(time * 9 + i * 1.7) * 0.12 + Math.sin(time * 23 + i * 3.4) * 0.06;
        f.scale.set(1 / Math.sqrt(flicker), flicker, 1 / Math.sqrt(flicker));
        f.rotation.y = time * 0.8 + i;
      });
      // Smoke rises from the chimney top, thin when the fire only smolders.
      smoke.forEach((p, i) => {
        const t = (time * 0.25 + i / smoke.length) % 1;
        const show = lit || (ignited ? false : i < 2);
        p.visible = show;
        p.position.set(Math.sin(t * 6 + i) * 0.15 + t * 0.5, cur.chimney + t * 2, -0.1 - t * 0.3);
        p.scale.setScalar(0.18 + t * 0.5);
        smokeMat[i].opacity = (lit ? 0.35 : 0.14) * (1 - t);
      });
    },
  };
}
