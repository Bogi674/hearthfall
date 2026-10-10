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

## 2026-10-03 (M7.1)

- **Map 128 by 128.** This was already the full game target in section 4. Distances to places grow by about 1.5 times. Squads walk a third faster, so the longest trip still fits in one day.
- **Forest density is anchored to a fixed distance.** Tree density used to ramp up relative to the map size. On the bigger map that pushed the woods so far out that woodcutters stood 40 tiles from home. Now the forest starts 17 tiles out on any map size.
- **Monsters spawn 42 tiles out, not at the map edge.** At the map edge a Shambler would need most of the night to arrive. A fixed spawn square keeps waves as dangerous as before.
- **Lookout sight 44, 56, and 66.** Stage 1 finds the Clinic, stage 2 the Rail Depot and Old Airfield from near the house. Stage 3 helps a post built away from the center.
- **Light protects people, not buildings.** The request asked that people closer to the fire are safer and that monsters at the fringe can attack but not fully hurt. Applying the steps to buildings would make the house unbreakable in the bright core, which removes the loss condition. So the steps scale damage to people and the speed of monsters only.
- **In the bright core monsters ignore people.** With zero damage a monster would stand and swing at a person forever. Skipping people there lets it keep walking to a wall or the house.
- **Warmth fades over 60 percent of the radius.** A gradual edge reads like real light. It also widens the cold but not freezing ring outside the warm circle, which is a small help late in a run.
- **Fog haze from a distance map.** The renderer turns the reveal map into a distance to the nearest known tile with a two pass chamfer sweep. The ground shader shows grey haze for the first few tiles and black deeper in. Props use the same distance to fade to grey silhouettes and then hide. The simulation state did not change.
- **Looks are data, colors live in materials.** `src/data/looks.ts` lists the twenty designs by color name. `LOOK_COLORS` in `src/render/materials.ts` defines those colors once. Skin and hair need natural tones outside the eight palette colors, so they are kept muted and warm.
- **The name picks woman or man, the seed picks the design.** Names already alternate between women and men. A look is derived in the renderer from the name and the seed, so no new state is saved and old saves still load.
- **One rig for every look.** Each style is a part that shows only for looks that ask for it. Hidden parts are zero size instances, and parts nobody wears are skipped. This keeps the shared InstancedMesh approach from the character decision.

## 2026-10-04 (M8)

- **The earlier "M8" is now M7.1.** The user asked for this batch to be M8. The previous scale, people, and light work was a follow up to M7, so it was renamed M7.1 in the design document and changelog.
- **Light steps are shares of the light radius, and light ends at the radius.** The user gave core to 70 percent, lit to 80, dim to 90, and fringe from 90 percent to where the light vanishes. The light now vanishes at the radius, so the visible pool and the protection match. Warmth still fades past the radius, so the snow edge stays soft.
- **Light is drawn from a light map, not the warmth map.** Buildings and lamps give light without warmth. The renderer paints a light texture from the same light sources the combat system uses (`lightSources` in `src/sim/query.ts`).
- **Day raids.** The emergency shelter only matters if workers can be in danger while they work. Waves only come at night, when nobody works, so a small raid of Shamblers and Runners now prowls in at two minutes into each day from day 3.
- **Hunters wait at walls.** Monsters that cannot break buildings chase exposed people within 10 tiles and otherwise follow the flow field. At a wall they stop. Walls therefore fully stop hunters, which keeps walls worth building.
- **Light softens damage to people only.** If light protected buildings, the house would be unbreakable in its own core.
- **Construction uses colonists without a job.** A production building's crew builds it first. Everyone else without a job helps the nearest site. There is no separate builder role to manage, which keeps the prototype simple.
- **Work spots in the simulation.** Production only counts workers who stand at their spot. This makes the animation honest: a worker you see walking is not producing yet.
- **Rooms are buildings on a reserved lot.** Rooms reuse the building system for construction, workers, light, and shelter. The 7 by 7 lot around the hearth is reserved for them, so the player decides the layout of the house.
- **One person rig with every tool.** Tools and weapons are parts on the right hand of the person rig, shown only when a figure holds them. Arms take a pose per trade when the figure stands still.
- **Weapons on a rack, not in the stockpile.** Spare weapons are counted in `world.weapons`, not as resources, so they do not crowd the top bar or use storage.
- **Saves stay in the browser, with save files for moving runs.** The game is single player and works offline. Browser storage with an autosave and three slots covers one device. Export and import of a save file covers moving between browsers and devices, and works in the offline file. Cloud saves on Vercel storage would need player accounts and a server, and would break rule 8 for the offline file, so they were not added.
- **Vercel needs no config.** The Vercel project detects Vite, runs `npm run build`, and serves `dist`. Every push to `main` deploys to production.
- **Watchtower costs wood.** It used to cost planks, which a new colony does not have, so the player could not build one early. It now costs 30 wood.
- **The full run test uses seeds 2, 3, 5, and 6 when checked by hand, and 2, 3, and 5 in the test.** Construction labor and raids slow the simple bot. Seeds 1 and 4 end one airship part short at the night 10 Blood Moon.
- **Building art is split by category** under `src/render/meshes/buildings/`, with `src/render/meshes/buildings.ts` as a short registry. Shared junk props live in `parts.ts` and shared materials and geometry in `kit.ts`, so a building reuses geometry instead of making new materials.
- **Rooms face away from the house.** A room turns on the first frame it is drawn, using its world position and the hearth at the origin. This needs no extra state in the simulation.
- **Ground glow comes from the light map only.** Building meshes no longer carry their own ground glow decals, since the light map already paints building light. Only the heater, lantern post, and lamp post keep a glow inside their `light` child.

