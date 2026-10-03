import type { Resource } from './resources';

// Points of interest (section 10.1) and the rare items expeditions bring back (section 11).
// Loot gives a min and max per search roll. Distance is in tiles from the hearth.

export const ITEMS = {
  silkCanopy: 'Silk Canopy',
  engineBlock: 'Engine Block',
  pressureValve: 'Pressure Valve',
  compassRig: 'Compass Rig',
} as const;
export type ItemId = keyof typeof ITEMS;

export interface PoiDef {
  name: string;
  danger: number;
  distance: number;
  loot: Partial<Record<Resource, [number, number]>>;
  rare?: ItemId;
  /** Chance per search roll to find a survivor who joins the colony. */
  survivors?: number;
}

const DEFS = {
  farmhouse: { name: 'Farmhouse', danger: 1, distance: 24, loot: { rawFood: [3, 6], wood: [2, 5] }, rare: 'silkCanopy' },
  gasStation: { name: 'Gas Station', danger: 2, distance: 32, loot: { fuel: [2, 5], scrap: [2, 5] }, rare: 'pressureValve' },
  hardwareStore: { name: 'Hardware Store', danger: 2, distance: 36, loot: { metal: [1, 4], parts: [0, 2] } },
  clinic: { name: 'Clinic', danger: 3, distance: 42, loot: { rawFood: [2, 5], parts: [0, 2] }, rare: 'silkCanopy', survivors: 0.08 },
  railDepot: { name: 'Rail Depot', danger: 4, distance: 48, loot: { metal: [2, 6] }, rare: 'engineBlock' },
  oldAirfield: { name: 'Old Airfield', danger: 5, distance: 54, loot: { scrap: [2, 5], parts: [0, 3] }, rare: 'compassRig' },
} satisfies Record<string, PoiDef>;

export type PoiType = keyof typeof DEFS;
export const POIS: Record<PoiType, PoiDef> = DEFS;
export const POI_TYPES = Object.keys(POIS) as PoiType[];

/** Short injury lines for the event log, such as "Tom was bitten." */
export const INJURIES = ['was bitten', 'was clawed', 'fell through a rotten floor', 'cut a hand on rusted metal'];
