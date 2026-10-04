import * as THREE from 'three';
import { PALETTE } from '../materials';
import { boardedWindow, drum, patch, sandbags, sheet, shedRoof, stringLights, tires, type V3 } from './buildings/parts';
import { at, GEO, glowPart, link, logPile, MAT, part } from './kit';

// The Hearth House (section 5.2): a ruined house the colony patches into a fortified shelter in
// five stages. Parts carry the range of stages they show in. Flames, windows, and smoke follow the fire.
// The house stays inside its 3 by 3 tile footprint, since rooms are built on the ring around it.

export interface HearthMesh {
  group: THREE.Group;
  update(time: number, lit: boolean, stage: number): void;
}

/** Window glow for this house only, so it can go dark when the fire is out. */
const windowGlow = new THREE.MeshBasicMaterial({ color: PALETTE.lantern.clone().multiplyScalar(1.7) });
const lanternLit = PALETTE.lantern.clone().multiplyScalar(1.7);
const lanternOut = PALETTE.warmShadow.clone();

const FOOT = 0.14;
const EAVE = 1.54;
const RIDGE = 2.3;
const FRONT = 0.6;
const BACK = -1.4;
const SIDE = 1.35;
const MID = (FRONT + BACK) / 2;

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
  const embers = part(GEO.cylinder, MAT.ember, [0, 0, 0], [0.62, 0.08, 0.62]);
  group.add(embers);
  for (let i = 0; i < 4; i++) group.add(part(GEO.log, MAT.darkWood, [0, 0.12, 0], [0.6, 0.09, 0.09], [0, (i * Math.PI) / 4, 0.25]));
  const flames = [flame(PALETTE.ember, 1.8, 0.28, 0.9), flame(PALETTE.lantern, 2, 0.17, 0.7), flame(PALETTE.lantern, 2.4, 0.13, 0.5)];
  flames[1].position.set(0.1, 0.05, 0.06);
  flames[2].position.set(-0.09, 0.05, -0.07);
  for (const f of flames) group.add(f);
  return { group, flames, embers };
}

/** A glazed window facing +z: frame, warm pane, cross bars, and sheet metal shutters swung open. */
function glazedWindow(w = 0.36, h = 0.32): THREE.Group {
  const g = new THREE.Group();
  g.add(part(GEO.centered, MAT.darkWood, [0, 0, 0], [w + 0.08, h + 0.08, 0.04]));
  g.add(glowPart(windowGlow, [0, 0, 0.02], [w, h, 0.02]));
  g.add(part(GEO.centered, MAT.darkWood, [0, 0, 0.035], [0.03, h, 0.02]), part(GEO.centered, MAT.darkWood, [0, 0, 0.035], [w, 0.03, 0.02]));
  for (const s of [-1, 1]) g.add(part(GEO.corrugated, MAT.sheet, [s * (w / 2 + 0.16), -h / 2 - 0.02, 0.1], [w / 2 + 0.04, h + 0.06, 0.05], [0, s * 0.7, 0]));
  return g;
}

/** Wall segments for the ruin: [from, to, height] along x at a fixed z, or along z at a fixed x. */
function ruinWall(alongX: boolean, fixed: number, segs: [number, number, number][]): THREE.Object3D[] {
  return segs.map(([a, b, h], i) => {
    const mid = (a + b) / 2;
    const m = i % 2 ? MAT.concrete : MAT.plaster;
    return alongX ? part(GEO.block, m, [mid, FOOT, fixed], [b - a, h, 0.14]) : part(GEO.block, m, [fixed, FOOT, mid], [0.14, h, b - a]);
  });
}

