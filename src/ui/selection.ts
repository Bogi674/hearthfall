// Selection panel for the house and for buildings (section 14): status, workers, construction,
// guns, the armory, shelter, and upgrades. Every blocked building shows its reason.
import { BALANCE } from '../data/balance';
import { BUILDINGS } from '../data/buildings';
import { ROOMS, WALL_MODULES } from '../data/rooms';
import { RECIPES } from '../data/recipes';
import { CRAFTABLE, WEAPONS } from '../data/weapons';
import { buildingUpgradeError, hearthUpgradeError } from '../sim/commands';
import { hearthStage, isBuilt, isRoomBuilt } from '../sim/query';
import type { Building, BuildingStatus, Room, WallModule, World } from '../sim/world';
import { amounts } from './build';
import { BUILDING_ICONS } from './icons';

export const STATUS_TEXT: Partial<Record<BuildingStatus, string>> = {
  noWorkers: 'No workers',
  noDefender: 'No defender',
  noFuel: 'No fuel to light',
  noInput: 'Missing input',
  noResource: 'Nothing to gather nearby',
  tooCold: 'Too cold to work',
  storageFull: 'Storage full',
  sheltering: 'Workers are taking shelter',
};

const bar = (fraction: number) => `<i class="bar wide"><b style="width:${Math.round(fraction * 100)}%"></b></i>`;

export function selectionHtml(w: World, selected: number | 'hearth' | null): string {
  if (selected === 'hearth') return houseHtml(w);
  
  // Check if it's a room
  const room = w.rooms.find((r) => r.id === selected);
  if (room) return roomHtml(w, room);
  
  // Check if it's a wall module
  const wallModule = w.wallModules.find((wm) => wm.id === selected);
  if (wallModule) return wallModuleHtml(w, wallModule);
  
  const b = w.buildings.find((b) => b.id === selected);
  if (!b) return '';
  const def = BUILDINGS[b.type];
  const lines = [`<h3 class="with-icon">${BUILDING_ICONS[b.type]}${def.name}</h3><p>Health ${Math.ceil(b.hp)}/${def.hp}</p>`];
  if (!isBuilt(b)) {
    const builders = w.colonists.filter((c) => c.site === b.id && c.task === 'build').length;
    lines.push(`<p>Being built, ${Math.floor((1 - b.construct / def.build) * 100)}% done. ${builders} building now.</p>${bar(1 - b.construct / def.build)}`);
    lines.push(`<p class="${builders ? '' : 'alert'}">${builders ? 'Colonists without a job help build.' : 'Nobody is building. Free up a colonist by lowering workers elsewhere.'}</p>`);
    return lines.join('');
  }
  if (STATUS_TEXT[b.status]) lines.push(`<p class="alert">${STATUS_TEXT[b.status]}</p>`);
  if (def.workers > 0) {
    const crew = w.colonists.filter((c) => (def.nightDuty ? c.duty : c.job) === b.id).length;
    lines.push(`<p class="workers">${def.nightDuty ? 'Defenders' : 'Workers'} ${crew}/${b.workers} of ${def.workers}
      <button data-act="workers:${b.id}:${b.workers - 1}">−</button><button data-act="workers:${b.id}:${b.workers + 1}">+</button></p>`);
  }
  const recipe = RECIPES[b.type];
  if (recipe) {
    lines.push(`<p>${recipe.inputs ? `${amounts(recipe.inputs)} to ` : ''}${amounts(recipe.outputs)} every ${recipe.cycle}s</p>`);
    lines.push(bar(b.progress / recipe.cycle));
  }
  if (def.armory) lines.push(armoryHtml(w, b));
  if (def.beds) lines.push(`<p>Beds ${w.colonists.filter((c) => c.bed === b.id).length}/${def.beds}${def.restBonus ? `. Sleepers rest and heal ${def.restBonus} times faster` : ''}</p>`);
  if (def.storage) lines.push(`<p>Adds ${def.storage} storage</p>`);
  if (def.light) lines.push(`<p>Lights a radius of ${def.light.radius} at night for ${def.light.fuel} fuel. ${b.lit ? 'Lit' : 'Unlit'}</p>`);
  else if (def.glow) lines.push(`<p>Its lamps light a radius of ${def.glow}.</p>`);
  if (def.indoor) lines.push('<p>People inside are safe while it stands.</p>');
  if (def.walkable) lines.push('<p>Hurts monsters that walk over it</p>');
  if (def.guns) lines.push(gunsHtml(w, b));
  if (def.sight) lines.push(sightHtml(w, b));
  if (def.workers > 0 && !def.nightDuty) {
    lines.push(b.shelter
      ? `<button data-act="shelter:${b.id}:0">Back to work</button>`
      : `<button data-act="shelter:${b.id}:1">Take shelter</button><small class="note">Workers hide inside until you call them back.</small>`);
  }
  return lines.join('');
}

