import * as THREE from 'three';
import { BALANCE } from '../data/balance';
import { BUILDINGS } from '../data/buildings';
import { EDGES } from '../data/house';
import { COMPONENT_IDS } from '../data/vehicle';
import { ENEMIES } from '../data/enemies';
import { Tile } from '../sim/grid';
import { hearthStage, isBuilt, lightSources } from '../sim/query';
import type { World } from '../sim/world';
import { FOG_DEPTH_TILES, fogDistance } from './fogOfWar';
import { paintLight } from './lightMap';
import { createGroundMaterial } from './groundShader';
import { createHearthLight } from './lighting';
import { createBars, type Bar } from './meshes/bars';
import { createBuildingMesh, createConstructionSite, createLandmark, WALL_EAST, WALL_NORTH, WALL_SOUTH, WALL_TYPES, WALL_WEST } from './meshes/buildings';
import { createEnemyMeshes } from './meshes/enemies';
import { colonistFigures } from './colonists';
import { createFigureSet } from './meshes/figures';
import { PERSON_RIG } from './meshes/people';
import { createHearthMesh } from './meshes/hearth';
import { createHouseView } from './houseView';
import { buildProps, colorPropsByWarmth } from './meshes/props';
import { createSnow } from './meshes/snow';
import { createAtmosphere } from './atmosphere';
import type { View } from './scene';

// Maps simulation state to scene objects. Reads the world and never writes to it.
// Tile (x, y) has its center at world (x - width / 2, 0, y - height / 2), so the hearth is at the origin.

/** Frost coverage on cold ground for a given day. Grows over days (section 12.2). */
function frostForDay(day: number): number {
  return Math.min(0.8, 0.3 + day * 0.04);
}

export interface WorldView {
  /** With cutaway the roofs fade so the people inside the house can be seen. */
  update(world: World, time: number, alpha: number, pixelsPerUnit: number, camera: THREE.Camera, cutaway: boolean): void;
}

