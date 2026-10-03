import * as THREE from 'three';
import type { BuildingType } from '../../data/buildings';
import { mixPalette, PALETTE } from '../materials';

// Procedural buildings: a wooden body, a hip roof, and a glowing window. Tents are a single ridge.

const body = new THREE.MeshStandardMaterial({ color: PALETTE.oldWood, roughness: 0.9 });
const roof = new THREE.MeshStandardMaterial({ color: PALETTE.warmShadow, roughness: 1 });
const canvas = new THREE.MeshStandardMaterial({ color: mixPalette(PALETTE.oldWood, PALETTE.lantern, 0.35), roughness: 1 });
const stone = new THREE.MeshStandardMaterial({ color: mixPalette(PALETTE.nightBlue, PALETTE.frost, 0.45), roughness: 1 });
const glow = new THREE.MeshBasicMaterial({ color: PALETTE.lantern.clone().multiplyScalar(1.6) });
const ember = new THREE.MeshBasicMaterial({ color: PALETTE.ember.clone().multiplyScalar(2) });
const box = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
const pyramid = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4).rotateY(Math.PI / 4).translate(0, 0.5, 0);
// Triangular prism along x, one unit wide and long, apex up, base on the ground.
const R = 1 / Math.sqrt(3);
const ridge = new THREE.CylinderGeometry(R, R, 1, 3).rotateZ(Math.PI / 2).rotateX(-Math.PI / 2).translate(0, R / 2, 0);

/** Body height and whether the building has a smoking chimney. Defenses have their own builders below. */
const LOOK: Partial<Record<BuildingType, { height: number; chimney?: boolean; stoneBody?: boolean }>> = {
  tent: { height: 0 },
  bunkhouse: { height: 1.3 },
  storageShed: { height: 1.1 },
  woodcutterCamp: { height: 0.8 },
  salvageYard: { height: 0.7 },
  quarry: { height: 0.6, stoneBody: true },
  foragerHut: { height: 0.8 },
  kitchen: { height: 1, chimney: true },
  sawmill: { height: 1 },
  charcoalKiln: { height: 0.9, chimney: true, stoneBody: true },
  smelter: { height: 1.1, chimney: true, stoneBody: true },
  workshop: { height: 1.2 },
};

function part(geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, sx: number, sy: number, sz: number, ry = 0, rz = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  m.rotation.set(0, ry, rz);
  return m;
}

const spike = new THREE.ConeGeometry(0.06, 0.3, 4).translate(0, 0.15, 0);

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

/** Builders for the one tile defenses from section 9.1. */
const DEFENSE: Partial<Record<BuildingType, (g: THREE.Group) => void>> = {
  woodenBarricade: (g) => {
    g.add(part(box, body, 0, 0.15, 0, 1, 0.16, 0.16, 0, 0.5));
    g.add(part(box, body, 0, 0.15, 0, 1, 0.16, 0.16, 0, -0.5));
    g.add(part(box, body, 0, 0.45, 0, 1, 0.14, 0.14));
  },
  gate: (g) => {
    g.add(part(box, stone, -0.42, 0, 0, 0.16, 1.4, 0.3));
    g.add(part(box, stone, 0.42, 0, 0, 0.16, 1.4, 0.3));
    g.add(part(box, body, 0, 0, 0, 0.68, 1.1, 0.12));
  },
  lanternPost: (g) => {
    g.add(part(box, body, 0, 0, 0, 0.1, 1.5, 0.1));
    g.add(part(box, glow, 0, 1.4, 0, 0.24, 0.26, 0.24));
    g.add(lightPool(4));
  },
  spikeTrap: (g) => {
    g.add(part(box, body, 0, 0, 0, 0.9, 0.05, 0.9));
    for (const [x, z] of [[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25], [0, 0]]) g.add(part(spike, stone, x, 0.05, z, 1, 1, 1));
  },
  heater: (g) => {
    g.add(part(box, stone, 0, 0, 0, 0.6, 0.7, 0.6));
    g.add(part(box, ember, 0, 0.25, 0.31, 0.3, 0.25, 0.02));
    g.add(part(box, stone, 0, 0.7, 0, 0.18, 0.6, 0.18));
    g.add(lightPool(4));
  },
  airshipDock: (g) => {
    g.add(part(box, stone, 0, 0, 0, 3.8, 0.3, 3.8));
    for (const [x, z] of [[-1.7, -1.7], [1.7, -1.7], [-1.7, 1.7], [1.7, 1.7]]) g.add(part(box, body, x, 0.3, z, 0.18, 3.2, 0.18));
    g.add(createAirship());
  },
  watchtower: (g) => {
    for (const [x, z] of [[-0.35, -0.35], [0.35, -0.35], [-0.35, 0.35], [0.35, 0.35]]) g.add(part(box, body, x, 0, z, 0.1, 2.2, 0.1));
    g.add(part(box, body, 0, 2.2, 0, 1, 0.15, 1));
    g.add(part(pyramid, roof, 0, 2.75, 0, 1.1, 0.6, 1.1));
    g.add(part(box, glow, 0, 2.4, 0, 0.2, 0.2, 0.2));
  },
};