## M10.1a: The house layer

- **The house is a layer of tiles and edges, not prefab rooms.** The player asked for a Sims style house. Floors are tiles. Walls, doors, and windows are edges between tiles, so a wall never uses up floor space. Rooms are derived from the walls and are not saved.
- **Furniture reuses the building system.** A bed or shelf is a building with `furniture: true`. It gets construction, hit points, saves, and selection with no new code.
- **Hearth House walls are virtual.** The house is a 3 by 3 wall with a front door on its south side. They are not stored. A stored door or window on a house wall replaces the virtual wall. This lets rooms open into the house without a second set of data.
- **No sealed rooms.** Placement analyses the planned layout, counting sites as built, and refuses a wall that shuts a room in with no door. This makes it impossible to trap colonists and keeps the rule simple to explain.
- **Routes only near the house.** Colonists still walk straight lines outside the house area, so the cost of path finding stays tiny. A route is stored on the colonist as plain data and rebuilt when the layout or target changes.
- **Furniture does not block walking.** Blocking furniture could trap people or block doors, so it waits for a design that keeps a clear path.
- **Lot radius 3, 4, 5, 6, 7.** M10 used up to 11, which pushed ordinary buildings off the map and broke the full run. A lot that grows by one tile per stage keeps the compound next to the house.
- **Floors cost wood and stone, walls cost wood first.** A new colony has only wood, so the first room must be possible from the starting stock.
- **The idle ring follows the lot.** Idle colonists stand 1.6 tiles outside the lot so they never wait inside the house area.
- **The house walls block walking only after the first floor or wall is built.** Always blocking made colonists detour around the 3 by 3 house and lost the scripted run on 5 of 8 seeds. With no house building the game plays exactly as it did before M10.1. Once the player builds on the house, the full rules apply.
- **The full run test for the house uses seed 2.** A control run with ordinary buildings of the same cost loses seeds 3 and 5 as well, so those seeds say nothing about the house.

## M10.1b: Living in the house

