# Changelog

Newest entries first. Each entry names the milestone it belongs to.

## 2026-10-09 (M10.1c: The House You Can See)

- **The house in the scene.** Closed rooms have a snow covered roof. Holding Tab, holding a house tool, or selecting a piece of the house fades the roofs so the people inside can be seen. Doors slide open when someone is close. Gun ports show a slit and a barrel. Damaged walls darken and show a health bar. A drifter is drawn walking in from the dark.
- **Ghosts.** Placing a building shows the real model in translucent color on a footprint plate that pulses. Green means it can go and red means it cannot, with the reason next to the cursor. A Rotate button joins the R key.
- **Hover and click.** Colonists, buildings, wall pieces, floors, and the house glow with a soft frame under the cursor, which also becomes a pointer. A click sends a ring outward. The selected thing keeps a steady frame. Buttons glow on hover and press down on click.
- **Selection panels** for colonists, wall pieces, and floors. A wall piece shows its strength, who guards it, an upgrade, Make a gun port, and Remove. A floor shows its room. Furniture has Remove. Other buildings have Take apart.
- **Room overlay.** Press H or hold a house tool to see each room named from its furniture, with warnings for rooms that are not closed or need furniture.
- The colonist list is now clickable and finds the colonist.
- The airship tab shows the blueprint, the Moot, the site, the ground to clear, seats, and Berth Decks.
- Added `tests/interaction.test.ts` and a room name test. Added screenshots `m10-1-*.jpg`.

## 2026-10-09 (M10.1b: Living in the House)

- **Furniture replaces the fixed rooms.** The six M8 rooms are gone. The house now has a Bed, Sickbed, Shelf, Table, Sofa, Stove, Workbench, Drafting Table, Lamp, Rug, and Potted Plant, plus defenses (section 5.7).
- **The evening.** At dusk colonists walk into the house, sit at tables and sofas, and eat or talk. At night they sleep. Time spent sitting lifts hope at dawn, up to 3 points, and decor in a closed room lifts that limit. With a table in the house colonists eat there unless they get very hungry.
- **Beds.** A bed in a closed room rests and heals 1.5 times faster. A colonist with no bed sleeps on a mat by the hearth at half speed and costs 0.5 hope, up to 1.5. Nobody is turned away.
- **Safe rooms.** People in a closed room are safe from monsters. When a wall breaks, anyone on that floor is exposed.
- **Defense on the house.** Gun ports are a wall kind. One defender stands inside and fires through each. A Roof Turret goes in a closed room. A Spotlight lights a wide circle at night. Walls can be upgraded or changed to another kind while the old piece stands. Breakers smash house walls, and monsters go for the weakest piece, which is the door. Broken walls cost hope.
- **The blueprint and the Moot.** The airship is unknown at the start. At stage 3 and hope 50 the crew finds the old owner's plans in the attic. The player then chooses the Launch Pad site. The chosen ground and a ring around it are kept free.
- **The Launch Pad** replaces the Airship Dock. It is 6 by 6 and must be within 18 tiles of the house. Colonists can take buildings apart to clear the ring and bring back 75 percent of the cost. Any building can now be taken apart.
- **The Drafting Table** in the house lets four workers build components without the pad. The pad is needed for the launch. Crews at a pad in the cold work at half speed.
- **Seats.** The Frame gives 8 seats and each Berth Deck adds 4, up to 20. At launch anyone without a seat is left behind.
- **Crew size.** The colony starts with 7 colonists and 80 wood. Drifters walk in on the dusk of days 3, 6, and 9 if hope is 50 or more and a bed is free. The crew is capped at 20. The Farmhouse, Hardware Store, and Rail Depot can now hold survivors.
- Saves are version 5.
- Added `tests/living.test.ts`, `tests/housedefense.test.ts`, and new cases in `tests/airship.test.ts`. The scripted player now builds beds on house floors, a Drafting Table, and chooses a pad site outside the wall ring.

## 2026-10-09 (M10.1a: The House Layer)