function roomHtml(w: World, r: Room): string {
  const def = ROOMS.find(rd => rd.id === r.roomId);
  if (!def) return '';
  const built = isRoomBuilt(r);
  const lines = [`<h3 class="with-icon">🏠${def.name}</h3><p>Health ${Math.ceil(r.hp)}/${def.size[0] * def.size[1] * 50}</p>`];
  
  if (!built) {
    const builders = w.colonists.filter((c) => c.site === r.id && c.task === 'build').length;
    lines.push(`<p>Being built, ${Math.floor((1 - r.construct / def.buildTime) * 100)}% done. ${builders} building now.</p>${bar(1 - r.construct / def.buildTime)}`);
    lines.push(`<p class="${builders ? '' : 'alert'}">${builders ? 'Colonists without a job help build.' : 'Nobody is building. Free up a colonist by lowering workers elsewhere.'}</p>`);
    return lines.join('');
  }
  
  if (r.status && STATUS_TEXT[r.status as BuildingStatus]) lines.push(`<p class="alert">${STATUS_TEXT[r.status as BuildingStatus]}</p>`);
  
  if (def.workers > 0) {
    const crew = w.colonists.filter((c) => c.job === r.id).length;
    lines.push(`<p class="workers">Workers ${crew}/${def.workers}
      <button data-act="workers:${r.id}:${Math.max(0, def.workers - 1)}">−</button><button data-act="workers:${r.id}:${def.workers + 1}">+</button></p>`);
  }
  
  if (def.produces && RECIPES[def.produces]) {
        const recipe = RECIPES[def.produces]!;
        lines.push(`<p>${recipe.inputs ? `${amounts(recipe.inputs)} to ` : ''}${amounts(recipe.outputs)} every ${recipe.cycle}s</p>`);
        const progress = r.progress ?? 0;
        lines.push(bar(progress / recipe.cycle));
      }
  
  if (def.storage) lines.push(`<p>Adds ${def.storage} storage</p>`);
  if (def.beds) lines.push(`<p>Beds ${w.colonists.filter((c) => c.bed === r.id).length}/${def.beds}${def.restBonus ? `. Sleepers rest and heal ${def.restBonus} times faster` : ''}</p>`);
  if (def.warmthBonus) lines.push(`<p>Adds +${def.warmthBonus} warmth radius to hearth</p>`);
  if (def.glow) lines.push(`<p>Its lamps light a radius of ${def.glow}.</p>`);
  if (def.heat) lines.push(`<p>Heats radius ${def.heat.radius} for ${def.heat.fuelPerMinute} fuel/min. ${r.status === 'ok' ? 'Running' : 'Needs fuel'}</p>`);
  if (def.indoor) lines.push('<p>People inside are safe while it stands.</p>');
  
  // Wall upgrade buttons
  lines.push('<h4>Walls</h4>');
  const edges = ['North', 'East', 'South', 'West'];
  r.walls.forEach((edge, edgeIdx) => {
    edge.forEach((seg, segIdx) => {
      const module = WALL_MODULES.find(m => m.wallType === seg.type);
      const current = module ? module.name : seg.type;
      lines.push(`<small>${edges[edgeIdx]} [${segIdx}]: ${current} (${Math.ceil(seg.hp)}/${seg.maxHp})</small> `);
      // Upgrade options
      WALL_MODULES.filter(m => m.wallType !== seg.type).forEach(m => {
        lines.push(`<button data-act="upgradeWall:${r.id}:${edgeIdx}:${segIdx}:${m.wallType}" class="small">${m.name} (${amounts(m.cost)})</button>`);
      });
      lines.push('<br>');
    });
  });
  
  // Remove room button
  lines.push(`<button data-act="removeRoom:${r.id}" class="alert">Remove room (50% refund)</button>`);
  
  return lines.join('');
}

function wallModuleHtml(_w: World, wm: WallModule): string {
  const def = WALL_MODULES.find(m => m.id === wm.moduleId);
  if (!def) return '';
  const built = wm.construct <= 0;
  const lines = [`<h3 class="with-icon">🛡️${def.name}</h3><p>Health ${Math.ceil(wm.hp)}/${def.hp}</p>`];
  
  if (!built) {
    lines.push(`<p>Being installed, ${Math.floor((1 - wm.construct / def.buildTime) * 100)}% done.</p>`);
    return lines.join('');
  }
  
  if (def.gun) lines.push(`<p>Gun: ${def.gun.name}, range ${def.gun.range}, damage ${def.gun.damage}, ${def.gun.interval}s per shot</p>`);
  if (def.lightRadius) lines.push(`<p>Spotlight radius ${def.lightRadius} tiles</p>`);
  if (def.wallType === 'trapDoor') lines.push('<p>Drops enemies into pit. 50 damage. Resets at dawn.</p>');
  
  lines.push(`<button data-act="removeWallModule:${wm.id}" class="alert">Remove (50% refund)</button>`);
  
  return lines.join('');
}

