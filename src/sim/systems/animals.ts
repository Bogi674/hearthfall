// Wild animals (M13). Deer and pigs wander the forest, shy away from people, and wander in again each dawn while there is room.
// Hunters from a Hunting Lodge go after them (see jobs.ts). Everything random uses the world's seeded generator.
import { ANIMALS, WILD, type AnimalKind } from '../../data/wild';
import { Tile } from '../grid';
import { chance, nextFloat } from '../rng';
import { phaseStarted } from '../query';
import type { Animal, World } from '../world';

const walkable = (world: World, x: number, y: number): boolean => {
  const { width, height, tiles } = world.map;
  const [tx, ty] = [Math.round(x), Math.round(y)];
  if (tx < 1 || ty < 1 || tx >= width - 1 || ty >= height - 1) return false;
  const t = tiles[ty * width + tx];
  return t !== Tile.Water && t !== Tile.RuinWall && t !== Tile.Blocked;
};

/** Puts animals on the map, in the band of land between the camp and the far edge. */
export function spawnAnimals(world: World, n: number): void {
  const { rng, map } = world;
  for (let placed = 0, tries = 0; placed < n && tries < 400 && world.animals.length < WILD.cap; tries++) {
    const a = nextFloat(rng) * Math.PI * 2;
    const r = WILD.from + nextFloat(rng) * (WILD.to - WILD.from);
    const x = Math.round(world.hearth.x + Math.cos(a) * r);
    const y = Math.round(world.hearth.y + Math.sin(a) * r);
    if (x < 3 || y < 3 || x >= map.width - 3 || y >= map.height - 3 || !walkable(world, x, y)) continue;
    const kind: AnimalKind = chance(rng, WILD.pigShare) ? 'pig' : 'deer';
    world.animals.push({ id: world.nextId++, kind, x, y, px: x, py: y, tx: x, ty: y, pause: nextFloat(rng) * 6, hunter: null, caught: 0 });
    placed++;
  }
}

export function animalsSystem(world: World, dt: number): void {
  if (phaseStarted(world, 'Dawn', dt)) spawnAnimals(world, WILD.perDay);
  const alive = new Set(world.colonists.map((c) => c.id));
  for (const an of world.animals) {
    an.px = an.x;
    an.py = an.y;
    if (an.hunter !== null && !alive.has(an.hunter)) [an.hunter, an.caught] = [null, 0];
    const def = ANIMALS[an.kind];
    // A hunter standing close freezes it while the hunt is finished. Anyone else nearby makes it run.
    const near = world.colonists.filter((c) => Math.hypot(c.x - an.x, c.y - an.y) < def.fear);
    const held = an.hunter !== null && near.some((c) => c.id === an.hunter && Math.hypot(c.x - an.x, c.y - an.y) < 1.2);
    if (held) continue;
    // The hunter who marked it can come closer before it bolts, but not all the way.
    const scared = near.filter((c) => c.id !== an.hunter || Math.hypot(c.x - an.x, c.y - an.y) < def.fear * 0.6);
    if (scared.length > 0) {
      const c = scared[0];
      const d = Math.hypot(an.x - c.x, an.y - c.y) || 1;
      step(world, an, an.x + ((an.x - c.x) / d) * 3, an.y + ((an.y - c.y) / d) * 3, def.speed * dt);
      continue;
    }
    if (an.pause > 0) {
      an.pause -= dt;
      continue;
    }
    if (Math.hypot(an.tx - an.x, an.ty - an.y) < 0.2) {
      const a = nextFloat(world.rng) * Math.PI * 2;
      const r = 2 + nextFloat(world.rng) * 4;
      const [nx, ny] = [an.x + Math.cos(a) * r, an.y + Math.sin(a) * r];
      // They keep to the wild, away from the camp.
      if (walkable(world, nx, ny) && Math.hypot(nx - world.hearth.x, ny - world.hearth.y) > WILD.from - 4) [an.tx, an.ty] = [nx, ny];
      an.pause = 3 + nextFloat(world.rng) * 8;
      continue;
    }
    step(world, an, an.tx, an.ty, def.speed * WILD.wander * dt);
  }
}

function step(world: World, an: Animal, tx: number, ty: number, length: number): void {
  const d = Math.hypot(tx - an.x, ty - an.y);
  if (d < 1e-6) return;
  const s = Math.min(d, length);
  const [nx, ny] = [an.x + ((tx - an.x) / d) * s, an.y + ((ty - an.y) / d) * s];
  if (walkable(world, nx, ny)) [an.x, an.y] = [nx, ny];
  else an.pause = 1;
}