export function createBuildingMesh(type: BuildingType, w: number, h: number): THREE.Group {
  const g = new THREE.Group();
  const defense = DEFENSE[type];
  if (defense) {
    defense(g);
    return g;
  }
  const look = LOOK[type]!;
  const bw = w - 0.3;
  const bd = h - 0.3;
  if (type === 'tent') {
    g.add(part(ridge, canvas, 0, 0, 0, bw, 1.1, bd));
    g.add(part(box, glow, bw / 2 + 0.01, 0, 0, 0.02, 0.4, 0.3));
    return g;
  }
  g.add(part(box, look.stoneBody ? stone : body, 0, 0, 0, bw, look.height, bd));
  g.add(part(pyramid, roof, 0, look.height, 0, bw + 0.2, 0.7, bd + 0.2));
  g.add(part(box, glow, 0, look.height * 0.3, bd / 2 + 0.01, 0.35, 0.3, 0.02));
  if (look.chimney) {
    g.add(part(box, stone, bw / 3, look.height, -bd / 4, 0.3, 0.9, 0.3));
    g.add(part(box, ember, bw / 3, look.height + 0.9, -bd / 4, 0.22, 0.05, 0.22));
  }
  return g;
}

export const GHOST_OK = PALETTE.lantern;
export const GHOST_BAD = mixPalette(PALETTE.ember, PALETTE.warmShadow, 0.4);

export function createGhost(): THREE.Mesh<THREE.BoxGeometry, THREE.MeshBasicMaterial> {
  const ghost = new THREE.Mesh(box, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.45, depthWrite: false }));
  ghost.visible = false;
  return ghost;
}

/** A POI landmark: a broken stone footing with a cold beacon that shows through fog. */
export function createLandmark(): THREE.Group {
  const g = new THREE.Group();
  g.add(part(box, stone, 0, 0, 0, 1.8, 0.4, 1.8));
  g.add(part(box, body, 0.5, 0.4, 0.5, 0.12, 2.2, 0.12));
  g.add(part(box, new THREE.MeshBasicMaterial({ color: PALETTE.frost.clone().multiplyScalar(1.8), fog: false }), 0.5, 2.6, 0.5, 0.3, 0.3, 0.3));
  return g;
}

/** The airship above the dock. Each component is a named part the renderer shows once it is built. */
function createAirship(): THREE.Group {
  const ship = new THREE.Group();
  ship.name = 'airship';
  ship.position.y = 3.6;
  const named = (name: string, ...parts: THREE.Object3D[]) => {
    const g = new THREE.Group();
    g.name = name;
    g.add(...parts);
    ship.add(g);
  };
  const ribs = [-1.2, -0.4, 0.4, 1.2].map((x) => part(box, body, x, -0.1, 0, 0.1, 0.5, 1));
  named('frame', part(box, body, 0, 0, 0, 3.2, 0.15, 0.15), ...ribs);
  const sphere = new THREE.SphereGeometry(1, 16, 12);
  named('envelope', part(sphere, canvas, 0, 1.2, 0, 2, 0.9, 0.9));
  named('engine', part(box, stone, -1.8, 0, 0, 0.5, 0.45, 0.45), part(box, ember, -2.06, 0, 0, 0.02, 0.3, 0.3));
  named('fuelTank', part(new THREE.CylinderGeometry(0.22, 0.22, 1.4, 10).rotateZ(Math.PI / 2), stone, 0.2, -0.45, 0, 1, 1, 1));
  named('navigation', part(box, glow, 1.75, 0.15, 0, 0.2, 0.2, 0.2));
  return ship;
}
