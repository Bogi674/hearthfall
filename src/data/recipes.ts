import { Tile } from '../sim/grid';
import type { BuildingType } from './buildings';
import type { Amounts } from './resources';

// Production recipes (section 7). Cycle is seconds per output at full workers on a warm tile.
// Gatherers harvest the nearest node of their tile type within the radius. Nodes deplete.

export interface Recipe {
  cycle: number;
  inputs?: Amounts;
  outputs: Amounts;
  gather?: { tile: Tile; radius: number };
}

export const RECIPES: Partial<Record<BuildingType, Recipe>> = {
  woodcutterCamp: { cycle: 6, outputs: { wood: 3 }, gather: { tile: Tile.Tree, radius: 6 } },
  salvageYard: { cycle: 8, outputs: { scrap: 2 }, gather: { tile: Tile.Rubble, radius: 6 } },
  quarry: { cycle: 8, outputs: { stone: 3 }, gather: { tile: Tile.RuinWall, radius: 6 } },
  foragerHut: { cycle: 8, outputs: { rawFood: 2 } },
  kitchen: { cycle: 8, inputs: { rawFood: 2, fuel: 1 }, outputs: { meals: 2 } },
  sawmill: { cycle: 8, inputs: { wood: 2 }, outputs: { planks: 1 } },
  charcoalKiln: { cycle: 8, inputs: { wood: 2 }, outputs: { fuel: 2 } },
};

/** Units a node holds before it is used up. */
export const NODE_AMOUNTS: Partial<Record<Tile, number>> = {
  [Tile.Tree]: 25,
  [Tile.Rubble]: 15,
  [Tile.RuinWall]: 30,
};
