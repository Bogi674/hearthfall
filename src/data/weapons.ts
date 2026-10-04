import type { Amounts } from './resources';

// Colonist weapons (section 9.6). Everyone starts with a pipe club. The Armory crafts better ones.
// Damage is per hit. Range is in tiles. A colonist picks up the best spare weapon in the armory rack.

export interface WeaponDef {
  name: string;
  damage: number;
  range: number;
  /** Seconds between hits. */
  interval: number;
  cost: Amounts;
  /** Seconds of armory work to craft one. */
  craft: number;
}

const DEFS = {
  pipe: { name: 'Pipe Club', damage: 5, range: 0.9, interval: 1, cost: {}, craft: 0 },
  spear: { name: 'Spear', damage: 9, range: 1.4, interval: 1, cost: { planks: 3, scrap: 2 }, craft: 15 },
  crossbow: { name: 'Crossbow', damage: 12, range: 5, interval: 1.4, cost: { planks: 5, metal: 3, parts: 1 }, craft: 25 },
  rifle: { name: 'Hunting Rifle', damage: 22, range: 7, interval: 1.6, cost: { metal: 8, parts: 4 }, craft: 40 },
} satisfies Record<string, WeaponDef>;

export type WeaponId = keyof typeof DEFS;
export const WEAPONS: Record<WeaponId, WeaponDef> = DEFS;
/** Weakest first. */
export const WEAPON_IDS = Object.keys(WEAPONS) as WeaponId[];
export const CRAFTABLE = WEAPON_IDS.filter((id) => WEAPONS[id].craft > 0);
