import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Tile, type MapState } from '../../sim/grid';
import { FOG_PROP_TILES } from '../fogOfWar';
import { createPropMaterial, mixPalette, PALETTE } from '../materials';

// Instanced map props: trees, rubble, and ruin walls. One InstancedMesh per part.

export interface PropLayer {
  mesh: THREE.InstancedMesh;
  /** Tile index for each instance, used to color it by warmth. */
  tileOf: number[];
}

/** Stable per tile variation so props look the same on every load. */
function hash(n: number): number {
  const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return s - Math.floor(s);
}

function tilesOfType(map: MapState, type: Tile): number[] {
  const out: number[] = [];
  map.tiles.forEach((t, i) => t === type && out.push(i));
  return out;
}

function layer(geometry: THREE.BufferGeometry, material: THREE.Material, count: number): PropLayer {
  const mesh = new THREE.InstancedMesh(geometry, material, Math.max(1, count));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(Math.max(1, count) * 3), 3);
  return { mesh, tileOf: [] };
}

export function buildProps(map: MapState): PropLayer[] {
  const ox = map.width / 2;
  const oz = map.height / 2;
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const pos = new THREE.Vector3();
  const scale = new THREE.Vector3();
  const place = (l: PropLayer, tile: number, variation: number) => {
    const i = l.tileOf.length;
    m.compose(pos, q, scale);
    l.mesh.setMatrixAt(i, m);
    l.mesh.setColorAt(i, new THREE.Color(0, variation, 0));
    l.tileOf.push(tile);
  };

  // Trees: four tiers of drooping cones on a trunk, each tier turned a little so the outline is irregular.
  const trees = tilesOfType(map, Tile.Tree);
  const foliageGeo = mergeGeometries(
    [
      [0.82, 1.0, 0.95],
      [0.66, 0.9, 1.5],
      [0.5, 0.8, 2.0],
      [0.32, 0.7, 2.45],
    ].map(([r, h, y], i) => new THREE.ConeGeometry(r, h, 9, 1).rotateY(i * 0.6).translate(0, y, 0)),
  );
  const foliage = layer(
    foliageGeo,
    createPropMaterial(mixPalette(PALETTE.warmShadow, PALETTE.oldWood, 0.35), mixPalette(PALETTE.nightBlue, PALETTE.frost, 0.2), true),
    trees.length,
  );
  const trunks = layer(
    new THREE.CylinderGeometry(0.09, 0.15, 0.75, 8).translate(0, 0.37, 0),
    createPropMaterial(PALETTE.oldWood, mixPalette(PALETTE.oldWood, PALETTE.nightBlue, 0.6), false),
    trees.length,
  );
  for (const t of trees) {
    const x = t % map.width;
    const z = Math.floor(t / map.width);
    const s = 0.7 + hash(t) * 0.6;
    pos.set(x - ox + (hash(t + 1) - 0.5) * 0.4, 0, z - oz + (hash(t + 2) - 0.5) * 0.4);
    q.setFromAxisAngle(up, hash(t + 3) * Math.PI * 2);
    scale.set(s, s * (0.9 + hash(t + 4) * 0.3), s);
    const v = hash(t + 5);
    place(foliage, t, v);
    place(trunks, t, v);
  }

  // Rubble: three flattened stones per tile.
  const rubbleTiles = tilesOfType(map, Tile.Rubble);
  const rubble = layer(
    new THREE.IcosahedronGeometry(0.22, 1),
    createPropMaterial(mixPalette(PALETTE.warmShadow, PALETTE.oldWood, 0.5), mixPalette(PALETTE.nightBlue, PALETTE.frost, 0.3), true),
    rubbleTiles.length * 3,
  );
  for (const t of rubbleTiles) {
    const x = t % map.width;
    const z = Math.floor(t / map.width);
    for (let k = 0; k < 3; k++) {
      const h = t * 3 + k;
      const s = 0.6 + hash(h + 10) * 0.9;
      pos.set(x - ox + (hash(h + 11) - 0.5) * 0.7, 0.05, z - oz + (hash(h + 12) - 0.5) * 0.7);
      q.setFromAxisAngle(up, hash(h + 13) * Math.PI * 2);
      scale.set(s, s * 0.6, s);
      place(rubble, t, hash(h + 14));
    }
  }

  // Ruin walls: thin wall segments that join neighboring wall tiles, so houses read as broken shells.
  // A tile with walls on both axes gets both segments. A lone tile becomes a stub pillar.
  const wallTiles = tilesOfType(map, Tile.RuinWall);
  const isWall = (x: number, z: number) => x >= 0 && z >= 0 && x < map.width && z < map.height && map.tiles[z * map.width + x] === Tile.RuinWall;
  const walls = layer(
    new RoundedBoxGeometry(1, 1, 1, 2, 0.06).translate(0, 0.5, 0),
    createPropMaterial(mixPalette(PALETTE.oldWood, PALETTE.frost, 0.3), mixPalette(PALETTE.nightBlue, PALETTE.frost, 0.4), true),
    wallTiles.length * 2,
  );
  q.identity();
  for (const t of wallTiles) {
    const x = t % map.width;
    const z = Math.floor(t / map.width);
    const left = isWall(x - 1, z);
    const right = isWall(x + 1, z);
    const back = isWall(x, z - 1);
    const front = isWall(x, z + 1);
    const h = 0.7 + hash(t + 20) * 1.1;
    const v = hash(t + 21);
    // Each axis gets a full segment between two neighbors, or a half segment toward one neighbor.
    if (left || right) {
      const len = left && right ? 1.02 : 0.65;
      pos.set(x - ox + (left && right ? 0 : left ? -0.175 : 0.175), 0, z - oz);
      scale.set(len, h, 0.3);
      place(walls, t, v);
    }
    if (back || front) {
      const len = back && front ? 1.02 : 0.65;
      pos.set(x - ox, 0, z - oz + (back && front ? 0 : back ? -0.175 : 0.175));
      scale.set(0.3, h, len);
      place(walls, t, v);
    }
    if (!left && !right && !back && !front) {
      pos.set(x - ox, 0, z - oz);
      scale.set(0.4, h * 0.6, 0.4);
      place(walls, t, v);
    }
  }
  walls.mesh.count = walls.tileOf.length;

  // Abandoned cars along the roads, away from the town square, each turned to follow its road.
  const roadTiles = tilesOfType(map, Tile.Road);
  const isRoad = (x: number, z: number) => x >= 0 && z >= 0 && x < map.width && z < map.height && map.tiles[z * map.width + x] === Tile.Road;
  const carTiles = roadTiles.filter((t) => hash(t + 30) < 0.012 && Math.hypot((t % map.width) - map.width / 2, Math.floor(t / map.width) - map.height / 2) > 16);
  const carGeo = mergeGeometries([
    new THREE.BoxGeometry(0.95, 0.26, 0.5).translate(0, 0.2, 0),
    new THREE.BoxGeometry(0.5, 0.22, 0.44).translate(-0.05, 0.44, 0),
    new THREE.CylinderGeometry(0.15, 0.15, 0.56, 8).rotateX(Math.PI / 2).translate(0.3, 0.15, 0),
    new THREE.CylinderGeometry(0.15, 0.15, 0.56, 8).rotateX(Math.PI / 2).translate(-0.3, 0.15, 0),
  ]);
  const cars = layer(carGeo, createPropMaterial(mixPalette(PALETTE.ember, PALETTE.oldWood, 0.55), mixPalette(PALETTE.nightBlue, PALETTE.frost, 0.25), true), carTiles.length);
  for (const t of carTiles) {
    const x = t % map.width;
    const z = Math.floor(t / map.width);
    pos.set(x - ox + (hash(t + 31) - 0.5) * 0.3, 0, z - oz + (hash(t + 32) - 0.5) * 0.3);
    q.setFromAxisAngle(up, (isRoad(x - 1, z) || isRoad(x + 1, z) ? 0 : Math.PI / 2) + (hash(t + 33) - 0.5) * 0.5 + (hash(t + 34) < 0.5 ? 0 : Math.PI));
    scale.set(1.3, 1.3, 1.3);
    place(cars, t, hash(t + 35));
  }

  cars.mesh.count = cars.tileOf.length;

  // A few drums among the rubble.
  const drumTiles = rubbleTiles.filter((t) => hash(t + 40) < 0.07);
  const drums = layer(
    new THREE.CylinderGeometry(0.16, 0.16, 0.42, 9).translate(0, 0.21, 0),
    createPropMaterial(mixPalette(PALETTE.ember, PALETTE.warmShadow, 0.55), mixPalette(PALETTE.nightBlue, PALETTE.frost, 0.2), true),
    drumTiles.length,
  );
  for (const t of drumTiles) {
    pos.set((t % map.width) - ox + 0.3, 0, Math.floor(t / map.width) - oz + 0.25);
    q.setFromAxisAngle(up, hash(t + 41) * 3);
    scale.set(1, 1, 1);
    place(drums, t, hash(t + 42));
  }

  drums.mesh.count = drums.tileOf.length;

  return [foliage, trunks, rubble, walls, cars, drums];
}

/**
 * Colors each prop by the warmth of its tile. Blue holds fog of war visibility: 1 when revealed,
 * fading toward 0 deeper in the fog, where the prop is hidden. Call when warmth or fog changes.
 */
export function colorPropsByWarmth(layers: PropLayer[], warmth: number[], warmThreshold: number, fogDist: Float32Array): void {
  const c = new THREE.Color();
  for (const l of layers) {
    l.tileOf.forEach((tile, i) => {
      l.mesh.getColorAt(i, c);
      c.r = 1 - THREE.MathUtils.smoothstep(warmth[tile], warmThreshold - 20, warmThreshold + 8);
      c.b = fogDist[tile] === 0 ? 1 : Math.max(0, 1 - fogDist[tile] / FOG_PROP_TILES) * 0.9;
      l.mesh.setColorAt(i, c);
    });
    l.mesh.instanceColor!.needsUpdate = true;
  }
}
