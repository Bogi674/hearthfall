// DOM overlay: top bar, build menu, selection panel, colonist list, event log, and game over screen.
// Reads world state and only changes the world through the command queue.
import { BALANCE } from '../data/balance';
import { type BuildingType } from '../data/buildings';
import { ENEMIES, ENEMY_TYPES } from '../data/enemies';
import type { EdgeKind } from '../data/house';
import { RESOURCE_NAMES, RESOURCES } from '../data/resources';
import { COMPONENT_IDS, PAD, type ComponentId } from '../data/vehicle';
import type { WeaponId } from '../data/weapons';
import type { WallMode } from '../render/houseView';
import type { SlotId } from '../save/save';
import { pushCommand } from '../sim/commands';
import { maxStorey } from '../sim/house';
import { capacity, currentPhase, fuelFactor, stockTotal } from '../sim/query';
import type { World } from '../sim/world';
import { currentHint } from '../data/hints';
import { INTRO } from '../data/story';
import { buildMenuHtml, parseTool, toolId as toolIdOf, type BuildCat, type HouseTool } from './build';
import { menuHtml, titleHtml, type MenuView } from './menu';
import { rightPanel, type Tab } from './panels';
import { selectionHtml } from './selection';
import type { Settings } from './settings';

export interface UiState {
  placing: BuildingType | null;
  /** The building the cursor is over in the build menu, for the facts card (M13). */
  info: BuildingType | null;
  /** The house tool in hand: a floor, a wall, a door, a window, or remove. */
  tool: HouseTool | null;
  rotated: boolean;
  /** Wall display: all walls up, only the back walls, or every wall cut low. Cycled with V (section 12.6). */
  walls: WallMode;
  /** Held with Tab to look inside with every wall cut down. */
  peek: boolean;
  /** The storey being built on and selected from. 0 is the ground floor (M11). */
  storey: number;
  /** Show every storey, or only up to the current one. Toggled with L. */
  levels: 'all' | 'current';
  /** Drag out shapes with the house tools: a rectangle of floor, a run of wall, an area to clear. Toggled with Z. */
  fill: boolean;
  /** Names and warnings are drawn over the rooms of the house. Toggled with H. */
  rooms: boolean;
  selected: number | 'hearth' | 'stash' | null;
  speed: number;
  paused: boolean;
  buildOpen: boolean;
  buildCat: BuildCat;
  tab: Tab;
  /** POI picked in the expedition panel, and the colonists picked for the squad. */
  poi: number | null;
  squad: number[];
  menu: boolean;
  /** The intro story is open. The game waits until it closes. */
  intro: boolean;
  /** The title screen is open before a run starts. */
  title: boolean;
  view: MenuView;
  /** Map number shown on the new game screen. */
  seed: string;
}

/** What the HUD asks the main loop to do. */
export interface HudActions {
  focus(x: number, y: number): void;
  /** Saves to a slot and returns a short note for the menu. */
  save(slot: SlotId): string;
  load(slot: SlotId): void;
  remove(slot: SlotId): void;
  continueRun(): void;
  hasSave(): boolean;
  newGame(seed: number): void;
  exportSave(): void;
  importSave(): void;
  toTitle(): void;
  settings: Settings;
  settingsChanged(): void;
}

