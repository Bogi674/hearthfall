// Title screen and pause menu (section 14.2): new game with a seed or a random map, continue,
// load from a slot, import and export save files, settings, and the controls list.
import { SLOTS, slotInfo, type SlotId } from '../save/save';
import type { Settings } from './settings';

const CONTROLS: [string, string][] = [
  ['Left click', 'Select or place'],
  ['Right click or Escape', 'Cancel placement'],
  ['R', 'Rotate building during placement'],
  ['Q and E', 'Rotate camera'],
  ['WASD, arrows, middle drag', 'Pan the camera'],
  ['Scroll', 'Zoom'],
  ['Space', 'Pause'],
  ['1, 2, 3', 'Game speed'],
  ['B', 'Show or hide the build menu'],
];

export type MenuView = 'main' | 'new' | 'load' | 'save' | 'settings';

const SLOT_NAMES: Record<SlotId, string> = { auto: 'Autosave', 1: 'Slot 1', 2: 'Slot 2', 3: 'Slot 3' };

function slotRows(mode: 'load' | 'save'): string {
  return SLOTS.filter((s) => mode === 'load' || s !== 'auto')
    .map((s) => {
      const info = slotInfo(s);
      const when = info ? `Day ${info.day}, ${info.colonists} colonists, map ${info.seed}. ${new Date(info.savedAt).toLocaleString()}` : 'Empty';
      const act =
        mode === 'save' ? `<button data-act="saveslot:${s}">Save here</button>`
        : info ? `<button data-act="loadslot:${s}">Load</button><button data-act="delslot:${s}">Delete</button>`
        : '';
      return `<div class="slot"><span><b>${SLOT_NAMES[s]}</b><small>${when}</small></span><span class="menu-row">${act}</span></div>`;
    })
    .join('');
}

function settingsHtml(settings: Settings): string {
  const toggle = (key: 'autoPause' | 'hints', label: string) => `<button data-act="set:${key}">${label}: ${settings[key] ? 'On' : 'Off'}</button>`;
  return `<div class="menu-row">${toggle('autoPause', 'Auto pause at dusk')}${toggle('hints', 'Hints')}</div>
    <div class="menu-row"><span>Volume ${Math.round(settings.volume * 100)}%</span>
    <button data-act="volume:-1">−</button><button data-act="volume:1">+</button></div>
    <h4>Controls</h4>
    <table>${CONTROLS.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('')}</table>`;
}

const back = '<button data-act="view:main">Back</button>';

/** The title screen, shown before a run starts. */
export function titleHtml(view: MenuView, settings: Settings, seed: string, canContinue: boolean, note: string): string {
  const body =
    view === 'new'
      ? `<h4>New game</h4><p>Every map number makes a different town. Pick one or roll a random map.</p>
         <div class="menu-row"><label>Map <input id="seed" value="${seed}" inputmode="numeric" maxlength="9"></label>
         <button data-act="randomize">Random map</button></div>
         <div class="menu-row"><button data-act="start" class="primary">Start</button>${back}</div>`
      : view === 'load'
        ? `<h4>Load game</h4>${slotRows('load')}<div class="menu-row"><button data-act="import">Import save file</button>${back}</div>`
        : view === 'settings'
          ? `<h4>Settings</h4>${settingsHtml(settings)}<div class="menu-row">${back}</div>`
          : `<div class="menu-col">
             <button data-act="continue" class="primary" ${canContinue ? '' : 'disabled'}>Continue</button>
             <button data-act="view:new">New game</button>
             <button data-act="view:load">Load game</button>
             <button data-act="import">Import save file</button>
             <button data-act="view:settings">Settings</button>
             <button data-act="story">Story</button></div>`;
  return `<div class="title-card"><h1>Hearthfall</h1><p class="tag">Keep the fire. Patch the house. Find a way out.</p>${body}${note ? `<p class="note">${note}</p>` : ''}</div>`;
}

/** The pause menu during a run. */
export function menuHtml(view: MenuView, settings: Settings, note: string): string {
  const body =
    view === 'save' ? `<h4>Save game</h4>${slotRows('save')}<div class="menu-row">${back}</div>`
    : view === 'load' ? `<h4>Load game</h4>${slotRows('load')}<div class="menu-row"><button data-act="import">Import save file</button>${back}</div>`
    : `<div class="menu-row"><button data-act="menu">Resume</button><button data-act="view:save">Save game</button>
       <button data-act="view:load">Load game</button><button data-act="export">Export save file</button>
       <button data-act="story">Story</button><button data-act="title">Main menu</button></div>
       <h4>Settings</h4>${settingsHtml(settings)}`;
  return `<h2>Hearthfall</h2>${body}${note ? `<p class="note">${note}</p>` : ''}`;
}
