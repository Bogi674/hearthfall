// Seeded map generation. The same seed always produces the same map.
import { BALANCE } from '../data/balance';
import { POI_TYPES, POIS } from '../data/pois';
import { getTile, inBounds, setTile, Tile, type MapState } from './grid';
import { chance, nextFloat, nextInt, type RngState } from './rng';

const CFG = BALANCE.map;

export interface GeneratedMap {
  map: MapState;
  hearth: { x: number; y: number };
  pois: { type: (typeof POI_TYPES)[number]; x: number; y: number; clears: number; seen: 'hidden' | 'rumored' | 'known' }[];
}

export function generateMap(rng: RngState): GeneratedMap {
  const width = CFG.width;
  const height = CFG.height;
  const map: MapState = { width, height, tiles: new Array<Tile>(width * height).fill(Tile.Ground) };
  const hx = Math.floor(width / 2);
  const hy = Math.floor(height / 2);

  placeRoads(map, rng, hx, hy);
  placeHouses(map, rng, hx, hy);
  placePonds(map, rng, hx, hy);
  placeTrees(map, rng, hx, hy);
  placeStreetRubble(map, rng);
  clearAround(map, hx, hy, CFG.clearingRadius);

  const pois = placePois(map, rng, hx, hy);
  placeYard(map, rng, hx, hy);
  return { map, hearth: { x: hx, y: hy }, pois };
}

/**
 * The old owner's paddock: an open square of ground near the house, in a random one of the eight directions.
 * Trees, ruins, and rubble are cleared from it, so the launch pad (section 11.2) always has room on every map.
 */
function placeYard(map: MapState, rng: RngState, hx: number, hy: number): void {
  const a = (nextInt(rng, 0, 7) * Math.PI) / 4;
  const [cx, cy] = [Math.round(hx + Math.cos(a) * CFG.yard.distance), Math.round(hy + Math.sin(a) * CFG.yard.distance)];
  const half = Math.floor(CFG.yard.size / 2);
  for (let y = cy - half; y < cy - half + CFG.yard.size; y++) {
    for (let x = cx - half; x < cx - half + CFG.yard.size; x++) if (inBounds(map, x, y)) setTile(map, x, y, Tile.Ground);
  }
}

/** One POI of each type at its design distance, in a random direction, on a small cleared lot. */
function placePois(map: MapState, rng: RngState, hx: number, hy: number): GeneratedMap['pois'] {
  return POI_TYPES.map((type) => {
    const a = nextFloat(rng) * Math.PI * 2;
    const r = POIS[type].distance;
    const x = Math.max(3, Math.min(map.width - 4, Math.round(hx + Math.cos(a) * r)));
    const y = Math.max(3, Math.min(map.height - 4, Math.round(hy + Math.sin(a) * r)));
    clearAround(map, x, y, 1.5);
    return { type, x, y, clears: 0, seen: 'hidden' as const };
  });
}

function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}

/** Two main roads cross the whole map beside the town square. Shorter side streets branch off. */
function placeRoads(map: MapState, rng: RngState, hx: number, hy: number): void {
  const mainY = hy + nextInt(rng, 3, 5) * (chance(rng, 0.5) ? 1 : -1);
  const mainX = hx + nextInt(rng, 3, 5) * (chance(rng, 0.5) ? 1 : -1);
  for (let i = 0; i < map.width; i++) {
    for (let w = 0; w < 2; w++) {
      setTile(map, i, mainY + w, Tile.Road);
      setTile(map, mainX + w, i, Tile.Road);
    }
  }
  for (const offset of CFG.sideStreets) {
    const y = hy + offset + nextInt(rng, -1, 1);
    const half = nextInt(rng, 14, CFG.townRadius);
    for (let x = hx - half; x <= hx + half; x++) if (inBounds(map, x, y)) setTile(map, x, y, Tile.Road);
    const x = hx + offset + nextInt(rng, -1, 1);
    const halfV = nextInt(rng, 14, CFG.townRadius);
    for (let yy = hy - halfV; yy <= hy + halfV; yy++) if (inBounds(map, x, yy)) setTile(map, x, yy, Tile.Road);
  }
}

