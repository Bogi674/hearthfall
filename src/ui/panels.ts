// Right side panel with tabs: colonists, expeditions, and the airship (section 14).
import { ITEMS, POIS } from '../data/pois';
import { BERTH, BLUEPRINT, COMPONENT_IDS, COMPONENTS, LAST_NIGHT, PAD } from '../data/vehicle';
import { WEAPONS } from '../data/weapons';
import { taskText } from './people';
import { RESOURCE_NAMES, type Resource } from '../data/resources';
import { berthError, componentError, expeditionError, launchError } from '../sim/commands';
import { directionFromHearth, seatCount } from '../sim/query';
import { expeditionRisk } from '../sim/systems/expeditions';
import type { World } from '../sim/world';
import type { UiState } from './hud';

export type Tab = 'colonists' | 'expeditions' | 'airship';
const TAB_NAMES: Record<Tab, string> = { colonists: 'Colonists', expeditions: 'Expeditions', airship: 'Airship' };

const bar = (v: number, label: string) => `<i class="bar" title="${label}"><b style="width:${Math.round(v * 100)}%"></b></i>`;
const loot = (a: Partial<Record<Resource, number>>) => Object.entries(a).map(([r, n]) => `${n} ${RESOURCE_NAMES[r as Resource].toLowerCase()}`).join(', ');

export function rightPanel(w: World, state: UiState): string {
  const tabs = (Object.keys(TAB_NAMES) as Tab[])
    .map((t) => `<button data-act="tab:${t}" class="${state.tab === t ? 'on' : ''}">${TAB_NAMES[t]}</button>`)
    .join('');
  const body = state.tab === 'colonists' ? colonists(w) : state.tab === 'expeditions' ? expeditions(w, state) : airship(w);
  return `<div class="tabs">${tabs}</div>${body}`;
}

function colonists(w: World): string {
  return `${w.colonists
    .map((c) => `<button data-act="focus:${Math.round(c.x)}:${Math.round(c.y)}" class="colonist"><span>${c.name}</span><small>${taskText(w, c)}, ${WEAPONS[c.weapon].name.toLowerCase()}</small>
        <div class="bars">${bar(c.health, 'Health')}${bar(c.hunger, 'Hunger')}${bar(c.rest, 'Rest')}${bar(c.warmth, 'Warmth')}</div></button>`)
    .join('')}<p class="legend">Bars: health, hunger, rest, warmth. Click a colonist to find them.</p>`;
}

function expeditions(w: World, state: UiState): string {
  const out: string[] = [];
  for (const ex of w.expeditions) {
    const poi = w.pois[ex.poi];
    const def = { name: poi.seen === 'known' ? POIS[poi.type].name : 'Unconfirmed sighting' };
    const names = w.colonists.filter((c) => ex.members.includes(c.id)).map((c) => c.name).join(', ');
    const doing = ex.stage === 'out' ? 'Walking out' : ex.stage === 'search' ? `Searching, ${Math.ceil(ex.searchLeft)}s left` : 'Coming home';
    const carrying = [loot(ex.loot), ...ex.items.map((i) => ITEMS[i])].filter(Boolean).join(', ');
    out.push(`<div class="card"><b>${def.name}</b><small>${names}</small><small>${doing}${carrying ? `. Carrying ${carrying}` : ''}</small>
      ${ex.stage !== 'back' ? `<button data-act="recall:${ex.id}">Recall</button>` : ''}</div>`);
  }

  out.push('<h4>Places</h4>');
  w.pois.forEach((p, i) => {
    const def = POIS[p.type];
    const d = Math.round(Math.hypot(p.x - w.hearth.x, p.y - w.hearth.y));
    // Hidden places are not listed. Rumors give only a direction until a squad confirms them (section 10.4).
    if (p.seen === 'hidden') return;
    if (p.seen === 'rumored') {
      out.push(`<button data-act="poi:${i}" class="row ${state.poi === i ? 'on' : ''}"><b>Unconfirmed sighting</b>
        <small>To the ${directionFromHearth(w, p.x, p.y)}, ${d} tiles away. Danger unknown.</small><small>Send a squad to find out what it is.</small></button>`);
      return;
    }
    const rare = def.rare && !w.items[def.rare] ? ` May hold the ${ITEMS[def.rare]}.` : '';
    const finds = Object.keys(def.loot).map((r) => RESOURCE_NAMES[r as Resource].toLowerCase()).concat(def.survivors ? ['survivors'] : []).join(', ');
    out.push(`<button data-act="poi:${i}" class="row ${state.poi === i ? 'on' : ''}"><b>${def.name}</b>
      <small>Danger ${def.danger}, ${d} tiles away${p.clears ? `, searched ${p.clears} times` : ''}</small><small>Finds ${finds}.${rare}</small></button>`);
  });

  if (state.poi !== null) {
    const free = w.colonists.filter((c) => c.expedition === null);
    state.squad = state.squad.filter((id) => free.some((c) => c.id === id));
    const target = w.pois[state.poi];
    const risk = expeditionRisk(w, POIS[target.type].danger, state.squad.length);
    const error = expeditionError(w, state.poi, state.squad);
    out.push(`<h4>Squad</h4><div class="chips">${free
      .map((c) => `<button data-act="squad:${c.id}" class="${state.squad.includes(c.id) ? 'on' : ''}">${c.name}</button>`)
      .join('')}</div>
      <p>${target.seen === 'known' ? `Danger chance per search roll: ${Math.round(risk * 100)}%.` : 'The danger is unknown until the squad arrives.'} Bigger squads lower it. Night triples it.</p>
      ${error ? `<p class="alert">${error}</p>` : `<button data-act="send">Send squad</button>`}`);
  }
  return out.join('');
}

