// Nightly waves (section 9.5): forecast at the start of each day, spawns during the night,
// retreat at dawn. Lantern posts take their night fuel here.
import { BALANCE } from '../../data/balance';
import { BUILDINGS } from '../../data/buildings';
import { ENEMIES, ENEMY_TYPES, type EnemyType } from '../../data/enemies';
import { currentPhase, isBuilt, nightThreat } from '../query';
import { chance, nextFloat, nextInt } from '../rng';
import { BLOCKED } from './pathfinding';
import { LAST_NIGHT } from '../../data/vehicle';
import { addLog, type Enemy, type Wave, type World } from '../world';

const W = BALANCE.waves;

export function wavesSystem(world: World, _dt: number): void {
  if (world.wave.night !== world.day) world.wave = planWave(world, world.day);
  if (world.airship.launch && !world.wave.final) world.wave = planWave(world, world.day, true);
  const phase = currentPhase(world);

  for (const b of world.buildings) {
    const light = BUILDINGS[b.type].light;
    if (!light || !isBuilt(b)) continue;
    if (phase.work) b.lit = false;
    else if (!b.lit && world.stock.fuel >= light.fuel) {
      world.stock.fuel -= light.fuel;
      b.lit = true;
    }
    b.status = phase.work || b.lit ? 'ok' : 'noFuel';
  }

  const wave = world.wave;
  if (phase.name === 'Night') {
    const due = Math.min(wave.plan.length, Math.ceil(((phase.seconds - phase.left) / W.spawnSeconds) * wave.plan.length));
    while (wave.spawned < due) spawn(world, wave.plan[wave.spawned++], wave.edges);
    for (const e of world.enemies) {
      const brood = ENEMIES[e.type].spawns;
      if (brood && world.tick % Math.round(brood.every / BALANCE_TICK) === 0) {
        world.enemies.push(makeEnemy(world, brood.type, e.x, e.y));
      }
    }
  }
  // A small raid prowls in by day, so workers far from the light are at risk (section 9.5).
  const raidTick = Math.round(W.raidAt / BALANCE_TICK);
  if (world.day >= W.raidFromDay && !wave.final && Math.round(world.dayTime / BALANCE_TICK) === raidTick) {
    const raid = planRaid(world, Math.max(2, nightThreat(world.day) * W.raidShare));
    for (const t of raid) spawn(world, t, wave.edges.slice(0, 1));
    if (raid.length) addLog(world, `${raid.length} monsters prowl in from the ${['north', 'east', 'south', 'west'][wave.edges[0]]}. Sound the alarm if workers are in danger.`);
  }
  if (phase.name === 'Dawn' && world.enemies.length > 0) {
    world.enemies = [];
    addLog(world, 'The monsters retreat at dawn.');
  }
}

/** Seconds per tick, for spawn timers. */
const BALANCE_TICK = 0.1;

function planWave(world: World, night: number, final = false): Wave {
  const threat = nightThreat(night) * (final ? LAST_NIGHT.threatMultiplier : 1);
  const edges = [0, 1, 2, 3];
  for (let i = 3; i > 0; i--) {
    const j = nextInt(world.rng, 0, i);
    [edges[i], edges[j]] = [edges[j], edges[i]];
  }
  const plan: EnemyType[] = [...(final ? (['hordeMother'] as EnemyType[]) : []), ...pickEnemies(world, night, threat)];
  const bloodMoon = threat > 0 && night % W.bloodMoonEvery === 0;
  if (bloodMoon && !final) addLog(world, 'A Blood Moon will rise tonight.');
  const edgeCount = final ? 4 : Math.min(4, 1 + Math.floor((night - 1) / W.nightsPerEdge));
  return { night, threat, bloodMoon, edges: edges.slice(0, edgeCount), plan, spawned: 0, final };
}

/** Spends threat points on random enemies unlocked by this night. */
function pickEnemies(world: World, night: number, threat: number): EnemyType[] {
  const plan: EnemyType[] = [];
  for (let points = threat; ; ) {
    const options = ENEMY_TYPES.filter((t) => ENEMIES[t].fromNight <= night && ENEMIES[t].threat <= points);
    if (!options.length) break;
    const t = options[nextInt(world.rng, 0, options.length - 1)];
    plan.push(t);
    points -= ENEMIES[t].threat;
  }
  return plan;
}

/** Day raids are made of small monsters only. */
function planRaid(world: World, threat: number): EnemyType[] {
  return pickEnemies(world, Math.min(world.day, ENEMIES.brute.fromNight - 1), threat);
}

/** A new monster. Whether it can break buildings is rolled here (section 9.4). */
function makeEnemy(world: World, type: EnemyType, x: number, y: number): Enemy {
  return { id: world.nextId++, type, x, y, px: x, py: y, hp: ENEMIES[type].hp, cooldown: 0, breaker: chance(world.rng, ENEMIES[type].breakChance) };
}

/** Spawns on a random reachable tile of one active side of the spawn square around the hearth. */
function spawn(world: World, type: EnemyType, edges: number[]): void {
  const { width, height } = world.map;
  const s = W.spawnDistance;
  const { x: hx, y: hy } = world.hearth;
  for (let tries = 0; tries < 30; tries++) {
    const edge = edges[nextInt(world.rng, 0, edges.length - 1)];
    const t = Math.floor(nextFloat(world.rng) * 2 * s) - s;
    const [dx, dy] = [[t, -s], [s, t], [t, s], [-s, t]][edge];
    const x = Math.max(0, Math.min(width - 1, hx + dx));
    const y = Math.max(0, Math.min(height - 1, hy + dy));
    if (world.flow.normal[y * width + x] >= BLOCKED) continue;
    world.enemies.push(makeEnemy(world, type, x, y));
    return;
  }
}
