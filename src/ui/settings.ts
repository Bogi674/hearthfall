// Player settings, kept in browser storage when it is available.

export interface Settings {
  autoPause: boolean;
  hints: boolean;
  volume: number;
}

const KEY = 'hearthfall.settings';
const DEFAULTS: Settings = { autoPause: true, hints: true, volume: 0.6 };

export function loadSettings(): Settings {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') };
  } catch {
    return { ...DEFAULTS };
  }
}

export function storeSettings(s: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // Settings still apply for this session.
  }
}
