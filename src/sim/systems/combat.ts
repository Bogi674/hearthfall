// Monsters follow the flow field toward the house (section 9.3). Breakers smash what blocks them.
// The others cannot hurt buildings, so they hunt people who are out in the open (section 9.4).
// Light protects people in steps (section 5.3). People inside a standing building are safe.
// Mounted guns fire with a defender on duty, colonists fight back with their weapons,
// and spike traps hurt monsters standing on them.
import { BALANCE } from '../../data/balance';
import { BUILDINGS } from '../../data/buildings';
import { ENEMIES } from '../../data/enemies';
import { WEAPON_IDS, WEAPONS } from '../../data/weapons';
import { EDGES } from '../../data/house';
import { crossCost } from './pathfinding';
import { barrierBetween, isBreached, isIndoors } from '../house';
import { center, isBuilt, lightSources, lightStepAt } from '../query';
import { addLog, recordDeath, type Building, type Colonist, type Enemy, type HouseEdge, type World } from '../world';

const D = BALANCE.defense;

export function combatSystem(world: World, dt: number): void {
  const { width } = world.map;
  const blocking = new Map<number, Building>();
  const traps = new Map<number, Building>();
  for (const b of world.buildings) {
    const map = BUILDINGS[b.type].walkable ? traps : blocking;
    for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) map.set(y * width + x, b);
  }
  const lights = lightSources(world);
  equip(world);
  for (const c of world.colonists) c.cooldown = Math.max(0, c.cooldown - dt);
  const byId = new Map(world.buildings.map((b) => [b.id, b]));
  const exposed = world.colonists.filter((c) => c.expedition === null && isExposed(world, c, byId));
  // Hunters avoid people standing in the core of a light.
  const prey = exposed.filter((c) => lightStepAt(lights, c.x, c.y)?.damage !== 0);

  for (const e of world.enemies) {
    const def = ENEMIES[e.type];
    const field = def.runner ? world.flow.runner : world.flow.normal;
    const light = lightStepAt(lights, e.x, e.y);
    const harm = light ? light.damage : 1;
    e.px = e.x;
    e.py = e.y;
    e.cooldown -= dt;
    const hit = e.cooldown <= 0;
    if (hit) e.cooldown = D.attackInterval;

    // In the brightest light monsters do not go for people at all.
    const victim = harm > 0 ? exposed.find((c) => c.health > 0 && Math.hypot(c.x - e.x, c.y - e.y) < D.reach) : undefined;
    if (victim) {
      if (hit) victim.health -= (def.damage * harm) / D.colonistHp;
      if (victim.health <= 0) recordDeath(world, victim, `was killed by a ${def.name}`);
    } else {
      const tx = Math.round(e.x);
      const ty = Math.round(e.y);
      const here = ty * width + tx;
      let next = here;
      let best = field[here];
      // House walls count against a step, so a monster goes where the way in is weakest.
      for (const n of [tx < width - 1 && here + 1, tx > 0 && here - 1, here + width, here - width]) {
        if (n === false) continue;
        const cost = field[n] + crossCost(world, !!def.runner, tx, ty, n % width, (n - (n % width)) / width);
        if (cost < best) [next, best] = [n, cost];
      }
      const speed = def.speed * (light ? light.speed : 1) * dt;
      const target = e.breaker ? null : nearestPrey(e, prey);
      const wall = blocking.get(next);
      const nx = next % width;
      const barrier = next === ty * width + tx ? undefined : barrierBetween(world, tx, ty, nx, (next - nx) / width);
      if (target && chase(world, e, target, speed, blocking, width)) {
        // Hunting a person in the open.
      } else if (field[next] === 0) {
        if (hit && e.breaker) world.hearth.hp -= def.damage;
      } else if (wall) {
        if (hit && e.breaker) wall.hp -= def.damage * def.wallDamage;
      } else if (barrier) {
        // A wall, door, or window of the house. Breakers smash it. The others wait outside.
        if (hit && e.breaker) barrier.hp -= def.damage * def.wallDamage;
      } else {
        const ny = (next - nx) / width;
        const d = Math.hypot(nx - e.x, ny - e.y);
        const step = Math.min(d, speed);
        if (d > 0) {
          e.x += ((nx - e.x) / d) * step;
          e.y += ((ny - e.y) / d) * step;
        }
      }
    }

    const trap = traps.get(Math.round(e.y) * width + Math.round(e.x));
    if (trap && isBuilt(trap)) {
      e.hp -= D.trapDps * dt;
      trap.hp -= D.trapWearPerSecond * dt;
    }
  }

  fireGuns(world);
  firePorts(world);
  fightBack(world, exposed);

  world.enemies = world.enemies.filter((e) => e.hp > 0);
  world.colonists = world.colonists.filter((c) => c.health > 0);
  const broken = world.house.edges.filter((e: HouseEdge) => e.hp <= 0);
  if (broken.length) {
    for (const e of broken) addLog(world, `A ${EDGES[e.kind].levels[e.level - 1].name.toLowerCase()} was broken.`, { x: e.x, y: e.y });
    world.house.edges = world.house.edges.filter((e) => e.hp > 0);
    world.buildRev++;
    world.hope = Math.max(0, world.hope + BALANCE.hope.buildingDestroyed * broken.length);
  }
  const destroyed = world.buildings.filter((b) => b.hp <= 0);
  if (destroyed.length) {
    for (const b of destroyed) addLog(world, `The ${BUILDINGS[b.type].name} was destroyed.`, center(b));
    world.buildings = world.buildings.filter((b) => b.hp > 0);
    world.buildRev++;
    world.hope = Math.max(0, world.hope + BALANCE.hope.buildingDestroyed * destroyed.length);
  }
}

