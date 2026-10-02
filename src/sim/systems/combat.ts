// Monsters follow the flow field and attack what blocks them (section 9.3).
// Watchtowers shoot with a defender on duty, spike traps hurt monsters standing on them,
// and light weakens Shamblers and slows Runners (section 5.3).
import { BALANCE } from '../../data/balance';
import { BUILDINGS } from '../../data/buildings';
import { ENEMIES } from '../../data/enemies';
import { center, currentPhase } from '../query';
import { hearthRadius } from './warmth';
import { addLog, recordDeath, type Building, type World } from '../world';

const D = BALANCE.defense;

export function combatSystem(world: World, dt: number): void {
  const { width } = world.map;
  const blocking = new Map<number, Building>();
  const traps = new Map<number, Building>();
  for (const b of world.buildings) {
    const map = BUILDINGS[b.type].walkable ? traps : blocking;
    for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) map.set(y * width + x, b);
  }
  const lightRadius = (b: Building) => BUILDINGS[b.type].light?.radius ?? BUILDINGS[b.type].heat?.radius ?? 0;
  const lights = world.buildings.filter((b) => b.lit).map((b) => ({ ...center(b), r: lightRadius(b) }));
  if (world.hearth.lit) lights.push({ x: world.hearth.x, y: world.hearth.y, r: hearthRadius(world) });
  const isLit = (x: number, y: number) => lights.some((l) => Math.hypot(x - l.x, y - l.y) <= l.r);

  for (const e of world.enemies) {
    const def = ENEMIES[e.type];
    const field = def.runner ? world.flow.runner : world.flow.normal;
    const lit = isLit(e.x, e.y);
    e.px = e.x;
    e.py = e.y;
    e.cooldown -= dt;
    const tx = Math.round(e.x);
    const ty = Math.round(e.y);
    let next = ty * width + tx;
    const neighbors = [tx < width - 1 && next + 1, tx > 0 && next - 1, next + width, next - width];
    for (const n of neighbors) if (n !== false && field[n] < field[next]) next = n;

    const hit = e.cooldown <= 0;
    if (hit) e.cooldown = D.attackInterval;
    const damage = def.damage * (e.type === 'shambler' && lit ? D.lightShamblerDamage : 1);
    const wall = blocking.get(next);
    const victim = world.colonists.find((c) => !c.asleep && Math.hypot(c.x - e.x, c.y - e.y) < D.reach);
    if (field[next] === 0) {
      if (hit) world.hearth.hp -= damage;
    } else if (wall) {
      if (hit) wall.hp -= damage * def.wallDamage;
    } else if (victim) {
      if (hit) victim.health -= damage / D.colonistHp;
      if (victim.health <= 0) recordDeath(world, victim, `was killed by a ${def.name}`);
    } else {
      const nx = next % width;
      const ny = (next - nx) / width;
      const d = Math.hypot(nx - e.x, ny - e.y);
      const step = Math.min(d, def.speed * (def.runner && lit ? D.lightRunnerSpeed : 1) * dt);
      if (d > 0) {
        e.x += ((nx - e.x) / d) * step;
        e.y += ((ny - e.y) / d) * step;
      }
    }

    const trap = traps.get(ty * width + tx);
    if (trap) {
      e.hp -= D.trapDps * dt;
      trap.hp -= D.trapWearPerSecond * dt;
    }
  }

  const night = !currentPhase(world).work;
  for (const b of world.buildings) {
    if (!BUILDINGS[b.type].nightDuty) continue;
    const at = center(b);
    const guard = world.colonists.find((c) => c.duty === b.id);
    b.status = guard ? 'ok' : 'noDefender';
    // Reuses progress as the reload timer.
    b.progress = Math.max(0, b.progress - dt);
    if (!night || !guard || Math.hypot(guard.x - at.x, guard.y - at.y) > BALANCE.colonist.arriveDistance || b.progress > 0) continue;
    let target = null;
    let best: number = D.towerRange;
    for (const e of world.enemies) {
      const d = Math.hypot(e.x - at.x, e.y - at.y);
      if (d <= best) [target, best] = [e, d];
    }
    if (target) {
      target.hp -= D.towerDamage;
      b.progress = D.towerInterval;
    }
  }

  world.enemies = world.enemies.filter((e) => e.hp > 0);
  world.colonists = world.colonists.filter((c) => c.health > 0);
  const destroyed = world.buildings.filter((b) => b.hp <= 0);
  if (destroyed.length) {
    for (const b of destroyed) addLog(world, `The ${BUILDINGS[b.type].name} was destroyed.`, center(b));
    world.buildings = world.buildings.filter((b) => b.hp > 0);
    world.buildRev++;
    world.hope = Math.max(0, world.hope + BALANCE.hope.buildingDestroyed * destroyed.length);
  }
}
