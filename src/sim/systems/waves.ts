// Nightly waves (section 9.5): forecast at the start of each day, spawns during the night,
// retreat at dawn. Lantern posts take their night fuel here.
import { BALANCE } from '../../data/balance';
import { BUILDINGS } from '../../data/buildings';
import { ENEMIES, ENEMY_TYPES, type EnemyType } from '../../data/enemies';
import { currentPhase, nightThreat } from '../query';
import { nextFloat, nextInt } from '../rng';
import { BLOCKED } from './pathfinding';
import { addLog, type Wave, type World } from '../world';

const W = BALANCE.waves;

export function wavesSystem(world: World, _dt: number): void {
  if (world.wave.night !== world.day) world.wave = planWave(world, world.day);
  const phase = currentPhase(world);

  for (const b of world.buildings) {
    const light = BUILDINGS[b.type].light;
    if (!light) continue;
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
  }
  if (phase.name === 'Dawn' && world.enemies.length > 0) {
    world.enemies = [];
    addLog(world, 'The monsters retreat at dawn.');
  }
}

function planWave(world: World, night: number): Wave {
  const threat = nightThreat(night);
  const edges = [0, 1, 2, 3];
  for (let i = 3; i > 0; i--) {
    const j = nextInt(world.rng, 0, i);
    [edges[i], edges[j]] = [edges[j], edges[i]];
  }
  const plan: EnemyType[] = [];
  for (let points = threat; ; ) {
    const options = ENEMY_TYPES.filter((t) => ENEMIES[t].fromNight <= night && ENEMIES[t].threat <= points);
    if (!options.length) break;
    const t = options[nextInt(world.rng, 0, options.length - 1)];
    plan.push(t);
    points -= ENEMIES[t].threat;
  }
  const bloodMoon = threat > 0 && night % W.bloodMoonEvery === 0;
  if (bloodMoon) addLog(world, 'A Blood Moon will rise tonight.');
  return { night, threat, bloodMoon, edges: edges.slice(0, Math.min(4, 1 + Math.floor((night - 1) / W.nightsPerEdge))), plan, spawned: 0 };
}

/** Spawns on a random reachable tile of one of the active edges. */
function spawn(world: World, type: EnemyType, edges: number[]): void {
  const { width, height } = world.map;
  for (let tries = 0; tries < 30; tries++) {
    const edge = edges[nextInt(world.rng, 0, edges.length - 1)];
    const t = Math.floor(nextFloat(world.rng) * (edge % 2 === 0 ? width : height));
    const [x, y] = [[t, 0], [width - 1, t], [t, height - 1], [0, t]][edge];
    if (world.flow.normal[y * width + x] >= BLOCKED) continue;
    world.enemies.push({ id: world.nextId++, type, x, y, px: x, py: y, hp: ENEMIES[type].hp, cooldown: 0 });
    return;
  }
}
