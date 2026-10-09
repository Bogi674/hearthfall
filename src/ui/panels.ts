// Right side panel with tabs: colonists, expeditions, and the airship (section 14).
import { BUILDINGS } from '../data/buildings';
import { EDGES } from '../data/house';
import { ITEMS, POIS } from '../data/pois';
import { COMPONENT_IDS, COMPONENTS, LAST_NIGHT } from '../data/vehicle';
import { WEAPONS } from '../data/weapons';
import { RESOURCE_NAMES, type Resource } from '../data/resources';
import { componentError, expeditionError, launchError } from '../sim/commands';
import { currentPhase, directionFromHearth } from '../sim/query';
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
  const name = (id: number | null) => {
    const b = w.buildings.find((b) => b.id === id);
    if (b) return BUILDINGS[b.type].name;
    if (w.house.floors.some((f) => f.id === id)) return 'house floor';
    const e = w.house.edges.find((e) => e.id === id);
    return e ? EDGES[e.kind].name.toLowerCase() : '';
  };
  return `${w.colonists
    .map((c) => {
      const task =
        c.expedition !== null ? 'On expedition'
        : c.task === 'sleep' ? 'Sleeping'
        : c.task === 'shelter' ? 'Taking shelter'
        : c.task === 'guard' ? `On watch at the ${name(c.duty)}`
        : c.task === 'build' || c.site !== null ? `Building the ${name(c.site)}`
        : c.job !== null && currentPhase(w).work ? name(c.job)
        : 'Idle';
      return `<div class="colonist"><span>${c.name}</span><small>${task}, ${WEAPONS[c.weapon].name.toLowerCase()}</small>
        <div class="bars">${bar(c.health, 'Health')}${bar(c.hunger, 'Hunger')}${bar(c.rest, 'Rest')}${bar(c.warmth, 'Warmth')}</div></div>`;
    })
    .join('')}<p class="legend">Bars: health, hunger, rest, warmth</p>`;
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
