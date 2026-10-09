import type { Amounts } from './resources';
import type { BuildingType } from './buildings';

// Room categories for UI grouping
export type RoomCategory = 'Living' | 'Storage' | 'Production' | 'Medical' | 'Defense' | 'Utility' | 'Decor';

// Wall types for room edges
export type WallType = 'wood' | 'reinforced' | 'stone' | 'metal' | 'gunPort' | 'window' | 'door' | 'trapDoor';

// A single wall segment on a room edge
export interface WallSegment {
  type: WallType;
  hp: number;
  maxHp: number;
}

// Room definition - modular, snap-to-grid
export interface RoomDef {
  id: string;
  name: string;
  category: RoomCategory;
  /** Footprint in tiles [width, depth] */
  size: [number, number];
  /** Minimum hearth stage required */
  tier: 1 | 2 | 3 | 4 | 5;
  /** Build cost */
  cost: Amounts;
  /** Build time in seconds (one builder) */
  buildTime: number;
  /** Workers this room provides when built */
  workers: number;
  /** Storage capacity this room adds */
  storage: number;
  /** Beds this room provides */
  beds: number;
  /** Warmth radius bonus (adds to hearth) */
  warmthBonus: number;
  /** Light radius this room provides (glow) */
  glow: number;
  /** Heat this room produces (fuel per minute, radius) */
  heat?: { radius: number; fuelPerMinute: number };
  /** Production recipe this room runs (by building type) */
  produces?: BuildingType;
  /** Work animation for workers in this room */
  workAnim?: 'chop' | 'pick' | 'pry' | 'gather' | 'stir' | 'saw' | 'hammer' | 'tend';
  /** Default wall layout for each edge: [north, east, south, west] */
  defaultWalls: WallType[][];
  /** Whether this room can be upgraded to a higher tier variant */
  upgradesTo?: string;
  /** Upgrade cost */
  upgradeCost?: Amounts;
  /** Whether this room is indoors (safe shelter) */
  indoor?: boolean;
  /** Rest bonus for sleepers */
  restBonus?: number;
  /** Description for UI */
  description: string;
}

// Wall module definitions (1x1 tiles that snap to room edges)
export interface WallModuleDef {
  id: string;
  name: string;
  category: 'Defense';
  cost: Amounts;
  buildTime: number;
  wallType: WallType;
  hp: number;
  /** For gunPort: gun stats */
  gun?: { name: string; range: number; damage: number; interval: number };
  /** For spotlight: light radius */
  lightRadius?: number;
  description: string;
}

// TIER 1 ROOMS (Hearth Stage 1: Ruined House)
const TIER1_ROOMS: RoomDef[] = [
  {
    id: 'bedroom',
    name: 'Bedroom',
    category: 'Living',
    size: [2, 2],
    tier: 1,
    cost: { wood: 20, planks: 10 },
    buildTime: 25,
    workers: 0,
    storage: 0,
    beds: 4,
    warmthBonus: 0,
    glow: 2,
    indoor: true,
    restBonus: 1.5,
    defaultWalls: [
      ['wood', 'wood', 'door', 'wood'],  // north
      ['wood', 'window', 'wood', 'wood'], // east
      ['wood', 'wood', 'wood', 'wood'],   // south
      ['wood', 'window', 'wood', 'wood'], // west
    ],
    description: '4 beds. Sleepers rest and heal 1.5x faster.',
  },
  {
    id: 'storageCloset',
    name: 'Storage Closet',
    category: 'Storage',
    size: [1, 2],
    tier: 1,
    cost: { wood: 10, planks: 5 },
    buildTime: 15,
    workers: 0,
    storage: 150,
    beds: 0,
    warmthBonus: 0,
    glow: 1,
    defaultWalls: [
      ['wood', 'door'],
      ['wood', 'wood'],
      ['wood', 'wood'],
      ['wood', 'wood'],
    ],
    description: '+150 storage. Compact and cheap.',
  },
  {
    id: 'workbenchCorner',
    name: 'Workbench Corner',
    category: 'Production',
    size: [1, 1],
    tier: 1,
    cost: { wood: 10, scrap: 5 },
    buildTime: 10,
    workers: 1,
    storage: 0,
    beds: 0,
    warmthBonus: 0,
    glow: 1,
    workAnim: 'hammer',
    produces: 'workshop',
    defaultWalls: [
      ['wood'],
      ['window'],
      ['wood'],
      ['door'],
    ],
    description: '1 worker crafts basic items. Slow but early.',
  },
];

