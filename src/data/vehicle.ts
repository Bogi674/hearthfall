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

/** The Last Night (section 11.1) and the score (section 3.4). */
export const LAST_NIGHT = {
  fuel: 200,
  seconds: 180,
  threatMultiplier: 3,
  boardSeconds: 30,
  /** Colonists this close to the dock center at launch are aboard. */
  boardRadius: 3.5,
};

export const SCORE = {
  perSurvivor: 100,
  difficulty: 1,
  /** Bonus per day left before this day. */
  targetDays: 30,
  perDayLeft: 20,
};
