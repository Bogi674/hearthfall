// Selection panel for the house and for buildings (section 14): status, workers, construction,
// guns, the armory, shelter, and upgrades. Every blocked building shows its reason.
import { BALANCE } from '../data/balance';
import { BUILDINGS } from '../data/buildings';
import { RECIPES } from '../data/recipes';
import { CRAFTABLE, WEAPONS } from '../data/weapons';
import { EDGES, FLOORS } from '../data/house';
import { buildingUpgradeError, hearthUpgradeError } from '../sim/commands';
import { houseRooms, lotRadius, roomHasTile, roomInfos } from '../sim/house';
import { hearthStage, isBuilt, missing } from '../sim/query';
import { nameOf, taskText } from './people';
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
  if (!b) return colonistHtml(w, selected as number) || edgeHtml(w, selected as number) || floorHtml(w, selected as number);
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
  if (BUILDINGS[b.type].furniture) return `<button data-act="remove:furniture:${b.id}">Remove</button><small class="note">Gives back half the cost.</small>`;
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

const meter = (label: string, v: number) => `<p class="meter"><span>${label}</span>${bar(v)}</p>`;

/** A colonist: needs, what they are doing, and where they sleep and work. */
function colonistHtml(w: World, id: number): string {
  const c = w.colonists.find((c) => c.id === id);
  if (!c) return '';
  const bed = c.bed === null ? undefined : w.buildings.find((b) => b.id === c.bed);
  return `<h3>${c.name}</h3><p>${taskText(w, c)}.</p>
    ${meter('Health', c.health)}${meter('Hunger', c.hunger)}${meter('Rest', c.rest)}${meter('Warmth', c.warmth)}
    <p>Works at: ${c.job === null ? 'nowhere' : nameOf(w, c.job)}. Sleeps: ${bed ? `in a ${BUILDINGS[bed.type].name.toLowerCase()}` : 'on a mat by the hearth'}.</p>
    <p>Carries a ${WEAPONS[c.weapon].name.toLowerCase()}.</p>`;
}

/** A wall, door, window, or gun port of the house: strength, who guards it, upgrades, and removal. */
function edgeHtml(w: World, id: number): string {
  const e = w.house.edges.find((e) => e.id === id);
  if (!e) return '';
  const level = EDGES[e.kind].levels[e.level - 1];
  const lines = [`<h3>${level.name}</h3><p>Health ${Math.ceil(e.hp)}/${level.hp}.</p>${bar(e.hp / level.hp)}`];
  if (e.construct > 0) lines.push(`<p>Being built, ${Math.floor((1 - e.construct / level.build) * 100)}% done.</p>`);
  if (e.pending) lines.push(`<p>Being changed to a ${EDGES[e.pending.kind].levels[e.pending.level - 1].name.toLowerCase()}.</p>`);
  if (e.kind === 'gunPort' && e.construct <= 0) {
    const defender = w.colonists.find((c) => c.duty === e.id);
    lines.push(`<p>Gun: ${level.gun!.name}, range ${level.gun!.range}, damage ${level.gun!.damage}.</p><p class="${defender ? '' : 'alert'}">${defender ? `${defender.name} fires it at night and at the alarm.` : 'No defender. Someone takes it when a colonist is free.'}</p>`);
  }
  if (e.kind === 'door') lines.push('<p>People walk through. Monsters break it, and it is the weakest piece, so they go for it.</p>');
  if (e.kind === 'window') lines.push('<p>Lets light through and stops people.</p>');
  if (e.construct <= 0 && !e.pending) {
    const next = EDGES[e.kind].levels[e.level];
    if (next) lines.push(`<p>Upgrade: ${next.name}. Costs ${amounts(next.cost)}.</p>${missing(w, next.cost) ? '<p class="alert">Not enough resources</p>' : `<button data-act="edge:${e.id}:${e.kind}:${e.level + 1}">Upgrade</button>`}`);
    if (e.kind === 'wall') {
      const port = EDGES.gunPort.levels[0];
      lines.push(`<button data-act="edge:${e.id}:gunPort:1" ${missing(w, port.cost) ? 'disabled' : ''}>Make a gun port</button><small class="note">${amounts(port.cost)}. A defender fires through it.</small>`);
    }
  }
  lines.push(`<button data-act="remove:edge:${e.id}">Remove</button><small class="note">Gives back half the cost.</small>`);
  return lines.join('');
}

/** A floor tile, with the room it belongs to. */
function floorHtml(w: World, id: number): string {
  const f = w.house.floors.find((f) => f.id === id);
  if (!f) return '';
  const room = roomInfos(w).find((r) => Math.abs(r.x - f.x) < 12 && Math.abs(r.y - f.y) < 12 && roomHasTile(w, r, f.x, f.y));
  const lines = [`<h3>${FLOORS[f.kind].name}</h3>`];
  if (f.construct > 0) lines.push(`<p>Being built, ${Math.floor((1 - f.construct / FLOORS[f.kind].build) * 100)}% done.</p>`);
  if (room) {
    lines.push(`<p>${room.name}. ${room.floors} floor tiles, ${room.beds} bed${room.beds === 1 ? '' : 's'}, ${room.seats} seat${room.seats === 1 ? '' : 's'}, ${room.decor} decor.</p>`);
    lines.push(`<p class="${room.closed && !room.note ? '' : 'alert'}">${room.closed ? (room.note || 'Closed. People inside are safe while the walls stand.') : room.note}</p>`);
  }
  lines.push(`<button data-act="remove:floor:${f.id}">Remove</button><small class="note">Gives back half the cost.</small>`);
  return lines.join('');
}