function buildStages(add: (from: number, to: number, ...o: THREE.Object3D[]) => void): void {
  add(1, 5, part(GEO.block, MAT.concrete, [0, 0, MID], [2.85, FOOT, 2.15]));
  // Firewood and a water drum by the door at every stage.
  add(1, 5, at(logPile(4), -1.08, 0, 1.15, Math.PI / 2), at(drum(MAT.paintBlue), -0.52, 0, 1.32));

  // Stages 1 and 2: broken walls of plaster and concrete, charred corner posts.
  add(1, 2,
    ...ruinWall(true, BACK, [[-SIDE, -0.3, 1.3], [-0.3, 0.45, 0.8], [0.45, SIDE, 1.5]]),
    ...ruinWall(true, FRONT, [[-SIDE, -0.7, 0.8], [-0.15, 0.45, 0.4], [0.45, SIDE, 0.7]]),
    ...ruinWall(false, -SIDE, [[BACK, -0.5, 1.25], [-0.5, 0.05, 0.55], [0.05, FRONT, 0.32]]),
    ...ruinWall(false, SIDE, [[BACK, -0.65, 1.42], [-0.65, 0.0, 0.48], [0.0, FRONT, 1.0]]),
    part(GEO.centered, MAT.plaster, [-0.95, FOOT + 1.32, BACK], [0.5, 0.2, 0.14], [0, 0, 0.35]),
    part(GEO.centered, MAT.plaster, [1.0, FOOT + 1.5, BACK], [0.5, 0.22, 0.14], [0, 0, -0.4]),
    part(GEO.centered, MAT.brick, [-0.9, 0.8, BACK + 0.08], [0.5, 0.3, 0.03]),
    part(GEO.centered, MAT.brick, [SIDE + 0.08, 0.7, -1.0], [0.03, 0.35, 0.45]),
    ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z]) => part(GEO.block, MAT.soot, [x * SIDE, FOOT, z > 0 ? FRONT : BACK], [0.13, EAVE - FOOT, 0.13])),
  );
  // Stage 1 only: fallen rafters and rubble inside the roofless shell.
  add(1, 1,
    link(MAT.soot, [-0.9, 1.4, BACK + 0.1], [-0.6, FOOT, 0.2], 0.1),
    link(MAT.soot, [0.3, 1.0, BACK + 0.1], [1.0, FOOT, -0.1], 0.1),
    part(GEO.centered, MAT.roofRed, [-0.85, 0.4, 0.25], [0.8, 0.07, 0.6], [0.5, 0.3, 0.2]),
    ...[[-1.1, 0.95], [1.2, 0.85], [0.3, 0.9], [-0.2, BACK - 0.05]].map(([x, z], i) => part(GEO.rock, MAT.concrete, [x, 0.12, z], [0.3, 0.22, 0.26], [i, i * 2, 0])),
  );

  // The old brick chimney, rebuilt taller at stage 3, with a stovepipe from stage 2.
  add(1, 5, part(GEO.block, MAT.brick, [0.75, FOOT, -1.2], [0.42, 1.76, 0.4]));
  add(2, 2, part(GEO.pipe, MAT.iron, [0.75, 1.9, -1.2], [0.14, 0.55, 0.14]));
  add(3, 5, part(GEO.block, MAT.brick, [0.75, 1.9, -1.2], [0.36, 0.55, 0.34]));
  add(4, 5, part(GEO.pipe, MAT.iron, [0.75, 2.45, -1.2], [0.2, 0.6, 0.2]), part(GEO.cone, MAT.iron, [0.75, 3.05, -1.2], [0.36, 0.14, 0.36]));

  // Stage 2 roof: rafters, a sheeted back slope, a blue tarp tied down with tires on the front.
  const slope = Math.atan2(RIDGE - EAVE, 1.1);
  const onFront = (x: number, z: number, lift = 0.05): V3 => [x, RIDGE - (z + 0.4) * Math.tan(slope) + lift, z];
  add(2, 4,
    at(shedRoof([MAT.sheet, MAT.rust, MAT.sheetWarm, MAT.rust], 2.95, 1.1, EAVE, RIDGE), 0, 0, -0.95, Math.PI),
    part(GEO.log, MAT.darkWood, [0, RIDGE + 0.05, -0.4], [3.0, 0.1, 0.1]),
    part(GEO.block, MAT.darkWood, [0, EAVE - 0.06, FRONT + 0.05], [2.85, 0.08, 0.08]),
  );
  add(2, 2,
    ...[-1.3, -0.45, 0.4].map((x) => link(MAT.darkWood, [x, EAVE, FRONT + 0.1], [x, RIDGE, -0.4], 0.07)),
    part(GEO.centered, MAT.tarpBlue, onFront(-0.45, 0.15, 0.02), [1.85, 0.04, 1.4], [slope, 0, 0]),
    at(shedRoof([MAT.rust, MAT.sheet], 1.05, 1.1, EAVE, RIDGE), 0.95, 0, 0.15),
    at(tires(1), ...onFront(-0.9, 0.05)).rotateX(slope),
    at(tires(1), ...onFront(0.0, 0.3)).rotateX(slope),
    link(MAT.rope, onFront(-1.15, -0.4), onFront(-1.15, FRONT + 0.15), 0.025),
    link(MAT.rope, onFront(0.3, -0.4), onFront(0.3, FRONT + 0.15), 0.025),
    part(GEO.gable, MAT.tarpOlive, [SIDE + 0.03, EAVE, -0.4], [2.1, RIDGE - EAVE, 0.04], [0, Math.PI / 2, 0]),
  );

  // Stages 3 to 5: walls closed up with plank and sheet patches, and the fire moved to a pit out front.
  add(3, 5,
    part(GEO.block, MAT.plaster, [0, FOOT, MID], [SIDE * 2, EAVE - FOOT, FRONT - BACK]),
    patch(MAT.wood, [-0.85, 0.42, FRONT + 0.02], 0.85, 0.44, 0.04),
    sheet(MAT.rust, [0.85, FOOT, FRONT + 0.02], 0.9, 0.62),
    patch(MAT.wood, [0.95, 1.38, FRONT + 0.02], 0.7, 0.2, -0.08),
    part(GEO.centered, MAT.brick, [-0.55, 1.3, FRONT + 0.015], [0.5, 0.22, 0.03]),
    sheet(MAT.sheet, [SIDE + 0.02, FOOT, -0.15], 1.2, 0.75, [0, Math.PI / 2, 0]),
    patch(MAT.wood, [SIDE + 0.03, 1.25, -0.95], 0.6, 0.3, 0.1).rotateY(Math.PI / 2),
    sheet(MAT.sheetWarm, [-SIDE - 0.02, FOOT, -0.6], 1.0, 0.9, [0, -Math.PI / 2, 0]),
    part(GEO.block, MAT.darkWood, [0, FOOT, FRONT + 0.02], [0.5, 0.95, 0.05]),
    part(GEO.centered, MAT.sheetWarm, [0.02, 0.45, FRONT + 0.05], [0.4, 0.3, 0.02], [0, 0, 0.06]),
    glowPart(windowGlow, [0.23, 0.6, FRONT + 0.05], [0.03, 0.85, 0.02]),
    part(GEO.block, MAT.concrete, [0, 0, FRONT + 0.2], [0.6, FOOT, 0.3]),
  );
  // Stages 3 and 4: a full sheet roof with the last of the tarp, and plank gables.
  add(3, 4,
    at(shedRoof([MAT.rust, MAT.sheetWarm, MAT.sheet, MAT.rust, MAT.sheet], 2.95, 1.1, EAVE, RIDGE), 0, 0, 0.15),
    part(GEO.centered, MAT.tarpBlue, onFront(-0.8, 0.0, 0.06), [0.8, 0.04, 0.7], [slope, 0, 0]),
    at(tires(1), ...onFront(-0.8, 0.0, 0.08)).rotateX(slope),
    ...[-SIDE - 0.02, SIDE + 0.02].map((x) => part(GEO.gable, MAT.wood, [x, EAVE, -0.4], [2.05, RIDGE - EAVE, 0.05], [0, Math.PI / 2, 0])),
  );
  add(3, 3, at(boardedWindow(windowGlow, 0.38, 0.32), -0.8, 0.95, FRONT + 0.03), at(boardedWindow(windowGlow, 0.38, 0.3), 0.8, 1.05, FRONT + 0.03), at(boardedWindow(windowGlow, 0.3, 0.28), SIDE + 0.03, 0.95, -0.55, Math.PI / 2));

  // Stage 4: glazed windows with shutters, sandbags, a porch awning, and string lights.
  add(4, 5,
    at(glazedWindow(), -0.8, 0.95, FRONT + 0.03),
    at(glazedWindow(0.36, 0.3), 0.8, 1.05, FRONT + 0.03),
    at(glazedWindow(0.3, 0.28), SIDE + 0.03, 0.95, -0.55, Math.PI / 2),
    at(sandbags(1.0, 2), -0.95, 0, 1.5),
    at(sandbags(1.0, 2), 0.95, 0, 1.5),
    at(sandbags(0.6, 2), 1.48, 0, 1.05, Math.PI / 2),
    ...[-0.42, 0.42].map((x) => part(GEO.block, MAT.darkWood, [x, 0, 1.18], [0.07, 1.36, 0.07])),
    at(shedRoof([MAT.sheet, MAT.rust], 1.1, 0.62, 1.34, 1.5), 0, 0, 0.9),
  );
  add(4, 4, stringLights('house4', [[-SIDE - 0.05, EAVE - 0.05, FRONT + 0.12], [-0.42, 1.35, 1.2], [0.42, 1.35, 1.2], [SIDE + 0.05, EAVE - 0.05, FRONT + 0.12]], 0.12, windowGlow));

  // Stage 5: a flat roof deck with an upper room, railing, a floodlight, an antenna, and a banner.
  add(5, 5,
    part(GEO.block, MAT.darkWood, [0, EAVE, MID], [2.85, 0.1, 2.15]),
    part(GEO.block, MAT.wood, [-0.42, EAVE + 0.1, -0.6], [1.75, 0.95, 1.5]),
    sheet(MAT.paintBlue, [-0.95, EAVE + 0.1, 0.16], 0.75, 0.9),
    sheet(MAT.rust, [-0.42 - 0.875 - 0.02, EAVE + 0.1, -0.6], 1.4, 0.8, [0, -Math.PI / 2, 0]),
    at(glazedWindow(0.3, 0.26), -0.95, EAVE + 0.6, 0.17),
    at(glazedWindow(0.3, 0.26), 0.1, EAVE + 0.6, 0.17),
    part(GEO.block, MAT.darkWood, [0.47, EAVE + 0.1, -0.75], [0.05, 0.72, 0.36]),
    glowPart(windowGlow, [0.5, EAVE + 0.45, -0.75], [0.02, 0.6, 0.03]),
    at(shedRoof([MAT.rust, MAT.sheet, MAT.sheetWarm], 1.9, 1.6, EAVE + 1.05, EAVE + 1.3), -0.42, 0, -0.6),
    // A banner hung from the upper room: a dark cloth with an ember mark.
    part(GEO.centered, MAT.paintRed, [-0.42, EAVE + 0.55, 0.19], [0.32, 0.7, 0.02]),
    part(GEO.centered, MAT.paintYellow, [-0.42, EAVE + 0.62, 0.205], [0.14, 0.14, 0.02], [0, 0, Math.PI / 4]),
    // Railing around the open deck.
    ...[-1.38, -0.45, 0.45, 1.38].map((x) => link(MAT.darkWood, [x, EAVE + 0.1, FRONT + 0.06], [x, EAVE + 0.5, FRONT + 0.06], 0.05)),
    ...[-1.35, -0.4].map((z) => link(MAT.darkWood, [1.38, EAVE + 0.1, z], [1.38, EAVE + 0.5, z], 0.05)),
    link(MAT.darkWood, [-1.4, EAVE + 0.45, FRONT + 0.06], [1.4, EAVE + 0.45, FRONT + 0.06], 0.05),
    link(MAT.darkWood, [1.38, EAVE + 0.45, -1.4], [1.38, EAVE + 0.45, FRONT + 0.06], 0.05),
    at(sandbags(0.8, 2), 0.95, EAVE + 0.1, 0.42),
    at(drum(MAT.sheet, 1.3), 1.0, EAVE + 0.1, -1.0),
    // A floodlight on a pole and a radio antenna.
    link(MAT.iron, [1.2, EAVE + 0.1, -0.3], [1.2, EAVE + 1.35, -0.3], 0.06),
    part(GEO.cone, MAT.iron, [1.2, EAVE + 1.32, -0.22], [0.32, 0.2, 0.26], [0.9, 0.785, 0]),
    glowPart(windowGlow, [1.27, EAVE + 1.26, -0.15], [0.2, 0.2, 0.06]).rotateY(0.785),
    link(MAT.iron, [-1.1, EAVE + 1.25, -1.2], [-1.1, EAVE + 2.45, -1.2], 0.04),
    link(MAT.iron, [-1.3, EAVE + 2.05, -1.2], [-0.9, EAVE + 2.05, -1.2], 0.025),
    link(MAT.iron, [-1.25, EAVE + 2.3, -1.2], [-0.95, EAVE + 2.3, -1.2], 0.025),
    glowPart(MAT.ember, [-1.1, EAVE + 2.47, -1.2], [0.06, 0.06, 0.06]),
    // A reinforced door with cross bars.
    part(GEO.centered, MAT.iron, [0, 0.62, FRONT + 0.08], [0.52, 0.06, 0.03], [0, 0, 0.9]),
    part(GEO.centered, MAT.iron, [0, 0.62, FRONT + 0.08], [0.52, 0.06, 0.03], [0, 0, -0.9]),
    stringLights('house5', [[-0.42, 1.35, 1.2], [0.42, 1.35, 1.2], [1.38, EAVE + 0.5, FRONT + 0.06]], 0.12, windowGlow),
  );
}

