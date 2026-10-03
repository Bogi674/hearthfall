import * as THREE from 'three';
import type { BuildingType } from '../../data/buildings';
import { mixPalette, PALETTE } from '../materials';
import { at, barrel, crate, GEO, house, logPile, MAT, part } from './kit';

// Buildings in the stylized low poly look (section 12.4). Each type has its own builder.
// Walls take a neighbor mask so they join into a palisade or a stone curtain (section 8.1).

/** Neighbor bits for walls: east, west, south, north. */
export const WALL_EAST = 1;
export const WALL_WEST = 2;
export const WALL_SOUTH = 4;
export const WALL_NORTH = 8;
export const WALL_TYPES: BuildingType[] = ['woodenBarricade', 'reinforcedWall', 'gate'];

/** Additive light pool on the ground that fakes a light source (section 12.4). */
function lightPool(radius: number): THREE.Mesh {
  const mat = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: PALETTE.lantern } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform vec3 uColor; varying vec2 vUv; void main() { float r = length(vUv - 0.5) * 2.0; gl_FragColor = vec4(uColor * pow(max(0.0, 1.0 - r), 2.0) * 0.35, 1.0); }',
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2, radius * 2).rotateX(-Math.PI / 2), mat);
  m.position.y = 0.03;
  m.name = 'light';
  return m;
}

const spike = new THREE.ConeGeometry(0.05, 0.28, 5).translate(0, 0.14, 0);

/** Wall pieces from the center toward each neighbor, so a line of walls reads as one wall. */
function wallRun(mask: number, piece: (len: number, along: 'x' | 'z', offset: number) => void): void {
  const dirs: [number, 'x' | 'z', number][] = [[WALL_EAST, 'x', 1], [WALL_WEST, 'x', -1], [WALL_SOUTH, 'z', 1], [WALL_NORTH, 'z', -1]];
  let any = false;
  for (const [bit, along, sign] of dirs) {
    if (!(mask & bit)) continue;
    piece(0.5, along, sign * 0.25);
    any = true;
  }
  if (!any) piece(0.7, 'x', 0);
}