export function createWorldView(world: World, view: Pick<View, 'scene' | 'fog' | 'lights' | 'renderer'>): WorldView {
  const { scene, fog } = view;
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

  const fogTex = new THREE.DataTexture(new Uint8Array(width * height), width, height, THREE.RedFormat);
  fogTex.magFilter = THREE.LinearFilter;
  fogTex.minFilter = THREE.LinearFilter;

  const lightTex = new THREE.DataTexture(new Uint8Array(width * height), width, height, THREE.RedFormat);
  lightTex.magFilter = THREE.LinearFilter;
  lightTex.minFilter = THREE.LinearFilter;
  let lightKey = '';

  const groundMat = createGroundMaterial({ warmth: warmthTex, tiles: tilesTex, fogDepth: fogTex, light: lightTex }, mapSize, warmThreshold, fog);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(width + 80, height + 80).rotateX(-Math.PI / 2), groundMat);
  ground.position.set(-0.5, 0, -0.5);
  scene.add(ground);

  let props = buildProps(world.map);
  for (const p of props) scene.add(p.mesh);
  let mapRev = world.mapRev;

  const buildingMeshes = new Map<number, THREE.Group>();
  // Walls join their neighbors, so a wall mesh is rebuilt when its neighbor mask changes.
  const wallMasks = new Map<number, number>();
  // Characters are drawn a little larger than true scale so they read from the isometric camera.
  const colonists = createFigureSet(PERSON_RIG, 64, 1.3);
  scene.add(colonists.group);
  const colonistHeading = new Map<number, number>();
  let launchedAt = 0;
  const landmarks = world.pois.map((p) => {
    const g = createLandmark();
    g.position.set(p.x - width / 2, 0, p.y - height / 2);
    scene.add(g);
    return g;
  });
  const houseView = createHouseView(scene);
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

  const atmosphere = createAtmosphere({ renderer: view.renderer, fog, lights: view.lights, snow, ground: groundMat.uniforms as never, frost: frostForDay });
  const viewDir = new THREE.Vector3();
  let warmthKey = '';
  let revealRev = -1;

  return {
    update(w, time, alpha, pixelsPerUnit, camera, cutaway) {
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
      if (w.warmthKey !== warmthKey || w.revealRev !== revealRev) {
        warmthKey = w.warmthKey;
        revealRev = w.revealRev;
        const data = warmthTex.image.data as Uint8Array;
        for (let i = 0; i < w.warmth.length; i++) data[i] = Math.round(w.warmth[i] * 2.55);
        warmthTex.needsUpdate = true;
        const fogDist = fogDistance(w.revealed, width, height);
        const fogData = fogTex.image.data as Uint8Array;
        for (let i = 0; i < fogDist.length; i++) fogData[i] = Math.round(Math.min(1, fogDist[i] / FOG_DEPTH_TILES) * 255);
        fogTex.needsUpdate = true;
        colorPropsByWarmth(props, w.warmth, warmThreshold, fogDist);
      }
      // Places: nothing while hidden, a beacon for a rumor, the full site once known (section 10.4).
      w.pois.forEach((p, i) => {
        landmarks[i].visible = p.seen !== 'hidden';
        landmarks[i].getObjectByName('site')!.visible = p.seen === 'known';
      });
      groundMat.uniforms.uFrost.value = atmosphere.update(w, time);
      const lights = lightSources(w);
      const key = lights.map((l) => `${l.x},${l.y},${l.r}`).join(';');
      if (key !== lightKey) {
        lightKey = key;
        paintLight(lights, width, height, lightTex.image.data as Uint8Array);
        lightTex.needsUpdate = true;
      }
      groundMat.uniforms.uTime.value = time;
      hearth.update(time, w.hearth.lit, w.hearth.level);
      hearthLight.visible = w.hearth.lit;
      hearthLight.intensity = baseIntensity * (1 + Math.sin(time * 11) * 0.05 + Math.sin(time * 27) * 0.03);

      houseView.update(w, time, cutaway);
      const alive = new Set<number>();
      const wallAt = new Set(w.buildings.filter((b) => WALL_TYPES.includes(b.type)).map((b) => b.y * width + b.x));
      for (const b of w.buildings) {
        alive.add(b.id);
        const isWall = WALL_TYPES.includes(b.type);
        const i = b.y * width + b.x;
        const mask = isWall ? (wallAt.has(i + 1) ? WALL_EAST : 0) | (wallAt.has(i - 1) ? WALL_WEST : 0) | (wallAt.has(i + width) ? WALL_SOUTH : 0) | (wallAt.has(i - width) ? WALL_NORTH : 0) : 0;
        if (buildingMeshes.has(b.id) && (!isWall || wallMasks.get(b.id) === mask)) continue;
        if (buildingMeshes.has(b.id)) scene.remove(buildingMeshes.get(b.id)!);
        wallMasks.set(b.id, mask);
        // The building sits in a wrapper so a construction site can rise around it (section 8.2).
        const g = new THREE.Group();
        g.add(createBuildingMesh(b.type, b.w, b.h, mask));
        if (!isBuilt(b)) g.add(createConstructionSite(b.w, b.h));
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
        const [body, site] = g.children;
        body.scale.y = isBuilt(b) ? 1 : 0.08 + 0.92 * (1 - b.construct / BUILDINGS[b.type].build);
        if (site && isBuilt(b)) g.remove(site);
        const light = g.getObjectByName('light');
        if (light) light.visible = b.lit;
        for (let s = 1; s <= 3; s++) {
          const stage = g.getObjectByName(`stage${s}`);
          if (stage) stage.visible = s === b.level;
        }
        const ship = g.getObjectByName('airship');
        if (ship) {
          for (const id of COMPONENT_IDS) ship.getObjectByName(id)!.visible = w.airship.built.includes(id);
          if (w.won && !launchedAt) launchedAt = time;
          // The airship climbs away after launch.
          ship.position.y = 3.3 + (launchedAt ? (time - launchedAt) ** 2 * 0.6 : 0);
        }
        const max = BUILDINGS[b.type].hp;
        if (b.hp < max) barList.push({ x: b.x + (b.w - 1) / 2 - width / 2, z: b.y + (b.h - 1) / 2 - height / 2, y: 2, fraction: b.hp / max, enemy: false });
      }
      for (const e of w.house.edges) {
        const max = EDGES[e.kind].levels[e.level - 1].hp;
        if (e.construct <= 0 && e.hp < max) barList.push({ x: (e.side === 'w' ? e.x - 0.5 : e.x) - width / 2, z: (e.side === 'n' ? e.y - 0.5 : e.y) - height / 2, y: 1.5, fraction: e.hp / max, enemy: false });
      }
      if (w.hearth.hp < hearthStage(w).hp) barList.push({ x: 0, z: 0, y: 3.5, fraction: w.hearth.hp / hearthStage(w).hp, enemy: false });
      // Monsters under fog of war stay unseen.
      const seen = w.enemies.filter((e) => w.revealed[Math.round(e.y) * width + Math.round(e.x)] === 1);
      for (const e of seen) {
        const max = ENEMIES[e.type].hp;
        if (e.hp < max) barList.push({ x: e.px + (e.x - e.px) * alpha - width / 2, z: e.py + (e.y - e.py) * alpha - height / 2, y: e.type === 'brute' ? 1.8 : 1.2, fraction: e.hp / max, enemy: true });
      }
      enemies.update(seen, alpha, width / 2, height / 2, time);
      camera.getWorldDirection(viewDir);
      bars.update(barList, Math.atan2(-viewDir.x, -viewDir.z));

      colonists.update(colonistFigures(w, alpha, colonistHeading), time, 9);

      snow.update(time, pixelsPerUnit, camera.getWorldDirection(viewDir));
    },
  };
}
