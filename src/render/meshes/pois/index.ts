import * as THREE from 'three';
import type { PoiType } from '../../../data/pois';
import { PALETTE } from '../../materials';
import { GEO, part } from '../kit';
import { gasStation, oldAirfield, railDepot } from './roadside';
import { clinic, farmhouse, hardwareStore, type Place } from './town';

// One unique building per kind of place (section 10.4). Rumors show only the cold beacon. A known place shows the
// whole building. Once a squad has searched it the loot props are gone.

const BUILD: Record<PoiType, (p: Place) => void> = { farmhouse, gasStation, hardwareStore, clinic, railDepot, oldAirfield };
/** How high the beacon floats over each place, a little above the roofline. */
const BEACON_HEIGHT: Record<PoiType, number> = { farmhouse: 3.6, gasStation: 3.2, hardwareStore: 2.8, clinic: 3.4, railDepot: 4.0, oldAirfield: 3.6 };

const beacon = new THREE.MeshBasicMaterial({ color: PALETTE.frost.clone().multiplyScalar(1.8), fog: false });

export function createPoiMesh(type: PoiType): THREE.Group {
  const g = new THREE.Group();
  const site = new THREE.Group();
  site.name = 'site';
  const loot = new THREE.Group();
  loot.name = 'loot';
  BUILD[type]({ site, loot });
  site.add(loot);
  g.add(site);
  g.add(part(GEO.block, beacon, [0, BEACON_HEIGHT[type], 0], [0.28, 0.28, 0.28]));
  return g;
}