export function createHearthMesh(): HearthMesh {
  const group = new THREE.Group();
  const staged: [THREE.Object3D, number, number][] = [];
  buildStages((from, to, ...objs) => {
    for (const o of objs) {
      group.add(o);
      staged.push([o, from, to]);
    }
  });

  // The fire sits inside the ruin, and in a fire pit by the door once the walls are closed.
  const fire = fireplace();
  group.add(fire.group);

  const smokeMat = Array.from({ length: 6 }, () => new THREE.MeshBasicMaterial({ color: PALETTE.frost, transparent: true, depthWrite: false }));
  const smoke = smokeMat.map((m) => new THREE.Mesh(GEO.sphere, m));
  for (const p of smoke) group.add(p);
  const chimneyTop = [1.9, 2.5, 2.5, 3.15, 3.15];
  const chimney = new THREE.Vector3();

  return {
    group,
    update(time, lit, stage) {
      for (const [o, from, to] of staged) o.visible = stage >= from && stage <= to;
      const inside = stage <= 2;
      fire.group.position.set(inside ? -0.2 : 0.95, inside ? FOOT : 0, inside ? -0.35 : 1.1);
      fire.group.scale.setScalar(inside ? 1 : 0.62);
      fire.embers.visible = lit;
      windowGlow.color.copy(lit ? lanternLit : lanternOut);
      fire.flames.forEach((f, i) => {
        f.visible = lit;
        const flicker = 1 + Math.sin(time * 9 + i * 1.7) * 0.12 + Math.sin(time * 23 + i * 3.4) * 0.06;
        f.scale.set(1 / Math.sqrt(flicker), flicker, 1 / Math.sqrt(flicker));
        f.rotation.y = time * 0.8 + i;
      });
      // Smoke puffs rise from the chimney and fade.
      chimney.set(0.75, chimneyTop[Math.min(4, Math.max(0, stage - 1))], -1.2);
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
