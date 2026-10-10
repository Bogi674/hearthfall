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
  woodcutterCamp: { cycle: 4, outputs: { wood: 8 }, gather: { tile: Tile.Tree, radius: 6 } },
  salvageYard: { cycle: 4, outputs: { scrap: 7 }, gather: { tile: Tile.Rubble, radius: 6 } },
  quarry: { cycle: 6, outputs: { stone: 3 }, gather: { tile: Tile.RuinWall, radius: 6 } },
  foragerHut: { cycle: 8, outputs: { rawFood: 2 } },
  hydroponics: { cycle: 10, inputs: { fuel: 1 }, outputs: { rawFood: 7 } },
  kitchen: { cycle: 6, inputs: { rawFood: 2, fuel: 1 }, outputs: { meals: 3 } },
  stove: { cycle: 6, inputs: { rawFood: 2, fuel: 1 }, outputs: { meals: 3 } },
  sawmill: { cycle: 3, inputs: { wood: 2 }, outputs: { planks: 3 } },
  charcoalKiln: { cycle: 6, inputs: { wood: 2 }, outputs: { fuel: 4 } },
  smelter: { cycle: 3.5, inputs: { scrap: 2, fuel: 1 }, outputs: { metal: 3 } },
  workshop: { cycle: 5, inputs: { planks: 1, metal: 1 }, outputs: { parts: 2 } },
};

/** Units a node holds before it is used up. */
export const NODE_AMOUNTS: Partial<Record<Tile, number>> = {
  [Tile.Tree]: 48,
  [Tile.Rubble]: 20,
  [Tile.RuinWall]: 30,
};
