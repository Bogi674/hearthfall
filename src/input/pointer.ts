// Mouse and keyboard for placing and selecting buildings, game speed, and the build menu.
import * as THREE from 'three';
import { pushCommand } from '../sim/commands';
import { BUILDINGS } from '../data/buildings';
import { PAD } from '../data/vehicle';
import { edgePlacementError, floorPlacementError, footprint, placementError, removeError, siteError } from '../sim/placement';
import { floorAt, storedEdgeAt, type Side } from '../sim/house';
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
    const [fw, fh] = state.placing ? footprint(state.placing, state.rotated) : state.tool?.kind === 'site' ? [PAD.size, PAD.size] : [1, 1];
    return { x: Math.round(hit.x + w.map.width / 2 - (fw - 1) / 2), y: Math.round(hit.z + w.map.height / 2 - (fh - 1) / 2) };
  };

  /** The tile border nearest the cursor, as the edge between two tiles. */
  const edgeAt = (): { x: number; y: number; side: Side } | null => {
    const w = world();
    ray.setFromCamera(mouse.ndc, camera);
    if (!ray.ray.intersectPlane(ground, hit)) return null;
    // Tile centers sit on whole numbers, so the borders sit at the halves.
    const u = hit.x + w.map.width / 2 + 0.5;
    const v = hit.z + w.map.height / 2 + 0.5;
    const [tx, ty] = [Math.floor(u), Math.floor(v)];
    const [fx, fy] = [u - tx, v - ty];
    const nearest = Math.min(fx, 1 - fx, fy, 1 - fy);
    if (nearest === fx) return { x: tx, y: ty, side: 'w' };
    if (nearest === 1 - fx) return { x: tx + 1, y: ty, side: 'w' };
    if (nearest === fy) return { x: tx, y: ty, side: 'n' };
    return { x: tx, y: ty + 1, side: 'n' };
  };

  /** Does the tool in hand at the cursor. Dragging repeats it on each new tile or border. */
  let lastTool = '';
  const useTool = (fresh: boolean) => {
    const w = world();
    const tool = state.tool;
    if (!tool) return;
    if (tool.kind === 'floor') {
      const t = tileAt();
      if (!t) return;
      const id = `${t.x},${t.y}`;
      if (id === lastTool) return;
      lastTool = id;
      pushCommand(w.commands, { type: 'paintFloor', x: t.x, y: t.y, kind: tool.floor });
    } else if (tool.kind === 'edge') {
      const e = edgeAt();
      if (!e) return;
      const id = `${e.side}${e.x},${e.y}`;
      if (id === lastTool) return;
      lastTool = id;
      pushCommand(w.commands, { type: 'buildEdge', ...e, kind: tool.edge, level: tool.level });
    } else if (tool.kind === 'site') {
      const t = tileAt();
      if (!t || !fresh) return;
      pushCommand(w.commands, { type: 'chooseSite', x: t.x, y: t.y });
      state.tool = null;
    } else if (fresh) {
      const target = eraseTarget(w);
      if (target) pushCommand(w.commands, { type: 'removeHouseItem', item: target.item, id: target.id });
    }
  };
  let painting = false;

  /** What Remove would take: furniture first, then a wall near the cursor, then the floor. */
  const eraseTarget = (w: World): { item: 'furniture' | 'edge' | 'floor'; id: number } | null => {
    const t = tileAt();
    if (!t) return null;
    const b = w.buildings.find((o) => BUILDINGS[o.type].furniture && t.x >= o.x && t.x < o.x + o.w && t.y >= o.y && t.y < o.y + o.h);
    if (b) return { item: 'furniture', id: b.id };
    const e = edgeAt();
    const edge = e && storedEdgeAt(w, e.x, e.y, e.side);
    if (edge) return { item: 'edge', id: edge.id };
    const f = floorAt(w, t.x, t.y);
    return f ? { item: 'floor', id: f.id } : null;
  };

  canvas.addEventListener('mousedown', (e) => {
    if (e.button !== 0 || !state.tool) return;
    painting = true;
    lastTool = '';
    useTool(true);
  });
  window.addEventListener('mouseup', () => (painting = false));

  canvas.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.ndc.set((e.clientX / canvas.clientWidth) * 2 - 1, -(e.clientY / canvas.clientHeight) * 2 + 1);
    mouse.inside = true;
    if (painting) useTool(false);
  });
  canvas.addEventListener('mouseleave', () => (mouse.inside = false));
  canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    state.placing = null;
    state.tool = null;
  });
  canvas.addEventListener('click', () => {
    if (state.tool) return;
    const w = world();
    const t = tileAt();
    if (!t) return;
    if (state.placing) {
      const at = state.placing === 'airshipDock' && w.airship.site ? w.airship.site : t;
      pushCommand(w.commands, { type: 'place', building: state.placing, x: at.x, y: at.y, rotated: state.rotated });
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
    if (e.code === 'Escape') [state.placing, state.tool, state.selected] = [null, null, null];
  });

  /** Shows where the tool in hand would act, green when it can and red with the reason when it cannot. */
  const toolGhost = (w: World) => {
    const tool = state.tool!;
    let error: string | null = null;
    ghost.visible = true;
    if (tool.kind === 'site') {
      const t = tileAt();
      ghost.visible = t !== null;
      if (!t) return;
      error = siteError(w, t.x, t.y);
      ghost.position.set(t.x + (PAD.size - 1) / 2 - w.map.width / 2, 0, t.y + (PAD.size - 1) / 2 - w.map.height / 2);
      ghost.scale.set(PAD.size, 0.15, PAD.size);
    } else if (tool.kind === 'edge') {
      const e = edgeAt();
      ghost.visible = e !== null;
      if (!e) return;
      error = edgePlacementError(w, e.x, e.y, e.side, tool.edge, tool.level);
      const [sx, sz] = e.side === 'n' ? [1.2, 0.2] : [0.2, 1.2];
      ghost.position.set(e.side === 'w' ? e.x - 0.5 - w.map.width / 2 : e.x - w.map.width / 2, 0, e.side === 'n' ? e.y - 0.5 - w.map.height / 2 : e.y - w.map.height / 2);
      ghost.scale.set(sx, 1.15, sz);
    } else {
      const t = tileAt();
      ghost.visible = t !== null;
      if (!t) return;
      const target = tool.kind === 'erase' ? eraseTarget(w) : null;
      error = tool.kind === 'floor' ? floorPlacementError(w, t.x, t.y, tool.floor) : target ? removeError(w, target.item, target.id) : 'Nothing to remove';
      ghost.position.set(t.x - w.map.width / 2, 0, t.y - w.map.height / 2);
      ghost.scale.set(1, 0.1, 1);
    }
    ghost.material.color.copy(error ? GHOST_BAD : GHOST_OK);
    if (error) pointer.tip = { text: error, x: mouse.x, y: mouse.y };
  };

  const pointer: Pointer = {
    tip: null,
    update(w) {
      pointer.tip = null;
      if (state.tool && mouse.inside) return toolGhost(w);
      let t = state.placing && mouse.inside ? tileAt() : null;
      // The launch pad goes on the site the crew chose.
      if (t && state.placing === 'airshipDock' && w.airship.site) t = w.airship.site;
      ghost.visible = t !== null;
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
