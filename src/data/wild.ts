import type { Amounts } from './resources';

// Food from the wild and from the ruins (M13): animals to hunt, and houses to scavenge.
// Numbers are for balance and live here, not in the systems.

export type AnimalKind = 'deer' | 'pig';

export const ANIMALS: Record<AnimalKind, { name: string; meat: number; hp: number; speed: number; fear: number }> = {
  deer: { name: 'Deer', meat: 14, hp: 30, speed: 2.4, fear: 7 },
  pig: { name: 'Wild Pig', meat: 22, hp: 45, speed: 1.7, fear: 3.5 },
};

export const WILD = {
  /** Animals on the map at the start, the most there can be, and how many wander in at each dawn when there is room. */
  start: 8,
  cap: 14,
  perDay: 2,
  /** Animals live this far from the hearth, never in the camp. */
  from: 24,
  to: 105,
  /** Hunters go after animals this far from their lodge. */
  huntRange: 60,
  /** Seconds a hunter needs beside an animal to finish the hunt. */
  killSeconds: 2.5,
  /** Wandering animals walk at this share of their speed. */
  wander: 0.35,
  /** Share of the chance of a pig among new animals. */
  pigShare: 0.4,
};

/** Site ids for scavenging are this minus the house id, so each house has its own. */
export const SCAVENGE_SITE = -200000;

/** Scavenging a ruined house: crew, builder seconds, and loot. Far houses hold more (M13). */
export const SCAVENGE = {
  crew: 2,
  seconds: 24,
  /** Loot ranges for a house next to the camp. Each is multiplied by 1 plus the distance over `perTiles`. */
  loot: { rawFood: [4, 9], scrap: [2, 6], wood: [0, 4] } as Record<string, [number, number]>,
  perTiles: 45,
  /** Chances of finds that are not always there. */
  extras: [
    { chance: 0.3, loot: { meals: [3, 7] } },
    { chance: 0.25, loot: { fuel: [4, 9] } },
    { chance: 0.08, loot: { parts: [1, 2], metal: [2, 5] } },
  ] as { chance: number; loot: Record<string, [number, number]> }[],
};

export type { Amounts };
