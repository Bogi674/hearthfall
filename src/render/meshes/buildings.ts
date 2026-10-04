import * as THREE from 'three';
import type { BuildingType } from '../../data/buildings';
import { mixPalette, PALETTE } from '../materials';
import { CAMPS } from './buildings/camps';
import { DEFENSE } from './buildings/defense';
import { ESCAPE } from './buildings/escape';
import type { Builder } from './buildings/parts';
import { ROOMS } from './buildings/rooms';
import { SHELTER } from './buildings/shelter';
import { WORKS } from './buildings/works';
import { GEO, MAT, part } from './kit';

// Buildings in a chunky low poly look, patched together from scavenged junk after the collapse.
// Each type has its own builder in src/render/meshes/buildings, grouped by category.

export { WALL_EAST, WALL_NORTH, WALL_SOUTH, WALL_TYPES, WALL_WEST } from './buildings/defense';
export { createConstructionSite } from './buildings/site';

const BUILD: Record<BuildingType, Builder> = { ...SHELTER, ...ROOMS, ...CAMPS, ...WORKS, ...DEFENSE, ...ESCAPE };

export function createBuildingMesh(type: BuildingType, w: number, h: number, mask = 0): THREE.Group {
  const g = new THREE.Group();
  BUILD[type](g, w, h, mask);
  return g;
}

export const GHOST_OK = PALETTE.lantern;
export const GHOST_BAD = mixPalette(PALETTE.ember, PALETTE.warmShadow, 0.4);

export function createGhost(): THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial> {
  const ghost = new THREE.Mesh(GEO.block, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.45, depthWrite: false }));
  ghost.visible = false;
  return ghost;
}

/** A POI landmark: a ruined signpost with a cold beacon that shows through fog. Rumors show only the beacon. */
export function createLandmark(): THREE.Group {
  const g = new THREE.Group();
  const beacon = new THREE.MeshBasicMaterial({ color: PALETTE.frost.clone().multiplyScalar(1.8), fog: false });
  const site = new THREE.Group();
  site.name = 'site';
  site.add(part(GEO.block, MAT.stone, [0, 0, 0], [1.8, 0.3, 1.8]));
  site.add(part(GEO.block, MAT.stone, [-0.6, 0.3, -0.5], [0.3, 0.9, 0.3]));
  site.add(part(GEO.block, MAT.stone, [0.6, 0.3, -0.5], [0.3, 0.55, 0.3]));
  site.add(part(GEO.block, MAT.darkWood, [0.5, 0.3, 0.5], [0.1, 2, 0.1]));
  site.add(part(GEO.block, MAT.wood, [0.25, 1.9, 0.5], [0.5, 0.2, 0.05]));
  g.add(site);
  g.add(part(GEO.block, beacon, [0.5, 2.35, 0.5], [0.28, 0.28, 0.28]));
  return g;
}
