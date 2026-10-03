import * as THREE from 'three';
import { BALANCE } from '../data/balance';
import { BUILDINGS } from '../data/buildings';
import { COMPONENT_IDS } from '../data/vehicle';
import { ENEMIES } from '../data/enemies';
import { Tile } from '../sim/grid';
import type { World } from '../sim/world';
import { createGroundMaterial } from './groundShader';
import { createHearthLight } from './lighting';
import { createBars, type Bar } from './meshes/bars';
import { createBuildingMesh, createLandmark } from './meshes/buildings';
import { createEnemyMeshes } from './meshes/enemies';
import { COAT_COLORS, COLONIST_RIG, createFigureSet, type Figure } from './meshes/figures';
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
  // Characters are drawn a little larger than true scale so they read from the isometric camera.
  const colonists = createFigureSet(COLONIST_RIG, 64, 1.3);
  scene.add(colonists.group);
  const colonistHeading = new Map<number, number>();
  let launchedAt = 0;
  for (const p of world.pois) {
    const g = createLandmark();
    g.position.set(p.x - width / 2, 0, p.y - height / 2);
    scene.add(g);
  }
  const enemies = createEnemyMeshes();
  scene.add(enemies.group);
  const bars = createBars();
  scene.add(bars.mesh);

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
      const barList: Bar[] = [];
      for (const b of w.buildings) {
        const g = buildingMeshes.get(b.id)!;
        const light = g.getObjectByName('light');
        if (light) light.visible = b.lit;
        const ship = g.getObjectByName('airship');
        if (ship) {
          for (const id of COMPONENT_IDS) ship.getObjectByName(id)!.visible = w.airship.built.includes(id);
          if (w.won && !launchedAt) launchedAt = time;
          // The airship climbs away after launch.
          ship.position.y = 3.6 + (launchedAt ? (time - launchedAt) ** 2 * 0.6 : 0);
        }
        const max = BUILDINGS[b.type].hp;
        if (b.hp < max) barList.push({ x: b.x + (b.w - 1) / 2 - width / 2, z: b.y + (b.h - 1) / 2 - height / 2, y: 2, fraction: b.hp / max, enemy: false });
      }
      if (w.hearth.hp < BALANCE.defense.hearthHp) barList.push({ x: 0, z: 0, y: 2.5, fraction: w.hearth.hp / BALANCE.defense.hearthHp, enemy: false });
      for (const e of w.enemies) {
        const max = ENEMIES[e.type].hp;
        if (e.hp < max) barList.push({ x: e.px + (e.x - e.px) * alpha - width / 2, z: e.py + (e.y - e.py) * alpha - height / 2, y: e.type === 'brute' ? 1.8 : 1.2, fraction: e.hp / max, enemy: true });
      }
      enemies.update(w.enemies, alpha, width / 2, height / 2, time);
      camera.getWorldDirection(viewDir);
      bars.update(barList, Math.atan2(-viewDir.x, -viewDir.z));

      const people: Figure[] = [];
      for (const c of w.colonists) {
        if (c.asleep) continue;
        const dx = c.x - c.px;
        const dy = c.y - c.py;
        if (dx || dy) colonistHeading.set(c.id, Math.atan2(dx, dy));
        people.push({ id: c.id, x: c.px + dx * alpha - width / 2, z: c.py + dy * alpha - height / 2, yaw: colonistHeading.get(c.id) ?? 0, moving: dx !== 0 || dy !== 0 });
      }
      colonists.update(people, time, 9, (id) => COAT_COLORS[id % COAT_COLORS.length]);

      snow.update(time, pixelsPerUnit, camera.getWorldDirection(viewDir));
    },
  };
}
