// A scripted player for a whole run, used by the M5 done line test.
// It plays like a careful player: a ring of walls with towers and traps, one target at a time
// (a building, the hearth upgrade, or an airship component), workers on whatever that target lacks,
// and expeditions for the rare items while daylight allows.
import { BALANCE } from '../src/data/balance';
import { BUILDINGS, type BuildingType } from '../src/data/buildings';
import { POIS, type ItemId, type PoiType } from '../src/data/pois';
import type { Amounts } from '../src/data/resources';
import { COMPONENT_IDS, COMPONENTS, type ComponentId } from '../src/data/vehicle';
import { buildingUpgradeError, componentError, launchError } from '../src/sim/commands';
import { hearthUpgradeError, lightError } from '../src/sim/hearth';
import { isIndoors } from '../src/sim/house';
import { scavengeError } from '../src/sim/manage';
import { mendArea, mendCount, planMend } from '../src/sim/mend';
import { padError, placementError, siteError } from '../src/sim/placement';
import { bandAt, capacity, center, currentPhase, launchFuelNeeded, missing, stockTotal } from '../src/sim/query';
import type { World } from '../src/sim/world';
import { findSpot, partitionRuin, sealGaps } from './helpers';

/** The ring of barricades stands outside the old house, which reaches 7 tiles from the hearth. */
const RING = 9;
const OUTSIDE = 12;
const ITEM_POIS: [ItemId, PoiType][] = [
  ['pressureValve', 'gasStation'],
  ['silkCanopy', 'farmhouse'],
  ['engineBlock', 'railDepot'],
  ['compassRig', 'oldAirfield'],
];
type Target = BuildingType | 'hearth' | 'lookout' | ComponentId;
const TARGETS: Target[] = [
  'woodcutterCamp', 'tent', 'quarry', 'charcoalKiln', 'foragerHut', 'kitchen', 'tent', 'sawmill', 'watchtower', 'watchtower',
  'salvageYard', 'huntingLodge', 'woodcutterCamp', 'gate', 'lookoutPost', 'hearth', 'storageShed', 'lookout', 'smelter', 'hearth', 'watchtower', 'watchtower',
  'lookout', 'storageShed',
  'workshop', 'sawmill', 'woodcutterCamp', 'storageShed', 'charcoalKiln',
  'airshipDock', ...COMPONENT_IDS,
];
const INSIDE: BuildingType[] = ['tent', 'watchtower', 'lookoutPost'];

const count = (w: World, t: BuildingType) => w.buildings.filter((b) => b.type === t).length;
const ring = (w: World, r: number) => {
  const tiles: [number, number][] = [];
  for (let y = w.hearth.y - r - 1; y <= w.hearth.y + r + 1; y++)
    for (let x = w.hearth.x - r - 1; x <= w.hearth.x + r + 1; x++) if (Math.round(Math.hypot(x - w.hearth.x, y - w.hearth.y)) === r) tiles.push([x, y]);
  return tiles;
};
const isComponent = (t: Target): t is ComponentId => t in COMPONENTS;

/** The first target not done yet, and what it costs. */
function nextTarget(w: World, skip: Set<number>): { target: Target; cost: Amounts; index: number } | null {
  const seen = new Map<Target, number>();
  for (const [index, t] of TARGETS.entries()) {
    seen.set(t, (seen.get(t) ?? 0) + 1);
    if (skip.has(index)) continue;
    if (t === 'hearth') {
      if (w.hearth.level <= seen.get(t)!) return { target: t, cost: BALANCE.hearth.levels[w.hearth.level].cost, index };
    } else if (t === 'lookout') {
      // Upgrade the lookout only while a place with a rare item is still unknown.
      const post = w.buildings.find((b) => b.type === 'lookoutPost');
      const hidden = ITEM_POIS.some(([, type]) => w.pois.find((p) => p.type === type)!.seen === 'hidden');
      if (post && hidden && post.level <= seen.get(t)!) return { target: t, cost: BUILDINGS.lookoutPost.upgrades![post.level - 1], index };
    } else if (isComponent(t)) {
      if (!w.airship.built.includes(t) && w.airship.building !== t) return { target: t, cost: COMPONENTS[t].cost, index };
    } else if (count(w, t) < seen.get(t)!) {
      return { target: t, cost: BUILDINGS[t].cost, index };
    }
  }
  return null;
}

