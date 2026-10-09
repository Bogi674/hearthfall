// Selection panel for the house and for buildings (section 14): status, workers, construction,
// guns, the armory, shelter, and upgrades. Every blocked building shows its reason.
import { BALANCE } from '../data/balance';
import { BUILDINGS } from '../data/buildings';
import { RECIPES } from '../data/recipes';
import { CRAFTABLE, WEAPONS } from '../data/weapons';
import { buildingUpgradeError, hearthUpgradeError } from '../sim/commands';
import { houseRooms, lotRadius } from '../sim/house';
import { hearthStage, isBuilt } from '../sim/query';
import type { Building, BuildingStatus, World } from '../sim/world';
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
  const b = w.buildings.find((b) => b.id === selected);
  if (!b) return '';
  const def = BUILDINGS[b.type];
  const lines = [`<h3 class="with-icon">${BUILDING_ICONS[b.type]}${def.name}</h3><p>Health ${Math.ceil(b.hp)}/${def.hp}</p>`];
  if (!isBuilt(b)) {
    const builders = w.colonists.filter((c) => c.site === b.id && c.task === 'build').length;
    lines.push(`<p>Being built, ${Math.floor((1 - b.construct / def.build) * 100)}% done. ${builders} building now.</p>${bar(1 - b.construct / def.build)}`);
    lines.push(`<p class="${builders ? '' : 'alert'}">${builders ? 'Colonists without a job help build.' : 'Nobody is building. Free up a colonist by lowering workers elsewhere.'}</p>`);
    lines.push(salvageHtml(b));
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
  lines.push(salvageHtml(b));
  return lines.join('');
}

/** Taking a building apart returns most of its cost (section 8.2). */
function salvageHtml(b: Building): string {
  if (b.type === 'supplyCart') return '';
  return b.salvage !== null
    ? `<p class="alert">Marked to be taken apart.</p><button data-act="salvage:${b.id}">Keep it</button>`
    : `<button data-act="salvage:${b.id}">Take apart</button><small class="note">Colonists without a job do it and bring back 75 percent of the cost.</small>`;
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

/** The Hearth House: repairs, the house lot, and its rooms (section 5.6). */
function houseHtml(w: World): string {
  const lvl = BALANCE.hearth.levels[w.hearth.level - 1];
  const next = BALANCE.hearth.levels[w.hearth.level];
  const error = hearthUpgradeError(w);
  const rooms = houseRooms(w).filter((r) => r.floorCount > 0).length - 1;
  const sites = w.house.floors.filter((f) => f.construct > 0).length + w.house.edges.filter((e) => e.construct > 0).length;
  return `<h3>Hearth House</h3><p>${lvl.name}, stage ${w.hearth.level} of ${BALANCE.hearth.levels.length}.</p>
    <p>Health ${Math.ceil(w.hearth.hp)}/${hearthStage(w).hp}. Warms a radius of ${lvl.radius} tiles. Burns ${lvl.fuelPerMinute} fuel per minute.</p>
    <p class="${w.hearth.lit ? '' : 'alert'}">${w.hearth.lit ? 'Burning' : 'Out of fuel'}</p>
    ${next ? `<h4>Next repair: ${next.name}</h4><p>Radius ${next.radius}, ${next.fuelPerMinute} fuel per minute, ${next.hp} health. Costs ${amounts(next.cost)}.</p>
      ${error ? `<p class="alert">${error}</p>` : '<button data-act="upgrade">Repair the house</button>'}` : '<p>The house is fully restored.</p>'}
    <h4>The house lot</h4><p>The lot reaches ${lotRadius(w)} tiles from the hearth. ${rooms > 0 ? `${rooms} closed room${rooms > 1 ? 's' : ''} so far.` : 'No closed rooms yet.'}${sites ? ` ${sites} pieces are waiting for builders.` : ''}</p>
    <p>Build floors, walls, and doors from the Structure tab, and furniture from the Furniture tab. People in a closed room are safe while its walls stand.</p>`;
}