function airship(w: World): string {
  const air = w.airship;
  const out = [`<p>Built ${air.built.length} of ${COMPONENT_IDS.length} components.</p>`];
  // The old owner's blueprint, the choice of where the airship rises, and the seats aboard (section 11.2).
  if (!air.blueprint) {
    out.push(`<div class="card"><b>The blueprint</b><small>Somewhere in the old house are plans for a balloon craft. Repair the house to stage ${BLUEPRINT.hearthLevel} and keep hope at ${BLUEPRINT.hope} or more.</small></div>`);
    return out.join('');
  }
  if (!air.site) {
    out.push(`<div class="card"><b>The Moot</b><small>The crew found the plans. Choose where the airship will rise. The pad is ${PAD.size} by ${PAD.size} tiles with open ground around it, within ${PAD.maxDistance} tiles of the house.</small><button data-act="tool:site">Choose the launch site</button></div>`);
  } else if (!w.buildings.some((b) => b.type === 'airshipDock')) {
    const { x, y } = air.site;
    const inWay = w.buildings.filter((b) => b.x < x + PAD.size + PAD.apron && x - PAD.apron < b.x + b.w && b.y < y + PAD.size + PAD.apron && y - PAD.apron < b.y + b.h);
    out.push(`<div class="card"><b>Launch site chosen</b><small>Build the Launch Pad from the Escape tab. The ground around it is kept free.</small>
      ${inWay.length ? `<small class="alert">${inWay.length} building${inWay.length > 1 ? 's' : ''} in the way. Colonists take them apart and bring back 75 percent of the cost.</small><button data-act="clearpad">Clear the ground</button>` : ''}
      <button data-act="focus:${x + 3}:${y + 3}">Show me</button><button data-act="tool:site">Choose another</button></div>`);
  }
  const seats = seatCount(w);
  out.push(`<p>Seats ${seats} for ${w.colonists.length} colonists.${seats && seats < w.colonists.length ? ' Anyone without a seat is left behind.' : ''}</p>`);
  const berthIssue = berthError(w);
  out.push(`<div class="card"><b>${BERTH.name}</b><small>Adds ${BERTH.seats} seats. ${air.berths} of ${BERTH.max} built. Needs ${loot(BERTH.cost)}.</small>
    ${air.building === 'berth' ? `<small>Building, ${Math.floor((air.progress / BERTH.seconds) * 100)}%</small>` : berthIssue ? `<small class="alert">${berthIssue}</small>` : '<button data-act="berth">Build</button>'}</div>`);
  for (const id of COMPONENT_IDS) {
    const def = COMPONENTS[id];
    const needs = [loot(def.cost), def.item ? `the ${ITEMS[def.item]}${w.items[def.item] ? '' : ' (not found yet)'}` : ''].filter(Boolean).join(', ');
    const error = componentError(w, id);
    const state = air.built.includes(id)
      ? '<small>Built</small>'
      : air.building === id
        ? `<small>Building, ${Math.floor((air.progress / def.seconds) * 100)}%</small>`
        : error
          ? `<small class="alert">${error}</small>`
          : `<button data-act="component:${id}">Build</button>`;
    const info = air.built.includes(id) ? '' : `<small>Needs ${needs}</small>${def.hope ? `<small>Hope plus ${def.hope}</small>` : ''}`;
    out.push(`<div class="card"><b>${def.name}</b>${info}${state}</div>`);
  }
  const launch = air.launch;
  out.push(`<h4>The Last Night</h4><p>Load ${LAST_NIGHT.fuel} fuel over ${LAST_NIGHT.seconds} seconds while the final horde attacks.
    Colonists board in the last ${LAST_NIGHT.boardSeconds} seconds. Defenders on night duty stay at their post and are left behind.</p>`);
  if (launch) out.push(`<p>Fuel loaded ${Math.floor(launch.fuel)}/${LAST_NIGHT.fuel}. ${Math.max(0, Math.ceil(LAST_NIGHT.seconds - launch.elapsed))}s left.</p>`);
  else {
    const error = launchError(w);
    out.push(error ? `<p class="alert">${error}</p>` : '<button data-act="launch">Begin the launch</button>');
  }
  return out.join('');
}
