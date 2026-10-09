// Worker, defender, builder, and bed assignment, and colonist movement (sections 6 and 8.2).
// Colonists walk in straight lines to a spot and get a task there that the renderer animates.
// Workers stand where the work is: next to the tree being cut, at the stove, or inside a building.
import { BALANCE } from '../../data/balance';
import { BUILDINGS } from '../../data/buildings';
import { HOUSE } from '../../data/house';
import { LAST_NIGHT } from '../../data/vehicle';
import { floorAt, houseExtent, isHearthTile } from '../house';
import { bandAt, center, currentPhase, isBuilt } from '../query';
import { routeFor } from '../route';
import type { Building, Colonist, HouseEdge, Task, World } from '../world';

const C = BALANCE.colonist;
/** Where workers stand inside indoor buildings, relative to the center. */
const INDOOR_SPOTS = [[-0.35, 0.25], [0.35, 0.25], [0, -0.3]];

/** Something builders put up: a building, a house floor tile, or a house wall edge. */
interface Site {
  id: number;
  x: number;
  y: number;
  /** Most builders at once. */
  cap: number;
  /** Where the nth builder stands. */
  spot: (n: number) => { x: number; y: number };
}

interface Plan {
  x: number;
  y: number;
  task: Task;
  site?: number;
}

export function jobsSystem(world: World, dt: number): void {
  const byId = new Map(world.buildings.map((b) => [b.id, b]));
  const ports = new Map(world.house.edges.filter((e) => e.kind === 'gunPort' && e.construct <= 0).map((e) => [e.id, e]));
  for (const c of world.colonists) {
    if (c.job !== null && !byId.has(c.job)) c.job = null;
    if (c.duty !== null && !byId.has(c.duty) && !ports.has(c.duty)) c.duty = null;
    if (c.bed !== null && (!byId.has(c.bed) || !isBuilt(byId.get(c.bed)!))) c.bed = null;
  }

  for (const b of world.buildings) {
    // Night duty posts take defenders, who keep their day job.
    const slot = BUILDINGS[b.type].nightDuty ? 'duty' : 'job';
    const assigned = world.colonists.filter((c) => c[slot] === b.id);
    for (const c of assigned.slice(b.workers)) c[slot] = null;
    for (let n = assigned.length; n < b.workers; n++) {
      const idle = world.colonists.find((c) => c[slot] === null && c.expedition === null);
      if (!idle) break;
      idle[slot] = b.id;
    }
    const beds = isBuilt(b) ? (BUILDINGS[b.type].beds ?? 0) : 0;
    let used = world.colonists.filter((c) => c.bed === b.id).length;
    for (const c of world.colonists) {
      if (used >= beds) break;
      if (c.bed === null) {
        c.bed = b.id;
        used++;
      }
    }
  }

  // Each finished gun port takes one defender, who guards it at night and at the alarm (section 9.8).
  for (const e of ports.values()) {
    const assigned = world.colonists.filter((c) => c.duty === e.id);
    for (const c of assigned.slice(1)) c.duty = null;
    if (assigned.length === 0) {
      const idle = world.colonists.find((c) => c.duty === null && c.expedition === null);
      if (idle) idle.duty = e.id;
    }
  }

  const crewIndex = new Map<number, number>();
  const crewSeen = new Map<number, number>();
  for (const c of world.colonists) {
    if (c.job === null) continue;
    const n = crewSeen.get(c.job) ?? 0;
    crewIndex.set(c.id, n);
    crewSeen.set(c.job, n + 1);
  }
  const siteLoad = new Map<number, number>();
  const sites = sitesOf(world);
  const evening = currentPhase(world).name === 'Dusk' ? seatPlan(world, byId) : undefined;
  const mats = matPlan(world, byId);

  for (const c of world.colonists) {
    if (c.expedition !== null) continue;
    const plan = planFor(world, c, byId, ports, sites, siteLoad, crewIndex.get(c.id) ?? 0, evening?.get(c.id), mats.get(c.id));
    c.site = plan.site ?? null;
    if (plan.site !== undefined) siteLoad.set(plan.site, (siteLoad.get(plan.site) ?? 0) + 1);
    c.px = c.x;
    c.py = c.y;
    // Near the house colonists follow a route through its doors. Elsewhere they walk straight.
    const key = `${world.buildRev}|${Math.round(plan.x * 2)},${Math.round(plan.y * 2)}`;
    if (c.routeKey !== key) {
      c.routeKey = key;
      c.route = routeFor(world, c, plan) ?? [];
    }
    const next = c.route[0] ?? plan;
    const dx = next.x - c.x;
    const dy = next.y - c.y;
    const d = Math.hypot(dx, dy);
    const step = Math.min(d, C.speed * dt);
    if (d > 0) {
      c.x += (dx / d) * step;
      c.y += (dy / d) * step;
    }
    if (c.route.length > 0 && d - step < 0.05) c.route.shift();
    const arrived = c.route.length === 0 && Math.hypot(plan.x - c.x, plan.y - c.y) < 0.05;
    c.task = arrived ? plan.task : 'walk';
    c.asleep = c.task === 'sleep';
    if (c.task === 'eat' || c.task === 'mingle') world.socialSeconds += dt;
  }
  world.matSleepers = Math.max(world.matSleepers, world.colonists.filter((c) => c.asleep && c.bed === null).length);
}

