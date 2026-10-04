import type { Amounts } from './resources';

// Buildings from section 8, house rooms from section 5.5, and defenses from section 9.1 of docs/GAME_DESIGN.md.
// Size is the footprint in tiles before rotation. HP is how much damage a building takes before it is destroyed.
// Build is the seconds of work one builder needs to put it up (section 8.2).

export type BuildingCategory = 'House' | 'Shelter' | 'Production' | 'Defense' | 'Escape';

/** How workers look while they work here (section 12.4). */
export type WorkAnim = 'chop' | 'pick' | 'pry' | 'gather' | 'stir' | 'saw' | 'hammer' | 'tend';

/** A mounted gun at one stage of a watchtower or gun nest (section 9.1). */
export interface Gun {
  name: string;
  range: number;
  damage: number;
  /** Seconds between shots. */
  interval: number;
}

export interface BuildingDef {
  name: string;
  category: BuildingCategory;
  cost: Amounts;
  size: [number, number];
  build: number;
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
  /** Small light every finished building gives for free (section 5.3). */
  glow?: number;
  /** Warmth and light radius in tiles while it burns fuel. */
  heat?: { radius: number; fuelPerMinute: number };
  /** Lookout sight radius per stage. */
  sight?: number[];
  /** Mounted gun per stage. Each defender on duty fires one. */
  guns?: Gun[];
  /** Cost to reach each stage after the first. */
  upgrades?: Amounts[];
  /** A room of the Hearth House. It must be built on the house lot (section 5.5). */
  room?: boolean;
  /** People working or sheltering inside are safe while it stands (section 5.3). */
  indoor?: boolean;
  work?: WorkAnim;
  /** Crafts weapons for the colony (section 9.6). */
  armory?: boolean;
  /** Sleepers here rest and heal faster. */
  restBonus?: number;
}

const GUN_MAKESHIFT: Gun = { name: 'Makeshift gun', range: 6, damage: 12, interval: 1 };
const GUN_HEAVY: Gun = { name: 'Heavy gun', range: 8, damage: 26, interval: 1.2 };

