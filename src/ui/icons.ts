// Build menu pictograms. Each icon is an outline drawn in currentColor with at most one translucent accent fill.
import type { BuildingType } from '../data/buildings';

const svg = (body: string): string =>
  `<svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true" fill="none" stroke="currentColor" ` +
  `stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

/** Attributes for the single solid accent area of an icon. */
const ACCENT = 'fill="currentColor" opacity="0.35" stroke="none"';

/** Inline SVG icons for the build menu, 32 by 32, drawn with currentColor so the button color shows through. */
export const BUILDING_ICONS: Record<BuildingType, string> = {
  supplyCart: svg(
    `<rect x="5" y="9" width="8" height="8" ${ACCENT}/>` +
      `<rect x="5" y="9" width="8" height="8"/><rect x="14" y="12" width="7" height="5"/>` +
      `<path d="M3 17h21l5-6"/><path d="M5 9l8 8M13 9l-8 8"/>` +
      `<circle cx="11" cy="23" r="4"/><path d="M22 17v8"/>`,
  ),
  tent: svg(
    `<path d="M12 26l4-10 4 10z" ${ACCENT}/>` +
      `<path d="M4 26L16 6l12 20z"/><path d="M12 26l4-10 4 10"/><path d="M16 6V3"/>` +
      `<rect x="20.5" y="17" width="3" height="3" stroke-width="1.5"/>`,
  ),
  bunkhouse: svg(
    `<rect x="18" y="14" width="6" height="11" ${ACCENT}/>` +
      `<rect x="3" y="8" width="26" height="17" rx="1"/>` +
      `<path d="M7 12v9M11 12v9M15 12v9"/><rect x="18" y="14" width="6" height="11"/><path d="M3 28h26"/>`,
  ),
  storageShed: svg(
    `<rect x="10" y="16" width="12" height="11" ${ACCENT}/>` +
      `<path d="M4 13L28 7M6 12.5V27h20V8.5"/><rect x="10" y="16" width="12" height="11"/>` +
      `<path d="M10 16l12 11M22 16L10 27M16 16v11"/>`,
  ),
  heater: svg(
    `<path d="M16 3c2.5 3 5 5 3.5 8.5h-7C11 8 13.5 6 16 3z" ${ACCENT}/>` +
      `<path d="M16 3c2.5 3 5 5 3.5 8.5h-7C11 8 13.5 6 16 3z"/>` +
      `<rect x="8" y="14" width="16" height="12" rx="2"/><path d="M8 18h16"/>` +
      `<rect x="13" y="20" width="6" height="3"/><path d="M10 26v2M22 26v2"/>`,
  ),
  bed: svg(
    `<rect x="5" y="14" width="22" height="8" ${ACCENT}/>` +
      `<path d="M4 24V8M4 18h24v6M28 24v-3"/><rect x="6" y="12" width="7" height="5" rx="1.5"/>`,
  ),
  stairs: svg(
    `<path d="M5 26h6v-5h6v-5h6v-5h4v15z" ${ACCENT}/>` +
      `<path d="M4 26h6v-5h6v-5h6v-5h6"/><path d="M4 26h24"/>`,
  ),
  stringLights: svg(
    `<path d="M5 24V8M27 24V8"/><path d="M5 9c6 7 16 7 22 0"/>` +
      `<circle cx="10" cy="14" r="2" ${ACCENT}/><circle cx="16" cy="16" r="2" ${ACCENT}/><circle cx="22" cy="14" r="2" ${ACCENT}/>`,
  ),
  crate: svg(
    `<rect x="5" y="9" width="22" height="16" ${ACCENT}/><rect x="5" y="9" width="22" height="16"/>` +
      `<path d="M5 14h22M5 19h22M12 9v16M20 9v16"/>`,
  ),
  sickbed: svg(
    `<rect x="5" y="14" width="22" height="8" ${ACCENT}/>` +
      `<path d="M4 24V10M4 18h24v6M28 24v-3"/><path d="M15 15v6M12 18h6"/>`,
  ),
  table: svg(
    `<rect x="5" y="11" width="22" height="5" ${ACCENT}/>` +
      `<rect x="5" y="11" width="22" height="5" rx="1"/><path d="M8 16v10M24 16v10"/><circle cx="12" cy="8" r="2.5"/><circle cx="20" cy="8" r="2.5"/>`,
  ),
  sofa: svg(
    `<rect x="6" y="16" width="20" height="7" ${ACCENT}/>` +
      `<path d="M6 16V11a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5M4 16h4v8H4zM24 16h4v8h-4zM8 23h16M9 26v2M23 26v2"/>`,
  ),
  stove: svg(
    `<rect x="9" y="12" width="14" height="13" ${ACCENT}/>` +
      `<rect x="8" y="11" width="16" height="15" rx="1"/><path d="M20 11V4M13 17h6v4h-6zM10 26v2M22 26v2"/>`,
  ),
  workbench: svg(
    `<rect x="4" y="14" width="24" height="4" ${ACCENT}/>` +
      `<rect x="4" y="14" width="24" height="4" rx="1"/><path d="M7 18v9M25 18v9M8 6l5 5M14 5l-3 6M22 7v7"/>`,
  ),
  lamp: svg(
    `<path d="M11 14l2-8h6l2 8z" ${ACCENT}/>` +
      `<path d="M11 14l2-8h6l2 8zM16 14v13M11 27h10"/>`,
  ),
  rug: svg(
    `<rect x="5" y="9" width="22" height="14" ${ACCENT}/>` +
      `<rect x="5" y="9" width="22" height="14" rx="1"/><rect x="10" y="13" width="12" height="6"/><path d="M5 9v-2M9 9v-2M13 9v-2M17 9v-2M21 9v-2M25 9v-2"/>`,
  ),
  plant: svg(
    `<circle cx="16" cy="12" r="7" ${ACCENT}/>` +
      `<path d="M16 19V9M16 14c-3 0-5-2-5-4M16 12c3 0 5-2 5-4M11 20h10l-1 8h-8z"/>`,
  ),
  roofTurret: svg(
    `<rect x="9" y="12" width="14" height="6" ${ACCENT}/>` +
      `<path d="M7 18h18M9 18v9M23 18v9M4 10l12 2M16 8v7M10 12h12"/><circle cx="16" cy="12" r="3"/>`,
  ),
  spotlight: svg(
    `<path d="M10 6h10l4 8H6z" ${ACCENT}/>` +
      `<path d="M10 6h10l4 8H6zM15 14v13M10 27h10M4 20l4-2M4 25l4-2"/>`,
  ),
  draftingTable: svg(
    `<path d="M6 12l20-3v9L6 21z" ${ACCENT}/>` +
      `<path d="M6 12l20-3v9L6 21zM9 21v7M23 18v10M12 14l8-1.2M12 17l8-1.2"/>`,
  ),
  shelf: svg(
    `<rect x="9" y="6" width="14" height="20" ${ACCENT}/>` +
      `<rect x="7" y="4" width="18" height="24" rx="1"/><path d="M7 12h18M7 20h18"/><rect x="11" y="14" width="4" height="6"/>`,
  ),
  woodcutterCamp: svg(
    `<ellipse cx="16" cy="20" rx="10" ry="3" ${ACCENT}/>` +
      `<ellipse cx="16" cy="20" rx="10" ry="3"/><path d="M6 20v6a10 3 0 0 0 20 0v-6"/>` +
      `<path d="M16 14L26 4"/><path d="M9 9.5l8 4 1 5.5h-8z"/>`,
  ),
  salvageYard: svg(
    `<path d="M3 27l4-6 4 2 4-3 6 1 4-2 4 8z" ${ACCENT}/>` +
      `<path d="M3 27l4-6 4 2 4-3 6 1 4-2 4 8z"/><path d="M8 21L5 13"/>` +
      `<path d="M21.9 10L23.9 10L23.9 12L21.9 12L21.2 13.8L22.6 15.2L21.2 16.6L19.8 15.2L18 15.9L18 17.9L16 17.9` +
      `L16 15.9L14.2 15.2L12.8 16.6L11.4 15.2L12.8 13.8L12.1 12L10.1 12L10.1 10L12.1 10L12.8 8.2L11.4 6.8` +
      `L12.8 5.4L14.2 6.8L16 6.1L16 4.1L18 4.1L18 6.1L19.8 6.8L21.2 5.4L22.6 6.8L21.2 8.2Z"/>` +
      `<circle cx="17" cy="11" r="2"/>`,
  ),
  quarry: svg(
    `<path d="M17 27l2-6 5-3 4 3v6z" ${ACCENT}/>` +
      `<path d="M17 27l2-6 5-3 4 3v6zM9 27l1-4 4-1 2 5z"/>` +
      `<path d="M4 12Q11 2 21 7"/><path d="M12.5 6.5L5 25"/>`,
  ),
  foragerHut: svg(
    `<g ${ACCENT}><circle cx="10.5" cy="13.5" r="2.5"/><circle cx="16.5" cy="12.5" r="2.5"/>` +
      `<circle cx="22.5" cy="13.5" r="2.5"/></g>` +
      `<circle cx="10.5" cy="13.5" r="2.5"/><circle cx="16.5" cy="12.5" r="2.5"/><circle cx="22.5" cy="13.5" r="2.5"/>` +
      `<path d="M17 10c0-4 3-6 8-6 0 4-3 6-8 6z"/>` +
      `<path d="M5 16h22l-3 11H8z"/><path d="M6.5 20.5h19M7.5 24h17"/>`,
  ),
  kitchen: svg(
    `<path d="M11 28c-2-3 1-4 1-7 2 2 3 3 4 1 1 2 2 1 4-1 0 3 3 4 1 7z" ${ACCENT}/>` +
      `<path d="M8 6h16v5a5 5 0 0 1-5 5h-6a5 5 0 0 1-5-5zM5 7h3M24 7h3"/>` +
      `<path d="M11 28c-2-3 1-4 1-7 2 2 3 3 4 1 1 2 2 1 4-1 0 3 3 4 1 7z"/><path d="M5 28h22"/>`,
  ),
  sawmill: svg(
    `<rect x="4" y="23" width="24" height="5" ${ACCENT}/>` +
      `<path d="M22.5 13L23.8 17.5L21.6 16.3L20.5 20.8L19.3 18.6L16 22L16 19.5L11.5 20.8L12.8 18.6L8.2 17.5` +
      `L10.4 16.3L7 13L9.5 13L8.2 8.5L10.4 9.8L11.5 5.2L12.7 7.4L16 4L16 6.5L20.5 5.2L19.3 7.4L23.8 8.5` +
      `L21.6 9.7L25 13Z"/><circle cx="16" cy="13" r="2"/><rect x="4" y="23" width="24" height="5"/>`,
  ),
  charcoalKiln: svg(
    `<path d="M13 27v-3a3 3 0 0 1 6 0v3z" ${ACCENT}/>` +
      `<path d="M3 27C3 19 9 15 16 15s13 4 13 12z"/><path d="M13 27v-3a3 3 0 0 1 6 0v3"/>` +
      `<path d="M14 12c-2-2 2-3 0-5.5M19 12c-2-2 2-4 0-8"/>`,
  ),
  smelter: svg(
    `<path d="M12 27l2-5h10l2 5z" ${ACCENT}/>` +
      `<path d="M4 9l9-5 4 7-7 4z"/><path d="M17 10q3 3 3 10"/>` +
      `<path d="M12 27l2-5h10l2 5z"/>`,
  ),
  workshop: svg(
    `<path d="M16 8.9l2.9-2.9 7 7-2.9 2.9z" ${ACCENT}/>` +
      `<path d="M16 8.9l2.9-2.9 7 7-2.9 2.9z"/><path d="M5 27l14-14"/>` +
      `<path d="M27 27L12.5 12.5"/><path d="M9 4.5a4.5 4.5 0 1 0 4.5 4.5L10 10 9 9z"/>`,
  ),
  woodenBarricade: svg(
    `<path d="M11 27V10l2.5-4 2.5 4v17z" ${ACCENT}/>` +
      `<path d="M4 27V12l2.5-4 2.5 4v15M11 27V10l2.5-4 2.5 4v17M18 27V10l2.5-4 2.5 4v17M23 27V12l2.5-4 2.5 4v15"/>` +
      `<path d="M3 19l26-2M3 22l26-2"/>`,
  ),
  reinforcedWall: svg(
    `<rect x="16" y="14" width="8" height="6" ${ACCENT}/>` +
      `<rect x="4" y="8" width="24" height="18"/><path d="M4 14h24M4 20h24"/>` +
      `<path d="M12 8v6M20 8v6M8 14v6M16 14v6M24 14v6M12 20v6M20 20v6"/>`,
  ),
  gate: svg(
    `<path d="M5 28V7l2-3 2 3v21M23 28V7l2-3 2 3v21"/>` +
      `<rect x="9" y="10" width="7" height="16"/><rect x="16" y="10" width="7" height="16"/>` +
      `<path d="M9 26l7-16M23 26l-7-16"/>`,
  ),
  spikeTrap: svg(
    `<rect x="4" y="22" width="24" height="5" ${ACCENT}/>` +
      `<rect x="4" y="22" width="24" height="5"/>` +
      `<path d="M5 22l2.5-9 2.5 9M11 22l2.5-11 2.5 11M17 22l2.5-9 2.5 9M23 22l2.5-11 2.5 11"/>`,
  ),
  watchtower: svg(
    `<rect x="6" y="11" width="20" height="4" ${ACCENT}/>` +
      `<path d="M6 7l10-4 10 4z"/><path d="M8 7v4M24 7v4"/><rect x="6" y="11" width="20" height="4"/>` +
      `<path d="M9 15L7 28M23 15l2 13M9 18l15 9M23 18L8 27"/>`,
  ),
  lanternPost: svg(
    `<rect x="18.5" y="13" width="3" height="5" ${ACCENT}/>` +
      `<path d="M9 4v24M5 28h8M9 6h11v3"/><path d="M16 11l4-2 4 2"/>` +
      `<rect x="16" y="11" width="8" height="9" rx="1"/><path d="M16 20h8"/>`,
  ),
  lampPost: svg(
    `<path d="M16 13h6l5 13H11z" ${ACCENT}/>` +
      `<path d="M9 28V9a5 5 0 0 1 5-5h5v5"/><path d="M5 28h8"/><path d="M15 9h8l-2 4h-4z"/>`,
  ),
  lookoutPost: svg(
    `<circle cx="16" cy="9" r="3" ${ACCENT}/>` +
      `<path d="M4 9q12-10 24 0Q16 19 4 9z"/><circle cx="16" cy="9" r="3"/>` +
      `<path d="M16 15v13M11 28h10M16 21l-4 7M16 21l4 7"/>`,
  ),
  airshipDock: svg(
    `<ellipse cx="15" cy="10" rx="11" ry="5.5" ${ACCENT}/>` +
      `<ellipse cx="15" cy="10" rx="11" ry="5.5"/><path d="M4 10h22M25 7l4-3v12l-4-3"/>` +
      `<path d="M10 15l2 6M20 15l-2 6"/><rect x="11" y="21" width="8" height="4" rx="1"/>` +
      `<path d="M4 28h24"/><rect x="17" y="6" width="4" height="2.5" stroke-width="1.5"/>`,
  ),
};
