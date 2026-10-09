import type { Amounts } from './resources';

// Buildings from section 8, house rooms from section 5.5, and defenses from section 9.1 of docs/GAME_DESIGN.md.
// Size is the footprint in tiles before rotation. HP is how much damage a building takes before it is destroyed.
// Build is the seconds of work one builder needs to put it up (section 8.2).

export type BuildingCategory = 'Furniture' | 'Shelter' | 'Production' | 'Defense' | 'Escape';

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
  /** Furniture goes on house floors, inside the house (section 5.6). */
  furniture?: boolean;
  /** People sit here in the evening: to eat a meal or to mingle (section 5.7). */
  social?: 'eat' | 'mingle';
  /** Goes on the floor of a closed room, under its roof (section 9.8). */
  roofed?: boolean;
  /** Adds comfort to the house, which lifts the evening hope bonus (section 5.7). */
  decor?: boolean;
  /** People working or sheltering inside are safe while it stands (section 5.3). */
  indoor?: boolean;
  work?: WorkAnim;
  /** Crafts weapons for the colony (section 9.6). */
  armory?: boolean;
  /** Sleepers here rest and heal faster. */
  restBonus?: number;
}

export const GUN_MAKESHIFT: Gun = { name: 'Makeshift gun', range: 6, damage: 12, interval: 1 };
export const GUN_HEAVY: Gun = { name: 'Heavy gun', range: 8, damage: 26, interval: 1.2 };

const DEFS = {
  supplyCart: { name: 'Supply Cart', category: 'Shelter', cost: {}, size: [2, 1], build: 0, workers: 0, hp: 150, storage: 300, glow: 1.5 },
  tent: { name: 'Tent', category: 'Shelter', cost: { wood: 10 }, size: [2, 2], build: 10, workers: 0, hp: 80, beds: 4, glow: 2 },
  bunkhouse: { name: 'Bunkhouse', category: 'Shelter', cost: { planks: 30, stone: 10 }, size: [3, 3], build: 40, workers: 0, hp: 300, beds: 10, glow: 3 },
  storageShed: { name: 'Storage Shed', category: 'Shelter', cost: { wood: 20 }, size: [2, 2], build: 15, workers: 0, hp: 150, storage: 200, glow: 2 },
  heater: { name: 'Heater', category: 'Shelter', cost: { metal: 10, parts: 5 }, size: [1, 1], build: 10, workers: 0, hp: 80, heat: { radius: 4, fuelPerMinute: 1 } },
  bed: { name: 'Bed', category: 'Furniture', cost: { wood: 6 }, size: [1, 1], build: 6, workers: 0, hp: 60, beds: 1, furniture: true, indoor: true },
  sickbed: { name: 'Sickbed', category: 'Furniture', cost: { planks: 8, parts: 1 }, size: [1, 1], build: 8, workers: 0, hp: 60, beds: 1, restBonus: 3, furniture: true, indoor: true },
  shelf: { name: 'Shelf', category: 'Furniture', cost: { wood: 8 }, size: [1, 1], build: 5, workers: 0, hp: 60, storage: 60, furniture: true, indoor: true },
  table: { name: 'Table', category: 'Furniture', cost: { wood: 10 }, size: [2, 1], build: 6, workers: 0, hp: 60, social: 'eat', furniture: true, indoor: true },
  sofa: { name: 'Sofa', category: 'Furniture', cost: { wood: 10, scrap: 4 }, size: [2, 1], build: 6, workers: 0, hp: 60, social: 'mingle', furniture: true, indoor: true },
  stove: { name: 'Stove', category: 'Furniture', cost: { planks: 6, stone: 4 }, size: [1, 1], build: 8, workers: 1, hp: 80, furniture: true, indoor: true, work: 'stir' },
  workbench: { name: 'Workbench', category: 'Furniture', cost: { planks: 10, metal: 6 }, size: [2, 1], build: 10, workers: 1, hp: 80, furniture: true, indoor: true, work: 'hammer', armory: true },
  draftingTable: { name: 'Drafting Table', category: 'Furniture', cost: { planks: 12, metal: 6 }, size: [2, 1], build: 10, workers: 4, hp: 80, furniture: true, indoor: true, work: 'hammer' },
  lamp: { name: 'Lamp', category: 'Furniture', cost: { wood: 2, scrap: 4 }, size: [1, 1], build: 3, workers: 0, hp: 30, glow: 3, decor: true, furniture: true, indoor: true },
  rug: { name: 'Rug', category: 'Furniture', cost: { scrap: 6 }, size: [2, 1], build: 3, workers: 0, hp: 20, decor: true, furniture: true, indoor: true },
  plant: { name: 'Potted Plant', category: 'Furniture', cost: { wood: 3 }, size: [1, 1], build: 2, workers: 0, hp: 20, decor: true, furniture: true, indoor: true },
  roofTurret: {
    name: 'Roof Turret', category: 'Defense', cost: { planks: 20, metal: 15, parts: 3 }, size: [1, 1], build: 20, workers: 1, hp: 200, nightDuty: true,
    guns: [GUN_MAKESHIFT, GUN_HEAVY], upgrades: [{ metal: 20, parts: 5 }], glow: 1.5, furniture: true, roofed: true,
  },
  spotlight: { name: 'Spotlight', category: 'Defense', cost: { scrap: 10, metal: 3 }, size: [1, 1], build: 6, workers: 0, hp: 40, furniture: true, light: { radius: 8, fuel: 1 } },
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
    sight: [52, 66, 78], upgrades: [{ planks: 30, stone: 10 }, { planks: 40, metal: 15 }], glow: 1.5,
  },
  airshipDock: { name: 'Launch Pad', category: 'Escape', cost: { planks: 70, metal: 50, parts: 12 }, size: [6, 6], build: 40, workers: 4, hp: 500, work: 'hammer', glow: 3 },
} satisfies Record<string, BuildingDef>;

export type BuildingType = keyof typeof DEFS;
export const BUILDINGS: Record<BuildingType, BuildingDef> = DEFS;
export const BUILDING_TYPES = Object.keys(BUILDINGS) as BuildingType[];
/** Buildings the player can place from the build menu. The Supply Cart comes with the colony. */
export const BUILDABLE = BUILDING_TYPES.filter((t) => t !== 'supplyCart');
