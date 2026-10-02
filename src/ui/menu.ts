// Pause menu: save and load, new run, settings, and the controls list (section 14.1).
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

export function menuHtml(settings: Settings, hasSave: boolean, note: string): string {
  const toggle = (key: 'autoPause' | 'hints', label: string) =>
    `<button data-act="set:${key}">${label}: ${settings[key] ? 'On' : 'Off'}</button>`;
  return `<h2>Hearthfall</h2>
    <div class="menu-row"><button data-act="menu">Resume</button><button data-act="save">Save game</button>
    <button data-act="load" ${hasSave ? '' : 'disabled'}>Load game</button><button data-act="new">New run</button></div>
    ${note ? `<p>${note}</p>` : ''}
    <h4>Settings</h4>
    <div class="menu-row">${toggle('autoPause', 'Auto pause at dusk')}${toggle('hints', 'Hints')}</div>
    <div class="menu-row"><span>Volume ${Math.round(settings.volume * 100)}%</span>
    <button data-act="volume:-1">−</button><button data-act="volume:1">+</button></div>
    <h4>Controls</h4>
    <table>${CONTROLS.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('')}</table>`;
}
