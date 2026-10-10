// Selection panel for the house and for buildings (section 14): status, workers, construction,
// guns, the armory, shelter, and upgrades. Every blocked building shows its reason.
import { BALANCE } from '../data/balance';
import { BUILDINGS } from '../data/buildings';
import { RECIPES } from '../data/recipes';
import { CRAFTABLE, WEAPONS } from '../data/weapons';
import { EDGES, FLOORS } from '../data/house';
import { buildingUpgradeError } from '../sim/commands';
import { hearthUpgradeError, lightError, moveCost } from '../sim/hearth';
import { edgeRepair, furnitureRepair, roofPatchable } from '../sim/mend';
import { HOUSE } from '../data/house';
import { BLUEPRINT, STASH_SITE } from '../data/vehicle';
import { roomHasTile, roomInfos } from '../sim/house';
import { hearthStage, isBuilt, missing } from '../sim/query';
import { nameOf, taskText } from './people';
import type { Building, BuildingStatus, World } from '../sim/world';
import { amounts } from './build';
import type { Amounts } from '../data/resources';
import { BUILDING_ICONS } from './icons';
import { BUILDING_INFO } from '../data/descriptions';
import { statLines } from './stats';
import { SCAVENGE } from '../data/wild';
import { scavengeError } from '../sim/manage';

