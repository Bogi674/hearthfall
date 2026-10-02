# Changelog

Newest entries first. Each entry names the milestone it belongs to.

## 2026-10-02 (M0: Scaffold)

- Set up Vite, strict TypeScript, Three.js, and Vitest.
- Created the folder structure from section 15.4 of the design document.
- Added the fixed tick loop at 10 ticks per second (`src/sim/loop.ts`, `src/sim/world.ts`).
- Added the seeded RNG (`src/sim/rng.ts`) with tests for determinism, range, and JSON round trips.
- Added an empty command queue (`src/sim/commands.ts`).
- Added an architecture test that fails if `src/sim` imports `three`, uses `Math.random`, or touches the DOM.
- `npm run dev` shows an empty lit scene. `npm test` and `npm run build` pass.
