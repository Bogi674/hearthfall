// Player command queue. UI pushes commands here and the world applies them at the start of a tick.
import { BALANCE } from '../data/balance';
import { BUILDINGS, type BuildingType } from '../data/buildings';
import { CRAFTABLE, type WeaponId } from '../data/weapons';
import { ITEMS } from '../data/pois';
import { RESOURCE_NAMES, type Resource } from '../data/resources';
import { BERTH, COMPONENT_IDS, COMPONENTS, type ComponentId } from '../data/vehicle';
import type { EdgeKind, FloorId } from '../data/house';
import type { Side } from './house';
import { placeBuilding, placeEdge, placeFloor, removeHouseItem, siteError, type HouseItem } from './placement';
import { center, launchFuelNeeded, missing, pay } from './query';
import { recall } from './systems/expeditions';
import { addLog, type Building, type World } from './world';

export type Command =
  | { type: 'place'; building: BuildingType; x: number; y: number; rotated: boolean; storey?: number }
  | { type: 'setWorkers'; id: number; count: number }
  | { type: 'sendExpedition'; poi: number; members: number[] }
  | { type: 'recall'; id: number }
  | { type: 'buildComponent'; component: ComponentId }
  | { type: 'buildBerth' }
  | { type: 'chooseSite'; x: number; y: number }
  | { type: 'salvage'; id: number }
  | { type: 'clearArea'; x: number; y: number; w: number; h: number }
  | { type: 'launch' }
  | { type: 'upgradeHearth' }
  | { type: 'upgradeBuilding'; id: number }
  | { type: 'setShelter'; id: number; on: boolean }
  | { type: 'alarm'; on: boolean }
  | { type: 'setCraft'; id: number; weapon: WeaponId }
  | { type: 'paintFloor'; x: number; y: number; kind: FloorId; storey?: number }
  | { type: 'buildEdge'; x: number; y: number; side: Side; kind: EdgeKind; level: number; storey?: number }
  | { type: 'removeHouseItem'; item: HouseItem; id: number };

export function pushCommand(queue: Command[], command: Command): void {
  queue.push(command);
}

export function applyCommands(world: World): void {
  for (const c of world.commands) {
    if (c.type === 'place') placeBuilding(world, c.building, c.x, c.y, c.rotated, false, c.storey ?? 0);
    if (c.type === 'paintFloor') placeFloor(world, c.x, c.y, c.kind, c.storey ?? 0);
    if (c.type === 'buildEdge') placeEdge(world, c.x, c.y, c.side, c.kind, c.level, c.storey ?? 0);
    if (c.type === 'removeHouseItem') removeHouseItem(world, c.item, c.id);
    if (c.type === 'setWorkers') {
      const b = world.buildings.find((b) => b.id === c.id);
      if (b) b.workers = Math.max(0, Math.min(BUILDINGS[b.type].workers, c.count));
    }
    if (c.type === 'sendExpedition' && !expeditionError(world, c.poi, c.members)) sendExpedition(world, c.poi, c.members);
    if (c.type === 'buildComponent' && !componentError(world, c.component)) {
      pay(world, COMPONENTS[c.component].cost);
      [world.airship.building, world.airship.progress] = [c.component, 0];
    }
    if (c.type === 'chooseSite' && !siteError(world, c.x, c.y)) {
      world.airship.site = { x: c.x, y: c.y };
      addLog(world, 'The crew agrees. The airship will rise from here.', { x: c.x + 3, y: c.y + 3 });
    }
    if (c.type === 'buildBerth' && !berthError(world)) {
      pay(world, BERTH.cost);
      [world.airship.building, world.airship.progress] = ['berth', 0];
    }
    if (c.type === 'salvage') {
      const b = world.buildings.find((b) => b.id === c.id);
      if (b && b.type !== 'supplyCart') b.salvage = b.salvage === null ? Math.max(3, BUILDINGS[b.type].build / 2) : null;
    }
    if (c.type === 'clearArea') {
      // Marks every building touching the area, such as the ring of ground around the launch pad.
      for (const b of world.buildings) {
        if (b.type !== 'supplyCart' && b.x < c.x + c.w && c.x < b.x + b.w && b.y < c.y + c.h && c.y < b.y + b.h && b.salvage === null) b.salvage = Math.max(3, BUILDINGS[b.type].build / 2);
      }
    }
    if (c.type === 'upgradeHearth' && !hearthUpgradeError(world)) {
      const next = BALANCE.hearth.levels[world.hearth.level];
      pay(world, next.cost);
      world.hearth.hp += next.hp - BALANCE.hearth.levels[world.hearth.level - 1].hp;
      world.hearth.level++;
      addLog(world, `The house is repaired: ${next.name}.`, world.hearth);
    }
    if (c.type === 'upgradeBuilding') {
      const b = world.buildings.find((b) => b.id === c.id);
      if (b && !buildingUpgradeError(world, b)) {
        pay(world, BUILDINGS[b.type].upgrades![b.level - 1]);
        b.level++;
        addLog(world, `The ${BUILDINGS[b.type].name} reaches stage ${b.level}.`, b);
      }
    }
    if (c.type === 'setShelter' || c.type === 'setCraft') {
      const b = world.buildings.find((b) => b.id === c.id);
      if (b && c.type === 'setShelter') b.shelter = c.on;
      if (b && c.type === 'setCraft' && BUILDINGS[b.type].armory && CRAFTABLE.includes(c.weapon) && b.craft !== c.weapon) [b.craft, b.progress, b.loaded] = [c.weapon, 0, false];
    }
    if (c.type === 'alarm' && world.alarm !== c.on) {
      world.alarm = c.on;
      addLog(world, c.on ? 'The alarm sounds. Everyone takes cover.' : 'All clear. Back to work.');
    }
    if (c.type === 'launch' && !launchError(world)) {
      world.airship.launch = { elapsed: 0, fuel: 0 };
      // The launch is a night: skip to the start of the night phase.
      world.dayTime = BALANCE.phases[0].seconds + BALANCE.phases[1].seconds;
      addLog(world, 'The Last Night begins. Load the fuel and hold the line.');
    }
    if (c.type === 'recall') {
      const ex = world.expeditions.find((e) => e.id === c.id);
      if (ex) recall(world, ex);
    }
  }
  world.commands.length = 0;
}

