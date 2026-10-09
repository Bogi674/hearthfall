import type { ItemId } from './pois';
import type { Amounts } from './resources';

// The airship (section 11). Components are built at the Airship Dock in this order of dependency:
// the Frame first, then the rest. Seconds is dock work at full crew on a warm tile.

export interface ComponentDef {
  name: string;
  cost: Amounts;
  item?: ItemId;
  seconds: number;
  hope: number;
  needs?: ComponentId;
}

const DEFS = {
  frame: { name: 'Frame', cost: { planks: 120, metal: 40 }, seconds: 60, hope: 0 },
  envelope: { name: 'Envelope', cost: { planks: 80, parts: 20 }, item: 'silkCanopy', seconds: 60, hope: 10, needs: 'frame' },
  engine: { name: 'Engine', cost: { metal: 100, parts: 40 }, item: 'engineBlock', seconds: 80, hope: 10, needs: 'frame' },
  fuelTank: { name: 'Fuel Tank', cost: { metal: 60, parts: 20 }, item: 'pressureValve', seconds: 40, hope: 0, needs: 'frame' },
  navigation: { name: 'Navigation', cost: { parts: 20 }, item: 'compassRig', seconds: 40, hope: 0, needs: 'frame' },
} satisfies Record<string, Omit<ComponentDef, 'needs'> & { needs?: string }>;

export type ComponentId = keyof typeof DEFS;
export const COMPONENTS = DEFS as Record<ComponentId, ComponentDef>;
export const COMPONENT_IDS = Object.keys(COMPONENTS) as ComponentId[];

/** The old owner's blueprint turns up when the house is repaired and hope is up (section 11.2). */
export const BLUEPRINT = { hearthLevel: 3, hope: 50 };

/**
 * The launch pad (section 11.2): a square deck for the gondola with a ring of open ground around it. It must be close
 * enough to the house for the final dash on the last night.
 */
export const PAD = { size: 6, apron: 1, maxDistance: 18 };

/** Seats aboard (section 11.2). The Frame gives the base seats and each Berth Deck adds more. */
export const SEATS = { base: 8 };
export const BERTH = { name: 'Berth Deck', cost: { planks: 40, parts: 10 } as Amounts, seconds: 30, seats: 4, max: 3, needs: 'frame' as ComponentId };

/** The Last Night (section 11.1) and the score (section 3.4). */
export const LAST_NIGHT = {
  fuel: 200,
  seconds: 180,
  threatMultiplier: 3,
  boardSeconds: 30,
  /** Colonists this close to the dock center at launch are aboard. */
  boardRadius: 4.5,
};

export const SCORE = {
  perSurvivor: 100,
  difficulty: 1,
  /** Bonus per day left before this day. */
  targetDays: 30,
  perDayLeft: 20,
};
