// A scripted player for a whole run, used by the M5 done line test.
// It plays like a careful player: a ring of walls with towers and traps, one target at a time
// (a building, the hearth upgrade, or an airship component), workers on whatever that target lacks,
// and expeditions for the rare items while daylight allows.
import { BALANCE } from '../src/data/balance';
import { BUILDINGS, type BuildingType } from '../src/data/buildings';
import { POIS, type ItemId, type PoiType } from '../src/data/pois';
import type { Amounts } from '../src/data/resources';
import { COMPONENT_IDS, COMPONENTS, LAST_NIGHT, type ComponentId } from '../src/data/vehicle';
import { buildingUpgradeError, componentError, hearthUpgradeError, launchError } from '../src/sim/commands';
import { placementError } from '../src/sim/placement';
import { bandAt, capacity, center, currentPhase, missing, stockTotal } from '../src/sim/query';
import type { World } from '../src/sim/world';
import { findSpot } from './helpers';

const RING = 5;
const OUTSIDE = 8;
const ITEM_POIS: [ItemId, PoiType][] = [
  ['pressureValve', 'gasStation'],
  ['silkCanopy', 'farmhouse'],
  ['engineBlock', 'railDepot'],
  ['compassRig', 'oldAirfield'],
];
type Target = BuildingType | 'hearth' | 'lookout' | ComponentId;
const TARGETS: Target[] = [
  'woodcutterCamp', 'tent', 'quarry', 'charcoalKiln', 'foragerHut', 'kitchen', 'tent', 'sawmill', 'watchtower', 'watchtower',
  'woodcutterCamp', 'gate', 'lookoutPost', 'hearth', 'salvageYard', 'storageShed', 'lookout', 'smelter', 'hearth', 'watchtower', 'watchtower',
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
function nextTarget(w: World): { target: Target; cost: Amounts } | null {
  const seen = new Map<Target, number>();
  for (const t of TARGETS) {
    seen.set(t, (seen.get(t) ?? 0) + 1);
    if (t === 'hearth') {
      if (w.hearth.level <= seen.get(t)!) return { target: t, cost: BALANCE.hearth.levels[w.hearth.level].cost };
    } else if (t === 'lookout') {
      // Upgrade the lookout only while a place with a rare item is still unknown.
      const post = w.buildings.find((b) => b.type === 'lookoutPost');
      const hidden = ITEM_POIS.some(([, type]) => w.pois.find((p) => p.type === type)!.seen === 'hidden');
      if (post && hidden && post.level <= seen.get(t)!) return { target: t, cost: BUILDINGS.lookoutPost.upgrades![post.level - 1] };
    } else if (isComponent(t)) {
      if (!w.airship.built.includes(t) && w.airship.building !== t) return { target: t, cost: COMPONENTS[t].cost };
    } else if (count(w, t) < seen.get(t)!) {
      return { target: t, cost: BUILDINGS[t].cost };
    }
  }
  return null;
}

export function fullRunPlayer() {
  return (w: World) => {
    const phase = currentPhase(w);
    const s = w.stock;
    const next = nextTarget(w);

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
        const spot = findSpot(w, t, INSIDE.includes(t) ? 0 : OUTSIDE, t === 'woodcutterCamp' ? 30 : 10);
        if (spot) w.commands.push({ type: 'place', building: t, x: spot.x, y: spot.y, rotated: false });
      }
    }
    // Replace gatherers that ran out of nodes.
    for (const [type, keep] of [['woodcutterCamp', 2], ['salvageYard', 1]] as [BuildingType, number][]) {
      const working = w.buildings.filter((b) => b.type === type && b.status !== 'noResource').length;
      if (count(w, type) && working < keep && !missing(w, BUILDINGS[type].cost)) {
        const spot = findSpot(w, type, OUTSIDE, type === 'woodcutterCamp' ? 30 : 10);
        if (spot) w.commands.push({ type: 'place', building: type, x: spot.x, y: spot.y, rotated: false });
      }
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
    const fuelTarget = w.airship.built.length >= 3 ? LAST_NIGHT.fuel + 80 : 80;
    if (ready) placeRing('spikeTrap', RING + 2, 60);
    // Sites without a crew of their own need colonists without a job to build them.
    const sites = w.buildings.filter((b) => b.construct > 0).length;
    let free = w.colonists.filter((c) => c.expedition === null).length - Math.min(3, sites);
    const want: [BuildingType, number][] = [
      ['kitchen', s.meals < 30 ? 2 : s.meals < 60 ? 1 : 0],
      ['foragerHut', s.rawFood < 40 ? 2 : 0],
      ['charcoalKiln', s.fuel < fuelTarget && s.wood >= 2 ? 2 : 0],
      ['woodcutterCamp', 3],
      ['airshipDock', w.airship.building ? 4 : 0],
      ['quarry', s.stone < (cost.stone ?? 0) ? 3 : 0],
      ['workshop', partsShort > 0 && s.planks >= 1 && s.metal >= 1 ? 2 : 0],
      ['smelter', s.metal < metalNeed && s.scrap >= 2 && s.fuel > 30 ? 2 : 0],
      ['salvageYard', s.scrap < 2 * Math.max(0, metalNeed - s.metal) ? 3 : 0],
      ['sawmill', s.planks < planksNeed && s.wood > 30 ? 4 : 0],
      ['woodcutterCamp', 99],
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

    if (ready && !launchError(w) && s.fuel >= LAST_NIGHT.fuel + 15) w.commands.push({ type: 'launch' });
  };
}
