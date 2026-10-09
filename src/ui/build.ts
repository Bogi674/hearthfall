// Build menu (section 14): one tab per category, an icon button per building with its cost,
// and the reason a building cannot be placed yet.
import { BUILDABLE, BUILDINGS, type BuildingCategory } from '../data/buildings';
import { roomsForTier, wallModulesForTier, type RoomDef, type WallModuleDef, RoomCategory } from '../data/rooms';
import { RESOURCE_NAMES, type Amounts, type Resource } from '../data/resources';
import { missing, roomTier } from '../sim/query';
import type { World } from '../sim/world';
import { BUILDING_ICONS } from './icons';

export const BUILD_CATS: BuildingCategory[] = ['House', 'Shelter', 'Production', 'Defense', 'Escape'];
export const ROOM_CATS: RoomCategory[] = ['Living', 'Storage', 'Production', 'Medical', 'Defense', 'Utility', 'Decor'];

export const amounts = (a: Amounts) => Object.entries(a).map(([r, n]) => `${n} ${RESOURCE_NAMES[r as Resource]}`).join(' + ');

export function buildMenuHtml(w: World, cat: BuildingCategory | RoomCategory | 'WallModules', placing: string | null): string {
  const currentTier = roomTier(w);
  const allCats = [...BUILD_CATS, ...ROOM_CATS, 'WallModules'];
  const tabs = allCats.map((c) => `<button data-act="cat:${c}" class="${cat === c ? 'on' : ''}">${c}</button>`).join('');
  
  let items = '';
  
  if (BUILD_CATS.includes(cat as BuildingCategory)) {
    // Original building categories
    items = BUILDABLE.filter((t) => BUILDINGS[t].category === cat)
      .map((t) => {
        const def = BUILDINGS[t];
        const short = missing(w, def.cost);
        const why = short ? `Needs more ${RESOURCE_NAMES[short as Resource].toLowerCase()}` : def.room ? 'Goes on the house lot' : '';
        return `<button data-act="build:${t}" class="item ${placing === t ? 'on' : ''} ${short ? 'poor' : ''}" title="${def.name}. ${why}">
          ${BUILDING_ICONS[t]}<span><b>${def.name}</b><small>${amounts(def.cost)}</small>${why ? `<small class="${short ? 'why' : ''}">${why}</small>` : ''}</span></button>`;
      })
      .join('');
  } else if (cat === 'WallModules') {
    // Wall modules
    const modules = wallModulesForTier(currentTier);
    items = modules
      .map((m: WallModuleDef) => {
        const short = missing(w, m.cost);
        return `<button data-act="wallModule:${m.id}" class="item ${placing === m.id ? 'on' : ''} ${short ? 'poor' : ''}" title="${m.name}. ${m.description}">
          <span class="icon">🛡️</span><span><b>${m.name}</b><small>${amounts(m.cost)}</small>${short ? `<small class="why">Needs more ${RESOURCE_NAMES[short as Resource].toLowerCase()}</small>` : ''}</span></button>`;
      })
      .join('');
  } else {
    // Room categories
    const rooms = roomsForTier(currentTier).filter(r => r.category === cat);
    items = rooms
      .map((r: RoomDef) => {
        const short = missing(w, r.cost);
        const tierLabel = r.tier > currentTier ? ` (Tier ${r.tier})` : '';
        return `<button data-act="room:${r.id}" class="item ${placing === r.id ? 'on' : ''} ${short ? 'poor' : ''} ${r.tier > currentTier ? 'locked' : ''}" title="${r.name}${tierLabel}. ${r.description}">
          <span class="icon">🏠</span><span><b>${r.name}</b><small>${amounts(r.cost)}${tierLabel}</small>${short ? `<small class="why">Needs more ${RESOURCE_NAMES[short as Resource].toLowerCase()}</small>` : r.tier > currentTier ? `<small class="why">Requires hearth stage ${r.tier}</small>` : ''}</span></button>`;
      })
      .join('');
  }
  
  return `<div class="tabs">${tabs}</div><div class="group">${items}</div>`;
}
