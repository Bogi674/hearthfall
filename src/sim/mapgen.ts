// Seeded map generation. The same seed always produces the same map.
import { BALANCE } from '../data/balance';
import { POI_TYPES, POIS } from '../data/pois';
import { getTile, inBounds, setTile, Tile, type MapState } from './grid';
import { chance, nextFloat, nextInt, type RngState } from './rng';
import { emptyRuins, startingRuin, townRuin, type Ruins } from './ruins';

const CFG = BALANCE.map;

export interface GeneratedMap {
  map: MapState;
  hearth: { x: number; y: number };
  pois: { type: (typeof POI_TYPES)[number]; x: number; y: number; clears: number; seen: 'hidden' | 'rumored' | 'known' }[];
  /** Every ruined house on the map as worn house pieces, the starting ruin first among them. */
  ruins: Ruins;
}

export function generateMap(rng: RngState): GeneratedMap {
  const width = CFG.width;
  const height = CFG.height;
  const map: MapState = { width, height, tiles: new Array<Tile>(width * height).fill(Tile.Ground) };
  const hx = Math.floor(width / 2);
  const hy = Math.floor(height / 2);

  const ruins = emptyRuins();
  placeRoads(map, rng, hx, hy);
  placeHouses(map, rng, hx, hy, ruins);
  placePonds(map, rng, hx, hy);
  placeTrees(map, rng, hx, hy);
  placeStreetRubble(map, rng);
  clearAround(map, hx, hy, CFG.clearingRadius);

  // The starting ruin goes in last, so nothing grows over it. It clears its own ground.
  const start = startingRuin(rng, map, hx, hy);
  ruins.floors.push(...start.floors);
  ruins.edges.push(...start.edges);
  ruins.furniture.push(...start.furniture);
  ruins.stash = start.stash;

  const pois = placePois(map, rng, hx, hy);
  placeYard(map, rng, hx, hy);
  return { map, hearth: { x: hx, y: hy }, pois, ruins };
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
    // Each place sits near its design distance, a little nearer or farther by the map.
    const r = POIS[type].distance * (0.9 + nextFloat(rng) * 0.2);
    const x = Math.max(3, Math.min(map.width - 4, Math.round(hx + Math.cos(a) * r)));
    const y = Math.max(3, Math.min(map.height - 4, Math.round(hy + Math.sin(a) * r)));
    clearAround(map, x, y, 4);
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

/** True when the starting ruin and its yard are in the way of a house at this spot. */
const nearStart = (hx: number, hy: number, x0: number, y0: number, w: number, d: number) =>
  x0 - 1 <= hx + 10 && x0 + w + 1 >= hx - 10 && y0 - 1 <= hy + 9 && y0 + d + 1 >= hy - 5;

/**
 * Ruined houses: worn floors and walls, made of house pieces, with masonry heaps beside them. A few neighbors stand near the
 * hearth, hamlets stand far apart from each other, and lone houses stand out by themselves. The gaps between them vary,
 * so a long walk may find nothing and a short one may find a hamlet.
 */
function placeHouses(map: MapState, rng: RngState, hx: number, hy: number, ruins: Ruins): void {
  const houses: { x: number; y: number }[] = [];
  const tooClose = (x: number, y: number, gap: number) => houses.some((h) => dist(h.x, h.y, x, y) < gap);
  const tryHouse = (cx: number, cy: number, gap: number): boolean => {
    const w = nextInt(rng, CFG.houseWidth[0], CFG.houseWidth[1]);
    const d = nextInt(rng, CFG.houseDepth[0], CFG.houseDepth[1]);
    const x0 = Math.round(cx - w / 2);
    const y0 = Math.round(cy - d / 2);
    if (!areaIsGround(map, x0 - 1, y0 - 1, w + 2, d + 2) || nearStart(hx, hy, x0, y0, w, d) || tooClose(cx, cy, gap)) return false;
    townRuin(rng, map, x0, y0, w, d, ruins);
    houses.push({ x: cx, y: cy });
    return true;
  };
  const around = (r0: number, r1: number) => {
    const a = nextFloat(rng) * Math.PI * 2;
    const r = r0 + nextFloat(rng) * (r1 - r0);
    return { x: hx + Math.cos(a) * r, y: hy + Math.sin(a) * r };
  };

  // Neighbors close to the hearth, so the first days have something to scavenge.
  const N = CFG.neighbors;
  for (let placed = 0, tries = 0; placed < N.count && tries < 200; tries++) {
    const p = around(N.between[0], N.between[1]);
    if (tryHouse(p.x, p.y, 8)) placed++;
  }
  // Hamlets, each far from the others.
  const H = CFG.hamlets;
  const centers: { x: number; y: number }[] = [];
  const hamletCount = nextInt(rng, H.count[0], H.count[1]);
  for (let tries = 0; centers.length < hamletCount && tries < 400; tries++) {
    const p = around(H.from, CFG.townRadius);
    if (p.x < 12 || p.y < 12 || p.x > map.width - 12 || p.y > map.height - 12) continue;
    if (centers.some((c) => dist(c.x, c.y, p.x, p.y) < H.spacing + nextFloat(rng) * 10)) continue;
    centers.push(p);
    const size = nextInt(rng, H.size[0], H.size[1]);
    for (let placed = 0, k = 0; placed < size && k < 80; k++) {
      const q = { x: p.x + (nextFloat(rng) - 0.5) * 2 * H.spread, y: p.y + (nextFloat(rng) - 0.5) * 2 * H.spread };
      if (tryHouse(q.x, q.y, H.houseGap + 4)) placed++;
    }
  }
  // Lone houses out in the dark.
  const L = CFG.lone;
  for (let placed = 0, tries = 0; placed < L.count && tries < 400; tries++) {
    const p = around(L.from, CFG.townRadius * 1.35);
    if (p.x < 8 || p.y < 8 || p.x > map.width - 8 || p.y > map.height - 8) continue;
    if (tryHouse(p.x, p.y, L.spacing)) placed++;
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
    const r = 28 + nextFloat(rng) * (CFG.townRadius * 1.2 - 28);
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
