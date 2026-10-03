// DOM overlay: top bar, build menu, selection panel, colonist list, event log, and game over screen.
// Reads world state and only changes the world through the command queue.
import { BALANCE } from '../data/balance';
import { BUILDING_TYPES, BUILDINGS, type BuildingCategory, type BuildingType } from '../data/buildings';
import { ENEMIES, ENEMY_TYPES } from '../data/enemies';
import { RECIPES } from '../data/recipes';
import { RESOURCE_NAMES, RESOURCES, type Amounts, type Resource } from '../data/resources';
import { COMPONENT_IDS, type ComponentId } from '../data/vehicle';
import { hearthUpgradeError, pushCommand } from '../sim/commands';
import { capacity, currentPhase, missing, stockTotal } from '../sim/query';
import type { BuildingStatus, World } from '../sim/world';
import { currentHint } from '../data/hints';
import { INTRO } from '../data/story';
import { menuHtml } from './menu';
import { rightPanel, type Tab } from './panels';
import type { Settings } from './settings';

export interface UiState {
  placing: BuildingType | null;
  rotated: boolean;
  selected: number | 'hearth' | null;
  speed: number;
  paused: boolean;
  buildOpen: boolean;
  buildCat: BuildingCategory;
  tab: Tab;
  /** POI picked in the expedition panel, and the colonists picked for the squad. */
  poi: number | null;
  squad: number[];
  menu: boolean;
  /** The intro story is open. The game waits until it closes. */
  intro: boolean;
}

/** What the HUD asks the main loop to do. */
export interface HudActions {
  focus(x: number, y: number): void;
  /** Saves and returns a short note for the menu. */
  save(): string;
  load(): void;
  newRun(): void;
  hasSave(): boolean;
  settings: Settings;
  settingsChanged(): void;
}

export const STATUS_TEXT: Partial<Record<BuildingStatus, string>> = {
  noWorkers: 'No workers',
  noDefender: 'No defender',
  noFuel: 'No fuel to light',
  noInput: 'Missing input',
  noResource: 'Nothing to gather nearby',
  tooCold: 'Too cold to work',
  storageFull: 'Storage full',
};

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const amounts = (a: Amounts) => Object.entries(a).map(([r, n]) => `${n} ${RESOURCE_NAMES[r as Resource]}`).join(' + ');

