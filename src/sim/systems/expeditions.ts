// Expeditions (section 10.2): squads walk out through a gate, search a POI with loot and danger rolls,
// and walk home. Risk rises at night and falls with squad size.
import { BALANCE } from '../../data/balance';
import { INJURIES, ITEMS, POIS } from '../../data/pois';
import { RESOURCE_NAMES, type Resource } from '../../data/resources';
import { capacity, currentPhase, stockTotal } from '../query';
import { chance, nextFloat, nextInt } from '../rng';
import { addColonist, addLog, recordDeath, type Expedition, type World } from '../world';

const E = BALANCE.expeditions;

export function expeditionsSystem(world: World, dt: number): void {
  for (const ex of world.expeditions) {
    ex.members = ex.members.filter((id) => world.colonists.some((c) => c.id === id && c.health > 0));
    ex.px = ex.x;
    ex.py = ex.y;
    if (ex.stage === 'search') search(world, ex, dt);
    else walk(world, ex, dt);
    world.colonists.forEach((c) => {
      const i = ex.members.indexOf(c.id);
      if (i < 0) return;
      c.px = c.x;
      c.py = c.y;
      c.x = ex.x + Math.cos(i * 1.6) * 0.5;
      c.y = ex.y + Math.sin(i * 1.6) * 0.5;
    });
  }
  for (const ex of world.expeditions.filter((e) => e.members.length === 0)) {
    addLog(world, `The squad sent to ${placeName(world, ex.poi)} was lost.`, ex);
  }
  world.expeditions = world.expeditions.filter((e) => e.members.length > 0 && !(e.stage === 'back' && e.route.length === 0));
  world.colonists = world.colonists.filter((c) => c.health > 0);
}

function walk(world: World, ex: Expedition, dt: number): void {
  let budget = E.speed * dt;
  while (budget > 0 && ex.route.length) {
    const to = ex.route[0];
    const d = Math.hypot(to.x - ex.x, to.y - ex.y);
    if (d <= budget) {
      [ex.x, ex.y] = [to.x, to.y];
      budget -= d;
      ex.route.shift();
    } else {
      ex.x += ((to.x - ex.x) / d) * budget;
      ex.y += ((to.y - ex.y) / d) * budget;
      budget = 0;
    }
  }
  if (ex.route.length) return;
  if (ex.stage === 'out') {
    ex.stage = 'search';
    ex.searchLeft = E.searchSeconds;
    ex.rollTimer = E.rollSeconds;
  } else {
    returnHome(world, ex);
  }
}

function search(world: World, ex: Expedition, dt: number): void {
  ex.searchLeft -= dt;
  ex.rollTimer -= dt;
  if (ex.rollTimer <= 0) {
    ex.rollTimer += E.rollSeconds;
    roll(world, ex);
  }
  if (ex.searchLeft <= 0) {
    world.pois[ex.poi].clears++;
    recall(world, ex);
  }
}

/** One search roll: loot, a chance at the rare item or a survivor, and a chance of a danger event. */
function roll(world: World, ex: Expedition): void {
  const poi = world.pois[ex.poi];
  const def = POIS[poi.type];
  const factor = E.revisitLoot ** poi.clears;
  for (const [r, [min, max]] of Object.entries(def.loot) as [Resource, [number, number]][]) {
    const n = Math.round(nextInt(world.rng, min, max) * factor);
    if (n > 0) ex.loot[r] = (ex.loot[r] ?? 0) + n;
  }
  const squad = world.colonists.filter((c) => ex.members.includes(c.id));
  const finder = squad[nextInt(world.rng, 0, squad.length - 1)];
  if (def.rare && !world.items[def.rare] && !ex.items.includes(def.rare) && chance(world.rng, E.rareChance)) {
    ex.items.push(def.rare);
    addLog(world, `${finder.name} found a ${ITEMS[def.rare]}.`, ex);
  }
  if (def.survivors && chance(world.rng, def.survivors * factor)) {
    ex.recruits++;
    addLog(world, `${finder.name} found a survivor at the ${def.name}.`, ex);
  }
  if (chance(world.rng, expeditionRisk(world, def.danger, squad.length))) {
    const victim = squad[nextInt(world.rng, 0, squad.length - 1)];
    victim.health -= E.injury[0] + nextFloat(world.rng) * (E.injury[1] - E.injury[0]);
    if (victim.health <= 0) recordDeath(world, victim, `died at the ${def.name}`);
    else addLog(world, `${victim.name} ${INJURIES[nextInt(world.rng, 0, INJURIES.length - 1)]}.`, ex);
  }
}

/** Chance of a danger event on one search roll (section 10.2). Exported for the UI. */
export function expeditionRisk(world: World, danger: number, squadSize: number): number {
  return (danger * E.riskPerDanger * (currentPhase(world).work ? 1 : E.nightRisk)) / Math.sqrt(Math.max(1, squadSize));
}

export function recall(world: World, ex: Expedition): void {
  if (ex.stage === 'back') return;
  ex.stage = 'back';
  ex.route = [ex.gate, { x: world.hearth.x + 2, y: world.hearth.y + 2 }];
}

function returnHome(world: World, ex: Expedition): void {
  const got: string[] = [];
  for (const [r, n] of Object.entries(ex.loot) as [Resource, number][]) {
    const kept = Math.min(n, Math.max(0, capacity(world) - stockTotal(world)));
    world.stock[r] += kept;
    if (kept > 0) got.push(`${kept} ${RESOURCE_NAMES[r].toLowerCase()}`);
  }
  for (const item of ex.items) {
    world.items[item] = 1;
    got.push(`the ${ITEMS[item]}`);
  }
  for (let i = 0; i < ex.recruits; i++) got.push(`${addColonist(world, ex.x, ex.y).name}, a survivor`);
  for (const c of world.colonists) if (c.expedition === ex.id) c.expedition = null;
  const from = placeName(world, ex.poi);
  addLog(world, got.length ? `The squad is back from ${from} with ${got.join(', ')}.` : `The squad is back from ${from} with nothing.`, ex);
}

/** "the Clinic" once known, or "the sighting" while it is still a rumor. */
function placeName(world: World, poi: number): string {
  const p = world.pois[poi];
  return p.seen === 'known' ? `the ${POIS[p.type].name}` : 'the sighting';
}
