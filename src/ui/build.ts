// Build menu (section 14): one tab per category, an icon button per building with its cost,
// and the reason a building cannot be placed yet. The Structure tab holds the house builder tools (M11).
import { BUILDABLE, BUILDINGS, type BuildingCategory, type BuildingType } from '../data/buildings';
import { infoHtml } from './stats';
import { EDGES, FLOORS, type EdgeKind, type FloorId } from '../data/house';
import { RESOURCE_NAMES, type Amounts, type Resource } from '../data/resources';
import { missing } from '../sim/query';
import type { World } from '../sim/world';
import { BUILDING_ICONS } from './icons';

/** What the build menu is drawing: the pieces of the house, or a building. */
export type HouseTool =
  | { kind: 'floor'; floor: FloorId }
  | { kind: 'edge'; edge: EdgeKind; level: number }
  | { kind: 'room'; floor: FloorId; level: number }
  | { kind: 'erase' }
  | { kind: 'mend' }
  | { kind: 'hearth' }
  | { kind: 'move'; id: number }
  | { kind: 'site' };
export type BuildCat = BuildingCategory;

export const BUILD_CATS: BuildCat[] = ['Structure', 'Furniture', 'Utility', 'Defense', 'Shelter', 'Production', 'Escape'];

/** The id a tool has in a button, such as floor.boards, edge.wall.1, or room.stone.3. */
export const toolId = (t: HouseTool): string =>
  t.kind === 'floor' ? `floor.${t.floor}` : t.kind === 'edge' ? `edge.${t.edge}.${t.level}` : t.kind === 'room' ? `room.${t.floor}.${t.level}` : t.kind === 'move' ? `move.${t.id}` : t.kind;
export function parseTool(id: string): HouseTool {
  const [kind, a, b] = id.split('.');
  if (kind === 'floor') return { kind, floor: a as FloorId };
  if (kind === 'edge') return { kind, edge: a as EdgeKind, level: Number(b) };
  if (kind === 'room') return { kind, floor: a as FloorId, level: Number(b) };
  if (kind === 'move') return { kind, id: Number(a) };
  return kind === 'site' ? { kind: 'site' } : kind === 'mend' ? { kind: 'mend' } : kind === 'hearth' ? { kind: 'hearth' } : { kind: 'erase' };
}

/** Tools that draw a shape when the fill toggle is on: a rectangle of floor, a straight run of wall, or an area to take apart. */
export const drawsShapes = (t: HouseTool): boolean => t.kind === 'floor' || t.kind === 'edge' || t.kind === 'erase' || t.kind === 'room' || t.kind === 'mend';

export const amounts = (a: Amounts) => Object.entries(a).map(([r, n]) => `${n} ${RESOURCE_NAMES[r as Resource]}`).join(' + ');

const section = (name: string, body: string) => `<div class="sec"><h5>${name}</h5><div class="group">${body}</div></div>`;

function structureHtml(w: World, tool: HouseTool | null, placing: string | null, fill: boolean): string {
  const button = (t: HouseTool, name: string, cost: Amounts | null, hint: string, key = '') => {
    const short = cost ? missing(w, cost) : null;
    return `<button data-act="tool:${toolId(t)}" class="item ${tool && toolId(tool) === toolId(t) ? 'on' : ''} ${short ? 'poor' : ''}" title="${name}${key ? ` (${key})` : ''}">
      <span><b>${name}</b>${cost ? `<small>${amounts(cost)}</small>` : ''}<small class="${short ? 'why' : ''}">${short ? `Needs more ${RESOURCE_NAMES[short as Resource].toLowerCase()}` : hint}</small></span></button>`;
  };
  const shape = `<button data-act="shape" class="item rotate ${fill ? 'on' : ''}" title="Drag out a rectangle of floor, a run of wall, or an area to take apart (Z)">Drag shapes: ${fill ? 'On' : 'Off'} (Z)</button>`;
  const floors = (Object.keys(FLOORS) as FloorId[]).map((f) => button({ kind: 'floor', floor: f }, FLOORS[f].name, FLOORS[f].cost, fill ? 'Drag a rectangle' : 'Drag to paint', f === 'boards' ? 'F' : ''));
  const rooms = [
    button({ kind: 'room', floor: 'boards', level: 1 }, 'Wood Room', { ...FLOORS.boards.cost, ...EDGES.wall.levels[0].cost }, 'Drag a rectangle. Floor, walls, and a door', 'Y'),
    button({ kind: 'room', floor: 'stone', level: 3 }, 'Stone Room', { ...FLOORS.stone.cost, ...EDGES.wall.levels[2].cost }, 'Drag a rectangle. Stone floor and walls'),
  ];
  const edge = (k: EdgeKind) => EDGES[k].levels.map((l, i) => button({ kind: 'edge', edge: k, level: i + 1 }, l.name, l.cost, fill ? 'Drag a line' : 'Click a tile border', k === 'wall' && i === 0 ? 'T' : ''));
  const stairs = BUILDABLE.filter((t) => BUILDINGS[t].category === 'Structure').map((t) => buildingButton(w, t, placing));
  return `<div class="sections">${[
    section('Tools', shape + button({ kind: 'mend' }, 'Mend', null, 'Drag over the ruin to repair walls, furniture, roofs, and rubble', 'M') + button({ kind: 'erase' }, 'Remove', null, fill ? 'Drag an area to clear' : 'Click a piece', 'X')),
    section('Floors', floors.join('')),
    section('Rooms', rooms.join('')),
    section('Walls', edge('wall').join('')),
    section('Doors and windows', [...edge('door'), ...edge('window')].join('')),
    section('Stairs', stairs.join('')),
  ].join('')}</div>`;
}