// TIER 2 ROOMS (Hearth Stage 2: Patched Roof)
const TIER2_ROOMS: RoomDef[] = [
  {
    id: 'kitchen',
    name: 'Kitchen',
    category: 'Production',
    size: [2, 2],
    tier: 2,
    cost: { planks: 20, stone: 10 },
    buildTime: 25,
    workers: 2,
    storage: 0,
    beds: 0,
    warmthBonus: 1,
    glow: 2,
    workAnim: 'stir',
    produces: 'hearthKitchen',
    heat: { radius: 3, fuelPerMinute: 1 },
    indoor: true,
    defaultWalls: [
      ['wood', 'wood', 'door', 'wood'],
      ['wood', 'window', 'wood', 'wood'],
      ['wood', 'wood', 'wood', 'wood'],
      ['wood', 'window', 'wood', 'wood'],
    ],
    description: '2 cooks make meals indoors. Adds warmth.',
  },
  {
    id: 'workshop',
    name: 'Workshop',
    category: 'Production',
    size: [2, 2],
    tier: 2,
    cost: { planks: 30, metal: 15 },
    buildTime: 30,
    workers: 2,
    storage: 50,
    beds: 0,
    warmthBonus: 0,
    glow: 2,
    workAnim: 'hammer',
    produces: 'workshop',
    defaultWalls: [
      ['reinforced', 'reinforced', 'door', 'reinforced'],
      ['reinforced', 'window', 'reinforced', 'reinforced'],
      ['reinforced', 'reinforced', 'reinforced', 'reinforced'],
      ['reinforced', 'window', 'reinforced', 'reinforced'],
    ],
    description: '2 workers make parts and advanced items.',
  },
  {
    id: 'infirmary',
    name: 'Infirmary',
    category: 'Medical',
    size: [2, 2],
    tier: 2,
    cost: { planks: 25, parts: 5 },
    buildTime: 30,
    workers: 0,
    storage: 50,
    beds: 3,
    warmthBonus: 1,
    glow: 2,
    indoor: true,
    restBonus: 3,
    defaultWalls: [
      ['wood', 'wood', 'door', 'wood'],
      ['wood', 'window', 'wood', 'wood'],
      ['wood', 'wood', 'wood', 'wood'],
      ['wood', 'window', 'wood', 'wood'],
    ],
    description: '3 medical beds. Healing 3x faster.',
  },
  {
    id: 'generatorRoom',
    name: 'Generator Room',
    category: 'Utility',
    size: [1, 1],
    tier: 2,
    cost: { metal: 10, parts: 5, fuel: 20 },
    buildTime: 15,
    workers: 0,
    storage: 0,
    beds: 0,
    warmthBonus: 2,
    glow: 3,
    heat: { radius: 5, fuelPerMinute: 2 },
    defaultWalls: [
      ['reinforced'],
      ['reinforced'],
      ['door'],
      ['reinforced'],
    ],
    description: 'Burns fuel for large warmth radius. No workers.',
  },
];

