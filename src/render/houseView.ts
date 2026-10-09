import * as THREE from 'three';
import { BUILDINGS } from '../data/buildings';
import { EDGES, FLOORS } from '../data/house';
import { floorAt, houseRooms, isHearthTile } from '../sim/house';
import type { World } from '../sim/world';
import { mixPalette, PALETTE } from './materials';

// Floors, walls, doors, windows, gun ports, and roofs of the house layer (M10.1). Reads the world and never writes to it.
// Pieces rise out of the ground as builders work on them. Roofs cover closed rooms and fade away for the cutaway view.
// Rebuilt every frame since the counts are small.

const CAPACITY = 900;
const WALL_HEIGHT = 1.15;
const THICK = 0.14;
const ROOF_THICK = 0.1;
/** How near a person must be for a door to swing open, in tiles. */
const DOOR_REACH = 1.15;

const FLOOR_COLOR = { boards: mixPalette(PALETTE.oldWood, PALETTE.lantern, 0.3), stone: mixPalette(PALETTE.nightBlue, PALETTE.frost, 0.45) };
const WALL_COLOR = [
  mixPalette(PALETTE.oldWood, PALETTE.lantern, 0.12),
  mixPalette(mixPalette(PALETTE.ember, PALETTE.oldWood, 0.6), PALETTE.warmShadow, 0.35),
  mixPalette(PALETTE.nightBlue, PALETTE.frost, 0.5),
  mixPalette(PALETTE.deepCold, PALETTE.frost, 0.4),
];
const DOOR_COLOR = mixPalette(PALETTE.oldWood, PALETTE.warmShadow, 0.45);
const WINDOW_COLOR = PALETTE.lantern.clone().multiplyScalar(1.4);
const SLIT_COLOR = PALETTE.warmShadow;
const ROOF_COLOR = mixPalette(PALETTE.frost, PALETTE.nightBlue, 0.35);
const DAMAGE_COLOR = mixPalette(PALETTE.ember, PALETTE.warmShadow, 0.5);

function instanced(geometry: THREE.BufferGeometry, material: THREE.Material, shadow: boolean): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(geometry, material, CAPACITY);
  mesh.count = 0;
  mesh.castShadow = shadow;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  return mesh;
}

export interface HouseView {
  /** Draws the house. With cutaway the roofs fade so the people inside can be seen. */
  update(world: World, time: number, cutaway: boolean): void;
}