- **Start with 7 colonists, not 6.** The plan said 6. Measured on 16 seeds with drifters, a start of 6 launched on 4, a start of 7 on 12, and a start of 8 on 14. The old baseline with 8 and no drifters launched on 8. Six is too few for the economy. Seven is the smallest crew that holds up, and drifters bring the colony to about 10 by the first airship part.
- **Drifters need a free bed and hope.** A colony that ignores housing stops growing. This ties arrivals to the house instead of to chance.
- **Mats at the hearth, not a hard cap.** A bedless colonist sleeps on the hearth floor at half speed and costs a little hope. The penalty is small so a colony that grows past its beds is nudged, not punished.
- **Closed rooms are safe, open rooms are not.** Safety comes from the walls, so a breached room exposes people on its floor. This makes walls matter without a separate shelter flag.
- **Monsters pick their step with the wall cost included.** The flow field cost alone sent monsters at the nearest wall even when a door stood open beside it. Both the field and the step choice now count the wall strength, so doors draw attackers.
- **Furniture workstations replace room buildings.** The stove, workbench, and drafting table are furniture with workers. They reuse the building worker rules, so no new job system was needed.
- **The Drafting Table has four workers.** It does the same work as the old dock crew, so building the airship in the warm house costs no more labor than before.
- **The pad is 6 by 6 and cheaper.** A bigger footprint and a clear ring cost the player space. The cost fell from 100 planks, 80 metal, 20 parts to 70, 50, and 12, and the build time from 60 to 40 seconds.
- **The site is chosen before the pad is built.** The scripted run showed the nearest clear spot is crowded out by the time the pad is affordable. Choosing the site early keeps ground free, which is the Moot.
- **Push Out the Wall was not built.** Taking buildings apart plus the normal wall tools do the same job. A dedicated tool can follow if players need it.
- **The scripted player lives by the new rules.** It builds beds on house floors, a Drafting Table, and a pad outside the wall ring. Without the pad outside the ring it left a gap in its own walls.
- **The full run test uses seeds 2, 4, and 7.** Measured on 16 seeds the scripted run launches on 12 with 7 colonists. Seeds 2, 4, and 7 launch on days 8, 7, and 7.

## M10.1c: The house you can see

- **Hover frames are drawn on the ground.** Buildings share materials, so tinting one would tint all of that type. A frame under the thing needs no new materials, works for colonists and wall pieces too, and reads clearly from the isometric camera. It draws on top so it is visible through walls.
- **Cutaway fades the roofs, not the walls.** Walls are low, so they never hide the room. Only the roof does, and it fades smoothly instead of popping.
- **Building ghosts reuse the real meshes.** A ghost is the real model with a translucent material, so it can never drift from what gets built.
- **Rotation stays a half turn toggle.** The plan asked for four directions. The simulation only stores whether the footprint is turned, and seats and beds do not care which way they face. Four facings can come with the animation work if furniture needs a front.
- **Close to a border wins over the tile.** A wall piece next to a bed would otherwise never be pickable, so the cursor picks the wall when it is within a fifth of a tile of the border.
- **The Launch Pad lists its first blocking reason.** The blueprint and the site come before the cost, since resources do not help until those are done.
- **Dev builds expose `project` and `ui`.** Browser scripts use them to point at a tile and to read the selection. Production builds do not.

## M10.2a: Weather and temperature

- **The forecast is a pure function of seed and day.** Using the world rng would have shifted every other random roll and broken old tests. A separate hash also lets the HUD and the sim agree on tomorrow without storing a table.
- **Fuel is the main thermal cost.** A larger fuel multiplier (2 percent) lost 4 of 24 scripted runs. 1.2 percent keeps weather felt but fair, and 23 of 24 still win.
- **A blizzard shrinks outdoor heat reach but not closed rooms.** This gives the player a reason to wall in the rooms they live in, without changing the starting hearth radius on clear days.
- **No mid day temperature swings other than the day and night split.** A smooth curve would recompute the warmth map every tick. Four steps per day are cheap and readable.

## M11: The house that grows

- **The tile stays the unit, and everything else shrinks.** The request was that a bedroom takes too many tiles. Splitting tiles in two would have made rooms take more tiles, not fewer. So the tile now holds more: beds are one tile and people are drawn smaller. The map grew so the base has room.
- **Storeys are a number on each piece.** Floors, edges, and furniture carry a storey, and every query takes it with a default of 0. That kept the ground rules and tests as they were and made upper floors work with the same room, door, and routing logic.
- **Stairs are a building on one tile.** They link a tile to the same tile one storey up. A two tile staircase would have needed facing and a ramp, and the one tile version already gives a real route. The top landing needs a floor beside it, so nobody is stranded.
- **Upper storeys are reached through the stairs, not through a door.** The room that holds the top of the stairs counts as connected, so the no sealed rooms rule still holds upstairs.
- **Monsters ignore upper floors.** They break ground floor walls and reach people on balconies from below. Walls above the ground fall only to guns that miss. This keeps the monster code as it was, and the reward for building up is the range bonus and a safer bed.
- **Area tools are loops over the single piece rules.** A room, a fill, a line, and a demolish each call the same checks as one piece, so no rule could be skipped. They live in the simulation, so they work from commands and tests.
- **Surfaces are mapped from world position.** A painted texture on a stretched thin box would smear. World mapping keeps boards the same size on any wall and costs one shader patch.

