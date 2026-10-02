import * as THREE from 'three';
import { mixPalette, PALETTE } from '../materials';

// The hearth: a stone ring, a log teepee, a glowing ember bed, and flickering flames.
// Bright emissive colors above 1 feed the bloom pass.

export interface HearthMesh {
  group: THREE.Group;
  update(time: number, lit: boolean): void;
}

export function createHearthMesh(): HearthMesh {
  const group = new THREE.Group();

  const stone = new THREE.MeshStandardMaterial({ color: mixPalette(PALETTE.nightBlue, PALETTE.frost, 0.45), roughness: 1 });
  const stoneGeo = new THREE.DodecahedronGeometry(0.28, 0);
  const stones = 12;
  for (let i = 0; i < stones; i++) {
    const a = (i / stones) * Math.PI * 2;
    const s = new THREE.Mesh(stoneGeo, stone);
    s.position.set(Math.cos(a) * 1.05, 0.15, Math.sin(a) * 1.05);
    s.rotation.set(a, a * 2, 0);
    s.scale.set(1, 0.75, 1);
    group.add(s);
  }

  const wood = new THREE.MeshStandardMaterial({ color: PALETTE.oldWood, roughness: 1 });
  const logGeo = new THREE.CylinderGeometry(0.09, 0.11, 1.4, 6);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const log = new THREE.Mesh(logGeo, wood);
    log.position.set(Math.cos(a) * 0.32, 0.5, Math.sin(a) * 0.32);
    log.rotation.set(Math.sin(a) * 0.55, 0, -Math.cos(a) * 0.55);
    group.add(log);
  }

  const embers = new THREE.Mesh(
    new THREE.CylinderGeometry(0.75, 0.85, 0.12, 12),
    new THREE.MeshBasicMaterial({ color: PALETTE.ember.clone().multiplyScalar(1.6) }),
  );
  embers.position.y = 0.06;
  group.add(embers);

  const flameMat = (color: THREE.Color, strength: number) =>
    new THREE.MeshBasicMaterial({
      color: color.clone().multiplyScalar(strength),
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  const flames = [
    { mesh: new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.5, 8).translate(0, 0.75, 0), flameMat(PALETTE.ember, 1.8)), phase: 0 },
    { mesh: new THREE.Mesh(new THREE.ConeGeometry(0.28, 1.1, 8).translate(0, 0.55, 0), flameMat(PALETTE.lantern, 2)), phase: 1.7 },
    { mesh: new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.8, 8).translate(0, 0.4, 0), flameMat(PALETTE.lantern, 2.4)), phase: 3.1 },
  ];
  flames[1].mesh.position.set(0.18, 0.1, 0.1);
  flames[2].mesh.position.set(-0.15, 0.1, -0.12);
  for (const f of flames) group.add(f.mesh);

  return {
    group,
    update(time: number, lit: boolean) {
      embers.visible = lit;
      for (const f of flames) {
        f.mesh.visible = lit;
        const flicker = 1 + Math.sin(time * 9 + f.phase) * 0.12 + Math.sin(time * 23 + f.phase * 2) * 0.06;
        f.mesh.scale.set(1 / Math.sqrt(flicker), flicker, 1 / Math.sqrt(flicker));
        f.mesh.rotation.y = time * 0.8 + f.phase;
      }
    },
  };
}