// TIER 3 ROOMS (Hearth Stage 3: Rebuilt Walls)
const TIER3_ROOMS: RoomDef[] = [
  {
    id: 'armory',
    name: 'Armory',
    category: 'Defense',
    size: [2, 2],
    tier: 3,
    cost: { planks: 30, metal: 10 },
    buildTime: 30,
    workers: 1,
    storage: 100,
    beds: 0,
    warmthBonus: 0,
    glow: 2,
    workAnim: 'hammer',
    produces: 'armory',
    defaultWalls: [
      ['reinforced', 'reinforced', 'door', 'reinforced'],
      ['gunPort', 'gunPort', 'reinforced', 'reinforced'],
      ['reinforced', 'reinforced', 'reinforced', 'reinforced'],
      ['gunPort', 'gunPort', 'reinforced', 'reinforced'],
    ],
    description: '1 worker crafts weapons. Gun ports on east/west.',
  },
  {
    id: 'bunkroom',
    name: 'Bunkroom',
    category: 'Living',
    size: [3, 2],
    tier: 3,
    cost: { planks: 40, stone: 15 },
    buildTime: 35,
    workers: 0,
    storage: 0,
    beds: 8,
    warmthBonus: 1,
    glow: 3,
    indoor: true,
    restBonus: 1.5,
    defaultWalls: [
      ['reinforced', 'reinforced', 'door', 'reinforced', 'reinforced'],
      ['reinforced', 'window', 'window', 'reinforced', 'reinforced'],
      ['reinforced', 'reinforced', 'reinforced', 'reinforced', 'reinforced'],
      ['reinforced', 'window', 'window', 'reinforced', 'reinforced'],
    ],
    description: '8 beds. Large dormitory for growing population.',
  },
  {
    id: 'pantry',
    name: 'Pantry',
    category: 'Storage',
    size: [2, 2],
    tier: 3,
    cost: { planks: 40, stone: 10 },
    buildTime: 20,
    workers: 0,
    storage: 400,
    beds: 0,
    warmthBonus: 0,
    glow: 1,
    defaultWalls: [
      ['reinforced', 'reinforced', 'door', 'reinforced'],
      ['reinforced', 'reinforced', 'reinforced', 'reinforced'],
      ['reinforced', 'reinforced', 'reinforced', 'reinforced'],
      ['reinforced', 'reinforced', 'reinforced', 'reinforced'],
    ],
    description: '+400 food-focused storage. Keeps meals fresh longer.',
  },
  {
    id: 'waterPurifier',
    name: 'Water Purifier',
    category: 'Utility',
    size: [1, 1],
    tier: 3,
    cost: { metal: 15, parts: 5, stone: 10 },
    buildTime: 20,
    workers: 1,
    storage: 0,
    beds: 0,
    warmthBonus: 0,
    glow: 1,
    workAnim: 'tend',
    produces: 'kitchen', // Produces clean water (abstracted as food bonus)
    defaultWalls: [
      ['reinforced'],
      ['window'],
      ['door'],
      ['reinforced'],
    ],
    description: '1 worker. Boosts meal output from kitchen.',
  },
];

// TIER 4 ROOMS (Hearth Stage 4: Glazed and Stoved)
const TIER4_ROOMS: RoomDef[] = [
  {
    id: 'greenhouse',
    name: 'Greenhouse',
    category: 'Production',
    size: [2, 3],
    tier: 4,
    cost: { planks: 40, metal: 20, parts: 5 },
    buildTime: 40,
    workers: 2,
    storage: 50,
    beds: 0,
    warmthBonus: 2,
    glow: 3,
    workAnim: 'gather',
    produces: 'foragerHut', // Produces raw food
    heat: { radius: 4, fuelPerMinute: 1 },
    defaultWalls: [
      ['window', 'window', 'door', 'window', 'window', 'window'],
      ['window', 'window', 'window', 'window', 'window', 'window'],
      ['window', 'window', 'window', 'window', 'window', 'window'],
      ['window', 'window', 'window', 'window', 'window', 'window'],
    ],
    upgradesTo: 'hydroponicsBay',
    upgradeCost: { metal: 30, parts: 10, planks: 20 },
    description: '2 workers grow food year-round. Needs warmth. Glass walls.',
  },
  {
    id: 'lab',
    name: 'Laboratory',
    category: 'Production',
    size: [2, 2],
    tier: 4,
    cost: { planks: 30, metal: 20, parts: 10 },
    buildTime: 35,
    workers: 1,
    storage: 50,
    beds: 0,
    warmthBonus: 0,
    glow: 2,
    workAnim: 'tend',
    produces: 'workshop', // Advanced components
    defaultWalls: [
      ['reinforced', 'reinforced', 'door', 'reinforced'],
      ['reinforced', 'window', 'reinforced', 'reinforced'],
      ['reinforced', 'reinforced', 'reinforced', 'reinforced'],
      ['reinforced', 'window', 'reinforced', 'reinforced'],
    ],
    upgradesTo: 'advancedLab',
    upgradeCost: { metal: 40, parts: 15, planks: 20 },
    description: '1 worker makes advanced components. Unlocks upgrades.',
  },
  {
    id: 'commsRoom',
    name: 'Comms Room',
    category: 'Utility',
    size: [2, 2],
    tier: 4,
    cost: { metal: 25, parts: 10, planks: 15 },
    buildTime: 30,
    workers: 1,
    storage: 0,
    beds: 0,
    warmthBonus: 0,
    glow: 2,
    workAnim: 'tend',
    defaultWalls: [
      ['reinforced', 'reinforced', 'door', 'reinforced'],
      ['reinforced', 'window', 'reinforced', 'reinforced'],
      ['reinforced', 'reinforced', 'reinforced', 'reinforced'],
      ['reinforced', 'window', 'reinforced', 'reinforced'],
    ],
    description: '1 worker. Reveals distant POIs. Reduces expedition risk.',
  },
  {
    id: 'observationDeck',
    name: 'Observation Deck',
    category: 'Defense',
    size: [2, 2],
    tier: 4,
    cost: { planks: 35, metal: 15, parts: 5 },
    buildTime: 30,
    workers: 2,
    storage: 0,
    beds: 0,
    warmthBonus: 0,
    glow: 4,
    heat: { radius: 8, fuelPerMinute: 1 }, // Spotlight
    defaultWalls: [
      ['gunPort', 'gunPort', 'door', 'gunPort'],
      ['gunPort', 'window', 'window', 'gunPort'],
      ['window', 'window', 'window', 'window'],
      ['gunPort', 'window', 'window', 'gunPort'],
    ],
    description: '2 defenders. Spotlight + gun ports. Sees far.',
  },
];

