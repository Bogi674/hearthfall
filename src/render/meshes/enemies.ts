import * as THREE from 'three';
import { ENEMY_TYPES, type EnemyType } from '../../data/enemies';
import type { Enemy } from '../../sim/world';
import { createFigureSet, ENEMY_RIGS, type Figure, type FigureSet } from './figures';

// Monsters as rigged figures with glowing Blight eyes and wounds (section 12.5).

const MAX = 300;
/** Walk cycle speed per type, in radians per second. */
const STRIDE: Record<EnemyType, number> = { shambler: 4, runner: 13, brute: 3, hordeMother: 2 };

export interface EnemyMeshes {
  group: THREE.Group;
  update(enemies: Enemy[], alpha: number, ox: number, oz: number, time: number): void;
}

export function createEnemyMeshes(): EnemyMeshes {
  const group = new THREE.Group();
  const sets = Object.fromEntries(ENEMY_TYPES.map((t) => [t, createFigureSet(ENEMY_RIGS[t], MAX, 0.95)])) as Record<EnemyType, FigureSet>;
  for (const set of Object.values(sets)) group.add(set.group);
  const heading = new Map<number, number>();

  return {
    group,
    update(enemies, alpha, ox, oz, time) {
      const byType = Object.fromEntries(ENEMY_TYPES.map((t) => [t, [] as Figure[]])) as Record<EnemyType, Figure[]>;
      for (const e of enemies) {
        const dx = e.x - e.px;
        const dy = e.y - e.py;
        if (dx || dy) heading.set(e.id, Math.atan2(dx, dy));
        byType[e.type].push({ id: e.id, x: e.px + dx * alpha - ox, z: e.py + dy * alpha - oz, yaw: heading.get(e.id) ?? 0, moving: dx !== 0 || dy !== 0 });
      }
      for (const t of ENEMY_TYPES) sets[t].update(byType[t], time, STRIDE[t]);
      if (heading.size > MAX * 2) heading.clear();
    },
  };
}
