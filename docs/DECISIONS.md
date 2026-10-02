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

## 2026-10-02 (Offline build)

- **The game ships as one HTML file that runs from disk.** `npm run build:offline` uses `vite-plugin-singlefile` to inline all JavaScript and CSS into `dist-offline/index.html`. Players and reviewers can download one file and open it with no server and no install. The user asked for this plugin, so it is the one approved new dependency.
- **The offline build is a separate Vite mode.** `vite build --mode offline` adds the plugin and writes to `dist-offline`. The normal `npm run build` output in `dist` stays unchanged, so a later web or Steam build is not tied to single file packaging.
- **A check script guards the output.** `scripts/check-offline.mjs` fails the build if `dist-offline` holds anything besides `index.html` or if the HTML has a script, link, or image tag that points outside the file. This catches a future change that adds a runtime asset load or a code split chunk.
- **Assets must be bundled through static imports.** Runtime loads by URL, dynamic `import()`, separate worker files, and CDN scripts all break when the file is opened from disk. This is now architecture rule 8 in `CLAUDE.md`.
- **Every push to `main` publishes a GitHub Release.** The workflow runs `npm test` before building, so a broken commit does not publish. Each release gets a unique tag `build-<run number>` and is marked latest. This keeps a history of builds and gives a stable download link at `releases/latest/download/hearthfall.html`.
- **The release asset is named `hearthfall.html`.** The build still writes `index.html`. The workflow copies it to `hearthfall.html` before upload, because a download named `index.html` does not say what it is.

## 2026-10-02 (M2)

- **Buildings are built instantly when placed.** M2 lists placement but not construction time. The cost is paid on placement.
- **No stoker for the hearth.** The hearth burns fuel from the stockpile on its own. The stoker slot in section 8 has no defined effect yet.
- **Colonists walk in straight lines.** Hauling is abstracted in the prototype, and colonists only need to reach their building or bed. Pathfinding arrives for enemies in M3.
- **Work phases are Day and Dawn.** Colonists work in those phases and go to bed at Dusk. Without a bed they wait by the hearth.
- **Sleep only counts in a bed on a warm tile.** This follows section 6.3. A tent outside the warm circle gives no rest.
- **Meals are eaten automatically.** A colonist eats one meal when hunger falls below half. One meal restores half of the bar, so each colonist eats about one meal per day.
- **Health heals slowly.** Health recovers over 600 seconds while a colonist is neither starving nor frozen. Without this, small damage would add up forever.
- **A production building takes inputs at the start of a cycle.** This is the one cycle input buffer from section 7.3. Output waits when storage is full.
- **Storage counts all resources together.** The start value of 300 plus each Storage Shed is the cap for the sum of all stock.
- **Default workers fill every slot.** A new building requests all its slots. The player lowers the count with the minus button.
- **Node amounts.** Trees hold 25 wood, rubble 15 scrap, and ruin walls 30 stone. Smaller amounts made a camp run dry in under 2 days. Depleted tiles become ground.
- **Recipe numbers.** Cycle times and amounts are in `src/data/recipes.ts`. The design does not give them. They were tuned so the scripted player in `tests/helpers.ts` survives 5 days.
- **The auto pause is in the main loop.** Speed and pause are not simulation state, so the loop pauses itself on the first tick of Dusk.