/** Ruined houses are rectangles of broken wall with rubble inside. */
function placeHouses(map: MapState, rng: RngState, hx: number, hy: number): void {
  let placed = 0;
  for (let attempt = 0; attempt < CFG.houseAttempts && placed < CFG.houseCountMax; attempt++) {
    const w = nextInt(rng, CFG.houseWidth[0], CFG.houseWidth[1]);
    const d = nextInt(rng, CFG.houseDepth[0], CFG.houseDepth[1]);
    const angle = nextFloat(rng) * Math.PI * 2;
    const r = CFG.clearingRadius + 3 + nextFloat(rng) * (CFG.townRadius - CFG.clearingRadius - 3);
    const x0 = Math.round(hx + Math.cos(angle) * r - w / 2);
    const y0 = Math.round(hy + Math.sin(angle) * r - d / 2);
    if (!areaIsGround(map, x0 - 1, y0 - 1, w + 2, d + 2)) continue;

    for (let y = y0; y < y0 + d; y++) {
      for (let x = x0; x < x0 + w; x++) {
        const edge = x === x0 || y === y0 || x === x0 + w - 1 || y === y0 + d - 1;
        if (edge) {
          if (!chance(rng, CFG.wallGapChance)) setTile(map, x, y, Tile.RuinWall);
          else if (chance(rng, 0.5)) setTile(map, x, y, Tile.Rubble);
        } else if (chance(rng, CFG.houseRubbleChance)) {
          setTile(map, x, y, Tile.Rubble);
        }
      }
    }
    placed++;
  }
}

function areaIsGround(map: MapState, x0: number, y0: number, w: number, d: number): boolean {
  for (let y = y0; y < y0 + d; y++) {
    for (let x = x0; x < x0 + w; x++) {
      if (!inBounds(map, x, y) || getTile(map, x, y) !== Tile.Ground) return false;
    }
  }
  return true;
}

/** Small frozen ponds outside the town. */
function placePonds(map: MapState, rng: RngState, hx: number, hy: number): void {
  for (let p = 0; p < CFG.ponds; p++) {
    const angle = nextFloat(rng) * Math.PI * 2;
    const r = CFG.townRadius - 4 + nextFloat(rng) * 8;
    const cx = Math.round(hx + Math.cos(angle) * r);
    const cy = Math.round(hy + Math.sin(angle) * r);
    const radius = CFG.pondRadius[0] + nextFloat(rng) * (CFG.pondRadius[1] - CFG.pondRadius[0]);
    for (let y = cy - 6; y <= cy + 6; y++) {
      for (let x = cx - 6; x <= cx + 6; x++) {
        if (!inBounds(map, x, y) || getTile(map, x, y) !== Tile.Ground) continue;
        if (dist(x, y, cx, cy) < radius + (nextFloat(rng) - 0.5) * 1.5) setTile(map, x, y, Tile.Water);
      }
    }
  }
}

/** Trees grow in noisy clusters. Density rises with distance from the hearth. */
function placeTrees(map: MapState, rng: RngState, hx: number, hy: number): void {
  const noise = createValueNoise(rng, map.width, map.height, CFG.forestNoiseScale);
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      if (getTile(map, x, y) !== Tile.Ground) continue;
      const d = dist(x, y, hx, hy);
      const outside = Math.min(1, Math.max(0, (d - CFG.forestStart) / CFG.forestRamp));
      const density = noise(x, y) * 0.9 - 0.45 + outside * 0.75;
      if (chance(rng, Math.max(0, Math.min(0.9, density)))) setTile(map, x, y, Tile.Tree);
    }
  }
}

function placeStreetRubble(map: MapState, rng: RngState): void {
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      if (getTile(map, x, y) === Tile.Ground && chance(rng, CFG.streetRubbleChance)) setTile(map, x, y, Tile.Rubble);
    }
  }
}

function clearAround(map: MapState, cx: number, cy: number, radius: number): void {
  const r = Math.floor(radius);
  for (let y = cy - r; y <= cy + r; y++) {
    for (let x = cx - r; x <= cx + r; x++) {
      if (inBounds(map, x, y) && dist(x, y, cx, cy) <= radius) setTile(map, x, y, Tile.Ground);
    }
  }
}

/** Smooth value noise in [0, 1] built from a seeded lattice. */
function createValueNoise(rng: RngState, width: number, height: number, scale: number) {
  const gw = Math.ceil(width / scale) + 2;
  const gh = Math.ceil(height / scale) + 2;
  const lattice = Array.from({ length: gw * gh }, () => nextFloat(rng));
  const smooth = (t: number) => t * t * (3 - 2 * t);
  return (x: number, y: number): number => {
    const fx = x / scale;
    const fy = y / scale;
    const ix = Math.floor(fx);
    const iy = Math.floor(fy);
    const tx = smooth(fx - ix);
    const ty = smooth(fy - iy);
    const at = (gx: number, gy: number) => lattice[gy * gw + gx];
    const top = at(ix, iy) + (at(ix + 1, iy) - at(ix, iy)) * tx;
    const bottom = at(ix, iy + 1) + (at(ix + 1, iy + 1) - at(ix, iy + 1)) * tx;
    return top + (bottom - top) * ty;
  };
}