/** A place to sit in the evening: one for each tile of a table or sofa. Tables fill first. */
interface Seat {
  x: number;
  y: number;
  kind: 'eat' | 'mingle';
}

function seatPlan(world: World, byId: Map<number, Building>): Map<number, Seat> {
  const seats: Seat[] = [];
  for (const kind of ['eat', 'mingle'] as const) {
    for (const b of world.buildings) {
      if (BUILDINGS[b.type].social !== kind || !isBuilt(b) || b.hp <= 0) continue;
      for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) seats.push({ x, y, kind });
    }
  }
  const plan = new Map<number, Seat>();
  const people = world.colonists.filter((c) => c.expedition === null && c.duty === null);
  people.forEach((c, i) => {
    if (i < seats.length && !(c.job !== null && !byId.has(c.job))) plan.set(c.id, seats[i]);
  });
  return plan;
}

/** Colonists with no finished bed sleep on mats on the floor of the house, around the hearth. */
function matPlan(world: World, byId: Map<number, Building>): Map<number, { x: number; y: number }> {
  const plan = new Map<number, { x: number; y: number }>();
  let k = 0;
  for (const c of world.colonists) {
    if (c.expedition !== null || c.duty !== null) continue;
    const bed = c.bed === null ? undefined : byId.get(c.bed);
    if (bed && isBuilt(bed)) continue;
    plan.set(c.id, { x: world.hearth.x - 1 + (k % 3), y: world.hearth.y - 1 + (Math.floor(k / 3) % 3) });
    k++;
  }
  return plan;
}

function planFor(world: World, c: Colonist, byId: Map<number, Building>, ports: Map<number, HouseEdge>, sites: Site[], siteLoad: Map<number, number>, index: number, seat?: Seat, mat?: { x: number; y: number }): Plan {
  const work = currentPhase(world).work;
  const launch = world.airship.launch;
  const dock = world.buildings.find((b) => b.type === 'airshipDock');
  // Colonists board in the final seconds of The Last Night (section 11.1).
  // Defenders on night duty hold their post, so the player chooses who stays behind.
  if (launch && dock && launch.elapsed >= LAST_NIGHT.seconds - LAST_NIGHT.boardSeconds && c.duty === null) return { ...center(dock), task: 'idle' };

  const job = c.job === null ? undefined : byId.get(c.job);
  const duty = c.duty === null ? undefined : byId.get(c.duty);
  const port = c.duty === null ? undefined : ports.get(c.duty);
  // A defender stands at a tower or turret, or just inside the wall at a gun port.
  const post = duty && isBuilt(duty) ? center(duty) : port ? portSpot(world, port) : undefined;
  // The alarm sends defenders to their posts and everyone else under a roof (section 9.7).
  if (world.alarm && post) return { ...post, task: 'guard' };
  if (world.alarm || (work && job?.shelter)) return { ...shelterFor(world, c, job, byId), task: 'shelter' };

  if (!work) {
    if (post) return { ...post, task: 'guard' };
    // At dusk everyone with a seat sits down to eat or to talk. At night they sleep (section 5.7).
    if (seat) return { x: seat.x, y: seat.y, task: seat.kind };
    const bed = c.bed === null ? undefined : byId.get(c.bed);
    if (bed) return { ...center(bed), task: 'sleep' };
    return mat ? { ...mat, task: 'sleep' } : idleSpot(world, c);
  }

  if (job && !isBuilt(job)) return { ...buildSpot(job, siteLoad.get(job.id) ?? 0), task: 'build', site: job.id };
  // Nobody stands at a job that is too cold to work. They wait by the hearth.
  if (job && bandAt(world, center(job).x, center(job).y) !== 'freezing') return { ...workSpot(world, job, index), task: 'work' };
  if (!job) {
    const at = { x: c.x, y: c.y };
    const site = sites
      .filter((s) => (siteLoad.get(s.id) ?? 0) < s.cap)
      .reduce<Site | null>((best, s) => (!best || dist(s, at) < dist(best, at) ? s : best), null);
    if (site) return { ...site.spot(siteLoad.get(site.id) ?? 0), task: 'build', site: site.id };
  }
  return idleSpot(world, c);
}

const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

function idleSpot(world: World, c: Colonist): Plan {
  const a = c.id * 2.4;
  // The ring stays outside the house as it grows.
  const r = Math.max(C.idleRadius, houseExtent(world) + 1.6);
  return { x: world.hearth.x + Math.cos(a) * r, y: world.hearth.y + Math.sin(a) * r, task: 'idle' };
}

