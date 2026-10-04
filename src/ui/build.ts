// Build menu (section 14): one tab per category, an icon button per building with its cost,
// and the reason a building cannot be placed yet.
import { BUILDABLE, BUILDINGS, type BuildingCategory } from '../data/buildings';
import { RESOURCE_NAMES, type Amounts, type Resource } from '../data/resources';
import { missing } from '../sim/query';
import type { World } from '../sim/world';
import { BUILDING_ICONS } from './icons';

export const BUILD_CATS: BuildingCategory[] = ['House', 'Shelter', 'Production', 'Defense', 'Escape'];

export const amounts = (a: Amounts) => Object.entries(a).map(([r, n]) => `${n} ${RESOURCE_NAMES[r as Resource]}`).join(' + ');

export function buildMenuHtml(w: World, cat: BuildingCategory, placing: string | null): string {
  const tabs = BUILD_CATS.map((c) => `<button data-act="cat:${c}" class="${cat === c ? 'on' : ''}">${c}</button>`).join('');
  const items = BUILDABLE.filter((t) => BUILDINGS[t].category === cat)
    .map((t) => {
      const def = BUILDINGS[t];
      const short = missing(w, def.cost);
      const why = short ? `Needs more ${RESOURCE_NAMES[short as Resource].toLowerCase()}` : def.room ? 'Goes on the house lot' : '';
      return `<button data-act="build:${t}" class="item ${placing === t ? 'on' : ''} ${short ? 'poor' : ''}" title="${def.name}. ${why}">
        ${BUILDING_ICONS[t]}<span><b>${def.name}</b><small>${amounts(def.cost)}</small>${why ? `<small class="${short ? 'why' : ''}">${why}</small>` : ''}</span></button>`;
    })
    .join('');
  return `<div class="tabs">${tabs}</div><div class="group">${items}</div>`;
}
