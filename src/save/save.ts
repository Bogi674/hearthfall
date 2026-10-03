// Save and load (section 15.5). The full simulation state is plain data, saved as versioned JSON.
// Rendering state is rebuilt from it on load.
import type { World } from '../sim/world';

export const SAVE_VERSION = 2;

export function saveGame(world: World): string {
  return JSON.stringify({ version: SAVE_VERSION, world });
}

export function loadGame(text: string): World {
  const data = JSON.parse(text) as { version?: number; world?: World };
  if (data.version !== SAVE_VERSION || !data.world) throw new Error(`This save is from an unsupported version (${data.version}).`);
  return data.world;
}

const SLOT = 'hearthfall.save';

/** Browser storage can be blocked, for example in private windows. Saving then reports failure. */
export function storeSave(world: World): boolean {
  try {
    localStorage.setItem(SLOT, saveGame(world));
    return true;
  } catch {
    return false;
  }
}

export function readSave(): string | null {
  try {
    return localStorage.getItem(SLOT);
  } catch {
    return null;
  }
}