/** The nearest spot on a house floor in a closed room with a whole roof where the piece of furniture can stand. */
function furnishSpot(w: World, type: BuildingType): { x: number; y: number } | null {
  const [fw, fh] = BUILDINGS[type].size;
  const floors = w.house.floors
    .filter((f) => f.storey === 0 && Math.hypot(f.x - w.hearth.x, f.y - w.hearth.y) < 14)
    .sort((a, b) => Math.hypot(a.x - w.hearth.x, a.y - w.hearth.y) - Math.hypot(b.x - w.hearth.x, b.y - w.hearth.y));
  for (const f of floors) {
    if (placementError(w, type, f.x, f.y, false)) continue;
    let indoors = true;
    for (let dy = 0; dy < fh; dy++) for (let dx = 0; dx < fw; dx++) indoors &&= isIndoors(w, f.x + dx, f.y + dy, 0);
    if (indoors) return { x: f.x, y: f.y };
  }
  return null;
}

/** The area of the starting ruin, and the rooms of it that are mended one after the other. */
const ruinArea = (w: World) => ({ x: w.hearth.x - 9, y: w.hearth.y - 4, w: 19, h: 13 });

/**
 * Plays the old house like a person would: light the hearth, close the gaps, wall off the rooms, mend what is worn,
 * and later clear the ruins the launch pad needs. Orders are small so a thin stockpile still makes progress.
 */
function houseWork(w: World, started: boolean): void {
  if (!w.hearth.ignited && !lightError(w)) w.commands.push({ type: 'lightHearth' });
  // The first goal is wood for the colony. The house waits for a woodcutter.
  if (!started || w.stock.wood < 40) return;
  const area = ruinArea(w);
  const reserve = 25;
  const sites = w.house.edges.filter((e) => e.construct > 0).length;
  if (sites < 12) {
    if (w.stock.wood > reserve + 20) sealGaps(w, area);
    if (w.stock.wood > reserve + 20) partitionRuin(w);
  }
  // Mend room by room, nearest the hearth first, as long as the stockpile can pay.
  const { x, y } = w.hearth;
  const rooms = [
    { x: x - 3, y: y - 2, w: 7, h: 5 },
    { x: x - 7, y: y - 2, w: 4, h: 5 },
    { x: x + 4, y: y - 2, w: 4, h: 5 },
    { x: x - 3, y: y + 3, w: 7, h: 3 },
    { x: x - 7, y: y - 2, w: 4, h: 5, storey: 1 },
  ];
  for (const r of rooms) {
    const storey = r.storey ?? 0;
    const plan = planMend(w, r, storey);
    if (mendCount(plan) === 0 || w.stock.wood < reserve + (plan.cost.wood ?? 0)) continue;
    mendArea(w, r, storey);
    return;
  }
}

/** Sends two colonists to search the nearest unsearched house the colony has seen, one house at a time and only with daylight to spare. */
function scavengeNearby(w: World): void {
  if (currentPhase(w).name !== 'Day' || currentPhase(w).left < 150 || w.houses.some((h) => h.state === 'working')) return;
  const open = w.houses
    .filter((h) => h.state === 'fresh' && !scavengeError(w, h.id) && Math.hypot(h.x - w.hearth.x, h.y - w.hearth.y) < 55)
    .sort((a, b) => Math.hypot(a.x - w.hearth.x, a.y - w.hearth.y) - Math.hypot(b.x - w.hearth.x, b.y - w.hearth.y));
  if (open[0]) w.commands.push({ type: 'scavenge', house: open[0].id });
}

/** Puts one more bed in a closed room of the house. */
function houseBed(w: World): void {
  const spot = furnishSpot(w, 'bed');
  if (spot) w.commands.push({ type: 'place', building: 'bed', x: spot.x, y: spot.y, rotated: false });
}

