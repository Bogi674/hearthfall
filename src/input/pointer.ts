// Mouse and keyboard for placing and selecting buildings, game speed, and the build menu.
import * as THREE from 'three';
import { pushCommand } from '../sim/commands';
import { BUILDINGS } from '../data/buildings';
import { STOREY_HEIGHT } from '../data/house';
import { PAD } from '../data/vehicle';
import { moveError } from '../sim/manage';
import { edgePlacementError, floorPlacementError, footprint, placementError, removeError, siteError } from '../sim/placement';
import { floorAt, maxStorey, storedEdgeAt, type Side } from '../sim/house';
import { hearthMoveError } from '../sim/hearth';
import type { World } from '../sim/world';
import { createBuildingGhost } from '../render/ghost';
import { createGhost, GHOST_BAD, GHOST_OK } from '../render/meshes/buildings';
import type { Interaction } from '../render/interaction';
import { WALL_MODES, type UiState } from '../ui/hud';
import type { HouseTool } from '../ui/build';
import { pick, type Target } from './pick';
import { planArea, type Anchor, type AreaPlan } from './areas';
import { createAreaPreview } from '../render/areaPreview';
import { drawsShapes } from '../ui/build';

export interface Pointer {
  /** Placement problem under the cursor, shown next to it. */
  tip: { text: string; x: number; y: number } | null;
  /** What the cursor is over when nothing is being placed. It glows and the cursor turns to a pointer. */
  hover: Target | null;
  update(world: World): void;
}