export function createHud(root: HTMLElement, state: UiState, world: () => World, actions: HudActions): { update(): void } {
  root.insertAdjacentHTML(
    'beforeend',
    `<div id="hud"><div id="topbar" class="panel"><div id="top"></div><div id="controls"></div></div><div id="left"><div id="selection" class="panel"></div><div id="log" class="panel"></div></div>
     <div id="center"><div id="forecast" class="panel"></div><div id="hint" class="panel"></div></div>
     <div id="right" class="panel"></div><div id="build" class="panel"></div></div><div id="over" class="panel"></div><div id="menu" class="panel"></div><div id="intro"></div>`,
  );
  const el = (id: string) => document.getElementById(id)!;
  const last = new Map<string, string>();
  let note = '';
  const set = (id: string, html: string) => {
    if (last.get(id) === html) return;
    last.set(id, html);
    el(id).innerHTML = html;
    el(id).style.display = html ? '' : 'none';
  };

  // Act on press, not on click. Panels re-render several times a second, and a button swapped
  // between press and release would lose its click.
  root.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const t = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
    if (!t || (t as HTMLButtonElement).disabled) return;
    const [act, arg, arg2] = t.dataset.act!.split(':');
    if (act === 'build') state.placing = state.placing === arg ? null : (arg as BuildingType);
    if (act === 'speed') [state.speed, state.paused] = arg === '0' ? [state.speed, !state.paused] : [Number(arg), false];
    if (act === 'workers') pushCommand(world().commands, { type: 'setWorkers', id: Number(arg), count: Number(arg2) });
    if (act === 'restart') location.reload();
    if (act === 'tab') state.tab = arg as Tab;
    if (act === 'cat') state.buildCat = arg as BuildingCategory;
    if (act === 'poi') state.poi = Number(arg);
    if (act === 'squad') state.squad = state.squad.includes(Number(arg)) ? state.squad.filter((id) => id !== Number(arg)) : [...state.squad, Number(arg)];
    if (act === 'send' && state.poi !== null) {
      pushCommand(world().commands, { type: 'sendExpedition', poi: state.poi, members: state.squad });
      state.squad = [];
    }
    if (act === 'recall') pushCommand(world().commands, { type: 'recall', id: Number(arg) });
    if (act === 'focus') actions.focus(Number(arg), Number(arg2));
    if (act === 'menu') [state.menu, note] = [!state.menu, ''];
    if (act === 'story') [state.intro, state.menu] = [true, false];
    if (act === 'begin') state.intro = false;
    if (act === 'save') note = actions.save();
    if (act === 'load') actions.load();
    if (act === 'new') actions.newRun();
    if (act === 'set') {
      const key = arg as 'autoPause' | 'hints';
      actions.settings[key] = !actions.settings[key];
      actions.settingsChanged();
    }
    if (act === 'volume') {
      actions.settings.volume = Math.min(1, Math.max(0, Math.round((actions.settings.volume + Number(arg) * 0.1) * 10) / 10));
      actions.settingsChanged();
    }
    if (act === 'component') pushCommand(world().commands, { type: 'buildComponent', component: arg as ComponentId });
    if (act === 'launch') pushCommand(world().commands, { type: 'launch' });
    if (act === 'upgrade') pushCommand(world().commands, { type: 'upgradeHearth' });
    api.update();
  });

  const api = {
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
         <span>Colonists ${w.colonists.length}</span><span class="${w.hope < BALANCE.hope.lowBelow ? 'alert' : ''}">Hope ${Math.round(w.hope)}</span>
         <span>Airship ${w.airship.built.length}/${COMPONENT_IDS.length}</span>${RESOURCES.map((r) => `<span>${RESOURCE_NAMES[r]} ${Math.floor(w.stock[r])}</span>`).join('')}
         <span>Storage ${Math.floor(stockTotal(w))}/${capacity(w)}</span>${hearth}`,
      );
      set('controls', `${speeds}<button data-act="menu">Menu</button>`);

      const cats: BuildingCategory[] = ['Shelter', 'Production', 'Defense', 'Escape'];
      set(
        'build',
        !state.buildOpen
          ? ''
          : `<div class="tabs">${cats.map((c) => `<button data-act="cat:${c}" class="${state.buildCat === c ? 'on' : ''}">${c}</button>`).join('')}</div>
             <div class="group">${BUILDING_TYPES.filter((t) => BUILDINGS[t].category === state.buildCat)
               .map(
                 (t) =>
                   `<button data-act="build:${t}" class="${state.placing === t ? 'on' : ''} ${missing(w, BUILDINGS[t].cost) ? 'poor' : ''}">${BUILDINGS[t].name}<small>${amounts(BUILDINGS[t].cost)}</small></button>`,
               )
               .join('')}</div>`,
      );

      set('forecast', forecastHtml(w));
      const hint = actions.settings.hints && !w.lost && !w.won ? currentHint(w) : null;
      set('hint', hint ? `<b>Next</b> ${hint.text}` : '');
      set('menu', state.menu ? menuHtml(actions.settings, actions.hasSave(), note) : '');
      set(
        'intro',
        state.intro
          ? `<div class="story"><h1>${INTRO.title}</h1>${INTRO.paragraphs.map((p) => `<p>${p}</p>`).join('')}<button data-act="begin">${INTRO.begin}</button></div>`
          : '',
      );
      set('selection', selectionHtml(w, state));
      set('right', rightPanel(w, state));
      set(
        'log',
        w.log
          .slice(-8)
          .reverse()
          .map((l) => `<div ${l.x !== undefined ? `class="link" data-act="focus:${l.x}:${l.y}"` : ''}>Day ${l.day}: ${l.text}</div>`)
          .join(''),
      );
      set('over', scoreHtml(w));
    },
  };
  return api;
}

const EDGES = ['north', 'east', 'south', 'west'];

/** Forecast bar (section 9.5): threat, edges, and enemy types by day, exact counts from dusk. */
function forecastHtml(w: World): string {
  const wave = w.wave;
  const phase = currentPhase(w);
  if (wave.final) return `<b class="alert">The Last Night</b><span>Threat ${wave.threat} plus the Horde Mother from every edge</span><span>${w.enemies.length} monsters out, ${wave.plan.length - wave.spawned} still coming</span>`;
  if (wave.threat === 0) return `<b>Night ${wave.night}</b> No attack expected.`;
  const exact = phase.name === 'Dusk' || phase.name === 'Night';
  const kinds = ENEMY_TYPES.filter((t) => wave.plan.includes(t))
    .map((t) => (exact ? `${wave.plan.filter((p) => p === t).length} ${ENEMIES[t].plural}` : ENEMIES[t].plural))
    .join(', ');
  const edges = wave.edges.map((e) => EDGES[e]).join(' and ');
  const when =
    phase.name === 'Day' ? `Attack in ${clock(phase.left + BALANCE.phases[1].seconds)}`
    : phase.name === 'Dusk' ? `Attack in ${clock(phase.left)}`
    : phase.name === 'Night' ? `${w.enemies.length} monsters out, ${wave.plan.length - wave.spawned} still coming`
    : 'The night is over';
  return `<b class="${wave.bloodMoon ? 'alert' : ''}">Night ${wave.night}${wave.bloodMoon ? ', Blood Moon' : ''}</b>
    <span>Threat ${wave.threat} from the ${edges}</span><span>${kinds}</span><span>${when}</span>`;
}

function selectionHtml(w: World, state: UiState): string {
  if (state.selected === 'hearth') {
    const lvl = BALANCE.hearth.levels[w.hearth.level - 1];
    return `<h3>Hearth</h3><p>Health ${Math.ceil(w.hearth.hp)}/${BALANCE.defense.hearthHp}</p><p>Level ${w.hearth.level}. Warms a radius of ${lvl.radius} tiles.</p><p>Burns ${lvl.fuelPerMinute} fuel per minute.</p>
      <p class="${w.hearth.lit ? '' : 'alert'}">${w.hearth.lit ? 'Burning' : 'Out of fuel'}</p>${upgradeHtml(w)}`;
  }
  const b = w.buildings.find((b) => b.id === state.selected);
  if (!b) return '';
  const def = BUILDINGS[b.type];
  const recipe = RECIPES[b.type];
  const crew = w.colonists.filter((c) => (def.nightDuty ? c.duty : c.job) === b.id).length;
  const lines = [`<h3>${def.name}</h3><p>Health ${Math.ceil(b.hp)}/${def.hp}</p>`];
  if (STATUS_TEXT[b.status]) lines.push(`<p class="alert">${STATUS_TEXT[b.status]}</p>`);
  if (def.workers > 0) {
    lines.push(`<p class="workers">${def.nightDuty ? 'Night defenders' : 'Workers'} ${crew}/${b.workers} of ${def.workers}
      <button data-act="workers:${b.id}:${b.workers - 1}">−</button><button data-act="workers:${b.id}:${b.workers + 1}">+</button></p>`);
  }
  if (recipe) {
    lines.push(`<p>${recipe.inputs ? `${amounts(recipe.inputs)} to ` : ''}${amounts(recipe.outputs)} every ${recipe.cycle}s</p>`);
    lines.push(`<i class="bar wide"><b style="width:${Math.round((b.progress / recipe.cycle) * 100)}%"></b></i>`);
  }
  if (def.beds) lines.push(`<p>Beds ${w.colonists.filter((c) => c.bed === b.id).length}/${def.beds}</p>`);
  if (def.storage) lines.push(`<p>Adds ${def.storage} storage</p>`);
  if (def.light) lines.push(`<p>Lights a radius of ${def.light.radius} at night for ${def.light.fuel} fuel. ${b.lit ? 'Lit' : 'Unlit'}</p>`);
  if (def.walkable) lines.push('<p>Hurts monsters that walk over it</p>');
  if (def.nightDuty) lines.push(`<p>Shoots monsters within ${BALANCE.defense.towerRange} tiles at night</p>`);
  return lines.join('');
}

function upgradeHtml(w: World): string {
  const next = BALANCE.hearth.levels[w.hearth.level];
  if (!next) return '<p>Fully upgraded.</p>';
  const error = hearthUpgradeError(w);
  return `<p>Level ${w.hearth.level + 1}: radius ${next.radius}, ${next.fuelPerMinute} fuel per minute. Costs ${amounts(next.cost)}.</p>
    ${error ? `<p class="alert">${error}</p>` : '<button data-act="upgrade">Upgrade the hearth</button>'}`;
}

/** Score screen (section 3.4 and M5): survivors, the left behind, and every death with its cause. */
function scoreHtml(w: World): string {
  if (!w.lost && !w.won) return '';
  const dead = w.dead.length
    ? `<h4>Lost along the way</h4><ul>${w.dead.map((d) => `<li>${d.name} ${d.cause}, day ${d.day}</li>`).join('')}</ul>`
    : '<p>Nobody died.</p>';
  const head = w.won
    ? `<h2>The airship launched</h2><p>Score ${w.won.score}. Day ${w.day}.</p><p>Aboard: ${w.won.aboard.join(', ') || 'nobody'}.</p>
       ${w.won.leftBehind.length ? `<p>Left behind: ${w.won.leftBehind.join(', ')}.</p>` : ''}`
    : `<h2>${w.lost}</h2><p>The colony lasted ${w.day} days.</p>`;
  return `${head}${dead}<button data-act="restart">Play again</button>`;
}
