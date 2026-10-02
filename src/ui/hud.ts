// DOM overlay: top bar, build menu, selection panel, colonist list, event log, and game over screen.
// Reads world state and only changes the world through the command queue.
import { BALANCE } from '../data/balance';
import { BUILDING_TYPES, BUILDINGS, type BuildingType } from '../data/buildings';
import { RECIPES } from '../data/recipes';
import { RESOURCE_NAMES, RESOURCES, type Amounts, type Resource } from '../data/resources';
import { pushCommand } from '../sim/commands';
import { capacity, currentPhase, missing, stockTotal } from '../sim/query';
import type { BuildingStatus, World } from '../sim/world';

export interface UiState {
  placing: BuildingType | null;
  rotated: boolean;
  selected: number | 'hearth' | null;
  speed: number;
  paused: boolean;
  buildOpen: boolean;
}

export const STATUS_TEXT: Partial<Record<BuildingStatus, string>> = {
  noWorkers: 'No workers',
  noInput: 'Missing input',
  noResource: 'Nothing to gather nearby',
  tooCold: 'Too cold to work',
  storageFull: 'Storage full',
};

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const amounts = (a: Amounts) => Object.entries(a).map(([r, n]) => `${n} ${RESOURCE_NAMES[r as Resource]}`).join(' + ');
const bar = (v: number, label: string) => `<i class="bar" title="${label}"><b style="width:${Math.round(v * 100)}%"></b></i>`;

export function createHud(root: HTMLElement, state: UiState, world: () => World): { update(): void } {
  root.insertAdjacentHTML(
    'beforeend',
    `<div id="hud"><div id="top" class="panel"></div><div id="left"><div id="selection" class="panel"></div><div id="log" class="panel"></div></div>
     <div id="right" class="panel"></div><div id="build" class="panel"></div></div><div id="over" class="panel"></div>`,
  );
  const el = (id: string) => document.getElementById(id)!;
  const last = new Map<string, string>();
  const set = (id: string, html: string) => {
    if (last.get(id) === html) return;
    last.set(id, html);
    el(id).innerHTML = html;
    el(id).style.display = html ? '' : 'none';
  };

  root.addEventListener('click', (e) => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
    if (!t) return;
    const [act, arg, arg2] = t.dataset.act!.split(':');
    if (act === 'build') state.placing = state.placing === arg ? null : (arg as BuildingType);
    if (act === 'speed') [state.speed, state.paused] = arg === '0' ? [state.speed, !state.paused] : [Number(arg), false];
    if (act === 'workers') pushCommand(world().commands, { type: 'setWorkers', id: Number(arg), count: Number(arg2) });
    if (act === 'restart') location.reload();
  });

  return {
    update() {
      const w = world();
      const phase = currentPhase(w);
      const next = BALANCE.phases[(BALANCE.phases.findIndex((p) => p.name === phase.name) + 1) % BALANCE.phases.length];
      const burn = BALANCE.hearth.levels[w.hearth.level - 1].fuelPerMinute / 60;
      const hearth = w.hearth.lit
        ? `<span>Hearth fuel ${clock(w.stock.fuel / burn)}</span>`
        : `<span class="alert">Hearth out. Lost in ${Math.ceil(BALANCE.hearth.outLossSeconds - w.hearth.outSeconds)}s</span>`;
      const speeds = [0, 1, 2, 3]
        .map((s) => `<button data-act="speed:${s}" class="${(s === 0 ? state.paused : !state.paused && state.speed === s) ? 'on' : ''}">${s === 0 ? 'Pause' : `${s}x`}</button>`)
        .join('');
      set(
        'top',
        `<span><b>Day ${w.day}</b> ${phase.name}, ${next.name} in ${clock(phase.left)}</span><span>${w.temperature}°</span>
         <span>Colonists ${w.colonists.length}</span>${RESOURCES.map((r) => `<span>${RESOURCE_NAMES[r]} ${Math.floor(w.stock[r])}</span>`).join('')}
         <span>Storage ${Math.floor(stockTotal(w))}/${capacity(w)}</span>${hearth}<span class="speeds">${speeds}</span>`,
      );

      set(
        'build',
        !state.buildOpen
          ? ''
          : (['Shelter', 'Production'] as const)
              .map(
                (cat) =>
                  `<div class="group"><h4>${cat}</h4>${BUILDING_TYPES.filter((t) => BUILDINGS[t].category === cat)
                    .map(
                      (t) =>
                        `<button data-act="build:${t}" class="${state.placing === t ? 'on' : ''} ${missing(w, BUILDINGS[t].cost) ? 'poor' : ''}">${BUILDINGS[t].name}<small>${amounts(BUILDINGS[t].cost)}</small></button>`,
                    )
                    .join('')}</div>`,
              )
              .join(''),
      );

      set('selection', selectionHtml(w, state));
      set(
        'right',
        `<h4>Colonists</h4>${w.colonists
          .map((c) => {
            const job = w.buildings.find((b) => b.id === c.job);
            return `<div class="colonist"><span>${c.name}</span><small>${c.asleep ? 'Sleeping' : job ? BUILDINGS[job.type].name : 'Idle'}</small>
              <div class="bars">${bar(c.health, 'Health')}${bar(c.hunger, 'Hunger')}${bar(c.rest, 'Rest')}${bar(c.warmth, 'Warmth')}</div></div>`;
          })
          .join('')}<p class="legend">Bars: health, hunger, rest, warmth</p>`,
      );
      set('log', w.log.slice(-8).reverse().map((l) => `<div>Day ${l.day}: ${l.text}</div>`).join(''));
      set('over', w.lost ? `<h2>${w.lost}</h2><p>The colony lasted ${w.day} days.</p><button data-act="restart">Try again</button>` : '');
    },
  };
}

function selectionHtml(w: World, state: UiState): string {
  if (state.selected === 'hearth') {
    const lvl = BALANCE.hearth.levels[w.hearth.level - 1];
    return `<h3>Hearth</h3><p>Level ${w.hearth.level}. Warms a radius of ${lvl.radius} tiles.</p><p>Burns ${lvl.fuelPerMinute} fuel per minute.</p>
      <p class="${w.hearth.lit ? '' : 'alert'}">${w.hearth.lit ? 'Burning' : 'Out of fuel'}</p>`;
  }
  const b = w.buildings.find((b) => b.id === state.selected);
  if (!b) return '';
  const def = BUILDINGS[b.type];
  const recipe = RECIPES[b.type];
  const crew = w.colonists.filter((c) => c.job === b.id).length;
  const lines = [`<h3>${def.name}</h3>`];
  if (STATUS_TEXT[b.status]) lines.push(`<p class="alert">${STATUS_TEXT[b.status]}</p>`);
  if (def.workers > 0) {
    lines.push(`<p class="workers">Workers ${crew}/${b.workers} of ${def.workers}
      <button data-act="workers:${b.id}:${b.workers - 1}">−</button><button data-act="workers:${b.id}:${b.workers + 1}">+</button></p>`);
  }
  if (recipe) {
    lines.push(`<p>${recipe.inputs ? `${amounts(recipe.inputs)} to ` : ''}${amounts(recipe.outputs)} every ${recipe.cycle}s</p>`);
    lines.push(`<i class="bar wide"><b style="width:${Math.round((b.progress / recipe.cycle) * 100)}%"></b></i>`);
  }
  if (def.beds) lines.push(`<p>Beds ${w.colonists.filter((c) => c.bed === b.id).length}/${def.beds}</p>`);
  if (def.storage) lines.push(`<p>Adds ${def.storage} storage</p>`);
  return lines.join('');
}