const BUILD: Record<BuildingType, (g: THREE.Group, w: number, d: number, mask: number) => void> = {
  tent: (g, w, d) => {
    const slope = 0.85;
    for (const side of [-1, 1]) g.add(part(GEO.centered, MAT.canvas, [0, 0.42, (side * d) / 5.5], [w - 0.3, 0.05, d * 0.55], [side * slope, 0, 0]));
    g.add(part(GEO.log, MAT.darkWood, [0, 0.82, 0], [w - 0.15, 0.06, 0.06]));
    g.add(part(GEO.block, MAT.glow, [w / 2 - 0.16, 0, 0], [0.03, 0.4, 0.3]));
    for (const x of [-1, 1]) g.add(part(GEO.block, MAT.darkWood, [(x * (w - 0.2)) / 2, 0, 0], [0.06, 0.85, 0.06]));
    g.add(at(crate(0.22), -w / 2 + 0.2, 0, d / 2 - 0.1));
  },
  bunkhouse: (g, w, d) => {
    g.add(house(w - 0.25, d - 0.5, { wall: 0.9, roof: MAT.roofRed, chimney: true, windows: 1 }));
    g.add(at(barrel(), w / 2 - 0.2, 0, d / 2 - 0.15));
  },
  storageShed: (g, w, d) => {
    g.add(house(w - 0.35, d - 0.6, { wall: 0.75, roof: MAT.roofSlate, walls: MAT.wood, windows: 0 }));
    g.add(at(crate(0.28), w / 2 - 0.25, 0, d / 2 - 0.2));
    g.add(at(crate(0.2), w / 2 - 0.25, 0.28, d / 2 - 0.2, 0.4));
    g.add(at(barrel(), -w / 2 + 0.2, 0, d / 2 - 0.15));
  },
  woodcutterCamp: (g, w, d) => {
    // An open shed on posts over a log pile, with a chopping stump.
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.add(part(GEO.block, MAT.darkWood, [(x * (w - 0.5)) / 2, 0, (z * (d - 0.8)) / 2], [0.09, 0.85, 0.09]));
    g.add(part(GEO.centered, MAT.roofSlate, [0, 0.95, 0], [w - 0.25, 0.08, d - 0.5], [0.25, 0, 0]));
    g.add(at(logPile(4), 0, 0, -0.1));
    g.add(part(GEO.cylinder, MAT.wood, [w / 2 - 0.25, 0, d / 2 - 0.25], [0.3, 0.25, 0.3]));
    g.add(part(GEO.block, MAT.iron, [w / 2 - 0.25, 0.25, d / 2 - 0.25], [0.04, 0.22, 0.16], [0, 0, 0.3]));
  },
  salvageYard: (g, w, d) => {
    g.add(house(0.9, 0.8, { wall: 0.6, roof: MAT.roofSlate, walls: MAT.wood, windows: 0 }).translateX(-w / 4).translateZ(-d / 5));
    for (let i = 0; i < 5; i++) g.add(part(GEO.centered, i % 2 ? MAT.iron : MAT.darkStone, [0.2 + (i % 3) * 0.2, 0.12, 0.25 - (i % 2) * 0.3], [0.3, 0.2, 0.25], [0.3 * i, i, 0.2]));
    for (const x of [-1, 1]) g.add(part(GEO.block, MAT.darkWood, [(x * (w - 0.2)) / 2, 0, d / 2 - 0.1], [0.07, 0.5, 0.07]));
    g.add(part(GEO.block, MAT.darkWood, [0, 0.3, d / 2 - 0.1], [w - 0.2, 0.05, 0.04]));
  },
  quarry: (g, w, d) => {
    g.add(house(0.8, 0.7, { wall: 0.55, roof: MAT.thatch, walls: MAT.stone, windows: 0 }).translateX(-w / 4).translateZ(-d / 5));
    for (let i = 0; i < 4; i++) g.add(part(GEO.block, MAT.stone, [0.15 + (i % 2) * 0.3, (i > 1 ? 1 : 0) * 0.22, 0.25], [0.28, 0.22, 0.28]));
    g.add(part(GEO.block, MAT.iron, [-0.4, 0, 0.45], [0.05, 0.4, 0.05], [0, 0, 0.4]));
  },
  foragerHut: (g, w, d) => {
    g.add(house(w - 0.6, d - 0.7, { wall: 0.65, roof: MAT.thatch, windows: 1, pitch: 1 }));
    for (const x of [-0.25, 0.1]) g.add(part(GEO.cylinder, MAT.thatch, [x, 0, d / 2 - 0.1], [0.22, 0.16, 0.22]));
  },
  kitchen: (g, w, d) => {
    g.add(house(w - 0.4, d - 0.6, { wall: 0.75, roof: MAT.roofRed, chimney: true, windows: 1 }));
    g.add(at(barrel(), w / 2 - 0.15, 0, d / 2 - 0.15));
  },
  sawmill: (g, w, d) => {
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.add(part(GEO.block, MAT.darkWood, [(x * (w - 0.5)) / 2, 0, (z * (d - 0.6)) / 2], [0.1, 0.95, 0.1]));
    g.add(part(GEO.centered, MAT.roofRed, [0, 1.05, -0.1], [w - 0.2, 0.08, d - 0.3], [0.3, 0, 0]));
    g.add(part(GEO.block, MAT.wood, [0, 0, 0], [w * 0.5, 0.38, 0.4]));
    g.add(part(GEO.cylinder, MAT.iron, [0.1, 0.42, 0], [0.32, 0.03, 0.32], [Math.PI / 2, 0, 0]));
    g.add(part(GEO.log, MAT.wood, [-0.3, 0.48, 0], [0.9, 0.16, 0.16]));
    g.add(at(logPile(3), -w / 2 + 0.5, 0, d / 2 - 0.25));
  },
  charcoalKiln: (g) => {
    g.add(part(GEO.dome, MAT.stone, [0, 0, 0], [1.3, 1.3, 1.3]));
    g.add(part(GEO.block, MAT.ember, [0, 0.05, 0.6], [0.3, 0.25, 0.05]));
    g.add(part(GEO.block, MAT.stone, [0.25, 0.5, -0.1], [0.2, 0.5, 0.2]));
    g.add(at(logPile(3), -0.4, 0, 0.55));
  },
  smelter: (g, w, d) => {
    g.add(part(GEO.block, MAT.darkStone, [0, 0, 0], [w * 0.55, 0.9, d * 0.5]));
    g.add(part(GEO.block, MAT.stone, [0.15, 0.9, -0.1], [0.32, 0.8, 0.32]));
    g.add(part(GEO.block, MAT.ember, [0, 0.15, d * 0.25 + 0.01], [0.35, 0.3, 0.03]));
    g.add(part(GEO.block, MAT.ember, [0.15, 1.7, -0.1], [0.22, 0.03, 0.22]));
    g.add(part(GEO.block, MAT.iron, [-0.55, 0, 0.4], [0.3, 0.25, 0.3]));
  },
  workshop: (g, w, d) => {
    g.add(house(w - 0.3, d - 0.6, { wall: 0.85, roof: MAT.roofSlate, chimney: true, windows: 1 }));
    g.add(part(GEO.block, MAT.iron, [w / 2 - 0.25, 0, d / 2 - 0.1], [0.28, 0.25, 0.14]));
    g.add(part(GEO.block, MAT.iron, [w / 2 - 0.25, 0.25, d / 2 - 0.1], [0.36, 0.06, 0.16]));
  },
  heater: (g) => {
    g.add(part(GEO.cylinder, MAT.iron, [0, 0, 0], [0.5, 0.55, 0.5]));
    g.add(part(GEO.block, MAT.ember, [0, 0.12, 0.25], [0.24, 0.2, 0.03]));
    g.add(part(GEO.cylinder, MAT.iron, [0, 0.55, 0], [0.14, 0.6, 0.14]));
    g.add(lightPool(4));
  },
  airshipDock: (g) => {
    g.add(part(GEO.block, MAT.wood, [0, 0, 0], [3.8, 0.22, 3.8]));
    for (const [x, z] of [[-1.7, -1.7], [1.7, -1.7], [-1.7, 1.7], [1.7, 1.7]]) {
      g.add(part(GEO.block, MAT.darkWood, [x, 0.2, z], [0.16, 3.1, 0.16]));
      g.add(part(GEO.block, MAT.darkWood, [x, 1.5, z * 0.5], [0.08, 0.08, Math.abs(z)], [0.6 * Math.sign(z), 0, 0]));
    }
    g.add(part(GEO.block, MAT.darkWood, [0, 3.2, 1.7], [3.5, 0.1, 0.1]));
    g.add(part(GEO.block, MAT.darkWood, [0, 3.2, -1.7], [3.5, 0.1, 0.1]));
    g.add(createAirship());
  },
  woodenBarricade: (g, _w, _d, mask) => {
    // A palisade of sharpened stakes.
    wallRun(mask, (len, along, offset) => {
      for (let i = 0; i < 3; i++) {
        const t = (i - 1) * (len / 3) + offset;
        const [x, z] = along === 'x' ? [t, 0] : [0, t];
        const h = 0.8 + ((i * 7 + Math.abs(offset * 10)) % 3) * 0.08;
        g.add(part(GEO.cylinder, MAT.wood, [x, 0, z], [0.17, h, 0.17]));
        g.add(part(GEO.cone, MAT.wood, [x, h, z], [0.17, 0.2, 0.17]));
      }
      const [sx, sz] = along === 'x' ? [len, 0.06] : [0.06, len];
      g.add(part(GEO.block, MAT.darkWood, along === 'x' ? [offset, 0.45, 0.1] : [0.1, 0.45, offset], [sx, 0.07, sz]));
    });
  },
  reinforcedWall: (g, _w, _d, mask) => {
    g.add(part(GEO.block, MAT.darkStone, [0, 0, 0], [0.42, 1.25, 0.42]));
    wallRun(mask, (len, along, offset) => {
      const [sx, sz, x, z] = along === 'x' ? [len, 0.34, offset, 0] : [0.34, len, 0, offset];
      g.add(part(GEO.block, MAT.stone, [x, 0, z], [sx, 1, sz]));
      // Merlons along the top.
      g.add(part(GEO.block, MAT.stone, along === 'x' ? [x + 0.12, 1, 0] : [0, 1, z + 0.12], [0.22, 0.16, 0.22]));
    });
    g.add(part(GEO.block, MAT.snow, [0, 1.25, 0], [0.44, 0.04, 0.44]));
  },
  gate: (g, _w, _d, mask) => {
    const alongZ = (mask & (WALL_NORTH | WALL_SOUTH)) !== 0 && (mask & (WALL_EAST | WALL_WEST)) === 0;
    const r = alongZ ? Math.PI / 2 : 0;
    const inner = new THREE.Group();
    for (const x of [-0.42, 0.42]) inner.add(part(GEO.block, MAT.stone, [x, 0, 0], [0.22, 1.35, 0.32]));
    inner.add(part(GEO.block, MAT.darkWood, [0, 1.15, 0], [1.05, 0.14, 0.24]));
    for (const x of [-0.17, 0.17]) inner.add(part(GEO.block, MAT.wood, [x, 0, 0], [0.32, 1.05, 0.08]));
    inner.add(part(GEO.block, MAT.iron, [0, 0.5, 0.05], [0.64, 0.05, 0.02]));
    inner.rotation.y = r;
    g.add(inner);
  },
  lanternPost: (g) => {
    g.add(part(GEO.block, MAT.darkWood, [0, 0, 0], [0.1, 1.5, 0.1]));
    g.add(part(GEO.block, MAT.darkWood, [0.12, 1.42, 0], [0.3, 0.06, 0.06]));
    g.add(part(GEO.block, MAT.iron, [0.24, 1.08, 0], [0.18, 0.04, 0.18]));
    g.add(part(GEO.block, MAT.glow, [0.24, 1.12, 0], [0.13, 0.2, 0.13]));
    g.add(part(GEO.cone, MAT.iron, [0.24, 1.32, 0], [0.2, 0.1, 0.2]));
    g.add(lightPool(4));
  },
  spikeTrap: (g) => {
    g.add(part(GEO.block, MAT.darkWood, [0, 0, 0], [0.85, 0.05, 0.85]));
    for (let i = 0; i < 9; i++) g.add(part(spike, MAT.iron, [((i % 3) - 1) * 0.26, 0.05, (Math.floor(i / 3) - 1) * 0.26], [1, 1, 1], [0.15 * ((i % 2) * 2 - 1), 0, 0.1]));
  },
  watchtower: (g) => {
    g.add(part(GEO.block, MAT.stone, [0, 0, 0], [0.85, 0.7, 0.85]));
    for (const [x, z] of [[-0.32, -0.32], [0.32, -0.32], [-0.32, 0.32], [0.32, 0.32]]) g.add(part(GEO.block, MAT.darkWood, [x, 0.7, z], [0.1, 1.5, 0.1]));
    g.add(part(GEO.block, MAT.wood, [0, 2.1, 0], [1.05, 0.12, 1.05]));
    for (const [x, z, sx, sz] of [[0, 0.5, 1, 0.06], [0, -0.5, 1, 0.06], [0.5, 0, 0.06, 1], [-0.5, 0, 0.06, 1]]) g.add(part(GEO.block, MAT.wood, [x, 2.2, z], [sx, 0.3, sz]));
    g.add(part(GEO.cone, MAT.roofRed, [0, 2.75, 0], [1.4, 0.75, 1.4], [0, Math.PI / 4, 0]));
    g.add(part(GEO.block, MAT.glow, [0, 2.3, 0], [0.16, 0.16, 0.16]));
  },
  lookoutPost: (g) => {
    // Each stage adds a section, so the post grows taller as it sees further.
    for (let stage = 1; stage <= 3; stage++) {
      const s = new THREE.Group();
      s.name = `stage${stage}`;
      const h = 1.3 * stage;
      for (const [x, z] of [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]]) s.add(part(GEO.block, MAT.darkWood, [x, 0, z], [0.09, h, 0.09]));
      for (let k = 1; k < stage * 2; k++) s.add(part(GEO.block, MAT.wood, [0, k * 0.65, 0.3], [0.62, 0.05, 0.05], [0, 0, k % 2 ? 0.5 : -0.5]));
      s.add(part(GEO.block, MAT.wood, [0, h, 0], [0.9, 0.1, 0.9]));
      s.add(part(GEO.cone, MAT.thatch, [0, h + 0.45, 0], [1.2, 0.55, 1.2], [0, Math.PI / 4, 0]));
      s.add(part(GEO.block, MAT.glow, [0, h + 0.15, 0], [0.14, 0.14, 0.14]));
      if (stage === 3) {
        s.add(part(GEO.block, MAT.darkWood, [0, h + 0.9, 0], [0.04, 0.6, 0.04]));
        s.add(part(GEO.block, MAT.roofRed, [0.16, h + 1.3, 0], [0.3, 0.18, 0.02]));
      }
      g.add(s);
    }
  },
};

