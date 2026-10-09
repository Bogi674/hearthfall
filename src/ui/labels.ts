// Floating labels: the reason over every blocked building, and the placement problem next to the cursor.
import * as THREE from 'three';
import type { Pointer } from '../input/pointer';
import { STOREY_HEIGHT } from '../data/house';
import { POIS } from '../data/pois';
import { roomInfos } from '../sim/house';
import type { World } from '../sim/world';
import { STATUS_TEXT } from './selection';

export function createLabels(root: HTMLElement): { update(world: World, camera: THREE.Camera, pointer: Pointer, showRooms: boolean): void } {
  const layer = document.createElement('div');
  layer.id = 'labels';
  root.appendChild(layer);
  const pool: HTMLDivElement[] = [];
  const v = new THREE.Vector3();

  return {
    update(world, camera, pointer, showRooms) {
      const items: { text: string; x: number; y: number; cls?: string }[] = [];
      const screen = (x: number, h: number, y: number) => {
        v.set(x - world.map.width / 2, h, y - world.map.height / 2).project(camera);
        return { x: ((v.x + 1) / 2) * innerWidth, y: ((1 - v.y) / 2) * innerHeight };
      };
      // Hidden places get no label. Rumors are unconfirmed until a squad gets there (section 10.4).
      for (const p of world.pois) {
        if (p.seen !== 'hidden') items.push({ text: p.seen === 'known' ? POIS[p.type].name : 'Unconfirmed sighting', ...screen(p.x, 3.2, p.y), cls: 'poi' });
      }
      for (const b of world.buildings) {
        const text = STATUS_TEXT[b.status];
        if (!text) continue;
        items.push({ text, ...screen(b.x + (b.w - 1) / 2, 2 + b.storey * STOREY_HEIGHT, b.y + (b.h - 1) / 2) });
      }
      // The rooms of the house, named from their furniture, with a warning where something is missing (section 5.7).
      if (showRooms) {
        for (const r of roomInfos(world)) items.push({ text: r.note ? `${r.name}. ${r.note}` : r.name, ...screen(r.x, 1.9 + r.storey * STOREY_HEIGHT, r.y), cls: r.note ? 'room warn' : 'room' });
      }
      if (pointer.tip) items.push({ ...pointer.tip, cls: 'tip' });
      while (pool.length < items.length) pool.push(layer.appendChild(document.createElement('div')));
      pool.forEach((d, i) => {
        const it = items[i];
        d.style.display = it ? '' : 'none';
        if (!it) return;
        d.textContent = it.text;
        d.className = it.cls ?? '';
        d.style.left = `${it.x}px`;
        d.style.top = `${it.y}px`;
      });
    },
  };
}
