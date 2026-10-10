import * as THREE from 'three';
import { ANIMALS, type AnimalKind } from '../../data/wild';
import type { Animal, RuinHouse } from '../../sim/world';
import { mixPalette, PALETTE } from '../materials';
import { createSurfaceMaterial } from '../surfaces';
import { GEO, glowPart, MAT, part } from './kit';

// Wild animals and the scavenging markers of ruined houses (M13). Render only.

const fur = (c: THREE.Color) => createSurfaceMaterial('needles', { color: c, roughness: 1, grounded: true, flat: true });
const MATS = {
  deer: fur(mixPalette(PALETTE.oldWood, PALETTE.lantern, 0.3)),
  deerPale: fur(mixPalette(PALETTE.lantern, PALETTE.frost, 0.5)),
  pig: fur(mixPalette(PALETTE.ember, PALETTE.frost, 0.35)),
  pigDark: fur(mixPalette(PALETTE.oldWood, PALETTE.warmShadow, 0.4)),
};

function deer(): THREE.Group {
  const g = new THREE.Group();
  g.add(part(GEO.centered, MATS.deer, [0, 0.55, 0], [0.34, 0.3, 0.7]));
  g.add(part(GEO.centered, MATS.deerPale, [0, 0.45, 0.1], [0.3, 0.12, 0.5]));
  for (const [x, z] of [[-0.1, -0.26], [0.1, -0.26], [-0.1, 0.26], [0.1, 0.26]]) g.add(part(GEO.block, MATS.pigDark, [x, 0, z], [0.06, 0.45, 0.06]));
  g.add(part(GEO.centered, MATS.deer, [0, 0.82, 0.38], [0.14, 0.34, 0.14], [0.5, 0, 0]));
  g.add(part(GEO.centered, MATS.deer, [0, 1.02, 0.5], [0.16, 0.16, 0.26]));
  for (const s of [-1, 1]) {
    g.add(part(GEO.block, MATS.pigDark, [s * 0.05, 1.08, 0.46], [0.025, 0.28, 0.025], [0, 0, s * 0.35]));
    g.add(part(GEO.block, MATS.pigDark, [s * 0.14, 1.28, 0.44], [0.02, 0.14, 0.02], [0.3, 0, s * 0.7]));
  }
  g.add(part(GEO.centered, MATS.deerPale, [0, 0.62, -0.38], [0.1, 0.1, 0.06]));
  return g;
}

function pig(): THREE.Group {
  const g = new THREE.Group();
  g.add(part(GEO.centered, MATS.pig, [0, 0.38, 0], [0.4, 0.34, 0.66]));
  g.add(part(GEO.centered, MATS.pigDark, [0, 0.46, -0.1], [0.2, 0.22, 0.4]));
  for (const [x, z] of [[-0.12, -0.22], [0.12, -0.22], [-0.12, 0.22], [0.12, 0.22]]) g.add(part(GEO.block, MATS.pigDark, [x, 0, z], [0.08, 0.22, 0.08]));
  g.add(part(GEO.centered, MATS.pig, [0, 0.44, 0.4], [0.3, 0.28, 0.24]));
  g.add(part(GEO.centered, MATS.pigDark, [0, 0.4, 0.56], [0.14, 0.1, 0.08]));
  for (const s of [-1, 1]) {
    g.add(part(GEO.block, MATS.pig, [s * 0.1, 0.56, 0.42], [0.08, 0.1, 0.03], [0.4, 0, s * 0.3]));
    g.add(part(GEO.block, MAT.stone, [s * 0.06, 0.38, 0.6], [0.02, 0.06, 0.02], [0.2, 0, 0]));
  }
  return g;
}

const BUILD: Record<AnimalKind, () => THREE.Group> = { deer, pig };

export interface AnimalView {
  group: THREE.Group;
  update(animals: Animal[], houses: RuinHouse[], alpha: number, revealed: number[], width: number, height: number, time: number): void;
}

const markGlow = new THREE.MeshBasicMaterial({ color: PALETTE.lantern.clone().multiplyScalar(1.6), transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });

function marker(): THREE.Group {
  const g = new THREE.Group();
  g.add(part(GEO.block, MAT.wood, [0, 0, 0], [0.34, 0.24, 0.26]));
  g.add(part(GEO.block, MAT.darkWood, [0, 0.24, 0], [0.38, 0.05, 0.3]));
  g.add(glowPart(markGlow, [0, 0.9, 0], [0.14, 0.14, 0.14], GEO.sphere));
  return g;
}

export function createAnimalView(): AnimalView {
  const group = new THREE.Group();
  const shown = new Map<number, { g: THREE.Group; kind: AnimalKind }>();
  const marks = new Map<number, THREE.Group>();
  return {
    group,
    update(animals, houses, alpha, revealed, width, height, time) {
      const alive = new Set<number>();
      for (const a of animals) {
        alive.add(a.id);
        let e = shown.get(a.id);
        if (!e) {
          e = { g: BUILD[a.kind](), kind: a.kind };
          e.g.scale.setScalar(ANIMALS[a.kind].hp > 40 ? 1 : 1.05);
          group.add(e.g);
          shown.set(a.id, e);
        }
        const x = a.px + (a.x - a.px) * alpha;
        const y = a.py + (a.y - a.py) * alpha;
        e.g.visible = revealed[Math.round(a.y) * width + Math.round(a.x)] === 1;
        e.g.position.set(x - width / 2, 0, y - height / 2);
        const [dx, dy] = [a.x - a.px, a.y - a.py];
        if (dx !== 0 || dy !== 0) e.g.rotation.y = Math.atan2(dx, dy);
        e.g.position.y = dx !== 0 || dy !== 0 ? Math.abs(Math.sin(time * 9 + a.id)) * 0.05 : 0;
      }
      for (const [id, e] of shown) {
        if (alive.has(id)) continue;
        group.remove(e.g);
        shown.delete(id);
      }
      // A glint over each ruined house nobody has searched, once the colony has seen it.
      for (const h of houses) {
        let m = marks.get(h.id);
        if (!m) {
          m = marker();
          group.add(m);
          marks.set(h.id, m);
        }
        const [cx, cy] = [h.x + h.w / 2, h.y + h.d / 2];
        m.visible = h.state === 'fresh' && revealed[Math.round(cy) * width + Math.round(cx)] === 1;
        m.position.set(cx - width / 2, 0.15 + Math.sin(time * 2 + h.id) * 0.05, cy - height / 2);
        m.rotation.y = time * 0.6;
      }
    },
  };
}