export const STATUS_TEXT: Partial<Record<BuildingStatus, string>> = {
  broken: 'Broken. Mend it',
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

export function selectionHtml(w: World, selected: number | 'hearth' | 'stash' | null): string {
  if (selected === 'hearth') return houseHtml(w);
  if (selected === 'stash') return stashHtml(w);
  const b = w.buildings.find((b) => b.id === selected);
  if (!b) return colonistHtml(w, selected as number) || edgeHtml(w, selected as number) || floorHtml(w, selected as number);
  const def = BUILDINGS[b.type];
  const lines = [`<h3 class="with-icon">${BUILDING_ICONS[b.type]}${def.name}</h3><p class="desc">${BUILDING_INFO[b.type]}</p><p>Health ${Math.ceil(b.hp)}/${def.hp}</p>`];
  if (!isBuilt(b)) {
    const builders = w.colonists.filter((c) => c.site === b.id && c.task === 'build').length;
    lines.push(`<p>Being built, ${Math.floor((1 - b.construct / def.build) * 100)}% done. ${builders} building now.</p>${bar(1 - b.construct / def.build)}`);
    lines.push(`<p class="${builders ? '' : 'alert'}">${builders ? 'Colonists without a job help build.' : 'Nobody is building. Free up a colonist by lowering workers elsewhere.'}</p>`);
    lines.push(isBuilt(b) || b.salvage !== null ? salvageHtml(b) : `<button data-act="cancelbuild:${b.id}">Cancel construction</button><small class="note">${b.construct >= def.build ? 'Nothing is built yet, so all of the cost comes back.' : 'Half of the cost comes back.'}</small>`);
    return lines.join('');
  }
  if (STATUS_TEXT[b.status]) lines.push(`<p class="alert">${STATUS_TEXT[b.status]}</p>`);
  if (def.furniture) lines.push(repairHtml(w, b.repair !== null, furnitureRepair(b), `mend:furniture:${b.id}`, b.broken ? 'Broken. It does nothing until it is mended.' : ''));
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
  lines.push(`<details class="stats"><summary>Facts</summary><ul>${statLines(b.type).map((l) => `<li>${l}</li>`).join('')}</ul></details>`);
  lines.push(salvageHtml(b));
  return lines.join('');
}

/** The repair button of a worn piece with its cost, or the note that builders are on it. */
function repairHtml(w: World, working: boolean, plan: { cost: Amounts; seconds: number } | null, act: string, note = ''): string {
  if (working) return '<p>Builders are mending it.</p>';
  if (!plan) return note ? `<p class="alert">${note}</p>` : '';
  const short = missing(w, plan.cost);
  return `${note ? `<p class="alert">${note}</p>` : ''}${short ? `<p class="alert">Mending costs ${amounts(plan.cost)}. Not enough resources</p>` : `<button data-act="${act}">Mend</button><small class="note">Costs ${amounts(plan.cost)}.</small>`}`;
}

/** Deconstruct and move buttons for a finished building. Builders do the work (M13). */
function salvageHtml(b: Building): string {
  const def = BUILDINGS[b.type];
  if (def.furniture) return `<button data-act="remove:furniture:${b.id}">Remove</button><small class="note">Gives back ${b.ruin ? 'most of' : 'half'} the cost.</small>`;
  if (b.salvage !== null) {
    return `<p class="alert">${b.move ? 'The crew is taking it down to move it.' : 'Marked to be taken apart.'}</p><button data-act="salvage:${b.id}">${b.move ? 'Keep it here' : 'Keep it'}</button>`;
  }
  const move = b.type === 'airshipDock' || !isBuilt(b) ? '' : `<button data-act="movebuilding:${b.id}">Move</button>`;
  return `${move}<button data-act="salvage:${b.id}">Deconstruct</button><small class="note">Colonists without a job do it. Moving costs nothing but time. Deconstructing brings back 75 percent of the cost.</small>`;
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

/** The hearth: its state, light, move, and upgrade (M12). */
function houseHtml(w: World): string {
  const lvl = BALANCE.hearth.levels[w.hearth.level - 1];
  const next = BALANCE.hearth.levels[w.hearth.level];
  const error = hearthUpgradeError(w);
  const rooms = roomInfos(w).filter((r) => r.roofed).length;
  const state = w.hearth.lit ? 'Burning' : w.hearth.ignited ? 'Out of fuel' : w.hearth.lighting !== null ? 'Someone is lighting it' : 'Smoldering. Someone has to light it';
  const light = w.hearth.ignited ? '' : lightError(w) ? `<p class="alert">${lightError(w)}</p>` : `<button data-act="light">Light the fire</button><small class="note">Takes ${BALANCE.hearth.lightFuel} fuel and a few seconds of kindling.</small>`;
  const cost = moveCost(w);
  const move = w.hearthSite
    ? `<p>A new place is being built. The old hearth keeps burning until it is done.</p><button data-act="cancelmove">Cancel the move</button>`
    : `<button data-act="move">Move the hearth</button><small class="note">Costs ${amounts(cost)}. Pick a tile with the cursor.</small>`;
  return `<h3>${lvl.name}</h3><p>Stage ${w.hearth.level} of ${BALANCE.hearth.levels.length}.</p>
    <p>Health ${Math.ceil(w.hearth.hp)}/${hearthStage(w).hp}. Warms a radius of ${lvl.radius} tiles. Burns ${lvl.fuelPerMinute} fuel per minute.</p>
    <p class="${w.hearth.lit ? '' : 'alert'}">${state}</p>${light}
    ${next ? `<h4>Next stage: ${next.name}</h4><p>Radius ${next.radius}, ${next.fuelPerMinute} fuel per minute, ${next.hp} health. ${next.stands === 'room' ? 'Must stand in a closed room with a whole roof. ' : next.stands === 'floor' ? 'Must stand on a house floor. ' : ''}Costs ${amounts(next.cost)}.</p>
      ${error ? `<p class="alert">${error}</p>` : '<button data-act="upgrade">Upgrade the hearth</button>'}` : '<p>The hearth is fully upgraded.</p>'}
    <h4>Move it</h4>${move}
    <p>${rooms > 0 ? `${rooms} closed room${rooms > 1 ? 's' : ''} with a whole roof on the map.` : 'No closed room has a whole roof yet.'} Mend the old house from the Structure tab. Walls hold heat in and shade the ground behind them.</p>`;
}

/** The stash found under a loose board (M12). */
function stashHtml(w: World): string {
  const s = w.stash;
  if (!s) return '';
  const crew = w.colonists.filter((c) => c.site === STASH_SITE && c.task === 'build').length;
  return `<h3>Locked tin box</h3><p>It lay under a loose board. ${s.state === 'opened' ? 'It is open.' : `The crew is opening it, ${Math.floor((1 - s.open / BLUEPRINT.openSeconds) * 100)}% done. ${crew} working now.`}</p>${bar(1 - s.open / BLUEPRINT.openSeconds)}`;
}

/** The scavenge button of a ruined house, with how far it is and whether it was searched (M13). */
function scavengeHtml(w: World, house: World['houses'][number]): string {
  const d = Math.round(Math.hypot(house.x + house.w / 2 - w.hearth.x, house.y + house.d / 2 - w.hearth.y));
  const error = scavengeError(w, house.id);
  const state = house.state === 'working' ? `<p>The crew is searching it, ${Math.floor((1 - house.left / SCAVENGE.seconds) * 100)}% done.</p>` : house.state === 'looted' ? '<p>Searched. Nothing is left.</p>' : '';
  return `<h4>A ruined house, ${d} tiles from the fire</h4>${state}${house.state === 'fresh' ? (error ? `<p class="alert">${error}</p>` : `<button data-act="scavenge:${house.id}">Scavenge it</button><small class="note">Two colonists search it for food, scrap, and sometimes more. Houses farther out hold more, and it is colder there.</small>`) : ''}`;
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
  if (e.ruin) lines.push('<p>Part of the old house.</p>');
  if (e.construct > 0) lines.push(`<p>Being built, ${Math.floor((1 - e.construct / level.build) * 100)}% done.</p>`);
  lines.push(repairHtml(w, e.repair !== null, edgeRepair(e), `mend:edge:${e.id}`, e.hp < level.hp * 0.5 && e.construct <= 0 ? 'Worn through. Monsters break it fast.' : ''));
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
  lines.push(`<button data-act="remove:edge:${e.id}">Remove</button><small class="note">Gives back ${e.ruin ? 'most of' : 'half'} the cost.</small>`);
  return lines.join('');
}

/** A floor tile, with the room it belongs to. */
function floorHtml(w: World, id: number): string {
  const f = w.house.floors.find((f) => f.id === id);
  if (!f) return '';
  const room = roomInfos(w).find((r) => Math.abs(r.x - f.x) < 12 && Math.abs(r.y - f.y) < 12 && roomHasTile(w, r, f.x, f.y));
  const lines = [`<h3>${FLOORS[f.kind].name}</h3>`];
  if (f.ruin) lines.push('<p>Part of the old house.</p>');
  if (f.roofWork !== null) lines.push('<p>Builders are patching the roof.</p>');
  else if (roofPatchable(f)) lines.push(`<p class="alert">The roof is open. Snow falls in and the room cannot hold heat.</p>${missing(w, HOUSE.roofPatch.cost) ? `<p class="alert">A patch costs ${amounts(HOUSE.roofPatch.cost)}. Not enough resources</p>` : `<button data-act="mend:roof:${f.id}">Patch the roof</button><small class="note">Costs ${amounts(HOUSE.roofPatch.cost)}.</small>`}`);
  if (f.construct > 0) lines.push(`<p>Being built, ${Math.floor((1 - f.construct / FLOORS[f.kind].build) * 100)}% done.</p>`);
  if (room) {
    lines.push(`<p>${room.name}. ${room.floors} floor tiles, ${room.beds} bed${room.beds === 1 ? '' : 's'}, ${room.seats} seat${room.seats === 1 ? '' : 's'}, ${room.decor} decor.</p>`);
    lines.push(`<p class="${room.closed && !room.note ? '' : 'alert'}">${room.closed ? (room.note || 'Closed. People inside are safe while the walls stand.') : room.note}</p>`);
  }
  const house = w.houses.find((h) => f.x >= h.x - 1 && f.x <= h.x + h.w && f.y >= h.y - 1 && f.y <= h.y + h.d && f.storey === 0);
  if (house) lines.push(scavengeHtml(w, house));
  lines.push(`<button data-act="remove:floor:${f.id}">Remove</button><small class="note">Gives back ${f.ruin ? 'most of' : 'half'} the cost.</small>`);
  return lines.join('');
}