function upgradeButton(w: World, b: Building, label: string): string {
  const next = BUILDINGS[b.type].upgrades?.[b.level - 1];
  if (!next) return '';
  const error = buildingUpgradeError(w, b);
  return `<p>Costs ${amounts(next)}.</p>${error ? `<p class="alert">${error}</p>` : `<button data-act="stage:${b.id}">${label}</button>`}`;
}

function gunsHtml(w: World, b: Building): string {
  const def = BUILDINGS[b.type];
  const guns = def.guns!;
  const gun = guns[Math.min(b.level, guns.length) - 1];
  const next = guns[b.level];
  return `<p>${def.workers} x ${gun.name}: range ${gun.range}, damage ${gun.damage}. Each defender on duty fires one at night or when the alarm sounds.</p>
    ${next ? `<h4>Upgrade: ${next.name}</h4><p>Range ${next.range}, damage ${next.damage}.</p>${upgradeButton(w, b, 'Mount the heavy guns')}` : ''}`;
}

function sightHtml(w: World, b: Building): string {
  const sight = BUILDINGS[b.type].sight!;
  return `<p>Stage ${b.level} of ${sight.length}. Spots far places within ${sight[b.level - 1]} tiles. A squad must go to confirm them.</p>
    ${sight[b.level] ? `<p>Stage ${b.level + 1} sees ${sight[b.level]} tiles.</p>${upgradeButton(w, b, 'Build it higher')}` : ''}`;
}

function armoryHtml(w: World, b: Building): string {
  const choices = CRAFTABLE.map((id) => `<button data-act="craft:${b.id}:${id}" class="${b.craft === id ? 'on' : ''}">${WEAPONS[id].name}<small>${amounts(WEAPONS[id].cost)}</small></button>`).join('');
  const weapon = WEAPONS[b.craft];
  const rack = CRAFTABLE.map((id) => `${w.weapons[id]} ${WEAPONS[id].name.toLowerCase()}`).join(', ');
  const armed = CRAFTABLE.map((id) => `${w.colonists.filter((c) => c.weapon === id).length} ${WEAPONS[id].name.toLowerCase()}`).join(', ');
  return `<p>Crafting a ${weapon.name.toLowerCase()} every ${weapon.craft}s. Colonists pick up better weapons from the rack.</p>
    <div class="menu-row choices">${choices}</div>${bar(b.progress / weapon.craft)}<p>Rack: ${rack}.</p><p>Carried: ${armed}.</p>`;
}

/** The Hearth House: repairs, rooms, and what they give (section 5.5). */
function houseHtml(w: World): string {
  const lvl = BALANCE.hearth.levels[w.hearth.level - 1];
  const next = BALANCE.hearth.levels[w.hearth.level];
  const error = hearthUpgradeError(w);
  const rooms = w.rooms.filter(r => isRoomBuilt(r));
  const roomList = rooms.length
    ? rooms.map((r) => {
        const def = ROOMS.find(rd => rd.id === r.roomId);
        return `${def?.name || r.roomId}${isRoomBuilt(r) ? '' : ' (being built)'}`;
      }).join(', ')
    : 'None yet';
  return `<h3>Hearth House</h3><p>${lvl.name}, stage ${w.hearth.level} of ${BALANCE.hearth.levels.length}.</p>
    <p>Health ${Math.ceil(w.hearth.hp)}/${hearthStage(w).hp}. Warms a radius of ${lvl.radius} tiles. Burns ${lvl.fuelPerMinute} fuel per minute.</p>
    <p class="${w.hearth.lit ? '' : 'alert'}">${w.hearth.lit ? 'Burning' : 'Out of fuel'}</p>
    ${next ? `<h4>Next repair: ${next.name}</h4><p>Radius ${next.radius}, ${next.fuelPerMinute} fuel per minute, ${next.hp} health. Costs ${amounts(next.cost)}.</p>
      ${error ? `<p class="alert">${error}</p>` : '<button data-act="upgrade">Repair the house</button>'}` : '<p>The house is fully restored.</p>'}
    <h4>Rooms</h4><p>${roomList}.</p><p>Add rooms from the House tab of the build menu on the lot around the house. Rooms are safe shelter while they stand.</p>`;
}
