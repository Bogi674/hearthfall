# Changelog

Newest entries first. Each entry names the milestone it belongs to.

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