/** Why this squad cannot leave, or null when it can (section 10.2). */
export function expeditionError(world: World, poi: number, members: number[]): string | null {
  if (!world.buildings.some((b) => b.type === 'gate' && b.construct <= 0)) return 'Build a Gate first';
  if (!world.pois[poi]) return 'Pick a place to search';
  if (world.pois[poi].seen === 'hidden') return 'Nobody knows where that is yet';
  if (members.length < 1 || members.length > BALANCE.expeditions.maxSquad) return `Pick 1 to ${BALANCE.expeditions.maxSquad} colonists`;
  for (const id of members) {
    const c = world.colonists.find((c) => c.id === id);
    if (!c || c.expedition !== null) return 'A picked colonist is not available';
  }
  return null;
}

function sendExpedition(world: World, poiIndex: number, members: number[]): void {
  const poi = world.pois[poiIndex];
  const gates = world.buildings.filter((b) => b.type === 'gate' && b.construct <= 0).map(center);
  const gate = gates.reduce((a, b) => (Math.hypot(b.x - poi.x, b.y - poi.y) < Math.hypot(a.x - poi.x, a.y - poi.y) ? b : a));
  const squad = world.colonists.filter((c) => members.includes(c.id));
  const id = world.nextId++;
  for (const c of squad) [c.expedition, c.job, c.duty, c.asleep, c.storey] = [id, null, null, false, 0];
  const x = squad.reduce((s, c) => s + c.x, 0) / squad.length;
  const y = squad.reduce((s, c) => s + c.y, 0) / squad.length;
  world.expeditions.push({
    id, poi: poiIndex, members: [...members], stage: 'out', x, y, px: x, py: y,
    route: [gate, { x: poi.x, y: poi.y }], gate, searchLeft: 0, rollTimer: 0, loot: {}, items: [], recruits: 0,
  });
}

/** Why this airship component cannot be started, or null when it can (section 11). */
export function componentError(world: World, id: ComponentId): string | null {
  const def = COMPONENTS[id];
  const air = world.airship;
  if (!air.blueprint) return 'Needs the old owner\'s blueprint';
  if (!hasWorkstation(world)) return 'Build a Drafting Table or the Launch Pad first';
  if (air.built.includes(id)) return 'Built';
  if (air.building) return `The crew is busy with the ${air.building === 'berth' ? BERTH.name : COMPONENTS[air.building].name}`;
  if (def.needs && !air.built.includes(def.needs)) return `Needs the ${COMPONENTS[def.needs].name}`;
  if (def.item && !world.items[def.item]) return `Needs the ${ITEMS[def.item]}`;
  const short = missing(world, def.cost);
  return short ? `Not enough ${RESOURCE_NAMES[short as Resource].toLowerCase()}` : null;
}

/** True when a finished Drafting Table or Launch Pad stands, where the crew works on the airship. */
export const hasWorkstation = (world: World): boolean => world.buildings.some((b) => (b.type === 'airshipDock' || b.type === 'draftingTable') && b.construct <= 0);

/** Why a Berth Deck cannot be started, or null when it can (section 11.2). */
export function berthError(world: World): string | null {
  const air = world.airship;
  if (!air.blueprint) return 'Needs the old owner\'s blueprint';
  if (!hasWorkstation(world)) return 'Build a Drafting Table or the Launch Pad first';
  if (!air.built.includes(BERTH.needs)) return `Needs the ${COMPONENTS[BERTH.needs].name}`;
  if (air.berths >= BERTH.max) return 'Every berth is built';
  if (air.building) return `The crew is busy with the ${air.building === 'berth' ? BERTH.name : COMPONENTS[air.building].name}`;
  const short = missing(world, BERTH.cost);
  return short ? `Not enough ${RESOURCE_NAMES[short as Resource].toLowerCase()}` : null;
}

export function launchError(world: World): string | null {
  if (world.airship.launch) return 'The launch has started';
  if (!world.buildings.some((b) => b.type === 'airshipDock' && b.construct <= 0)) return 'Build the Launch Pad first';
  if (COMPONENT_IDS.some((id) => !world.airship.built.includes(id))) return 'Build every component first';
  if (world.stock.fuel < launchFuelNeeded(world)) return `Gather fuel first. Loading and the night's burning need ${launchFuelNeeded(world)}`;
  return null;
}

export function hearthUpgradeError(world: World): string | null {
  const next = BALANCE.hearth.levels[world.hearth.level];
  if (!next) return 'Fully upgraded';
  const short = missing(world, next.cost);
  return short ? `Not enough ${RESOURCE_NAMES[short as Resource].toLowerCase()}` : null;
}

export function buildingUpgradeError(world: World, b: Building): string | null {
  if (b.construct > 0) return 'Still being built';
  const cost = BUILDINGS[b.type].upgrades?.[b.level - 1];
  if (!cost) return 'Fully upgraded';
  const short = missing(world, cost);
  return short ? `Not enough ${RESOURCE_NAMES[short as Resource].toLowerCase()}` : null;
}