export function createHouseView(scene: THREE.Scene): HouseView {
  const block = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
  const solid = new THREE.MeshStandardMaterial({ roughness: 0.9 });
  const glass = new THREE.MeshBasicMaterial();
  const roofMat = new THREE.MeshStandardMaterial({ roughness: 0.95, transparent: true });
  const floors = instanced(block, solid, false);
  const walls = instanced(block, solid, true);
  const doors = instanced(block, solid, true);
  const windows = instanced(block, glass, false);
  const roofs = instanced(block, roofMat, true);
  scene.add(floors, walls, doors, windows, roofs);

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const p = new THREE.Vector3();
  const s = new THREE.Vector3();
  const tint = new THREE.Color();
  const open = new Map<number, number>();
  let roofOpacity = 1;
  let lastTime = 0;

  const put = (mesh: THREE.InstancedMesh, x: number, y: number, z: number, sx: number, sy: number, sz: number, color: THREE.Color) => {
    if (mesh.count >= CAPACITY) return;
    m.compose(p.set(x, y, z), q, s.set(sx, sy, sz));
    mesh.setMatrixAt(mesh.count, m);
    mesh.setColorAt(mesh.count, color);
    mesh.count++;
  };

  return {
    update(w, time, cutaway) {
      const dt = Math.min(0.1, Math.max(0, time - lastTime));
      lastTime = time;
      const ox = w.map.width / 2;
      const oy = w.map.height / 2;
      for (const mesh of [floors, walls, doors, windows, roofs]) mesh.count = 0;

      for (const f of w.house.floors) {
        const done = 1 - f.construct / FLOORS[f.kind].build;
        put(floors, f.x - ox, 0, f.y - oy, 1, 0.03 + 0.05 * done, 1, f.construct > 0 ? tint.copy(FLOOR_COLOR[f.kind]).multiplyScalar(0.6) : FLOOR_COLOR[f.kind]);
      }

      for (const e of w.house.edges) {
        const level = EDGES[e.kind].levels[e.level - 1];
        const rise = e.construct > 0 ? 0.08 + 0.92 * (1 - e.construct / level.build) : 1;
        const x = e.side === 'w' ? e.x - 0.5 - ox : e.x - ox;
        const z = e.side === 'n' ? e.y - 0.5 - oy : e.y - oy;
        const along = e.side === 'n' ? 'x' : 'z';
        const [sx, sz] = e.side === 'n' ? [1 + THICK, THICK] : [THICK, 1 + THICK];
        const color = tint.copy(e.kind === 'door' ? DOOR_COLOR : WALL_COLOR[e.kind === 'wall' ? e.level - 1 : e.level === 1 ? 0 : 1]);
        if (e.construct > 0) color.multiplyScalar(0.7);
        if (e.hp < level.hp) color.lerp(DAMAGE_COLOR, Math.min(0.7, (1 - e.hp / level.hp) * 0.9));
        if (e.kind === 'window') {
          put(windows, x, 0.25 * rise, z, sx * 0.96, 0.6 * rise, sz * 0.96, WINDOW_COLOR);
          // Sill and lintel around the glass.
          put(walls, x, 0, z, sx, 0.25 * rise, sz, color);
          put(walls, x, 0.85 * rise, z, sx, 0.3 * rise, sz, color);
        } else if (e.kind === 'gunPort') {
          // A wall with a dark slit and a short barrel poking out of it.
          put(walls, x, 0, z, sx, WALL_HEIGHT * rise, sz, color);
          put(windows, x, 0.55 * rise, z, e.side === 'n' ? 0.5 : THICK * 1.5, 0.16 * rise, e.side === 'n' ? THICK * 1.5 : 0.5, SLIT_COLOR);
          put(doors, x, 0.6 * rise, z, e.side === 'n' ? 0.1 : 0.55, 0.1 * rise, e.side === 'n' ? 0.55 : 0.1, WALL_COLOR[3]);
        } else if (e.kind === 'door') {
          // A door swings open when someone is close, shown by sliding it along the wall.
          const mx = e.side === 'n' ? e.x : e.x - 0.5;
          const my = e.side === 'n' ? e.y - 0.5 : e.y;
          const near = e.construct <= 0 && w.colonists.some((c) => Math.hypot(c.x - mx, c.y - my) < DOOR_REACH);
          const amount = open.get(e.id) ?? 0;
          const next = amount + ((near ? 1 : 0) - amount) * Math.min(1, dt * 9);
          open.set(e.id, next);
          const full = (e.side === 'n' ? sx : sz) * 0.7;
          const len = full * (1 - 0.8 * next);
          const slide = (full - len) / 2;
          const px = along === 'x' ? x + slide : x;
          const pz = along === 'z' ? z + slide : z;
          const [dx, dz] = e.side === 'n' ? [len, sz * 0.7] : [sx * 0.7, len];
          put(doors, px, 0, pz, dx, 0.95 * rise, dz, color);
        } else put(walls, x, 0, z, sx, WALL_HEIGHT * rise, sz, color);
      }

      // Roofs cover every closed room except the hearth hall, which has its own. A roof turret stands where the roof is open.
      const turrets = new Set(w.buildings.filter((b) => BUILDINGS[b.type].roofed).map((b) => b.y * w.map.width + b.x));
      for (const room of houseRooms(w)) {
        for (const t of room.tiles) {
          const tx = t % w.map.width;
          const ty = Math.floor(t / w.map.width);
          if (isHearthTile(w, tx, ty) || !floorAt(w, tx, ty) || floorAt(w, tx, ty)!.construct > 0 || turrets.has(t)) continue;
          put(roofs, tx - ox, WALL_HEIGHT, ty - oy, 1.08, ROOF_THICK, 1.08, ROOF_COLOR);
        }
      }
      roofOpacity += ((cutaway ? 0 : 1) - roofOpacity) * Math.min(1, dt * 8);
      roofMat.opacity = Math.max(0, Math.min(1, roofOpacity));
      roofMat.depthWrite = roofOpacity > 0.98;
      roofs.visible = roofOpacity > 0.02;

      for (const mesh of [floors, walls, doors, windows, roofs]) {
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      }
    },
  };
}