/**
 * Asleep in a bed, sheltering, or working inside a standing building keeps a colonist out of reach.
 * So does standing in a closed room of the house. Once a wall is down, anyone on its floor is exposed.
 */
function isExposed(world: World, c: Colonist, byId: Map<number, Building>): boolean {
  if (isIndoors(world, c.x, c.y, c.storey)) return false;
  if (isBreached(world, c.x, c.y, c.storey)) return true;
  if (c.asleep || c.task === 'shelter') return false;
  const job = c.job === null ? undefined : byId.get(c.job);
  return !(c.task === 'work' && job && BUILDINGS[job.type].indoor);
}

/** The nearest person a hunter can reach within its hunting radius. */
function nearestPrey(e: Enemy, prey: Colonist[]): Colonist | null {
  let best: Colonist | null = null;
  let bestD: number = D.huntRadius;
  for (const c of prey) {
    const d = Math.hypot(c.x - e.x, c.y - e.y);
    if (d < bestD && c.health > 0) [best, bestD] = [c, d];
  }
  return best;
}

/** Moves straight at the prey. Returns false when a building is in the way. */
function chase(world: World, e: Enemy, prey: Colonist, speed: number, blocking: Map<number, Building>, width: number): boolean {
  const d = Math.hypot(prey.x - e.x, prey.y - e.y);
  const step = Math.min(speed, Math.max(0, d - D.reach * 0.8));
  const x = e.x + ((prey.x - e.x) / d) * step;
  const y = e.y + ((prey.y - e.y) / d) * step;
  if (blocking.has(Math.round(y) * width + Math.round(x))) return false;
  if (crossesWall(world, e.x, e.y, x, y)) return false;
  [e.x, e.y] = [x, y];
  return true;
}

/** True when the step from one point to another goes through a finished wall of the house. A corner step needs both ways clear. */
function crossesWall(world: World, ax: number, ay: number, bx: number, by: number): boolean {
  const [fx, fy, tx, ty] = [Math.round(ax), Math.round(ay), Math.round(bx), Math.round(by)];
  if (fx === tx && fy === ty) return false;
  if (fx === tx || fy === ty) return barrierBetween(world, fx, fy, tx, ty) !== undefined;
  return (
    barrierBetween(world, fx, fy, tx, fy) !== undefined || barrierBetween(world, tx, fy, tx, ty) !== undefined ||
    barrierBetween(world, fx, fy, fx, ty) !== undefined || barrierBetween(world, fx, ty, tx, ty) !== undefined
  );
}

/** Each defender on duty at a finished tower or gun nest fires one mounted gun (section 9.1). */
function fireGuns(world: World): void {
  for (const b of world.buildings) {
    const def = BUILDINGS[b.type];
    if (!def.guns) continue;
    b.status = !isBuilt(b) ? 'building' : world.colonists.some((c) => c.duty === b.id) ? 'ok' : 'noDefender';
    if (!isBuilt(b)) continue;
    const gun = def.guns[Math.min(b.level, def.guns.length) - 1];
    const at = center(b);
    for (const c of world.colonists) {
      if (c.duty !== b.id || c.task !== 'guard' || c.cooldown > 0) continue;
      const target = nearestEnemy(world, at.x, at.y, gun.range + b.storey * D.storeyRange);
      if (!target) break;
      target.hp -= gun.damage;
      c.cooldown = gun.interval;
    }
  }
}

/** Each defender at a finished gun port fires its gun through the wall (section 9.8). */
function firePorts(world: World): void {
  for (const e of world.house.edges) {
    if (e.kind !== 'gunPort' || e.construct > 0) continue;
    const gun = EDGES.gunPort.levels[e.level - 1].gun!;
    const c = world.colonists.find((o) => o.duty === e.id && o.task === 'guard' && o.cooldown <= 0);
    if (!c) continue;
    const target = nearestEnemy(world, e.x - (e.side === 'w' ? 0.5 : 0), e.y - (e.side === 'n' ? 0.5 : 0), gun.range + e.storey * D.storeyRange);
    if (!target) continue;
    target.hp -= gun.damage;
    c.cooldown = gun.interval;
  }
}

/** Colonists out in the open hit back at monsters in range of their weapon (section 9.6). */
function fightBack(world: World, exposed: Colonist[]): void {
  for (const c of exposed) {
    if (c.cooldown > 0 || c.task === 'guard' || c.health <= 0) continue;
    const weapon = WEAPONS[c.weapon];
    const target = nearestEnemy(world, c.x, c.y, weapon.range);
    if (!target) continue;
    target.hp -= weapon.damage;
    c.cooldown = weapon.interval;
  }
}

function nearestEnemy(world: World, x: number, y: number, range: number): Enemy | null {
  let best: Enemy | null = null;
  let bestD = range;
  for (const e of world.enemies) {
    const d = Math.hypot(e.x - x, e.y - y);
    if (e.hp > 0 && d <= bestD) [best, bestD] = [e, d];
  }
  return best;
}

/** Colonists swap their weapon for a better spare from the armory rack. */
function equip(world: World): void {
  for (const c of world.colonists) {
    for (let i = WEAPON_IDS.length - 1; i > WEAPON_IDS.indexOf(c.weapon); i--) {
      const id = WEAPON_IDS[i];
      if (world.weapons[id] > 0) {
        world.weapons[id]--;
        c.weapon = id;
        break;
      }
    }
  }
}