const DEFS = {
  supplyCart: { name: 'Supply Cart', category: 'Shelter', cost: {}, size: [2, 1], build: 0, workers: 0, hp: 150, storage: 300, glow: 1.5 },
  tent: { name: 'Tent', category: 'Shelter', cost: { wood: 10 }, size: [2, 2], build: 10, workers: 0, hp: 80, beds: 4, glow: 2 },
  bunkhouse: { name: 'Bunkhouse', category: 'Shelter', cost: { planks: 30, stone: 10 }, size: [3, 3], build: 40, workers: 0, hp: 300, beds: 10, glow: 3 },
  storageShed: { name: 'Storage Shed', category: 'Shelter', cost: { wood: 20 }, size: [2, 2], build: 15, workers: 0, hp: 150, storage: 200, glow: 2 },
  heater: { name: 'Heater', category: 'Shelter', cost: { metal: 10, parts: 5 }, size: [1, 1], build: 10, workers: 0, hp: 80, heat: { radius: 4, fuelPerMinute: 1 } },
  bedroom: { name: 'Bedroom', category: 'House', cost: { wood: 20, planks: 10 }, size: [2, 2], build: 25, workers: 0, hp: 400, beds: 6, room: true, indoor: true, restBonus: 1.5, glow: 2 },
  storeroom: { name: 'Storeroom', category: 'House', cost: { wood: 30, planks: 10 }, size: [2, 2], build: 20, workers: 0, hp: 400, storage: 400, room: true, indoor: true, glow: 2 },
  hearthKitchen: { name: 'House Kitchen', category: 'House', cost: { planks: 20, stone: 10 }, size: [2, 2], build: 25, workers: 2, hp: 400, room: true, indoor: true, work: 'stir', glow: 2 },
  infirmary: { name: 'Infirmary', category: 'House', cost: { planks: 30, parts: 5 }, size: [2, 2], build: 30, workers: 0, hp: 400, beds: 3, room: true, indoor: true, restBonus: 3, glow: 2 },
  armory: { name: 'Armory', category: 'House', cost: { planks: 30, metal: 10 }, size: [2, 2], build: 30, workers: 1, hp: 450, room: true, indoor: true, work: 'hammer', armory: true, glow: 2 },
  gunNest: {
    name: 'Rooftop Gun Nest', category: 'House', cost: { planks: 20, metal: 25, parts: 5 }, size: [2, 2], build: 30, workers: 2, hp: 500,
    room: true, indoor: true, nightDuty: true, guns: [GUN_HEAVY], glow: 2,
  },
  woodcutterCamp: { name: 'Woodcutter Camp', category: 'Production', cost: { wood: 15 }, size: [2, 2], build: 12, workers: 3, hp: 150, work: 'chop', glow: 2 },
  salvageYard: { name: 'Salvage Yard', category: 'Production', cost: { wood: 20 }, size: [2, 2], build: 15, workers: 3, hp: 150, work: 'pry', glow: 2 },
  quarry: { name: 'Quarry', category: 'Production', cost: { wood: 30 }, size: [2, 2], build: 18, workers: 3, hp: 150, work: 'pick', glow: 2 },
  foragerHut: { name: 'Forager Hut', category: 'Production', cost: { wood: 15 }, size: [2, 2], build: 12, workers: 2, hp: 150, work: 'gather', glow: 2 },
  kitchen: { name: 'Kitchen', category: 'Production', cost: { wood: 25 }, size: [2, 2], build: 18, workers: 2, hp: 150, indoor: true, work: 'stir', glow: 2 },
  sawmill: { name: 'Sawmill', category: 'Production', cost: { wood: 30, scrap: 10 }, size: [3, 2], build: 25, workers: 2, hp: 150, indoor: true, work: 'saw', glow: 2.5 },
  charcoalKiln: { name: 'Charcoal Kiln', category: 'Production', cost: { wood: 20, stone: 10 }, size: [2, 2], build: 18, workers: 1, hp: 150, work: 'tend', glow: 2.5 },
  smelter: { name: 'Smelter', category: 'Production', cost: { planks: 30, stone: 20 }, size: [2, 2], build: 30, workers: 2, hp: 200, indoor: true, work: 'hammer', glow: 2.5 },
  workshop: { name: 'Workshop', category: 'Production', cost: { planks: 40, metal: 30 }, size: [2, 2], build: 30, workers: 2, hp: 200, indoor: true, work: 'hammer', glow: 2 },
  woodenBarricade: { name: 'Wooden Barricade', category: 'Defense', cost: { wood: 5 }, size: [1, 1], build: 3, workers: 0, hp: 100 },
  reinforcedWall: { name: 'Reinforced Wall', category: 'Defense', cost: { metal: 5, stone: 5 }, size: [1, 1], build: 6, workers: 0, hp: 350 },
  gate: { name: 'Gate', category: 'Defense', cost: { wood: 10, planks: 5 }, size: [1, 1], build: 8, workers: 0, hp: 200, gate: true },
  spikeTrap: { name: 'Spike Trap', category: 'Defense', cost: { wood: 10 }, size: [1, 1], build: 4, workers: 0, hp: 80, walkable: true },
  watchtower: {
    name: 'Watchtower', category: 'Defense', cost: { wood: 30 }, size: [1, 1], build: 15, workers: 2, hp: 180, nightDuty: true,
    guns: [GUN_MAKESHIFT, GUN_HEAVY], upgrades: [{ metal: 20, parts: 5 }], glow: 1.5,
  },
  lanternPost: { name: 'Lantern Post', category: 'Defense', cost: { wood: 5 }, size: [1, 1], build: 4, workers: 0, hp: 50, light: { radius: 4, fuel: 1 } },
  lampPost: { name: 'Lamp Post', category: 'Defense', cost: { scrap: 10, metal: 5, parts: 2 }, size: [1, 1], build: 8, workers: 0, hp: 90, light: { radius: 6, fuel: 1 } },
  lookoutPost: {
    name: 'Lookout Post', category: 'Escape', cost: { wood: 20, planks: 10 }, size: [1, 1], build: 15, workers: 0, hp: 120,
    sight: [44, 56, 66], upgrades: [{ planks: 30, stone: 10 }, { planks: 40, metal: 15 }], glow: 1.5,
  },
  airshipDock: { name: 'Airship Dock', category: 'Escape', cost: { planks: 100, metal: 80, parts: 20 }, size: [4, 4], build: 60, workers: 4, hp: 500, work: 'hammer', glow: 3 },
} satisfies Record<string, BuildingDef>;

export type BuildingType = keyof typeof DEFS;
export const BUILDINGS: Record<BuildingType, BuildingDef> = DEFS;
export const BUILDING_TYPES = Object.keys(BUILDINGS) as BuildingType[];
/** Buildings the player can place from the build menu. The Supply Cart comes with the colony. */
export const BUILDABLE = BUILDING_TYPES.filter((t) => t !== 'supplyCart');