/** The floor tile just inside a gun port, where its defender stands. */
function portSpot(world: World, e: HouseEdge): { x: number; y: number } {
  const [a, b] = e.side === 'n' ? [[e.x, e.y], [e.x, e.y - 1]] : [[e.x, e.y], [e.x - 1, e.y]];
  const floored = (p: number[]) => isHearthTile(world, p[0], p[1]) || floorAt(world, p[0], p[1]) !== undefined;
  const inside = floored(a) ? a : b;
  return { x: inside[0], y: inside[1] };
}

/** Every unfinished building, floor, and wall edge. */
function sitesOf(world: World): Site[] {
  const out: Site[] = [];
  for (const b of world.buildings) {
    if (!isBuilt(b) || b.salvage !== null) out.push({ id: b.id, ...center(b), cap: C.buildersPerSite, spot: (n) => buildSpot(b, n) });
  }
  const around = (x: number, y: number) => (n: number) => ({ x: x + Math.cos(n * 2.1) * 0.25, y: y + Math.sin(n * 2.1) * 0.25 });
  for (const f of world.house.floors) {
    if (f.construct > 0) out.push({ id: f.id, x: f.x, y: f.y, cap: HOUSE.buildersPerPiece, spot: around(f.x, f.y) });
  }
  for (const e of world.house.edges) {
    if (e.construct <= 0 && !e.pending) continue;
    // Builders stand on the open side of the wall, away from the floor if there is one.
    const [a, b] = e.side === 'n' ? [[e.x, e.y], [e.x, e.y - 1]] : [[e.x, e.y], [e.x - 1, e.y]];
    const floored = (p: number[]) => isHearthTile(world, p[0], p[1]) || floorAt(world, p[0], p[1]) !== undefined;
    const at = floored(a) && !floored(b) ? b : a;
    out.push({ id: e.id, x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2, cap: HOUSE.buildersPerPiece, spot: around(at[0], at[1]) });
  }
  return out;
}

/** Builders stand around the edge of the site. */
function buildSpot(b: Building, n: number): { x: number; y: number } {
  const at = center(b);
  const a = n * 2.1 + 0.4;
  // Furniture stands inside the house, so its builders stay on it.
  const r = BUILDINGS[b.type].furniture ? 0.25 : Math.max(b.w, b.h) / 2 + 0.3;
  return { x: at.x + Math.cos(a) * r, y: at.y + Math.sin(a) * r };
}

/** Where a worker stands to work (section 12.4). */
function workSpot(world: World, b: Building, index: number): { x: number; y: number } {
  const def = BUILDINGS[b.type];
  const at = center(b);
  if (b.node >= 0) {
    // Gatherers ring the tree, ruin, or rubble they are working on.
    const a = index * 2.1 + 0.7;
    const nx = b.node % world.map.width;
    const ny = (b.node - nx) / world.map.width;
    return { x: nx + Math.cos(a) * 0.65, y: ny + Math.sin(a) * 0.65 };
  }
  if (def.work === 'gather') {
    // Foragers roam the brush around the hut, moving to a new patch now and then.
    const patch = Math.floor(world.tick / 120) + index * 3;
    const a = patch * 2.39996;
    return { x: at.x + Math.cos(a) * (2 + (patch % 3) * 0.8), y: at.y + Math.sin(a) * (2 + (patch % 3) * 0.8) };
  }
  if (def.indoor) {
    const [dx, dy] = INDOOR_SPOTS[index % INDOOR_SPOTS.length];
    return { x: at.x + dx, y: at.y + dy };
  }
  const a = index * 2.1 + 0.8;
  const r = Math.max(b.w, b.h) / 2 + 0.35;
  return { x: at.x + Math.cos(a) * r, y: at.y + Math.sin(a) * r };
}

/** The colonist's own building if it can hold people, else their bed, else the nearest shelter, else the house. */
function shelterFor(world: World, c: Colonist, job: Building | undefined, byId: Map<number, Building>): { x: number; y: number } {
  const bed = c.bed === null ? undefined : byId.get(c.bed);
  const own = [job, bed].find((b) => b && canShelter(b));
  if (own) return center(own);
  let best: Building | null = null;
  for (const b of world.buildings) {
    if (canShelter(b) && (!best || dist(center(b), c) < dist(center(best), c))) best = b;
  }
  return best && dist(center(best), c) < dist(world.hearth, c) ? center(best) : { x: world.hearth.x, y: world.hearth.y };
}

/** Finished buildings with room for people. Walls, traps, posts, and towers are not shelters. */
export function canShelter(b: Building): boolean {
  const def = BUILDINGS[b.type];
  return isBuilt(b) && b.hp > 0 && !def.nightDuty && (def.indoor === true || (def.beds ?? 0) > 0 || (def.storage ?? 0) > 0 || (def.workers > 0 && b.w * b.h >= 4));
}
