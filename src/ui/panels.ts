// Right side panel with tabs: colonists and expeditions (section 14).
import { BUILDINGS } from '../data/buildings';
import { ITEMS, POIS } from '../data/pois';
import { RESOURCE_NAMES, type Resource } from '../data/resources';
import { expeditionError } from '../sim/commands';
import { currentPhase } from '../sim/query';
import { expeditionRisk } from '../sim/systems/expeditions';
import type { World } from '../sim/world';
import type { UiState } from './hud';

export type Tab = 'colonists' | 'expeditions';

const bar = (v: number, label: string) => `<i class="bar" title="${label}"><b style="width:${Math.round(v * 100)}%"></b></i>`;
const loot = (a: Partial<Record<Resource, number>>) => Object.entries(a).map(([r, n]) => `${n} ${RESOURCE_NAMES[r as Resource].toLowerCase()}`).join(', ');

export function rightPanel(w: World, state: UiState): string {
  const tabs = (['colonists', 'expeditions'] as const)
    .map((t) => `<button data-act="tab:${t}" class="${state.tab === t ? 'on' : ''}">${t === 'colonists' ? 'Colonists' : 'Expeditions'}</button>`)
    .join('');
  return `<div class="tabs">${tabs}</div>${state.tab === 'colonists' ? colonists(w) : expeditions(w, state)}`;
}

function colonists(w: World): string {
  const work = currentPhase(w).work;
  return `${w.colonists
    .map((c) => {
      const job = w.buildings.find((b) => b.id === c.job);
      const task = c.expedition !== null ? 'On expedition' : c.asleep ? 'Sleeping' : !work && c.duty !== null ? 'On watch' : job && work ? BUILDINGS[job.type].name : 'Idle';
      return `<div class="colonist"><span>${c.name}</span><small>${task}</small>
        <div class="bars">${bar(c.health, 'Health')}${bar(c.hunger, 'Hunger')}${bar(c.rest, 'Rest')}${bar(c.warmth, 'Warmth')}</div></div>`;
    })
    .join('')}<p class="legend">Bars: health, hunger, rest, warmth</p>`;
}

function expeditions(w: World, state: UiState): string {
  const out: string[] = [];
  for (const ex of w.expeditions) {
    const def = POIS[w.pois[ex.poi].type];
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
    const rare = def.rare && !w.items[def.rare] ? ` May hold the ${ITEMS[def.rare]}.` : '';
    const finds = Object.keys(def.loot).map((r) => RESOURCE_NAMES[r as Resource].toLowerCase()).concat(def.survivors ? ['survivors'] : []).join(', ');
    out.push(`<button data-act="poi:${i}" class="row ${state.poi === i ? 'on' : ''}"><b>${def.name}</b>
      <small>Danger ${def.danger}, ${d} tiles away${p.clears ? `, searched ${p.clears} times` : ''}</small><small>Finds ${finds}.${rare}</small></button>`);
  });

  if (state.poi !== null) {
    const free = w.colonists.filter((c) => c.expedition === null);
    state.squad = state.squad.filter((id) => free.some((c) => c.id === id));
    const risk = expeditionRisk(w, POIS[w.pois[state.poi].type].danger, state.squad.length);
    const error = expeditionError(w, state.poi, state.squad);
    out.push(`<h4>Squad</h4><div class="chips">${free
      .map((c) => `<button data-act="squad:${c.id}" class="${state.squad.includes(c.id) ? 'on' : ''}">${c.name}</button>`)
      .join('')}</div>
      <p>Danger chance per search roll: ${Math.round(risk * 100)}%. Bigger squads lower it. Night triples it.</p>
      ${error ? `<p class="alert">${error}</p>` : `<button data-act="send">Send squad</button>`}`);
  }
  return out.join('');
}
