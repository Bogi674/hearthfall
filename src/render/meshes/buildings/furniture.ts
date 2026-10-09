import type { BuildingType } from '../../../data/buildings';
import { GEO, MAT, part } from '../kit';
import type { Builder } from './parts';

// House furniture (section 5.5). Each piece fits inside its floor tiles.

const bed: Builder = (g, w, h) => {
  g.add(part(GEO.block, MAT.darkWood, [0, 0, 0], [w * 0.86, 0.2, h * 0.9]));
  g.add(part(GEO.block, MAT.sheetWarm, [0, 0.2, h * 0.06], [w * 0.76, 0.1, h * 0.7]));
  g.add(part(GEO.block, MAT.sheet, [0, 0.3, -h * 0.34], [w * 0.62, 0.08, h * 0.2]));
  g.add(part(GEO.block, MAT.darkWood, [0, 0.2, -h * 0.45], [w * 0.86, 0.34, 0.07]));
};

const shelf: Builder = (g, w, h) => {
  g.add(part(GEO.block, MAT.darkWood, [0, 0, 0], [w * 0.8, 1.1, h * 0.5]));
  for (const y of [0.35, 0.7]) g.add(part(GEO.block, MAT.wood, [0, y, 0.02], [w * 0.74, 0.05, h * 0.54]));
  g.add(part(GEO.block, MAT.rust, [-0.15, 0.4, 0.05], [0.18, 0.2, 0.2]));
  g.add(part(GEO.block, MAT.sheet, [0.15, 0.75, 0.05], [0.2, 0.18, 0.2]));
};

export const FURNITURE = { bed, shelf } satisfies Partial<Record<BuildingType, Builder>>;
