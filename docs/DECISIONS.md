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

## 2026-10-02 (M3)

- **Monster terrain.** Water, blocked tiles, and ruin walls are impassable. Trees cost 4 and rubble costs 2. Ground and road cost 1. Impassable tiles use a large finite cost so the state stays JSON safe.
- **Wall cost.** Any non walkable building costs 40 in the normal field. In the runner field walls cost 80 and gates cost 10, so Runners favor gaps and gates (section 9.4).
- **What monsters attack.** A monster steps to the neighbor tile with the lowest flow value. If that tile is the hearth it hits the hearth. If it holds a building it hits the building. Otherwise it hits an awake colonist in reach, or it walks.
- **Monsters retreat at dawn.** The design does not say what happens to survivors. Clearing them at dawn keeps each night a separate fight.
- **Spawning.** Monsters spawn on random reachable tiles of the active edges, spread over the first 90 seconds of the night. Active edges start at 1 and grow by one every 4 nights, up to 4.
- **Wave composition.** Threat is spent by picking uniformly among unlocked types that still fit. Night 1 has no wave because the first wave is on night 2.
- **Night duty is separate from the day job.** A watchtower slot assigns a defender. The defender works their day job, then guards the tower at dusk and night and skips sleep (section 9.2).
- **Lanterns pay fuel at dusk.** A Lantern Post takes 1 fuel when the night phases begin and stays lit until dawn. Without fuel it shows "No fuel to light".
- **Light effects.** Inside the lit hearth radius or a lit lantern radius, Shamblers deal 30 percent less damage and Runners move 20 percent slower (section 5.3).
- **Numbers not in the design.** Hearth HP 1000, colonist HP 100, tower range 6, tower damage 12 every 0.8 seconds, trap damage 20 per second, and HP for non defense buildings. All of these live in data files.
- **Watchtowers reuse the progress field as their reload timer.** This avoids a field that only one building type uses.
- **Done line test.** The "good layout" is a barricade circle at radius 5, a spike trap circle at radius 6, and 4 watchtowers inside. The player rebuilds broken pieces each second. Food and fuel are topped up so only the defense decides the outcome.
- **Test timeout is 60 seconds.** Multi day simulations take a few seconds each.
- **Dev builds expose `window.world`.** Browser scripts use it to set up night scenes for screenshots. It is behind `import.meta.env.DEV`.

## 2026-10-02 (M4)

- **POIs are on the map.** Each type appears once, at its distance from `src/data/pois.ts` in a random direction. The 80 by 80 map is small, so distances run from 16 to 36 tiles.
- **Squads leave through the gate nearest the POI** and come home through the same gate.
- **Squads walk slower than colonists in camp,** at 1.2 tiles per second. This makes far trips take real time.
- **Search.** A search lasts 60 seconds with a roll every 6 seconds. Each roll gives loot, may find the rare item or a survivor, and may cause a danger event.
- **Risk formula.** Danger chance per roll is danger times 0.035, divided by the square root of squad size, times 3 at night. The UI shows this number before sending.
- **Rare items drop once.** A rare item can only be found while the colony does not already hold it.
- **Revisits.** Each full search of a POI halves its loot. A recalled squad does not count as a full search.
- **Sent colonists lose their job and night duty.** Their slots refill from idle colonists at once. They get new jobs as idle colonists after they return.
- **Survivors join on return.** A survivor found at the Clinic becomes a new colonist when the squad gets home.

## 2026-10-02 (M5)