/** Ruins crowd the ground. The crew takes the ones on the nearest site apart, and clears its rubble, so the pad can go down. */
function padClearing(w: World): void {
  let best: { x: number; y: number; n: number } | null = null;
  for (let y = w.hearth.y - 24; y <= w.hearth.y + 24; y++) {
    for (let x = w.hearth.x - 24; x <= w.hearth.x + 24; x++) {
      const d = Math.hypot(x + 2.5 - w.hearth.x, y + 2.5 - w.hearth.y);
      if (d < OUTSIDE + 4 || d > 28) continue;
      const [x0, y0, x1, y1] = [x - 1, y - 1, x + 7, y + 7];
      const n = w.house.floors.filter((f) => f.x >= x0 && f.x < x1 && f.y >= y0 && f.y < y1).length + w.house.edges.filter((e) => e.x >= x0 && e.x <= x1 && e.y >= y0 && e.y <= y1).length;
      if (!best || n < best.n) best = { x, y, n };
    }
  }
  if (!best) return;
  const r = { x: best.x - 1, y: best.y - 1, w: 8, h: 8 };
  w.commands.push({ type: 'demolishArea', ...r });
  w.commands.push({ type: 'mendArea', ...r });
}

/** What the player is working toward, for debugging a run. */
export const trace = { target: '', crew: '' };