function buildingButton(w: World, t: keyof typeof BUILDINGS, placing: string | null): string {
  const def = BUILDINGS[t];
  const short = missing(w, def.cost);
  const padWhy = t !== 'airshipDock' ? '' : !w.airship.blueprint ? "Needs the old owner's blueprint" : !w.airship.site ? 'Choose the site in the Airship tab' : '';
  const why = padWhy ? padWhy : short ? `Needs more ${RESOURCE_NAMES[short as Resource].toLowerCase()}`
    : t === 'airshipDock' ? 'Goes on the chosen site'
    : def.stairs ? 'Goes on a floor with a floor beside the top'
    : def.roofed ? 'Goes in a closed room, under the open sky' : def.furniture ? 'Goes on a house floor' : '';
  return `<button data-act="build:${t}" class="item ${placing === t ? 'on' : ''} ${short || padWhy ? 'poor' : ''}" title="${def.name}. ${why}">
        ${BUILDING_ICONS[t]}<span><b>${def.name}</b><small>${amounts(def.cost)}</small>${why ? `<small class="${short || padWhy ? 'why' : ''}">${why}</small>` : ''}</span></button>`;
}

export function buildMenuHtml(w: World, cat: BuildCat, placing: string | null, tool: HouseTool | null, rotated: boolean, fill = false, info: BuildingType | null = null): string {
  const rotate = placing ? `<button data-act="rotate" class="rotate ${rotated ? 'on' : ''}" title="Turn the building a quarter turn (R)">Rotate (R)</button>` : '';
  const tabs = BUILD_CATS.map((c) => `<button data-act="cat:${c}" class="${cat === c ? 'on' : ''}">${c}</button>`).join('') + rotate;
  let body: string;
  if (cat === 'Structure') body = structureHtml(w, tool, placing, fill);
  else {
    const items = BUILDABLE.filter((t) => BUILDINGS[t].category === cat).map((t) => buildingButton(w, t, placing));
    // Gun ports are wall pieces, so they sit in the Defense tab beside the turrets.
    const ports = cat !== 'Defense' ? [] : EDGES.gunPort.levels.map((l, i) => {
      const t: HouseTool = { kind: 'edge', edge: 'gunPort', level: i + 1 };
      const short = missing(w, l.cost);
      return `<button data-act="tool:${toolId(t)}" class="item ${tool && toolId(tool) === toolId(t) ? 'on' : ''} ${short ? 'poor' : ''}" title="${l.name}. A defender fires through it at night">
        <span><b>${l.name}</b><small>${amounts(l.cost)}</small><small class="${short ? 'why' : ''}">${short ? `Needs more ${RESOURCE_NAMES[short as Resource].toLowerCase()}` : 'Click a tile border'}</small></span></button>`;
    });
    body = `<div class="group">${[...ports, ...items].join('')}</div>`;
  }
  // The facts card has a fixed height, so the menu does not jump as the cursor moves over the buttons.
  return `<div class="tabs">${tabs}</div><div class="facts">${info ? infoHtml(info) : '<p class="hint">Hover a building to see what it does.</p>'}</div>${body}`;
}
