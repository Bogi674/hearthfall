# Changelog

Newest entries first. Each entry names the milestone it belongs to.

## 2026-10-02 (M6: Prototype Polish)

- Added save and load as versioned JSON (`src/save/save.ts`). The menu saves to one slot in browser storage, and the game also saves at every dawn. Loading reloads the page and starts from the save.
- Added settings for auto pause at dusk, hints, and volume. They are kept in browser storage.
- Added tutorial hints for the first two days (`src/data/hints.ts`). One goal shows at a time, from the first Woodcutter Camp to the first expedition.
- Added placeholder audio synthesized with Web Audio, so the offline file still needs no assets. Fire crackle near the hearth and wind away from it follow the camera. Stingers sound at dusk, when the wave arrives, and when a building falls at night.
- Added a pause menu with resume, save, load, new run, settings, and the controls list.
- HUD buttons now act on press. Panels re-render often, and a click could be lost when a button was replaced between press and release.
- The top bar keeps its speed and menu buttons in their own container so they do not re-render with the clock.
- Balance pass: the M5 full run test drove the balance changes listed there. Tests now show a managed colony surviving 5 days, a defended base holding through night 8, and a full run launching on day 9.
- Tests show that a loaded game continues tick for tick like the original, that old save versions are rejected, and that hints advance as goals are met.
- Added `docs/screenshots/m6-hints.jpg` and `docs/screenshots/m6-menu.jpg`.

## 2026-10-02 (M5: Airship and Win State)

- Added the Smelter, Workshop, Heater, and Airship Dock. Heaters burn their own fuel and add a warm and lit radius of 4.
- Added the five airship components with their materials and rare items. The Frame comes first. Dock workers build each one.
- Added The Last Night. The launch starts a night with three times the threat and the Horde Mother, who spawns Shamblers. 200 fuel loads over 180 seconds and colonists board in the last 30. Anyone not aboard is left behind.
- Added the score screen with the score, who was aboard, who was left behind, and every death with its cause. It also shows on a loss.
- Added hope from section 6.5, because the Envelope and Engine raise it. Deaths, hunger, cold, and destroyed buildings lower it. Low hope slows work and zero hope makes a colonist desert at dawn.
- Added the hearth upgrade from section 5.2 with its design costs.
- Colonists no longer stand at a job that is too cold to work. They wait by the hearth.
- Added the Airship tab, hope and airship progress in the top bar, an upgrade button in the hearth panel, and a build menu with one tab per category.
- Balance changes from the full run test: faster recipes, trees hold 40, warmth drops 1 per degree, Shamblers deal 4, the hearth has 4000 HP, the hearth takes no wall multiplier, towers deal 15, and destroyed buildings cost 1 hope.
- A scripted full run launches on day 9 on seeds 1 and 2. That is about 85 minutes at 1x or about 43 minutes at 2x.
- Added `docs/screenshots/m5-airship.jpg` and `docs/screenshots/m5-launch.jpg`.

## 2026-10-02 (M4: Expeditions)

- Added the six POIs from section 10.1 with danger, distance, loot, rare items, and survivors at the Clinic. Each map places one of each at its design distance, with a landmark and a name label.
- Added metal and parts as resources so expeditions can bring them back. Their buildings arrive in M5.
- Added the expeditions system. A squad of 1 to 4 walks out through the nearest gate, searches with rolls for loot and danger, and walks home. Squads are visible on the map the whole trip.
- Danger events injure or kill. Bigger squads lower the risk and night triples it. A searched POI gives half the loot on each later visit.
- Recall turns a squad around at once.
- Added an Expeditions tab with places, danger, the danger chance per roll, loot hints, a squad picker, and active trips with recall.
- Event log entries with a place can be clicked to focus the camera there. Deaths are now recorded with their cause for the M5 score screen.
- Fixed map generation writing fractional tile keys when clearing a radius that is not a whole number.
- Added `docs/screenshots/m4-expedition.jpg`.

## 2026-10-02 (M3: Defense and Waves)