export function fullRunPlayer() {
  /** Targets the town has no room for, such as a quarry with no stone nearby. A player would give up on them and move on. */
  const skip = new Set<number>();
  return (w: World) => {
    const phase = currentPhase(w);
    const s = w.stock;
    const next = nextTarget(w, skip);
    trace.target = next ? String(next.target) : 'none';
    houseWork(w, count(w, 'woodcutterCamp') > 0 && count(w, 'charcoalKiln') > 0);
    scavengeNearby(w);

    // Work toward the next target.
    if (next) {
      const t = next.target;
      if (t === 'hearth') {
        if (!hearthUpgradeError(w)) w.commands.push({ type: 'upgradeHearth' });
      } else if (t === 'lookout') {
        const post = w.buildings.find((b) => b.type === 'lookoutPost')!;
        if (!buildingUpgradeError(w, post)) w.commands.push({ type: 'upgradeBuilding', id: post.id });
      } else if (isComponent(t)) {
        if (!componentError(w, t)) w.commands.push({ type: 'buildComponent', component: t });
      } else {
        const inside = INSIDE.includes(t);
        // Walls stop heat, so the buildings people live and stand guard in go where the tile is warm.
        const spot = findSpot(w, t, inside ? 0 : OUTSIDE, t === 'woodcutterCamp' ? 30 : 10, inside ? (x, y) => bandAt(w, x, y) === 'warm' : undefined);
        if (spot) w.commands.push({ type: 'place', building: t, x: spot.x, y: spot.y, rotated: false });
        else if (!missing(w, BUILDINGS[t].cost)) skip.add(next.index);
      }
    }
    // Colonists without a bed sleep on mats and cost hope. Extra people get beds on floors in the warm house.
    const beds = w.buildings.reduce((n, b) => n + (BUILDINGS[b.type].beds ?? 0), 0);
    if (beds < w.colonists.length && !w.buildings.some((b) => b.type === 'bed' && b.construct > 0)) houseBed(w);
    // The crew picks the nearest launch pad site with a clear ring as soon as the blueprint turns up (section 11.2).
    if (w.airship.blueprint && !w.airship.site) {
      let best: { x: number; y: number; d: number } | null = null;
      for (let y = w.hearth.y - 20; y <= w.hearth.y + 20; y++) {
        for (let x = w.hearth.x - 20; x <= w.hearth.x + 20; x++) {
          const d = Math.hypot(x + 2.5 - w.hearth.x, y + 2.5 - w.hearth.y);
          // Outside the ring of walls, like the other outside buildings. The pad does not fit inside it.
          if (d >= OUTSIDE + 1 && (!best || d < best.d) && !siteError(w, x, y) && !padError(w, x, y, 6, 6)) best = { x, y, d };
        }
      }
      if (best) w.commands.push({ type: 'chooseSite', x: best.x, y: best.y });
      else padClearing(w);
    }
    // Once the blueprint turns up, a Drafting Table on a house floor lets the crew build components in the warm house.
    if (w.airship.blueprint && count(w, 'draftingTable') === 0) {
      const spot = furnishSpot(w, 'draftingTable');
      if (spot) w.commands.push({ type: 'place', building: 'draftingTable', x: spot.x, y: spot.y, rotated: false });
    }
    // Replace gatherers that ran out of nodes.
    for (const [type, keep] of [['woodcutterCamp', 2], ['salvageYard', 1]] as [BuildingType, number][]) {
      const working = w.buildings.filter((b) => b.type === type && b.status !== 'noResource').length;
      if (count(w, type) && working < keep && !missing(w, BUILDINGS[type].cost)) {
        const spot = findSpot(w, type, OUTSIDE, type === 'woodcutterCamp' ? 30 : 10);
        if (spot) w.commands.push({ type: 'place', building: type, x: spot.x, y: spot.y, rotated: false });
      }
    }
    // Late in the run the launch needs a lot of fuel. More kilns make more of it, since each takes one worker.
    if (w.airship.built.length >= 2 && count(w, 'charcoalKiln') < 4 && s.fuel < launchFuelNeeded(w) && s.wood >= 60 && s.stone >= 10 && !w.buildings.some((b) => b.type === 'charcoalKiln' && b.construct > 0)) {
      const spot = findSpot(w, 'charcoalKiln', OUTSIDE);
      if (spot) w.commands.push({ type: 'place', building: 'charcoalKiln', x: spot.x, y: spot.y, rotated: false });
    }
    if (stockTotal(w) > capacity(w) - 40 && s.wood >= 20) {
      const spot = findSpot(w, 'storageShed', OUTSIDE);
      if (spot) w.commands.push({ type: 'place', building: 'storageShed', x: spot.x, y: spot.y, rotated: false });
    }

    // Heaters keep the gatherers working as outside tiles start to freeze.
    if (w.day >= 6) {
      for (const b of w.buildings.filter((b) => ['woodcutterCamp', 'salvageYard'].includes(b.type) && b.status !== 'noResource')) {
        const at = center(b);
        const warm = w.buildings.some((h) => h.type === 'heater' && Math.hypot(h.x - at.x, h.y - at.y) < 3);
        if (warm || bandAt(w, at.x, at.y) === 'warm') continue;
        for (const [dx, dy] of [[-1, 0], [b.w, 0], [0, -1], [0, b.h], [-1, -1], [b.w, b.h]]) {
          if (!placementError(w, 'heater', b.x + dx, b.y + dy, false)) {
            w.commands.push({ type: 'place', building: 'heater', x: b.x + dx, y: b.y + dy, rotated: false });
            break;
          }
        }
      }
    }

    // Keep the walls up once a tower stands, and add traps when wood is plentiful.
    const placeRing = (type: 'woodenBarricade' | 'spikeTrap', r: number, reserve: number) => {
      let wood = s.wood;
      for (const [x, y] of ring(w, r)) {
        if (wood - BUILDINGS[type].cost.wood! < reserve || placementError(w, type, x, y, false)) continue;
        w.commands.push({ type: 'place', building: type, x, y, rotated: false });
        wood -= BUILDINGS[type].cost.wood!;
      }
    };
    if (count(w, 'watchtower')) placeRing('woodenBarricade', RING, 20);
    if (count(w, 'smelter')) placeRing('spikeTrap', RING + 1, 80);

    // Workers: food and fuel first, a full woodcutter crew, then whatever the target lacks.
    const cost = next?.cost ?? {};
    const partsShort = Math.max(0, (cost.parts ?? 0) - s.parts);
    const metalNeed = (cost.metal ?? 0) + partsShort;
    const planksNeed = (cost.planks ?? 0) + partsShort;
    const ready = COMPONENT_IDS.every((id) => w.airship.built.includes(id));
    const fuelTarget = w.airship.built.length >= 3 ? launchFuelNeeded(w) + 40 : 160;
    if (ready) placeRing('spikeTrap', RING + 2, 60);
    // Sites without a crew of their own need colonists without a job to build them.
    const sites = w.buildings.filter((b) => b.construct > 0).length;
    let free = w.colonists.filter((c) => c.expedition === null).length - Math.min(3, sites);
    const want: [BuildingType, number][] = [
      ['kitchen', s.meals < 30 ? 2 : s.meals < 60 ? 1 : 0],
      ['foragerHut', s.rawFood < 40 ? 2 : 0],
      ['huntingLodge', s.rawFood < 60 ? 2 : 0],
      ['charcoalKiln', s.fuel < fuelTarget && s.wood >= 2 ? 2 : 0],
      ['woodcutterCamp', s.wood < 250 ? 3 : 1],
      ['draftingTable', w.airship.building ? 4 : 0],
      ['airshipDock', w.airship.building && count(w, 'draftingTable') === 0 ? 4 : 0],
      ['quarry', s.stone < Math.max(cost.stone ?? 0, w.airship.built.length >= 2 && count(w, 'charcoalKiln') < 4 ? 12 : 0) ? 3 : 0],
      ['workshop', partsShort > 0 && s.planks >= 1 && s.metal >= 1 ? 2 : 0],
      ['smelter', s.metal < metalNeed && s.scrap >= 2 && s.fuel > 30 ? 2 : 0],
      ['salvageYard', s.scrap < 2 * Math.max(0, metalNeed - s.metal) || s.scrap < (cost.scrap ?? 0) ? 3 : 0],
      ['sawmill', s.planks < planksNeed && s.wood > 30 ? 4 : 0],
      ['woodcutterCamp', s.wood < 600 ? 99 : 0],
    ];
    const crew = new Map<number, number>();
    for (const [type, total] of want) {
      let left = total;
      for (const b of w.buildings.filter((b) => b.type === type && b.status !== 'noResource' && b.construct <= 0)) {
        const k = Math.min(left, free, BUILDINGS[type].workers - (crew.get(b.id) ?? 0));
        crew.set(b.id, (crew.get(b.id) ?? 0) + k);
        left -= k;
        free -= k;
      }
    }
    trace.crew = [...crew.entries()].map(([id, n]) => `${w.buildings.find((b) => b.id === id)?.type.slice(0, 4)}${n}`).join(' ') + ` free ${free}`;
    for (const b of w.buildings) {
      // One defender per tower, so most colonists still sleep at night.
      if (b.type === 'watchtower' && b.workers !== 1) w.commands.push({ type: 'setWorkers', id: b.id, count: 1 });
      if (BUILDINGS[b.type].workers === 0 || BUILDINGS[b.type].nightDuty) continue;
      const k = crew.get(b.id) ?? 0;
      if (b.workers !== k) w.commands.push({ type: 'setWorkers', id: b.id, count: k });
    }

    // Expeditions for missing rare items, only when there is daylight for the whole trip.
    const gate = w.buildings.find((b) => b.type === 'gate');
    // After the rare items, search the Clinic for survivors to grow the work force.
    // Squads can only go where the colony knows of, or where the lookout saw something.
    const reachable = ([, type]: [ItemId, PoiType]) => w.pois.find((p) => p.type === type)!.seen !== 'hidden';
    // Survivor trips stop once the dock stands, when every worker is needed at home.
    const item = ITEM_POIS.filter(reachable).find(([id]) => !w.items[id]) ?? (count(w, 'airshipDock') ? null : (['silkCanopy', 'clinic'] as [ItemId, PoiType]));
    if (gate && item && reachable(item) && !w.expeditions.length && phase.name === 'Day') {
      const poi = w.pois.findIndex((p) => p.type === item[1]);
      const g = center(gate);
      const p = w.pois[poi];
      const trip = (2 * (Math.hypot(p.x - g.x, p.y - g.y) + Math.hypot(g.x - w.hearth.x, g.y - w.hearth.y))) / BALANCE.expeditions.speed;
      if (phase.left > trip + BALANCE.expeditions.searchSeconds + 20) {
        const size = POIS[item[1]].danger >= 4 ? 3 : 2;
        const members = w.colonists.filter((c) => c.expedition === null).slice(-size).map((c) => c.id);
        if (members.length === size) w.commands.push({ type: 'sendExpedition', poi, members });
      }
    }
    for (const ex of w.expeditions) if (phase.name !== 'Day') w.commands.push({ type: 'recall', id: ex.id });

    if (ready && !launchError(w) && s.fuel >= launchFuelNeeded(w) + 5) w.commands.push({ type: 'launch' });
  };
}