// TIER 5 ROOMS (Hearth Stage 5: Restored Lodge)
const TIER5_ROOMS: RoomDef[] = [
  {
    id: 'commandCenter',
    name: 'Command Center',
    category: 'Utility',
    size: [3, 3],
    tier: 5,
    cost: { planks: 80, metal: 60, parts: 20 },
    buildTime: 60,
    workers: 2,
    storage: 200,
    beds: 0,
    warmthBonus: 3,
    glow: 4,
    defaultWalls: [
      ['metal', 'metal', 'door', 'metal', 'metal', 'metal'],
      ['metal', 'window', 'gunPort', 'gunPort', 'window', 'metal'],
      ['metal', 'gunPort', 'metal', 'metal', 'gunPort', 'metal'],
      ['metal', 'window', 'gunPort', 'gunPort', 'window', 'metal'],
    ],
    description: 'Heart of the compound. +3 warmth radius. 2 workers manage defenses.',
  },
  {
    id: 'vaultDoor',
    name: 'Vault Door',
    category: 'Defense',
    size: [1, 1],
    tier: 5,
    cost: { metal: 50, parts: 20, planks: 30 },
    buildTime: 40,
    workers: 0,
    storage: 0,
    beds: 0,
    warmthBonus: 0,
    glow: 1,
    defaultWalls: [
      ['metal'],
      ['metal'],
      ['metal'],
      ['metal'],
    ],
    description: 'Seals the house entrance. 5000 HP. Opens only for colonists.',
  },
  {
    id: 'reactor',
    name: 'Reactor',
    category: 'Utility',
    size: [2, 2],
    tier: 5,
    cost: { metal: 60, parts: 30, planks: 20 },
    buildTime: 50,
    workers: 1,
    storage: 0,
    beds: 0,
    warmthBonus: 5,
    glow: 5,
    heat: { radius: 12, fuelPerMinute: 5 },
    defaultWalls: [
      ['metal', 'metal', 'door', 'metal'],
      ['metal', 'reinforced', 'reinforced', 'metal'],
      ['metal', 'reinforced', 'reinforced', 'metal'],
      ['metal', 'metal', 'metal', 'metal'],
    ],
    description: 'Massive heat output. Burns 5 fuel/min. Powers whole compound.',
  },
  {
    id: 'escapePodBay',
    name: 'Escape Pod Bay',
    category: 'Utility',
    size: [3, 3],
    tier: 5,
    cost: { planks: 100, metal: 80, parts: 30 },
    buildTime: 80,
    workers: 4,
    storage: 0,
    beds: 0,
    warmthBonus: 0,
    glow: 5,
    defaultWalls: [
      ['metal', 'metal', 'door', 'metal', 'metal', 'metal'],
      ['metal', 'reinforced', 'reinforced', 'reinforced', 'reinforced', 'metal'],
      ['metal', 'reinforced', 'reinforced', 'reinforced', 'reinforced', 'metal'],
      ['metal', 'metal', 'metal', 'metal', 'metal', 'metal'],
    ],
    description: 'Alternative escape. 4 workers. Launches faster than airship.',
  },
];