export function createBuildingMesh(type: BuildingType, w: number, h: number, mask = 0): THREE.Group {
  const g = new THREE.Group();
  BUILD[type](g, w, h, mask);
  return g;
}

/** The airship above the dock. Each component is a named part the renderer shows once it is built. */
function createAirship(): THREE.Group {
  const ship = new THREE.Group();
  ship.name = 'airship';
  ship.position.y = 3.3;
  const named = (name: string, ...parts: THREE.Object3D[]) => {
    const g = new THREE.Group();
    g.name = name;
    g.add(...parts);
    ship.add(g);
  };
  named(
    'frame',
    part(GEO.centered, MAT.wood, [0, -0.15, 0], [2.4, 0.35, 0.8]),
    part(GEO.centered, MAT.darkWood, [0, 0.05, 0], [2.5, 0.06, 0.85]),
    ...[-0.8, 0, 0.8].map((x) => part(GEO.centered, MAT.darkWood, [x, 0.55, 0], [0.06, 1, 0.06])),
  );
  // Thin rings around the envelope, like the ribs of a balloon.
  const bands = [-0.9, -0.3, 0.3, 0.9].map((x) => part(GEO.cylinder, MAT.darkWood, [x, 1.05, 0], [1.25, 0.04, 1.25], [0, 0, Math.PI / 2]));
  named('envelope', part(GEO.sphere, MAT.canvas, [0, 1.65, 0], [3.1, 1.2, 1.2]), ...bands);
  named('engine', part(GEO.centered, MAT.iron, [-1.45, -0.1, 0], [0.4, 0.35, 0.35]), part(GEO.centered, MAT.wood, [-1.72, -0.1, 0], [0.04, 0.8, 0.12]), part(GEO.block, MAT.ember, [-1.66, -0.2, 0], [0.02, 0.2, 0.2]));
  named('fuelTank', part(GEO.log, MAT.iron, [0.3, -0.45, 0], [1, 0.3, 0.3]));
  named('navigation', part(GEO.block, MAT.glow, [1.2, 0.05, 0], [0.16, 0.16, 0.16]), part(GEO.cone, MAT.iron, [1.2, 0.2, 0], [0.12, 0.18, 0.12]));
  return ship;
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
