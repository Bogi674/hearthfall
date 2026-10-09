// Mouse and keyboard for placing and selecting buildings, game speed, and the build menu.
import * as THREE from 'three';
import { pushCommand } from '../sim/commands';
import { footprint, placementError } from '../sim/placement';
import type { World } from '../sim/world';
import { createGhost, GHOST_BAD, GHOST_OK } from '../render/meshes/buildings';
import type { UiState } from '../ui/hud';

export interface Pointer {
  /** Placement problem under the cursor, shown next to it. */
  tip: { text: string; x: number; y: number } | null;
  update(world: World): void;
}

export function bindPointer(canvas: HTMLCanvasElement, camera: THREE.Camera, scene: THREE.Scene, state: UiState, world: () => World): Pointer {
  const ghost = createGhost();
  scene.add(ghost);
  const ray = new THREE.Raycaster();
  const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const hit = new THREE.Vector3();
  const mouse = { x: 0, y: 0, ndc: new THREE.Vector2(), inside: false };

  /** Tile under the cursor, or the top left tile of the footprint centered on it while placing. */
  const tileAt = () => {
    const w = world();
    ray.setFromCamera(mouse.ndc, camera);
    if (!ray.ray.intersectPlane(ground, hit)) return null;
    const [fw, fh] = state.placing ? footprint(state.placing, state.rotated) : [1, 1];
    return { x: Math.round(hit.x + w.map.width / 2 - (fw - 1) / 2), y: Math.round(hit.z + w.map.height / 2 - (fh - 1) / 2) };
  };

  canvas.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.ndc.set((e.clientX / canvas.clientWidth) * 2 - 1, -(e.clientY / canvas.clientHeight) * 2 + 1);
    mouse.inside = true;
  });
  canvas.addEventListener('mouseleave', () => (mouse.inside = false));
  canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    state.placing = null;
  });
  canvas.addEventListener('click', () => {
    const w = world();
    const t = tileAt();
    if (!t) return;
    if (state.placing) {
      pushCommand(w.commands, { type: 'place', building: state.placing, x: t.x, y: t.y, rotated: state.rotated });
      return;
    }
    const b = w.buildings.find((b) => t.x >= b.x && t.x < b.x + b.w && t.y >= b.y && t.y < b.y + b.h);
    const onHearth = Math.abs(t.x - w.hearth.x) <= 1 && Math.abs(t.y - w.hearth.y) <= 1;
    state.selected = b ? b.id : onHearth ? 'hearth' : null;
  });
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      state.paused = !state.paused;
    }
    if (['Digit1', 'Digit2', 'Digit3'].includes(e.code)) [state.speed, state.paused] = [Number(e.code.slice(5)), false];
    if (e.code === 'KeyB') state.buildOpen = !state.buildOpen;
    if (e.code === 'KeyR') state.rotated = !state.rotated;
    if (e.code === 'Escape') [state.placing, state.selected] = [null, null];
  });

  const pointer: Pointer = {
    tip: null,
    update(w) {
      const t = state.placing && mouse.inside ? tileAt() : null;
      ghost.visible = t !== null;
      pointer.tip = null;
      if (!t || !state.placing) return;
      const [fw, fh] = footprint(state.placing, state.rotated);
      const error = placementError(w, state.placing, t.x, t.y, state.rotated);
      ghost.position.set(t.x + (fw - 1) / 2 - w.map.width / 2, 0, t.y + (fh - 1) / 2 - w.map.height / 2);
      ghost.scale.set(fw, 0.6, fh);
      ghost.material.color.copy(error ? GHOST_BAD : GHOST_OK);
      if (error) pointer.tip = { text: error, x: mouse.x, y: mouse.y };
    },
  };
  return pointer;
}