// Wall modules (1x1, snap to room edges)
export const WALL_MODULES: WallModuleDef[] = [
  {
    id: 'reinforcedWall',
    name: 'Reinforced Wall',
    category: 'Defense',
    cost: { metal: 5, stone: 5 },
    buildTime: 6,
    wallType: 'reinforced',
    hp: 350,
    description: 'Strong wall segment. 350 HP.',
  },
  {
    id: 'stoneWall',
    name: 'Stone Wall',
    category: 'Defense',
    cost: { stone: 10, planks: 5 },
    buildTime: 8,
    wallType: 'stone',
    hp: 500,
    description: 'Very tough wall. 500 HP.',
  },
  {
    id: 'metalWall',
    name: 'Metal Wall',
    category: 'Defense',
    cost: { metal: 15, parts: 5 },
    buildTime: 10,
    wallType: 'metal',
    hp: 800,
    description: 'Maximum protection. 800 HP.',
  },
  {
    id: 'gunPort',
    name: 'Gun Port',
    category: 'Defense',
    cost: { metal: 10, parts: 5, planks: 5 },
    buildTime: 12,
    wallType: 'gunPort',
    hp: 200,
    gun: { name: 'Mounted Gun', range: 7, damage: 18, interval: 1.2 },
    description: 'Defender fires through this. Range 7, 18 damage.',
  },
  {
    id: 'heavyGunPort',
    name: 'Heavy Gun Port',
    category: 'Defense',
    cost: { metal: 25, parts: 10, planks: 10 },
    buildTime: 18,
    wallType: 'gunPort',
    hp: 300,
    gun: { name: 'Heavy Gun', range: 10, damage: 35, interval: 1.5 },
    description: 'Heavy gun. Range 10, 35 damage. Needs parts.',
  },
  {
    id: 'spotlightMount',
    name: 'Spotlight Mount',
    category: 'Defense',
    cost: { metal: 15, parts: 5, scrap: 10 },
    buildTime: 10,
    wallType: 'window', // Visual: window with light
    hp: 100,
    lightRadius: 10,
    description: 'Projects light 10 tiles. Burns 1 fuel/night.',
  },
  {
    id: 'trapDoor',
    name: 'Trap Door',
    category: 'Defense',
    cost: { metal: 10, parts: 5, wood: 10 },
    buildTime: 12,
    wallType: 'trapDoor',
    hp: 150,
    description: 'Drops enemies into pit. 50 damage. Resets at dawn.',
  },
  {
    id: 'window',
    name: 'Window',
    category: 'Defense',
    cost: { planks: 5, metal: 2 },
    buildTime: 4,
    wallType: 'window',
    hp: 80,
    description: 'Lets light out. Weak but pretty.',
  },
  {
    id: 'door',
    name: 'Reinforced Door',
    category: 'Defense',
    cost: { metal: 10, planks: 10, parts: 2 },
    buildTime: 8,
    wallType: 'door',
    hp: 250,
    description: 'Strong door. Colonists pass, enemies blocked.',
  },
];

// All rooms combined
export const ROOMS: RoomDef[] = [
  ...TIER1_ROOMS,
  ...TIER2_ROOMS,
  ...TIER3_ROOMS,
  ...TIER4_ROOMS,
  ...TIER5_ROOMS,
];

export const ROOM_TYPES = ROOMS.map(r => r.id) as RoomDef['id'][];
export const ROOM_BY_ID = Object.fromEntries(ROOMS.map(r => [r.id, r])) as Record<RoomDef['id'], RoomDef>;
export const WALL_MODULE_BY_ID = Object.fromEntries(WALL_MODULES.map(w => [w.id, w])) as Record<WallModuleDef['id'], WallModuleDef>;

// Helper: get rooms available at a given hearth stage
export function roomsForTier(tier: number): RoomDef[] {
  return ROOMS.filter(r => r.tier <= tier);
}

// Helper: get wall modules available (all available from tier 2+)
export function wallModulesForTier(tier: number): WallModuleDef[] {
  if (tier < 2) return [];
  return WALL_MODULES;
}

// Glass wall type (for greenhouse) - maps to window visually
export const GLASS_WALL_TYPES: WallType[] = ['window'];
export const WALL_TYPE_ORDER: WallType[] = ['wood', 'reinforced', 'stone', 'metal', 'gunPort', 'window', 'door', 'trapDoor'];