export const WALL_MODES: WallMode[] = ['up', 'cut', 'down'];
const WALL_NAMES: Record<WallMode, string> = { up: 'Walls up', cut: 'Walls cut', down: 'Walls down' };

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export function createHud(root: HTMLElement, state: UiState, world: () => World, actions: HudActions): { update(): void; say(text: string): void } {
  root.insertAdjacentHTML(
    'beforeend',
    `<div id="hud"><div id="topbar" class="panel"><div id="top"></div><div id="controls"></div></div><div id="left"><div id="selection" class="panel"></div><div id="log" class="panel"></div></div>
     <div id="center"><div id="forecast" class="panel"></div><div id="hint" class="panel"></div></div>
     <div id="right" class="panel"></div><div id="build" class="panel"></div></div><div id="over" class="panel"></div><div id="menu" class="panel"></div><div id="title"></div><div id="intro"></div>`,
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

  // The facts card follows the cursor over the build menu.
  root.addEventListener('mouseover', (e) => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('[data-act^="build:"]');
    const type = t ? (t.dataset.act!.split(':')[1] as BuildingType) : null;
    if (state.info !== type) [state.info] = [type];
  });

  // Act on press, not on click. Panels re-render several times a second, and a button swapped
  // between press and release would lose its click.
  root.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const t = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
    if (!t || (t as HTMLButtonElement).disabled) return;
    const [act, arg, arg2] = t.dataset.act!.split(':');
    if (act === 'build') [state.placing, state.tool] = [state.placing === arg ? null : (arg as BuildingType), null];
    if (act === 'tool') [state.tool, state.placing] = [state.tool && arg === toolIdOf(state.tool) ? null : parseTool(arg), null];
    if (act === 'rotate') state.rotated = !state.rotated;
    if (act === 'shape') state.fill = !state.fill;
    if (act === 'storey') state.storey = Math.max(0, Math.min(maxStorey(world()), state.storey + Number(arg)));
    if (act === 'levels') state.levels = state.levels === 'all' ? 'current' : 'all';
    if (act === 'walls') state.walls = WALL_MODES[(WALL_MODES.indexOf(state.walls) + 1) % WALL_MODES.length];
    if (act === 'edge') {
      const e = world().house.edges.find((o) => o.id === Number(arg));
      if (e) pushCommand(world().commands, { type: 'buildEdge', x: e.x, y: e.y, side: e.side, kind: arg2 as EdgeKind, level: Number(t.dataset.act!.split(':')[3]) });
    }
    if (act === 'remove') pushCommand(world().commands, { type: 'removeHouseItem', item: arg as 'edge' | 'floor' | 'furniture', id: Number(arg2) });
    if (act === 'speed') [state.speed, state.paused] = arg === '0' ? [state.speed, !state.paused] : [Number(arg), false];
    if (act === 'workers') pushCommand(world().commands, { type: 'setWorkers', id: Number(arg), count: Number(arg2) });
    if (act === 'restart') actions.toTitle();
    if (act === 'tab') state.tab = arg as Tab;
    if (act === 'cat') state.buildCat = arg as BuildCat;
    if (act === 'poi') state.poi = Number(arg);
    if (act === 'squad') state.squad = state.squad.includes(Number(arg)) ? state.squad.filter((id) => id !== Number(arg)) : [...state.squad, Number(arg)];
    if (act === 'send' && state.poi !== null) {
      pushCommand(world().commands, { type: 'sendExpedition', poi: state.poi, members: state.squad });
      state.squad = [];
    }
    if (act === 'recall') pushCommand(world().commands, { type: 'recall', id: Number(arg) });
    if (act === 'focus') {
      actions.focus(Number(arg), Number(arg2));
      // Looking at someone upstairs brings that floor into view.
      const level = t.dataset.act!.split(':')[3];
      if (level !== undefined) state.storey = Math.min(maxStorey(world()), Number(level));
    }
    if (act === 'menu') [state.menu, state.view, note] = [!state.menu, 'main', ''];
    if (act === 'view') [state.view, note] = [arg as MenuView, ''];
    if (act === 'story') [state.intro, state.menu] = [true, false];
    if (act === 'begin') state.intro = false;
    if (act === 'saveslot') note = actions.save(arg as SlotId);
    if (act === 'loadslot') actions.load(arg as SlotId);
    if (act === 'delslot') actions.remove(arg as SlotId);
    if (act === 'continue') actions.continueRun();
    if (act === 'export') actions.exportSave();
    if (act === 'import') actions.importSave();
    if (act === 'title') actions.toTitle();
    if (act === 'randomize') state.seed = String(Math.floor(Math.random() * 1e9));
    if (act === 'start') {
      const input = document.getElementById('seed') as HTMLInputElement | null;
      const seed = Number.parseInt(input?.value ?? state.seed, 10);
      if (Number.isFinite(seed) && seed >= 0) actions.newGame(seed);
      else note = 'The map number must be a whole number.';
    }
    if (act === 'alarm') pushCommand(world().commands, { type: 'alarm', on: !world().alarm });
    if (act === 'shelter') pushCommand(world().commands, { type: 'setShelter', id: Number(arg), on: arg2 === '1' });
    if (act === 'craft') pushCommand(world().commands, { type: 'setCraft', id: Number(arg), weapon: arg2 as WeaponId });
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
    if (act === 'berth') pushCommand(world().commands, { type: 'buildBerth' });
    if (act === 'salvage') pushCommand(world().commands, { type: 'salvage', id: Number(arg) });
    if (act === 'cancelbuild') pushCommand(world().commands, { type: 'cancelBuild', id: Number(arg) });
    if (act === 'movebuilding') [state.tool, state.placing, state.rotated] = [{ kind: 'move', id: Number(arg) }, null, false];
    if (act === 'scavenge') pushCommand(world().commands, { type: 'scavenge', house: Number(arg) });
    if (act === 'clearpad' && world().airship.site) {
      const { x, y } = world().airship.site!;
      pushCommand(world().commands, { type: 'clearArea', x: x - PAD.apron, y: y - PAD.apron, w: PAD.size + 2 * PAD.apron, h: PAD.size + 2 * PAD.apron });
    }
    if (act === 'launch') pushCommand(world().commands, { type: 'launch' });
    if (act === 'upgrade') pushCommand(world().commands, { type: 'upgradeHearth' });
    if (act === 'light') pushCommand(world().commands, { type: 'lightHearth' });
    if (act === 'move') [state.tool, state.placing] = [{ kind: 'hearth' }, null];
    if (act === 'cancelmove') pushCommand(world().commands, { type: 'cancelMove' });
    if (act === 'mend') pushCommand(world().commands, { type: 'mendItem', item: arg as 'edge' | 'furniture' | 'roof', id: Number(arg2) });
    if (act === 'stage') pushCommand(world().commands, { type: 'upgradeBuilding', id: Number(arg) });
    api.update();
  });

  const api = {
    /** Shows a short note in the open menu or title screen. */
    say(text: string) {
      note = text;
      api.update();
    },
    update() {
      const w = world();
      const phase = currentPhase(w);
      const next = BALANCE.phases[(BALANCE.phases.findIndex((p) => p.name === phase.name) + 1) % BALANCE.phases.length];
      const burn = (BALANCE.hearth.levels[w.hearth.level - 1].fuelPerMinute / 60) * fuelFactor(w);
      const hearth = w.hearth.lit
        ? `<span>Hearth fuel ${clock(w.stock.fuel / burn)}</span>`
        : !w.hearth.ignited
          ? '<span class="alert">Hearth smoldering. Light it</span>'
          : `<span class="alert">Hearth out. Lost in ${Math.ceil(BALANCE.hearth.outLossSeconds - w.hearth.outSeconds)}s</span>`;
      const speeds = [0, 1, 2, 3]
        .map((s) => `<button data-act="speed:${s}" class="${(s === 0 ? state.paused : !state.paused && state.speed === s) ? 'on' : ''}">${s === 0 ? 'Pause' : `${s}x`}</button>`)
        .join('');
      set(
        'top',
        `<span><b>Day ${w.day}</b> ${phase.name}, ${next.name} in ${clock(phase.left)}</span><span title="Tomorrow: ${BALANCE.weather.kinds[w.weatherNext].name}">${BALANCE.weather.kinds[w.weather].name} ${w.temperature}°, then ${BALANCE.weather.kinds[w.weatherNext].name.toLowerCase()}</span>
         <span>Colonists ${w.colonists.length}</span><span class="${w.hope < BALANCE.hope.lowBelow ? 'alert' : ''}">Hope ${Math.round(w.hope)}</span>
         <span>Airship ${w.airship.built.length}/${COMPONENT_IDS.length}</span>${RESOURCES.map((r) => `<span>${RESOURCE_NAMES[r]} ${Math.floor(w.stock[r])}</span>`).join('')}
         <span>Storage ${Math.floor(stockTotal(w))}/${capacity(w)}</span>${hearth}`,
      );
      const alarm = `<button data-act="alarm" class="${w.alarm ? 'alarm on' : 'alarm'}" title="Workers take shelter and defenders man the guns">${w.alarm ? 'All clear' : 'Alarm'}</button>`;
      const wallsButton = `<button data-act="walls" title="Walls up, back walls only, or all walls cut low (V)">${WALL_NAMES[state.walls]}</button>`;
      const floorBox = `<span class="floors"><button data-act="storey:-1" title="Down one floor (Page Down)">v</button><button data-act="levels" title="Show all floors or only up to this one (L)">Floor ${state.storey + 1}${state.levels === 'all' ? '' : ' only'}</button><button data-act="storey:1" title="Up one floor (Page Up)">^</button></span>`;
      set('controls', `${alarm}${speeds}${floorBox}${wallsButton}<button data-act="menu">Menu</button>`);
      set('build', state.buildOpen ? buildMenuHtml(w, state.buildCat, state.placing, state.tool, state.rotated, state.fill, state.info) : '');

      set('forecast', forecastHtml(w));
      const hint = actions.settings.hints && !w.lost && !w.won ? currentHint(w) : null;
      set('hint', hint ? `<b>Next</b> ${hint.text}` : '');
      set('menu', state.menu && !state.title ? menuHtml(state.view, actions.settings, note) : '');
      set('title', state.title && !state.intro ? titleHtml(state.view, actions.settings, state.seed, actions.hasSave(), note) : '');
      document.body.classList.toggle('on-title', state.title);
      set(
        'intro',
        state.intro
          ? `<div class="story"><h1>${INTRO.title}</h1>${INTRO.paragraphs.map((p) => `<p>${p}</p>`).join('')}<button data-act="begin">${INTRO.begin}</button></div>`
          : '',
      );
      set('selection', selectionHtml(w, state.selected));
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
  const raidIn = BALANCE.waves.raidAt - w.dayTime;
  const raid = phase.name === 'Day' && w.day >= BALANCE.waves.raidFromDay && raidIn > 0 ? `<span class="alert">Raid from the ${EDGES[wave.edges[0]]} in ${clock(raidIn)}</span>` : '';
  return `<b class="${wave.bloodMoon ? 'alert' : ''}">Night ${wave.night}${wave.bloodMoon ? ', Blood Moon' : ''}</b>
    <span>Threat ${wave.threat} from the ${edges}</span><span>${kinds}</span><span>${when}</span>${raid}`;
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
