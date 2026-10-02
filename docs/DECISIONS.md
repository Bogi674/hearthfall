# Decisions

Design and architecture decisions that are not already in `docs/GAME_DESIGN.md`. Each one has a reason.

## 2026-10-02 (M0)

- **RNG algorithm is mulberry32 with state in a plain object.** It is small, fast, and has a 32 bit state that fits in a JSON number. Saving the world saves the RNG position too.
- **The fixed step accumulator lives in `src/sim/loop.ts` as a pure function.** This keeps it testable without a browser. It caps catch up at 10 ticks per frame and drops the backlog after a long stall, so a hidden tab does not cause a burst of hundreds of ticks.
- **The command queue starts as an empty union type.** No player action exists before M2. The queue and the drain point in `stepWorld` are in place so UI code has one path to the simulation from the start.
- **The architecture test reads sources through `import.meta.glob`.** This avoids adding `@types/node` as a new dependency.
- **Empty folders from section 15.4 hold a `.gitkeep` file.** Git does not track empty folders.

## 2026-10-02 (M1)

- **Warmth model.** A tile's warmth is the larger of the outdoor baseline and each heat source. A source gives 100 at its center and falls to the warm threshold at its radius. Past the radius it drops to 0 over 3 tiles. This makes "radius" mean exactly the set of warm tiles, and heaters can reuse the same rule later. Sources do not stack.
- **Warmth bands.** Warm is 50 and above. Freezing is below 20. Cold is between them. The baseline is 30 at 0 degrees and drops 1.5 per degree below zero. Day 1 outside is cold (27). Outside becomes freezing around day 8. All of these live in `src/data/balance.ts`.
- **Warmth recomputes only when its inputs change.** The world stores a `warmthKey` built from temperature and hearth radius. The renderer compares the same key to know when to refresh its textures and prop colors.
- **World coordinates.** Tile (x, y) has its center at world (x minus half the width, 0, y minus half the height). The hearth sits at the map center, so it is at the world origin.
- **Fog by distance from the hearth.** The design asks for fog that thickens with distance from the hearth. Standard fog measures distance from the camera, so `installHearthFog` patches the fog vertex chunk to use horizontal distance from the origin. The ground shader applies the same fog by hand.
- **Derived colors come only from palette mixes.** `mixPalette` blends two palette colors. No new hex values appear outside the palette.
- **Warmth driven prop material.** Instanced props store coldness in the red channel of the instance color and a brightness variation in green. A patched standard material picks the warm or cold tint and adds snow on upward faces when cold.
- **Snow hides over the warm circle on screen.** Each flake fades by the warmth under itself and by the warmth of the ground point it overlaps along the view direction. Without the second check, flakes high above cold tiles were drawn over the warm circle in the isometric view.
- **Ruin walls are thin segments.** Each wall tile draws a segment toward its wall neighbors, so houses read as broken outlines and not as solid cubes.
- **Frost growth over days is a render constant.** It is visual only, so it lives in `src/render/sync.ts` and not in balance data.
- **Camera.** The view is 32 world units tall at zoom 1. Zoom ranges from 0.5 to 3. The pan target is clamped to the map bounds.
- **Seed from URL.** `?seed=` sets the map seed. This helps visual review and does not add a settings screen.