- Added the Wooden Barricade, Gate, Lantern Post, Spike Trap, and Watchtower. Every building now has HP and can be destroyed.
- Added flow field pathing toward the hearth. Walls cost a lot instead of blocking, so monsters break through the cheapest wall. Runners use their own field that favors gates and open gaps.
- Added the Shambler, Runner, and Brute. Brutes deal triple damage to walls.
- Added the wave formula with a Blood Moon every fifth night, unlocks by night, and spawn edges that grow over time.
- Added the forecast bar. It shows threat, edges, and enemy types by day, and exact counts from dusk.
- Added defender duty. Watchtower defenders keep their day job, skip sleep, and shoot monsters at night.
- Spike traps hurt monsters standing on them. Light from the hearth and lit lanterns weakens Shamblers and slows Runners.
- The hearth has HP. The run is lost if it is destroyed.
- Added meshes for the defenses, monsters with glowing Blight eyes, lantern light pools, and health bars on damaged entities.
- Tests show that a ringed base with towers and traps holds through night 8 on three seeds, and the same colony with no defenses falls.
- The M2 economy tests now run with monsters cleared, matching the "no monsters" wording of the M2 done line.
- Added `docs/screenshots/m3-night-attack.jpg` and `docs/screenshots/m3-overview.jpg`.

## 2026-10-02 (M2: Core Economy)

- Added data for the ten M2 buildings, their recipes, resources, colonist names, start values, the day cycle, and needs rates.
- Added the day cycle with Day, Dusk, Night, and Dawn phases from section 3.2. Temperature drops by 1 degree each new day.
- Added the hearth fuel burn. The hearth goes out with no fuel, and the run is lost after 60 seconds out.
- Added colonists with health, hunger, rest, and body warmth. They eat meals, sleep in beds on warm tiles, freeze on cold tiles, and die with a logged cause.
- Added worker and bed assignment. Colonists walk to their building by day and to their bed at dusk.
- Added production with worker slots, inputs, warmth speed, storage limits, and blocked reasons. Gatherers harvest nearby nodes and the nodes deplete.
- Added the place and set workers commands, with placement checks shared by the command and the preview.
- Added building meshes, colonists, and a placement ghost with the blocked reason next to the cursor.
- Added the HUD: top bar, build menu, selection panel with worker buttons, colonist list, event log, and game over screen.
- Added pause, 1x, 2x, and 3x speed. The game auto pauses when dusk starts.
- Tests show that a managed colony survives 5 days with everyone alive, and that neglecting fuel or food loses the run.
- Added `docs/screenshots/m2-economy.jpg`.

## 2026-10-02 (Tooling, outside the milestone plan)

- Added `npm run build:offline`. It uses `vite-plugin-singlefile` to write one self contained `dist-offline/index.html` that runs when opened directly from disk.
- Added `scripts/check-offline.mjs`. It runs after the offline build and fails if the output is more than one file or references an external file.
- Added the GitHub Action `.github/workflows/offline-build.yml`. On every push to `main` it runs the tests and the offline build, then publishes `hearthfall.html` as a GitHub Release asset.
- Updated `CLAUDE.md` with the offline build command, the end of session check, and architecture rule 8.

## 2026-10-02 (M1: Visual Direction)

- Added `src/data/balance.ts` with map generation, temperature, warmth, and hearth radius values.
- Added tile types and grid helpers (`src/sim/grid.ts`).
- Added seeded map generation (`src/sim/mapgen.ts`). It places a central clearing for the hearth, two main roads, side streets, ruined houses with broken walls and rubble, frozen ponds, and trees that thicken with distance.
- Added the warmth system (`src/sim/systems/warmth.ts`). Every tile holds warmth from 0 to 100. The hearth keeps its radius warm and the outdoor temperature sets the baseline outside.
- Added the ground shader. It blends warm earth and firelight with blue snow and ice using the warmth map.
- Added instanced trees, rubble, and ruin walls. Props shift to cold tints and gather snow on cold tiles.
- Added the hearth mesh with flickering flames and one real point light.
- Added bloom, ACES tone mapping, vignette, and film grain.
- Added cold fog that thickens with distance from the hearth.
- Added falling snow that appears only outside the warm radius.
- Added the isometric orthographic camera with scroll zoom, Q and E rotation in 90 degree steps, and pan with WASD, arrow keys, or middle mouse drag.
- The map seed can be set with `?seed=` in the URL.
- Added JPEG screenshots in `docs/screenshots` for the visual review.
- Tests cover map determinism, the clearing, tile variety, and warmth rules.

## 2026-10-02 (M0: Scaffold)

- Set up Vite, strict TypeScript, Three.js, and Vitest.
- Created the folder structure from section 15.4 of the design document.
- Added the fixed tick loop at 10 ticks per second (`src/sim/loop.ts`, `src/sim/world.ts`).
- Added the seeded RNG (`src/sim/rng.ts`) with tests for determinism, range, and JSON round trips.
- Added an empty command queue (`src/sim/commands.ts`).
- Added an architecture test that fails if `src/sim` imports `three`, uses `Math.random`, or touches the DOM.
- `npm run dev` shows an empty lit scene. `npm test` and `npm run build` pass.
