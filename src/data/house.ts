import { GUN_HEAVY, GUN_MAKESHIFT, type Gun } from './buildings';
import type { Amounts } from './resources';

// The house layer (M10.1): floors, wall edges, doors, and windows built on the house lot around the hearth.
// Furniture is in buildings.ts. Costs and times are balance numbers.

export const HOUSE = {
  /** Tiles from the hearth to the edge of the house lot at each hearth stage. */
  lotRadius: [4, 5, 6, 7, 8],
  /** Builders on one floor tile or wall edge at a time. */
  buildersPerPiece: 2,
};

export type FloorId = 'boards' | 'stone';

export interface FloorDef {
  name: string;
  cost: Amounts;
  /** Seconds of builder work. */
  build: number;
}

export const FLOORS: Record<FloorId, FloorDef> = {
  boards: { name: 'Plank Floor', cost: { wood: 2 }, build: 3 },
  stone: { name: 'Stone Floor', cost: { stone: 2 }, build: 4 },
};
export const FLOOR_IDS = Object.keys(FLOORS) as FloorId[];

/** A wall edge sits between two tiles. A door lets people through. A window lets light through and blocks people. */
export type EdgeKind = 'wall' | 'door' | 'window' | 'gunPort';

export interface EdgeLevel {
  name: string;
  cost: Amounts;
  build: number;
  hp: number;
  /** A gun port fires this gun when a defender stands at it at night (section 9.8). */
  gun?: Gun;
}

export interface EdgeDef {
  name: string;
  levels: EdgeLevel[];
}

export const EDGES: Record<EdgeKind, EdgeDef> = {
  wall: {
    name: 'Wall',
    levels: [
      { name: 'Wood Wall', cost: { wood: 4 }, build: 5, hp: 150 },
      { name: 'Reinforced Wall', cost: { planks: 4, metal: 1 }, build: 7, hp: 300 },
      { name: 'Stone Wall', cost: { stone: 6 }, build: 9, hp: 450 },
      { name: 'Metal Wall', cost: { metal: 6 }, build: 11, hp: 650 },
    ],
  },
  door: {
    name: 'Door',
    levels: [
      { name: 'Wood Door', cost: { wood: 6 }, build: 4, hp: 100 },
      { name: 'Reinforced Door', cost: { planks: 4, metal: 3 }, build: 7, hp: 300 },
    ],
  },
  window: {
    name: 'Window',
    levels: [{ name: 'Window', cost: { wood: 3 }, build: 4, hp: 80 }],
  },
  gunPort: {
    name: 'Gun Port',
    levels: [
      { name: 'Gun Port', cost: { wood: 4, scrap: 6 }, build: 6, hp: 120, gun: GUN_MAKESHIFT },
      { name: 'Heavy Gun Port', cost: { planks: 4, metal: 6, parts: 2 }, build: 9, hp: 300, gun: GUN_HEAVY },
    ],
  },
};
export const EDGE_KINDS = Object.keys(EDGES) as EdgeKind[];
