import type { Amounts } from './resources';

// Buildings from section 8 and defenses from section 9.1 of docs/GAME_DESIGN.md.
// Size is the footprint in tiles before rotation. HP is how much damage a building takes before it is destroyed.

export type BuildingCategory = 'Shelter' | 'Production' | 'Defense' | 'Escape';

export interface BuildingDef {
  name: string;
  category: BuildingCategory;
  cost: Amounts;
  size: [number, number];
  /** Day workers, or night defenders when nightDuty is set. */
  workers: number;
  hp: number;
  beds?: number;
  storage?: number;
  nightDuty?: boolean;
  /** Monsters walk over it instead of attacking it. */
  walkable?: boolean;
  /** Runners prefer to break through this. */
  gate?: boolean;
  /** Light radius in tiles, lit at night for the given fuel. */
  light?: { radius: number; fuel: number };
  /** Warmth and light radius in tiles while it burns fuel. */
  heat?: { radius: number; fuelPerMinute: number };
}

const DEFS = {
  tent: { name: 'Tent', category: 'Shelter', cost: { wood: 10 }, size: [2, 2], workers: 0, hp: 80, beds: 4 },
  bunkhouse: { name: 'Bunkhouse', category: 'Shelter', cost: { planks: 30, stone: 10 }, size: [3, 3], workers: 0, hp: 300, beds: 10 },
  storageShed: { name: 'Storage Shed', category: 'Shelter', cost: { wood: 20 }, size: [2, 2], workers: 0, hp: 150, storage: 200 },
  woodcutterCamp: { name: 'Woodcutter Camp', category: 'Production', cost: { wood: 15 }, size: [2, 2], workers: 3, hp: 150 },
  salvageYard: { name: 'Salvage Yard', category: 'Production', cost: { wood: 20 }, size: [2, 2], workers: 3, hp: 150 },
  quarry: { name: 'Quarry', category: 'Production', cost: { wood: 30 }, size: [2, 2], workers: 3, hp: 150 },
  foragerHut: { name: 'Forager Hut', category: 'Production', cost: { wood: 15 }, size: [2, 2], workers: 2, hp: 150 },
  kitchen: { name: 'Kitchen', category: 'Production', cost: { wood: 25 }, size: [2, 2], workers: 2, hp: 150 },
  sawmill: { name: 'Sawmill', category: 'Production', cost: { wood: 30, scrap: 10 }, size: [3, 2], workers: 2, hp: 150 },
  charcoalKiln: { name: 'Charcoal Kiln', category: 'Production', cost: { wood: 20, stone: 10 }, size: [2, 2], workers: 1, hp: 150 },
  woodenBarricade: { name: 'Wooden Barricade', category: 'Defense', cost: { wood: 5 }, size: [1, 1], workers: 0, hp: 100 },
  gate: { name: 'Gate', category: 'Defense', cost: { planks: 15 }, size: [1, 1], workers: 0, hp: 200, gate: true },
  lanternPost: { name: 'Lantern Post', category: 'Defense', cost: { wood: 5 }, size: [1, 1], workers: 0, hp: 50, light: { radius: 4, fuel: 1 } },
  spikeTrap: { name: 'Spike Trap', category: 'Defense', cost: { wood: 10 }, size: [1, 1], workers: 0, hp: 80, walkable: true },
  smelter: { name: 'Smelter', category: 'Production', cost: { planks: 30, stone: 20 }, size: [2, 2], workers: 2, hp: 200 },
  workshop: { name: 'Workshop', category: 'Production', cost: { planks: 40, metal: 30 }, size: [2, 2], workers: 2, hp: 200 },
  heater: { name: 'Heater', category: 'Shelter', cost: { metal: 10, parts: 5 }, size: [1, 1], workers: 0, hp: 80, heat: { radius: 4, fuelPerMinute: 1 } },
  airshipDock: { name: 'Airship Dock', category: 'Escape', cost: { planks: 100, metal: 80, parts: 20 }, size: [4, 4], workers: 4, hp: 500 },
  watchtower: { name: 'Watchtower', category: 'Defense', cost: { planks: 25 }, size: [1, 1], workers: 1, hp: 150, nightDuty: true },
} satisfies Record<string, BuildingDef>;

export type BuildingType = keyof typeof DEFS;
export const BUILDINGS: Record<BuildingType, BuildingDef> = DEFS;
export const BUILDING_TYPES = Object.keys(BUILDINGS) as BuildingType[];