- **Reverted the M10 scaffold.** The M10 commit added prefab rooms and wall modules that no system used. Builders never built them, nothing drew them, guns never fired, and it broke the full run on seeds 2, 3, and 5. The code was reverted and the full run passes again.
- **House layer** (`src/sim/house.ts`, `src/data/house.ts`). Floors, wall edges, doors, and windows on a house lot that grows from 3 to 7 tiles with the Hearth House stage. Rooms are found by flood fill. A wall that would seal a room with no door is refused, and so is removing the only door into a room.
- **Furniture** goes on floors. The Bed and the Shelf use the existing bed and storage rules.
- **Everyone builds.** Floors, walls, and furniture are construction sites. Idle colonists build the nearest one, up to 2 on a floor tile or wall, standing on the open side of a wall.
- **Walking through doors.** Near the house colonists follow an A star route over tiles (`src/sim/route.ts`). Walls and windows stop them. Doors let them through. Routes are cached on each colonist and rebuilt when the layout changes. Until the first floor or wall is built, the old house does not block walking, so a colony that never builds on it plays as before.
- **Build menu.** New Structure tab with floors, walls, doors, windows, and Remove. New Furniture tab. Drag to paint floors. Click a tile border for a wall. The cursor tip shows why a spot is refused.
- **Render.** Instanced floors and walls that rise as builders work (`src/render/houseView.ts`). This is the minimal view for M10.1a. M10.1c replaces it with roofs, cutaway, and real ghosts.
- Saves are version 4. Version 3 saves are rejected.
- Added `tests/house.test.ts` with 14 tests: placement rules, sealing, removal and refunds, rooms, routes, builders, a colonist sleeping behind a door, and a save round trip. Added a full run test where the scripted player also builds a room with a door and two beds.
- The colonist list now names floor and wall sites (it showed an empty name).

## 2026-10-04 (M8: The Living Compound)

- **Construction.** Placed buildings are construction sites. Their own workers build them first, and colonists without a job help at the nearest site. The building rises inside scaffolding on screen. Every building has a build time in `src/data/buildings.ts`.
- **Work at the work.** Woodcutters stand at the tree they chop, quarry workers at the ruin, salvagers at the rubble, and foragers roam the brush. Cooks, sawyers, smiths, and mechanics work inside their building. Each trade has its own animation and tool: axe, pick, crowbar, basket, ladle, saw, hammer, and poker. Builders hammer.
- **Supply Cart.** The colony starts with a hand cart of supplies by the house that holds the first 300 storage.
- **House rooms.** The 7 by 7 lot around the house is kept for rooms: Bedroom, Storeroom, House Kitchen, Infirmary, Armory, and Rooftop Gun Nest. Rooms are tough and safe, and bedrooms and the infirmary speed up rest and healing.
- **Light.** Light steps now sit at 70, 80, 90, and 100 percent of each light's radius. The ground shows a light map that is full in the core and fades to dark at the radius. Every finished building has a small free glow. Added the Lamp Post with radius 6.
- **Monsters.** Each monster is rolled at spawn as a breaker or a hunter. Hunters cannot hurt buildings and chase people in the open. From day 3 a small raid prowls in by day.
- **Shelter and alarm.** People inside a standing building are safe. Buildings have a Take shelter button for their workers. The Alarm button sends everyone under a roof and every defender to their gun.
- **Weapons.** Every colonist starts with a pipe club and fights back. The Armory crafts spears, crossbows, and hunting rifles onto a rack, and colonists pick up the best one.
- **Watchtower guns.** A watchtower has two makeshift guns, one per defender, and upgrades to heavy guns. It now costs 30 wood, so it can be built early. The old plank cost was why it could not be placed at the start.
- **Buildings redesigned** in a patched up post apocalyptic style, each with its own silhouette. The house goes from a roofless ruin to a fortified lodge.
- **Build menu icons** for every building, with the reason a building cannot be built yet.
- **Title screen** with Continue, New game on a chosen or random map, Load game, Import save file, Settings, and Story. The pause menu saves to three slots, loads, exports a save file, and returns to the title. Saves are version 3 and leave out data that is rebuilt on load.
- **Rebalance.** Woodcutters cut 8 wood per cycle and trees hold 48. Salvage yards get 7 scrap and rubble holds 20. Sawmills and smelters work a little faster. The scripted full run launches by day 9 on seeds 2, 3, 5, and 6.
- Added `docs/screenshots/m8-title.jpg`, `m8-compound.jpg`, `m8-workers.jpg`, `m8-house-stages.jpg`, `m8-buildings-1.jpg`, and `m8-buildings-2.jpg`.
- New tests in `tests/compound.test.ts` cover construction, work spots, the cart, the house lot, bedrooms, breakers, the alarm, raids, the armory, fighting back, and tower guns.

## 2026-10-03 (M7.1: Scale, People, and Light)