- **"About 45 minutes" means at 2x speed.** The new daily cycle makes a day 570 seconds, so 45 minutes at 1x is under 5 days. The scripted full run launches on day 9, which is about 85 minutes at 1x and about 43 minutes at 2x. Launching later runs into the night 10 Blood Moon, and The Last Night triples it.
- **Hope is built in M5.** The Envelope and Engine raise hope, so hope from section 6.5 had to exist. Values are in `src/data/balance.ts`.
- **Desertion is checked first at dawn,** before the dawn hope changes. Hope at 0 when the night ends means a colonist leaves.
- **The hearth upgrade is built in M5.** Section 5.2 defines it but no milestone lists it. Outside tiles freeze around day 10, so the late game needs it.
- **Colonists skip jobs on freezing tiles.** Work there stops anyway, and standing in the cold only killed them.
- **The hearth is not a wall.** The Brute and Horde Mother wall multiplier applies to buildings, not to the hearth.
- **Defenders hold their post during boarding.** Colonists on night duty keep defending and are left behind. The player chooses who stays by changing night duty. This keeps the towers firing in the last 30 seconds and makes people the cost.
- **The launch starts a night.** Starting The Last Night jumps the clock to the start of the night phase, so the final horde and the loading time line up.
- **Score.** Score is survivors aboard times 100 times the difficulty factor of 1, plus 20 per day left before day 30. The design gives the shape of the formula but not the numbers.
- **Balance changes.** The full run test drove these: recipe outputs went up, trees hold 40, warmth drops 1 per degree below zero, Shamblers deal 4, the hearth has 4000 HP, towers deal 15, destroyed buildings cost 1 hope, and the Horde Mother deals 15 and spawns a Shambler every 12 seconds. The design's building and component costs did not change.
- **The full run player lives in `tests/fullrun.ts`.** It plays one target at a time and is meant to show the run is possible, not to be optimal.

## 2026-10-02 (M6)

- **One save slot plus an autosave at dawn.** Both use the same slot in browser storage. This keeps the menu simple and protects a run from a closed tab.
- **Load reloads the page.** The map and meshes are built once from the world at start, so loading a save starts the page fresh from it. The save travels in session storage across the reload.
- **Synthesized audio.** Section 13 allows placeholder audio. Web Audio noise and oscillators make fire, wind, and stingers without any sound files, which keeps the offline build to one file.
- **Hints are data.** `src/data/hints.ts` lists each goal with its done condition. The HUD shows the first goal not yet met during days 1 and 2.
- **Buttons act on pointer down.** The HUD re-renders panels when their text changes, up to five times a second. Acting on press means a click is never lost to a re-render.

## 2026-10-03 (Characters and intro)

- **Characters are rigs of simple parts.** Each part is one InstancedMesh shared by every figure of that kind, so 200 monsters still cost a few dozen draw calls. This follows the InstancedMesh rule for things that appear many times.
- **Characters are drawn larger than true scale.** Colonists are 1.3 times and monsters 1.2 times their tile size, so they read from the isometric camera. This is render only and does not change the simulation.
- **Wounds glow less than eyes.** Section 12.3 gives Blight to monster eyes and wounds. Full strength wounds made bloom swallow the Horde Mother, so wounds use a dimmer Blight mix.
- **The intro pauses the game and is skipped on load.** A new run starts with the story. A loaded save returns straight to play.

## 2026-10-03 (M7)

- **The hearth is a house with five stages.** Each stage has its own radius, fuel use, health, and repair cost in `src/data/balance.ts`. A repair adds the health difference, so a damaged house stays damaged by the same amount.
- **Lookout sight is 30, 36, and 44 tiles.** Sight 26 spotted nothing on most seeds, because the nearest unknown places sit about 28 tiles out.
- **A lookout only rumors a place.** The player can send a squad to a rumor, but its name and danger stay hidden until a squad gets there. This keeps expeditions as the way to confirm places, as the request asked.
- **Fog of war is a reveal map in the world.** `world.revealed` holds 0 or 1 per tile and is plain JSON. The renderer turns it into a texture for the ground shader and writes it into the prop instance color, where the shader discards hidden props. No extra meshes or draw calls.
- **Walls join by neighbor mask.** The renderer computes a four bit mask from neighboring wall tiles and rebuilds a wall mesh only when its mask changes.
- **Real shadows come from the moon only.** One directional light with a 2048 map follows the camera target. A ShadowMaterial plane over the custom ground shader catches them, so the ground shader did not need light code.
- **Colonists use a wizard silhouette.** The reference character has a hat, white eyes, and a belt with a buckle. A big hat and bright eyes read well from the isometric camera.
- **Save version 2.** The world gained house levels, building levels, the reveal map, and place states. Old saves lack them, so they are rejected rather than patched.
- **Idle colonists stand 3.3 tiles from the house.** At the old radius they stood inside the house walls.
- **The full run test uses seeds 1, 4, and 5.** The bot plays a fixed build order. M7 added real costs to that order, and seeds 2, 3, and 6 no longer launch before the night 10 Blood Moon with it. The test still proves the M5 done line on three maps.
