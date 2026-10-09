// Build menu (section 14): one tab per category, an icon button per building with its cost,
// and the reason a building cannot be placed yet.
import { BUILDABLE, BUILDINGS, type BuildingCategory } from '../data/buildings';
import { EDGE_KINDS, EDGES, FLOOR_IDS, FLOORS, type EdgeKind, type FloorId } from '../data/house';
import { RESOURCE_NAMES, type Amounts, type Resource } from '../data/resources';
import { missing } from '../sim/query';
import type { World } from '../sim/world';
import { BUILDING_ICONS } from './icons';

/** What the build menu is drawing: the pieces of the house, or a building. */
export type HouseTool = { kind: 'floor'; floor: FloorId } | { kind: 'edge'; edge: EdgeKind; level: number } | { kind: 'erase' } | { kind: 'site' };
export type BuildCat = BuildingCategory | 'Structure';

export const BUILD_CATS: BuildCat[] = ['Structure', 'Furniture', 'Shelter', 'Production', 'Defense', 'Escape'];

/** The id a tool has in a button, such as floor.boards or edge.wall.1. */
export const toolId = (t: HouseTool): string => (t.kind === 'floor' ? `floor.${t.floor}` : t.kind === 'edge' ? `edge.${t.edge}.${t.level}` : t.kind);
export function parseTool(id: string): HouseTool {
  const [kind, a, b] = id.split('.');
  if (kind === 'floor') return { kind, floor: a as FloorId };
  if (kind === 'edge') return { kind, edge: a as EdgeKind, level: Number(b) };
  return kind === 'site' ? { kind: 'site' } : { kind: 'erase' };
}

function structureHtml(w: World, tool: HouseTool | null): string {
  const button = (t: HouseTool, name: string, cost: Amounts | null, hint: string) => {
    const short = cost ? missing(w, cost) : null;
    return `<button data-act="tool:${toolId(t)}" class="item ${tool && toolId(tool) === toolId(t) ? 'on' : ''} ${short ? 'poor' : ''}">
      <span><b>${name}</b>${cost ? `<small>${amounts(cost)}</small>` : ''}<small class="${short ? 'why' : ''}">${short ? `Needs more ${RESOURCE_NAMES[short as Resource].toLowerCase()}` : hint}</small></span></button>`;
  };
  const floors = FLOOR_IDS.map((f) => button({ kind: 'floor', floor: f }, FLOORS[f].name, FLOORS[f].cost, 'Drag to paint'));
  const edges = EDGE_KINDS.flatMap((k) =>
    EDGES[k].levels.map((l, i) => button({ kind: 'edge', edge: k, level: i + 1 }, l.name, l.cost, 'Click a tile border')),
  );
  return [...floors, ...edges, button({ kind: 'erase' }, 'Remove', null, 'Click a piece')].join('');
}

export const amounts = (a: Amounts) => Object.entries(a).map(([r, n]) => `${n} ${RESOURCE_NAMES[r as Resource]}`).join(' + ');

export function buildMenuHtml(w: World, cat: BuildCat, placing: string | null, tool: HouseTool | null, rotated: boolean): string {
  const rotate = placing ? `<button data-act="rotate" class="rotate ${rotated ? 'on' : ''}" title="Turn the building a quarter turn (R)">Rotate (R)</button>` : '';
  const tabs = BUILD_CATS.map((c) => `<button data-act="cat:${c}" class="${cat === c ? 'on' : ''}">${c}</button>`).join('') + rotate;
  const items = cat === 'Structure' ? structureHtml(w, tool) : BUILDABLE.filter((t) => BUILDINGS[t].category === cat)
    .map((t) => {
      const def = BUILDINGS[t];
      const short = missing(w, def.cost);
      const padWhy = t !== 'airshipDock' ? '' : !w.airship.blueprint ? "Needs the old owner's blueprint" : !w.airship.site ? 'Choose the site in the Airship tab' : '';
      const why = padWhy ? padWhy : short ? `Needs more ${RESOURCE_NAMES[short as Resource].toLowerCase()}`
        : t === 'airshipDock' ? 'Goes on the chosen site'
        : def.roofed ? 'Goes in a closed room' : def.furniture ? 'Goes on a house floor' : '';
      return `<button data-act="build:${t}" class="item ${placing === t ? 'on' : ''} ${short || padWhy ? 'poor' : ''}" title="${def.name}. ${why}">
        ${BUILDING_ICONS[t]}<span><b>${def.name}</b><small>${amounts(def.cost)}</small>${why ? `<small class="${short || padWhy ? 'why' : ''}">${why}</small>` : ''}</span></button>`;
    })
    .join('');
  return `<div class="tabs">${tabs}</div><div class="group">${items}</div>`;
}