- The map grows from 80 by 80 to 128 by 128 tiles. The town spreads out to 40 tiles with more ruined houses, more side streets, and four frozen ponds. The forest still starts to thicken about 17 tiles out, so wood stays close.
- Points of interest are farther away. The Farmhouse is 24 tiles out and the Old Airfield is 54. Squads walk 1.6 tiles per second instead of 1.2. The start reveal grows to 18 tiles. Squads reveal 6 tiles around them and find places within 8 tiles. Lookout sight is now 44, 56, and 66 tiles.
- Monsters spawn on a square 42 tiles out from the hearth instead of at the map edge, so nights keep their timing on the bigger map.
- Twenty colonist designs replace the wizard look: ten for women and ten for men (`src/data/looks.ts`, `src/render/meshes/people.ts`). They differ in height, build, skin, hair style and color, beards, knit hats, parkas, jackets, sweaters with scarves, vests, long coats, trousers, cargo pants, tall boots, skirts, and overalls.
- Warmth fades past a heat source over 60 percent of its radius instead of 3 tiles. The ground shader draws the light as a long soft falloff with no hard edge.
- Light protects people in steps: Bright, Lit, Dim, and Fringe (section 5.3). Monsters do not attack people in the bright core. In the fringe they attack at reduced strength. Monsters also slow down the deeper they go into the light. This replaces the old Shambler and Runner rule.
- Fog of war is no longer flat black. Near the known land it shows the ground as a darker grey drifting haze, with faint grey shapes of trees and ruins. Farther in it fades to pitch black.
- Tests cover the light steps, the gradual warmth falloff, and the colonist looks.
- Added `docs/screenshots/m7-1-start.jpg`, `m7-1-fog.jpg`, `m7-1-compound.jpg`, and `m7-1-people.jpg`.

## 2026-10-03 (M7: The Hearth House and the Compound)

- The hearth is now the Hearth House. It starts as a ruined house with a fire inside. Clicking it shows the next repair. Five stages raise its warm radius, fuel use, and health (section 5.2).
- Added the Reinforced Wall. Walls, barricades, and gates join their neighbors, so a run of wall pieces reads as one palisade or stone wall.
- Added the Lookout Post. It has three stages that raise how far it sees. It spots places as unconfirmed sightings.
- Added fog of war (`src/sim/systems/discovery.ts`). Only the land around the house and the three closest places are known at the start. Squads reveal land as they walk and confirm places they reach or pass near. A rumored place can be targeted, but its name and danger stay unknown until a squad confirms it.
- Saves are now version 2. Version 1 saves are rejected.
- New low poly mesh kit (`src/render/meshes/kit.ts`) with rounded blocks, timber frames, gabled roofs, chimneys, and lit windows. Every building was rebuilt with it.
- Colonists now look like small chunky wizards: a hooded pointed hat, a dark face with white eyes, a flared tunic, a belt with a brass buckle, gloves, and boots. Monsters got claws, horns, rags, and shoulder plates.
- Trees, rubble, and ruins have more polygons and flat shading.
- The moon casts real shadows. Buildings, props, and characters cast them onto the ground.
- Tuned the firelight, bloom, and ground glow so the house does not blow out.
- Colonists idle in a ring outside the house walls.
- The scripted full run now repairs the house twice, builds and raises a lookout, and runs two sawmills. It is checked on seeds 1, 4, and 5.
- Added `docs/screenshots/m7-start.jpg`, `m7-fog.jpg`, `m7-compound.jpg`, `m7-close.jpg`, and `m7-characters.jpg`.

## 2026-10-03 (Polish after M6: characters and intro story)

- Colonists and monsters are now rigged figures instead of a capsule and a box (`src/render/meshes/figures.ts`). Legs and arms swing while they walk.
- Colonists have a head, a knit cap, a scarf, a coat in one of four colors, arms, legs, and a pack.
- The Shambler is hunched with arms reaching forward. The Runner leans into a sprint. The Brute has a wide torso, huge arms, and shoulder spikes. The Horde Mother is a bloated body on four legs with spines and glowing sacs. All monsters keep glowing Blight eyes, and their wounds glow softly.
- Added an intro story (`src/data/story.ts`). It opens before every new run with the game paused, and the menu has a Story button to read it again. A loaded save skips it.
- Added `docs/screenshots/characters.jpg` and `docs/screenshots/intro.jpg`.

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
