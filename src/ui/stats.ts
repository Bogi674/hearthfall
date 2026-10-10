// Plain facts about a building for the build menu and the selection panel (M13): what it does and what it holds.
import { BUILDINGS, type BuildingType } from '../data/buildings';
import { BUILDING_INFO } from '../data/descriptions';
import { RECIPES } from '../data/recipes';
import { RESOURCE_NAMES, type Amounts, type Resource } from '../data/resources';

const list = (a: Amounts) => Object.entries(a).map(([r, n]) => `${n} ${RESOURCE_NAMES[r as Resource].toLowerCase()}`).join(' and ');

/** Short lines of facts about a building type. */
export function statLines(type: BuildingType): string[] {
  const d = BUILDINGS[type];
  const lines = [`Size ${d.size[0]} by ${d.size[1]}. Health ${d.hp}.`];
  if (d.workers > 0) lines.push(`${d.nightDuty ? 'Defenders' : 'Workers'}: up to ${d.workers}.`);
  const r = RECIPES[type];
  if (r) lines.push(`${r.inputs ? `${list(r.inputs)} into ` : 'Makes '}${list(r.outputs)} every ${r.cycle} seconds with a full crew.`);
  if (d.storage) lines.push(`Stores ${d.storage}.`);
  if (d.beds) lines.push(`Sleeps ${d.beds}.`);
  if (d.heat) lines.push(`Warms ${d.heat.radius} tiles for ${d.heat.fuelPerMinute} fuel a minute.`);
  if (d.light) lines.push(`Lights ${d.light.radius} tiles at night for ${d.light.fuel} fuel.`);
  else if (d.glow) lines.push(`Glows ${d.glow} tiles.`);
  if (d.guns) lines.push(`Gun range ${d.guns[0].range}, damage ${d.guns[0].damage}.`);
  if (d.sight) lines.push(`Sees ${d.sight[0]} tiles.`);
  if (d.roofed) lines.push('Goes in a closed room.');
  return lines;
}

export const infoHtml = (type: BuildingType): string =>
  `<h4>${BUILDINGS[type].name}</h4><p>${BUILDING_INFO[type]}</p><ul>${statLines(type).map((l) => `<li>${l}</li>`).join('')}</ul>`;
