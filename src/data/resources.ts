export const RESOURCES = ['wood', 'scrap', 'stone', 'rawFood', 'planks', 'fuel', 'meals'] as const;
export type Resource = (typeof RESOURCES)[number];
export type Amounts = Partial<Record<Resource, number>>;

export const RESOURCE_NAMES: Record<Resource, string> = {
  wood: 'Wood',
  scrap: 'Scrap',
  stone: 'Stone',
  rawFood: 'Raw Food',
  planks: 'Planks',
  fuel: 'Fuel',
  meals: 'Meals',
};
