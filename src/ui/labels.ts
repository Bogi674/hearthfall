// Floating labels: the reason over every blocked building, and the placement problem next to the cursor.
import * as THREE from 'three';
import type { Pointer } from '../input/pointer';
import type { World } from '../sim/world';
import { STATUS_TEXT } from './hud';

export function createLabels(root: HTMLElement): { update(world: World, camera: THREE.Camera, pointer: Pointer): void } {
  const layer = document.createElement('div');
  layer.id = 'labels';
  root.appendChild(layer);
  const pool: HTMLDivElement[] = [];
  const v = new THREE.Vector3();

  return {
    update(world, camera, pointer) {
      const items: { text: string; x: number; y: number; tip?: boolean }[] = [];
      for (const b of world.buildings) {
        const text = STATUS_TEXT[b.status];
        if (!text) continue;
        v.set(b.x + (b.w - 1) / 2 - world.map.width / 2, 2, b.y + (b.h - 1) / 2 - world.map.height / 2).project(camera);
        items.push({ text, x: ((v.x + 1) / 2) * innerWidth, y: ((1 - v.y) / 2) * innerHeight });
      }
      if (pointer.tip) items.push({ ...pointer.tip, tip: true });
      while (pool.length < items.length) pool.push(layer.appendChild(document.createElement('div')));
      pool.forEach((d, i) => {
        const it = items[i];
        d.style.display = it ? '' : 'none';
        if (!it) return;
        d.textContent = it.text;
        d.className = it.tip ? 'tip' : '';
        d.style.left = `${it.x}px`;
        d.style.top = `${it.y}px`;
      });
    },
  };
}
