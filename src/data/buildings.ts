import type { Amounts } from './resources';

// Buildings from section 8 of docs/GAME_DESIGN.md. Size is the footprint in tiles before rotation.

export interface BuildingDef {
  name: string;
  category: 'Shelter' | 'Production';
  cost: Amounts;
  size: [number, number];
  workers: number;
  beds?: number;
  storage?: number;
}

const DEFS = {
  tent: { name: 'Tent', category: 'Shelter', cost: { wood: 10 }, size: [2, 2], workers: 0, beds: 4 },
  bunkhouse: { name: 'Bunkhouse', category: 'Shelter', cost: { planks: 30, stone: 10 }, size: [3, 3], workers: 0, beds: 10 },
  storageShed: { name: 'Storage Shed', category: 'Shelter', cost: { wood: 20 }, size: [2, 2], workers: 0, storage: 200 },
  woodcutterCamp: { name: 'Woodcutter Camp', category: 'Production', cost: { wood: 15 }, size: [2, 2], workers: 3 },
  salvageYard: { name: 'Salvage Yard', category: 'Production', cost: { wood: 20 }, size: [2, 2], workers: 3 },
  quarry: { name: 'Quarry', category: 'Production', cost: { wood: 30 }, size: [2, 2], workers: 3 },
  foragerHut: { name: 'Forager Hut', category: 'Production', cost: { wood: 15 }, size: [2, 2], workers: 2 },
  kitchen: { name: 'Kitchen', category: 'Production', cost: { wood: 25 }, size: [2, 2], workers: 2 },
  sawmill: { name: 'Sawmill', category: 'Production', cost: { wood: 30, scrap: 10 }, size: [3, 2], workers: 2 },
  charcoalKiln: { name: 'Charcoal Kiln', category: 'Production', cost: { wood: 20, stone: 10 }, size: [2, 2], workers: 1 },
} satisfies Record<string, BuildingDef>;

export type BuildingType = keyof typeof DEFS;
export const BUILDINGS: Record<BuildingType, BuildingDef> = DEFS;
export const BUILDING_TYPES = Object.keys(BUILDINGS) as BuildingType[];
