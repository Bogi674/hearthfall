import * as THREE from 'three';
import { BALANCE } from '../data/balance';
import { Tile } from '../sim/grid';
import type { World } from '../sim/world';
import { createGroundMaterial } from './groundShader';
import { createHearthLight } from './lighting';
import { createBuildingMesh, createColonistMesh } from './meshes/buildings';
import { createHearthMesh } from './meshes/hearth';
import { buildProps, colorPropsByWarmth } from './meshes/props';
import { createSnow } from './meshes/snow';

// Maps simulation state to scene objects. Reads the world and never writes to it.
// Tile (x, y) has its center at world (x - width / 2, 0, y - height / 2), so the hearth is at the origin.

/** Frost coverage on cold ground for a given day. Grows over days (section 12.2). */
function frostForDay(day: number): number {
  return Math.min(0.8, 0.3 + day * 0.04);
}

export interface WorldView {
  update(world: World, time: number, alpha: number, pixelsPerUnit: number, camera: THREE.Camera): void;
}

export function createWorldView(world: World, scene: THREE.Scene, fog: THREE.Fog): WorldView {
  const { width, height, tiles } = world.map;
  const mapSize = new THREE.Vector2(width, height);
  const warmThreshold = BALANCE.warmth.warmThreshold;

  const warmthTex = new THREE.DataTexture(new Uint8Array(width * height), width, height, THREE.RedFormat);
  warmthTex.magFilter = THREE.LinearFilter;
  warmthTex.minFilter = THREE.LinearFilter;

  const tileData = new Uint8Array(width * height * 4);
  tiles.forEach((t, i) => {
    tileData[i * 4] = t === Tile.Road ? 255 : 0;
    tileData[i * 4 + 1] = t === Tile.Water ? 255 : 0;
  });
  const tilesTex = new THREE.DataTexture(tileData, width, height, THREE.RGBAFormat);
  tilesTex.magFilter = THREE.LinearFilter;
  tilesTex.minFilter = THREE.LinearFilter;
  tilesTex.needsUpdate = true;

  const groundMat = createGroundMaterial({ warmth: warmthTex, tiles: tilesTex }, mapSize, warmThreshold, fog);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(width + 80, height + 80).rotateX(-Math.PI / 2), groundMat);
  ground.position.set(-0.5, 0, -0.5);
  scene.add(ground);

  let props = buildProps(world.map);
  for (const p of props) scene.add(p.mesh);
  let mapRev = world.mapRev;

  const buildingMeshes = new Map<number, THREE.Group>();
  const colonists = createColonistMesh(64);
  scene.add(colonists);
  const m = new THREE.Matrix4();

  const hearth = createHearthMesh();
  hearth.group.position.set(world.hearth.x - width / 2, 0, world.hearth.y - height / 2);
  scene.add(hearth.group);
  const hearthLight = createHearthLight();
  hearthLight.position.add(hearth.group.position);
  scene.add(hearthLight);
  const baseIntensity = hearthLight.intensity;

  const snow = createSnow(warmthTex, mapSize, warmThreshold, fog.far);
  scene.add(snow.points);

  const viewDir = new THREE.Vector3();
  let warmthKey = '';

  return {
    update(w, time, alpha, pixelsPerUnit, camera) {
      if (w.mapRev !== mapRev) {
        mapRev = w.mapRev;
        for (const p of props) {
          scene.remove(p.mesh);
          p.mesh.geometry.dispose();
        }
        props = buildProps(w.map);
        for (const p of props) scene.add(p.mesh);
        warmthKey = '';
      }
      if (w.warmthKey !== warmthKey) {
        warmthKey = w.warmthKey;
        const data = warmthTex.image.data as Uint8Array;
        for (let i = 0; i < w.warmth.length; i++) data[i] = Math.round(w.warmth[i] * 2.55);
        warmthTex.needsUpdate = true;
        colorPropsByWarmth(props, w.warmth, warmThreshold);
      }
      groundMat.uniforms.uFrost.value = frostForDay(w.day);
      hearth.update(time, w.hearth.lit);
      hearthLight.visible = w.hearth.lit;
      hearthLight.intensity = baseIntensity * (1 + Math.sin(time * 11) * 0.05 + Math.sin(time * 27) * 0.03);

      const alive = new Set<number>();
      for (const b of w.buildings) {
        alive.add(b.id);
        if (buildingMeshes.has(b.id)) continue;
        const g = createBuildingMesh(b.type, b.w, b.h);
        g.position.set(b.x + (b.w - 1) / 2 - width / 2, 0, b.y + (b.h - 1) / 2 - height / 2);
        buildingMeshes.set(b.id, g);
        scene.add(g);
      }
      for (const [id, g] of buildingMeshes) {
        if (alive.has(id)) continue;
        scene.remove(g);
        buildingMeshes.delete(id);
      }

      let n = 0;
      for (const c of w.colonists) {
        if (c.asleep) continue;
        m.makeTranslation(c.px + (c.x - c.px) * alpha - width / 2, 0, c.py + (c.y - c.py) * alpha - height / 2);
        colonists.setMatrixAt(n++, m);
      }
      colonists.count = n;
      colonists.instanceMatrix.needsUpdate = true;

      snow.update(time, pixelsPerUnit, camera.getWorldDirection(viewDir));
    },
  };
}