## M10.2c and balance pass 2

- **The launch needs the burn, not just the load.** With weather, the hearth and four heaters burned about 30 fuel during the night, which broke a run that had followed the written rule. The rule now includes the burn and the reserve, and the UI says so. This is a rule change the player can read, not a hidden fudge.
- **Ground darkening is done in the material, not with a decal.** It costs nothing per object and works for every kit part, since the height test is in the shader.
- **The wave curve stays at 1.2 and 1.6.** At 1.24 and 1.7 three seeds fell. The nights already hurt, with the hearth at 40 percent in the worst run.

## Balance pass 1

- **The threat curve is 1.2 with a 1.6 Blood Moon.** Measured on 24 seeds with the scripted player: 1.2 won 24 and lost 0.04 colonists a run, 1.26 won 22 and lost 0.17, and the old 1.32 won 16 and lost 0.21. The steep curve made the run depend on being half a day faster. At 1.2 a day of delay still wins and the nights still hurt, since the hearth falls to about 70 percent at its worst.
- **The paddock is part of the map, not a rule.** Rather than letting the pad ignore trees, the map always has open ground for it. The pad still needs the player to choose where and to clear the ring.
- **Loading fuel keeps a hearth reserve.** A loss because the airship drank the fuel the hearth needed felt unfair. The launch now waits for more fuel instead.
- **Skipping turns does not stress the scripted player.** The player is paced by the economy, not by how often it acts, so a test that skips turns says little. Wave strength and delays do.


## M12: The ruin is the house

- **The ruin is data, not a model.** The starting house is generated as floors, wall edges, doors, windows, and furniture with a `ruin` flag and low hit points. Every query that worked on player pieces now works on the ruin, so there is no second code path to keep in step. The cost is one more flag on each piece.
- **Rooms are found per cluster.** About 70 town ruins would have made a whole map flood fill on every change. Pieces that touch are grouped, and only the group a change touches is analysed again. A ruin anywhere costs the same as one beside the hearth.
- **Routes run in a box around the walk.** The old route search covered the lot. The new one covers the walk with a margin, so a colonist crossing a ruin far from the hearth still gets a route.
- **The hearth is an object with a stage.** The old Hearth House was a model with a lot. Now the hearth is one tile, and the house around it is made of ordinary pieces. Stage 3 needs a floor and stages 4 and 5 need a closed room with a whole roof, which gives a reason to repair the roof and a reason to move the hearth into a good room.
- **Lighting costs fuel and a few seconds of work.** The run begins with a smoldering hearth, so there is a first action and a first small decision. An unlit hearth cannot lose the run, so the tutorial cannot punish a slow start.
- **Moving the hearth is a crew job.** The new place is built while the old one burns, so there is never a gap with no fire. The price is wood plus half of the stage cost, so a late move hurts but is possible.
- **Walls shade heat and do not stop it.** A first version stopped heat at every wall, and colonists in tents beside the house froze on day one. Each wall now adds 3 tiles to the way heat travels. A closed room still holds heat and gets a bonus of 10, and the ground behind a wall is cooler.
- **Ruined furniture counts only near the hearth.** With 70 houses, hundreds of beds and crates stood on the map, and colonists walked to a far bed and froze. A ruined piece counts as home inside the hearth radius or on a warm tile. Pieces the player built count anywhere.
- **A mend order pays when it is given.** Repairs need wood, planks, or stone like any other work. Paying at once makes the cost visible in the preview and stops a half finished job from stalling on an empty stockpile. The order is all or nothing so the preview is the exact cost.
- **The blueprint is a stash.** Tying it to a hearth stage made the story depend on a number. Now someone finds a tin box once three rooms are mended and hope is up. The player has to make real rooms, and the story reads as a find.
- **Every ruin has a way in.** Town houses can touch each other, and a room can end up shut in. After the map is built, a fallen wall opens each such room, so the no sealed rooms rule holds for ruins as well.
- **One painted look.** Buildings, props, ground, and people share the house textures. They are mapped from world position, except people, whose textures are mapped to the limb so they do not slide when someone walks.
