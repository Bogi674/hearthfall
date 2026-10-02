// Tile types and grid helpers. Tiles are stored row major as plain numbers.

export const Tile = {
  Ground: 0,
  Road: 1,
  Tree: 2,
  Rubble: 3,
  RuinWall: 4,
  Water: 5,
  Blocked: 6,
} as const;
export type Tile = (typeof Tile)[keyof typeof Tile];

export interface MapState {
  width: number;
  height: number;
  tiles: Tile[];
}

export function tileIndex(map: MapState, x: number, y: number): number {
  return y * map.width + x;
}

export function inBounds(map: MapState, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < map.width && y < map.height;
}

export function getTile(map: MapState, x: number, y: number): Tile {
  return map.tiles[tileIndex(map, x, y)];
}

export function setTile(map: MapState, x: number, y: number, tile: Tile): void {
  map.tiles[tileIndex(map, x, y)] = tile;
}
