// Save and load (section 15.5). The full simulation state is plain data, saved as versioned JSON.
// Rendering state is rebuilt from it on load. Saves live in browser storage in four slots: an autosave
// at every dawn and three manual slots. A save can also be exported to a file and imported again.
import type { World } from '../sim/world';

export const SAVE_VERSION = 3;

export type SlotId = 'auto' | '1' | '2' | '3';
export const SLOTS: SlotId[] = ['auto', '1', '2', '3'];

export interface SlotInfo {
  slot: SlotId;
  day: number;
  seed: number;
  colonists: number;
  savedAt: number;
}

/** Flow fields and the warmth map are rebuilt on load, so they are left out to keep saves small. */
export function saveGame(world: World): string {
  return JSON.stringify({ version: SAVE_VERSION, world: { ...world, flow: { key: '', normal: [], runner: [] }, warmthKey: '' } });
}

export function loadGame(text: string): World {
  const data = JSON.parse(text) as { version?: number; world?: World };
  if (data.version !== SAVE_VERSION || !data.world) throw new Error(`This save is from an unsupported version (${data.version}).`);
  return data.world;
}

const key = (slot: SlotId) => `hearthfall.save.${slot}`;
const metaKey = (slot: SlotId) => `hearthfall.meta.${slot}`;

/** Browser storage can be blocked, for example in private windows. Saving then reports failure. */
export function storeSave(world: World, slot: SlotId = 'auto'): boolean {
  try {
    const info: SlotInfo = { slot, day: world.day, seed: world.seed, colonists: world.colonists.length, savedAt: Date.now() };
    localStorage.setItem(key(slot), saveGame(world));
    localStorage.setItem(metaKey(slot), JSON.stringify(info));
    return true;
  } catch {
    return false;
  }
}

export function readSave(slot: SlotId): string | null {
  try {
    return localStorage.getItem(key(slot));
  } catch {
    return null;
  }
}

export function slotInfo(slot: SlotId): SlotInfo | null {
  try {
    const text = localStorage.getItem(metaKey(slot));
    return text && localStorage.getItem(key(slot)) ? (JSON.parse(text) as SlotInfo) : null;
  } catch {
    return null;
  }
}

export function deleteSave(slot: SlotId): void {
  try {
    localStorage.removeItem(key(slot));
    localStorage.removeItem(metaKey(slot));
  } catch {
    // Nothing to delete when storage is blocked.
  }
}

/** The most recent save in any slot, for the Continue button. */
export function latestSlot(): SlotId | null {
  const infos = SLOTS.map(slotInfo).filter((i): i is SlotInfo => i !== null);
  return infos.sort((a, b) => b.savedAt - a.savedAt)[0]?.slot ?? null;
}

/** Downloads the world as a save file. Works from a server and from the offline file. */
export function exportSave(world: World): void {
  const url = URL.createObjectURL(new Blob([saveGame(world)], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `hearthfall-seed${world.seed}-day${world.day}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