export function bindPointer(canvas: HTMLCanvasElement, camera: THREE.Camera, scene: THREE.Scene, state: UiState, world: () => World, interaction: Interaction): Pointer {
  const ghost = createGhost();
  scene.add(ghost);
  const buildingGhost = createBuildingGhost(scene);
  const preview = createAreaPreview(scene);
  /** A shape being dragged out with a house tool. */
  let drag: { a: Anchor; b: Anchor } | null = null;
  const ray = new THREE.Raycaster();
  const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const hit = new THREE.Vector3();
  const mouse = { x: 0, y: 0, ndc: new THREE.Vector2(), inside: false };

  /** House pieces and furniture go on the storey being built. Everything else goes on the ground. */
  const storeyOfWork = () => (state.tool && state.tool.kind !== 'site' && state.tool.kind !== 'move' && state.tool.kind !== 'hearth') || (state.placing && BUILDINGS[state.placing].furniture) || (!state.tool && !state.placing) ? state.storey : 0;
  const aimAt = (storey: number) => {
    ground.constant = -storey * STOREY_HEIGHT;
    ray.setFromCamera(mouse.ndc, camera);
    return ray.ray.intersectPlane(ground, hit);
  };

  /** The building being picked up by the move tool. */
  const movingBuilding = () => {
    const tool = state.tool;
    return tool?.kind === 'move' ? world().buildings.find((o) => o.id === tool.id) : undefined;
  };

  /** Tile under the cursor, or the top left tile of the footprint centered on it while placing. */
  const tileAt = () => {
    const w = world();
    if (!aimAt(storeyOfWork())) return null;
    const moving = state.tool?.kind === 'move' ? movingBuilding() : undefined;
    const [fw, fh] = state.placing ? footprint(state.placing, state.rotated) : moving ? footprint(moving.type, state.rotated) : state.tool?.kind === 'site' ? [PAD.size, PAD.size] : [1, 1];
    return { x: Math.round(hit.x + w.map.width / 2 - (fw - 1) / 2), y: Math.round(hit.z + w.map.height / 2 - (fh - 1) / 2) };
  };

  /** The tile border nearest the cursor, as the edge between two tiles. */
  const edgeAt = (): { x: number; y: number; side: Side } | null => {
    const w = world();
    if (!aimAt(storeyOfWork())) return null;
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
      const id = `${t.x},${t.y},${state.storey}`;
      if (id === lastTool) return;
      lastTool = id;
      pushCommand(w.commands, { type: 'paintFloor', x: t.x, y: t.y, kind: tool.floor, storey: state.storey });
    } else if (tool.kind === 'edge') {
      const e = edgeAt();
      if (!e) return;
      const id = `${state.storey}${e.side}${e.x},${e.y}`;
      if (id === lastTool) return;
      lastTool = id;
      pushCommand(w.commands, { type: 'buildEdge', ...e, kind: tool.edge, level: tool.level, storey: state.storey });
    } else if (tool.kind === 'site') {
      const t = tileAt();
      if (!t || !fresh) return;
      pushCommand(w.commands, { type: 'chooseSite', x: t.x, y: t.y });
      state.tool = null;
    } else if (tool.kind === 'move') {
      const t = tileAt();
      const b = movingBuilding();
      if (!t || !b || !fresh || moveError(w, b, t.x, t.y, state.rotated)) return;
      pushCommand(w.commands, { type: 'moveBuilding', id: b.id, x: t.x, y: t.y, rotated: state.rotated });
      state.tool = null;
    } else if (tool.kind === 'hearth') {
      const t = tileAt();
      if (!t || !fresh || hearthMoveError(w, t.x, t.y)) return;
      pushCommand(w.commands, { type: 'moveHearth', x: t.x, y: t.y });
      state.tool = null;
    } else if (tool.kind === 'mend') {
      return;
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
    const b = w.buildings.find((o) => BUILDINGS[o.type].furniture && o.storey === state.storey && t.x >= o.x && t.x < o.x + o.w && t.y >= o.y && t.y < o.y + o.h);
    if (b) return { item: 'furniture', id: b.id };
    const e = edgeAt();
    const edge = e && storedEdgeAt(w, e.x, e.y, e.side, state.storey);
    if (edge) return { item: 'edge', id: edge.id };
    const f = floorAt(w, t.x, t.y, state.storey);
    return f ? { item: 'floor', id: f.id } : null;
  };

  /** True when the tool in hand draws a shape: always for a room, and for floors, walls, and clearing while the shape toggle is on. */
  const shaped = () => state.tool !== null && state.tool.kind !== 'site' && state.tool.kind !== 'hearth' && (state.tool.kind === 'room' || state.tool.kind === 'mend' || (state.fill && drawsShapes(state.tool)));
  const anchorAt = (): Anchor | null => (state.tool?.kind === 'edge' ? edgeAt() : tileAt());
  const dragPlan = (w: World): AreaPlan | null => (drag && state.tool ? planArea(w, state.tool, drag.a, drag.b, state.storey) : null);

  canvas.addEventListener('mousedown', (e) => {
    if (e.button !== 0 || !state.tool) return;
    if (shaped()) {
      const a = anchorAt();
      if (a) drag = { a, b: a };
      return;
    }
    painting = true;
    lastTool = '';
    useTool(true);
  });
  window.addEventListener('mouseup', () => {
    painting = false;
    if (!drag) return;
    const plan = dragPlan(world());
    drag = null;
    if (plan?.command && !plan.blocked) pushCommand(world().commands, plan.command);
  });
  window.addEventListener('keyup', (e) => {
    if (e.code === 'Tab') state.peek = false;
  });

  canvas.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.ndc.set((e.clientX / canvas.clientWidth) * 2 - 1, -(e.clientY / canvas.clientHeight) * 2 + 1);
    mouse.inside = true;
    if (drag) drag.b = anchorAt() ?? drag.b;
    if (painting) useTool(false);
  });
  canvas.addEventListener('mouseleave', () => (mouse.inside = false));
  canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    state.placing = null;
    state.tool = null;
    drag = null;
  });
  canvas.addEventListener('click', () => {
    if (state.tool) return;
    const w = world();
    if (state.placing) {
      const t = tileAt();
      if (!t) return;
      const at = state.placing === 'airshipDock' && w.airship.site ? w.airship.site : t;
      pushCommand(w.commands, { type: 'place', building: state.placing, x: at.x, y: at.y, rotated: state.rotated, storey: BUILDINGS[state.placing].furniture ? state.storey : 0 });
      return;
    }
    const target = pointer.hover;
    state.selected = target ? target.id : null;
    if (target) interaction.click(target, performance.now() / 1000);
  });
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      state.paused = !state.paused;
    }
    if (['Digit1', 'Digit2', 'Digit3'].includes(e.code)) [state.speed, state.paused] = [Number(e.code.slice(5)), false];
    if (e.code === 'KeyB') state.buildOpen = !state.buildOpen;
    if (e.code === 'KeyR') state.rotated = !state.rotated;
    if (e.code === 'KeyZ') state.fill = !state.fill;
    // Tool hotkeys avoid the camera keys: F floor, T wall, Y room, X take apart, M mend.
    const toolKeys: Record<string, HouseTool> = {
      KeyF: { kind: 'floor', floor: 'boards' }, KeyT: { kind: 'edge', edge: 'wall', level: 1 }, KeyY: { kind: 'room', floor: 'boards', level: 1 }, KeyX: { kind: 'erase' }, KeyM: { kind: 'mend' },
    };
    if (toolKeys[e.code]) [state.tool, state.placing, state.buildCat] = [toolKeys[e.code], null, 'Structure'];
    if (e.code === 'KeyH') state.rooms = !state.rooms;
    if (e.code === 'PageUp' || e.code === 'BracketRight') state.storey = Math.min(maxStorey(world()), state.storey + 1);
    if (e.code === 'PageDown' || e.code === 'BracketLeft') state.storey = Math.max(0, state.storey - 1);
    if (e.code === 'KeyL') state.levels = state.levels === 'all' ? 'current' : 'all';
    if (e.code === 'KeyV') state.walls = WALL_MODES[(WALL_MODES.indexOf(state.walls) + 1) % WALL_MODES.length];
    if (e.code === 'Tab') {
      e.preventDefault();
      state.peek = true;
    }
    if (e.code === 'Escape') [state.placing, state.tool, state.selected, drag] = [null, null, null, null];
  });

  /** Shows where the tool in hand would act, green when it can and red with the reason when it cannot. */
  const toolGhost = (w: World) => {
    const tool = state.tool!;
    let error: string | null = null;
    ghost.visible = true;
    if (drag) {
      const plan = dragPlan(w)!;
      ghost.visible = false;
      preview.show(plan.items, state.storey, w.map.width, w.map.height, performance.now() / 1000);
      pointer.tip = { text: plan.text, x: mouse.x, y: mouse.y };
      return;
    }
    if (tool.kind === 'move') {
      const t = tileAt();
      const b = movingBuilding();
      ghost.visible = false;
      if (!t || !b) return buildingGhost.hide();
      const [fw, fh] = footprint(b.type, state.rotated);
      const err = moveError(w, b, t.x, t.y, state.rotated);
      buildingGhost.show(b.type, fw, fh, t.x + (fw - 1) / 2 - w.map.width / 2, t.y + (fh - 1) / 2 - w.map.height / 2, !err, performance.now() / 1000, 0);
      if (err) pointer.tip = { text: err, x: mouse.x, y: mouse.y };
      return;
    }
    if (tool.kind === 'site') {
      const t = tileAt();
      ghost.visible = t !== null;
      if (!t) return;
      error = siteError(w, t.x, t.y);
      ghost.position.set(t.x + (PAD.size - 1) / 2 - w.map.width / 2, 0, t.y + (PAD.size - 1) / 2 - w.map.height / 2);
      ghost.scale.set(PAD.size, 0.15, PAD.size);
    } else if (tool.kind === 'hearth') {
      const t = tileAt();
      ghost.visible = t !== null;
      if (!t) return;
      error = hearthMoveError(w, t.x, t.y);
      ghost.position.set(t.x - w.map.width / 2, state.storey * STOREY_HEIGHT, t.y - w.map.height / 2);
      ghost.scale.set(1, 0.3, 1);
    } else if (tool.kind === 'mend') {
      const t = tileAt();
      ghost.visible = t !== null;
      if (!t) return;
      ghost.position.set(t.x - w.map.width / 2, state.storey * STOREY_HEIGHT, t.y - w.map.height / 2);
      ghost.scale.set(1, 0.1, 1);
    } else if (tool.kind === 'edge') {
      const e = edgeAt();
      ghost.visible = e !== null;
      if (!e) return;
      error = edgePlacementError(w, e.x, e.y, e.side, tool.edge, tool.level, state.storey);
      const [sx, sz] = e.side === 'n' ? [1.2, 0.2] : [0.2, 1.2];
      ghost.position.set(e.side === 'w' ? e.x - 0.5 - w.map.width / 2 : e.x - w.map.width / 2, state.storey * STOREY_HEIGHT, e.side === 'n' ? e.y - 0.5 - w.map.height / 2 : e.y - w.map.height / 2);
      ghost.scale.set(sx, 1.15, sz);
    } else {
      const t = tileAt();
      ghost.visible = t !== null;
      if (!t) return;
      const target = tool.kind === 'erase' ? eraseTarget(w) : null;
      error = tool.kind === 'floor' || tool.kind === 'room' ? floorPlacementError(w, t.x, t.y, tool.floor, state.storey) : target ? removeError(w, target.item, target.id) : 'Nothing to remove';
      ghost.position.set(t.x - w.map.width / 2, state.storey * STOREY_HEIGHT, t.y - w.map.height / 2);
      ghost.scale.set(1, 0.1, 1);
    }
    ghost.material.color.copy(error ? GHOST_BAD : GHOST_OK);
    ghost.material.opacity = 0.42 + Math.sin(performance.now() / 160) * 0.1;
    if (error) pointer.tip = { text: error, x: mouse.x, y: mouse.y };
  };

  /** The cursor in continuous tile units, or null when it is off the ground. */
  const cursorUV = () => {
    const w = world();
    return aimAt(state.storey) ? { u: hit.x + w.map.width / 2, v: hit.z + w.map.height / 2 } : null;
  };

  const pointer: Pointer = {
    tip: null,
    hover: null,
    update(w) {
      pointer.tip = null;
      if ((state.tool && state.tool.kind !== 'move') || (!state.tool && !state.placing)) buildingGhost.hide();
      if (!drag) preview.hide();
      const free = mouse.inside && !state.tool && !state.placing;
      const uv = free ? cursorUV() : null;
      pointer.hover = uv ? pick(w, uv.u, uv.v, state.storey) : null;
      canvas.style.cursor = state.tool || state.placing ? 'crosshair' : pointer.hover ? 'pointer' : '';
      if (state.tool && mouse.inside) return toolGhost(w);
      let t = state.placing && mouse.inside ? tileAt() : null;
      // The launch pad goes on the site the crew chose.
      if (t && state.placing === 'airshipDock' && w.airship.site) t = w.airship.site;
      if (!t || !state.placing) {
        ghost.visible = false;
        buildingGhost.hide();
        return;
      }
      ghost.visible = false;
      const [fw, fh] = footprint(state.placing, state.rotated);
      const level = BUILDINGS[state.placing].furniture ? state.storey : 0;
      const error = placementError(w, state.placing, t.x, t.y, state.rotated, 'place', level);
      buildingGhost.show(state.placing, fw, fh, t.x + (fw - 1) / 2 - w.map.width / 2, t.y + (fh - 1) / 2 - w.map.height / 2, !error, performance.now() / 1000, level);
      if (error) pointer.tip = { text: error, x: mouse.x, y: mouse.y };
    },
  };
  return pointer;
}
