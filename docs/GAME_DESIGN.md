# HEARTHFALL: Game Design Document

Working title. Version 0.1. This document is the single source of truth for design decisions. When code and this document disagree, raise it before changing either.

---

## 1. Overview

**Pitch.** A small group of survivors is stranded in a ruined town during a monster outbreak as winter closes in. They shelter in a run down house with a working fireplace. They must keep the fire burning, repair the house little by little, grow it into a walled compound, defend it against hordes that grow every night, and assemble an airship to escape before the cold and the monsters overwhelm them.

**Genre.** Colony survival, base building, and tower defense.

**References.** Frostpunk for heat, hope, and expeditions. Factorio for short production chains and throughput thinking. RimWorld for named colonists with needs. Plants vs Zombies for readable defenses with distinct roles.

**Platform.** Desktop browser first. Later wrapped for Steam with Tauri or Electron.

**Run length.** Prototype run lasts about 45 minutes. Full game run lasts 4 to 6 hours.

**Emotional goal.** Inside the walls feels warm, golden, and safe. Outside feels blue, silent, and dangerous. Every decision to leave the light should feel like a real cost.

---

## 2. Design Pillars

1. **Pressure is the heartbeat.** Nightly waves and falling temperature are the clock. Every system exists to answer that pressure.
2. **Light is safety, and safety costs fuel.** Warmth and light define where the colony can live and work. Expanding the safe zone costs fuel every second.
3. **Short chains, real choices.** Production chains have at most three steps. Depth comes from competing demands on the same workers and resources, not from complex recipes.
4. **People are the cost.** Every worker sent on an expedition, posted on a wall, or assigned to a building is a worker missing somewhere else. Death is permanent.
5. **Fair escalation.** Players always see what is coming. Waves are forecast, temperature drops are announced, and failure should feel earned.

---

## 3. Core Loop

### 3.1 Moment to moment
Place buildings, assign workers, watch resources flow, react to shortages.

### 3.2 Daily cycle
| Phase | Duration at 1x | What happens |
|---|---|---|
| Day | 300 seconds | Colonists work. Expeditions travel. Building and production run at full speed. |
| Dusk | 60 seconds | Wave forecast becomes exact. Colonists not on night duty return to shelter. |
| Night | 180 seconds | Wave attacks. Only defenders and night shift buildings work. |
| Dawn | 30 seconds | Survivors return to work. Damage report and daily summary appear. |

Time controls are pause, 1x, 2x, and 3x. The game auto pauses on dusk start in the prototype, with a setting to disable it.

### 3.3 Run arc
1. **Early game, days 1 to 10.** Secure the hearth, food, fuel, and first walls.
2. **Mid game, days 11 to 25.** Build production chains, run expeditions, unlock the Airship Dock.
3. **Late game, days 26 onward.** Build airship components under heavy pressure.
4. **Finale.** The Last Night: fuel the airship while the final horde attacks, then launch.

### 3.4 Win and loss
- **Win.** The airship launches. Score equals surviving colonists multiplied by a difficulty factor, plus bonus for days remaining.
- **Loss.** The hearth goes out for 60 continuous seconds, the hearth is destroyed, or all colonists die.

---

## 4. World and Map

- **Grid.** Square tiles of 1 world unit. Prototype map is 80 by 80 tiles. Full game target is 128 by 128.
- **Generation.** Seed based and deterministic. The same seed always produces the same map.
- **Layout.** The hearth sits in a central clearing. Around it are ruined houses, streets, trees, rubble, and a few points of interest at increasing distance and danger.
- **Tile types.** Ground, road, tree, rubble, ruin wall, water, and blocked.
- **Resource nodes.** Trees yield wood. Rubble yields scrap. Some ruins yield stone. Nodes deplete.
- **Fog of war.** The map outside the starting radius is hidden. At the start only the 2 to 3 closest points of interest are known. Expedition squads reveal the land around them as they travel. Watchtowers reveal a small radius around themselves. A Lookout Post spots far points of interest as unconfirmed rumors (section 10.4). An expedition must reach a rumor to confirm what it is.
- **Edges.** Monsters spawn from marked spawn zones on map edges. The forecast shows which edges are active.

---

## 5. Warmth and Light

This is the system that connects survival, defense, and the visual identity.

### 5.1 Warmth map
- The simulation keeps a warmth value from 0 to 100 for every tile.
- The hearth emits warmth in a radius. Heaters add smaller local radii.
- Outdoor temperature lowers the baseline warmth everywhere over time.

### 5.2 Hearth House
The hearth is a fireplace inside a run down house in the town square. The colony repairs the house one stage at a time. Each stage makes the house look more whole, warms a wider radius, burns more fuel, and makes the house tougher. Monsters that reach the house attack it, and the run is lost if it falls.

| Stage | Name | Radius in tiles | Fuel per minute | HP | Repair cost |
|---|---|---|---|---|---|
| 1 | Ruined House | 8 | 3 | 4000 | Start |
| 2 | Patched Roof | 10 | 4 | 4500 | 20 wood, 10 planks |
| 3 | Rebuilt Walls | 12 | 5 | 5000 | 40 planks, 10 stone |
| 4 | Glazed and Stoved | 14 | 6 | 5500 | 40 planks, 20 metal |
| 5 | Restored Lodge | 16 | 8 | 6000 | 80 planks, 60 metal, 10 parts |

The player can set the hearth to Low, Normal, or Overdrive. Low halves fuel use and shrinks the radius by 30 percent. Overdrive doubles fuel use and grows the radius by 30 percent.

### 5.3 Effects of warmth
- Buildings on warm tiles work at full speed. Cold tiles reduce speed to 50 percent. Freezing tiles stop work.
- Colonists on cold tiles lose body warmth. At zero body warmth they take health damage.
- Light from the hearth, heaters, and lantern posts reduces damage dealt by Shamblers by 30 percent and slows Runners by 20 percent.

### 5.4 Temperature schedule
Outdoor temperature starts at minus 2 degrees on day 1 and drops by 1 degree per day. Cold snaps are announced one day ahead and drop the temperature by 10 extra degrees for one day.

---

## 6. Colonists

### 6.1 Control model
Indirect control. The player assigns worker counts to buildings and squads to expeditions. Colonists path and act on their own. The player never micromanages individual movement in the prototype.

### 6.2 Colonist data
Each colonist has a name, health, hunger, rest, and body warmth. Each has one trait from a small list in the full game, such as Strong, Quick, Stubborn, or Nervous. The prototype ships without traits.

### 6.3 Needs
| Need | Drain | Restored by | Failure effect |
|---|---|---|---|
| Hunger | Full to empty in 2 days | Meals from Kitchen | Health loss |
| Rest | Full to empty in 1.5 days | Sleeping in a bed on a warm tile | Work speed drops to 60 percent |
| Body warmth | Depends on tile warmth | Warm tiles | Health loss, then death |

### 6.4 Population
- Start with 8 colonists.
- New survivors join from expeditions and occasional random events.
- Death is permanent and is logged with the cause.

### 6.5 Hope
A colony wide value from 0 to 100, starting at 60.
- Rises with full meals, successful nights with no deaths, and airship progress.
- Falls with deaths, hunger, cold, and destroyed buildings.
- Below 30, work speed drops by 20 percent.
- At 0, one colonist deserts each dawn.

---

## 7. Resources and Production

### 7.1 Resources
| Tier | Resource | Source |
|---|---|---|
| Raw | Wood | Woodcutter Camp on trees |
| Raw | Scrap | Salvage Yard on rubble |
| Raw | Stone | Quarry on stone ruins |
| Raw | Raw Food | Forager Hut, Greenhouse, expeditions |
| Processed | Planks | Sawmill from wood |
| Processed | Fuel | Charcoal Kiln from wood |
| Processed | Metal | Smelter from scrap and fuel |
| Processed | Meals | Kitchen from raw food and fuel |
| Advanced | Parts | Workshop from planks and metal |
| Rare | Vehicle items | Expeditions only |

### 7.2 Logistics
- **Prototype.** Global stockpile limited by total storage capacity. Hauling is abstracted.
- **Later milestone.** Colonists physically haul between buildings and storage. Hand carts and simple conveyor lines become a mid game tech. This is where the Factorio flavor grows.

### 7.3 Production rules
- Each production building has a recipe, a cycle time, a worker slot count, and an input buffer.
- Output scales with assigned workers up to the slot count.
- A building stops and shows a clear icon when it lacks inputs, workers, warmth, or storage space.

---

## 8. Buildings

Costs and numbers are starting values and live in data files.

| Building | Cost | Workers | Function | Prototype |
|---|---|---|---|---|
| Hearth House | Start | 1 stoker | Warmth and light core, repaired in stages (section 5.2) | Yes |
| Tent | 10 wood | 0 | Beds for 4 | Yes |
| Bunkhouse | 30 planks, 10 stone | 0 | Beds for 10, small warmth bonus | Yes |
| Storage Shed | 20 wood | 0 | Plus 200 capacity | Yes |
| Woodcutter Camp | 15 wood | 3 | Wood from nearby trees | Yes |
| Salvage Yard | 20 wood | 3 | Scrap from nearby rubble | Yes |
| Quarry | 30 wood | 3 | Stone from nearby ruins | Yes |
| Forager Hut | 15 wood | 2 | Raw food | Yes |
| Greenhouse | 40 planks, 20 metal | 2 | Raw food, needs warm tile | No |
| Kitchen | 25 wood | 2 | Meals | Yes |
| Sawmill | 30 wood, 10 scrap | 2 | Planks | Yes |
| Charcoal Kiln | 20 wood, 10 stone | 1 | Fuel | Yes |
| Smelter | 30 planks, 20 stone | 2 | Metal | Yes |
| Workshop | 40 planks, 30 metal | 2 | Parts | Yes |
| Heater | 10 metal, 5 parts | 0 | Warmth radius 4, uses fuel | Yes |
| Airship Dock | 100 planks, 80 metal, 20 parts | 4 | Builds airship components | Yes |
| Lookout Post | 20 wood, 10 planks | 0 | Spots far points of interest as rumors. Upgrades to stage 2 (30 planks, 10 stone) and stage 3 (40 planks, 15 metal) to see further | Yes |

### 8.1 The compound
The colony grows from the house outward. Tents and workshops cluster around it. Walls join into a palisade or stone curtain around the core. Gates let squads out. Watchtowers and lantern posts stand on the walls as defense points. The goal is a compound that looks built by hand over many days.

---

## 9. Defense

### 9.1 Structures
| Structure | Cost | HP | Role | Prototype |
|---|---|---|---|---|
| Wooden Barricade | 5 wood | 100 | Blocks and redirects | Yes |
| Reinforced Wall | 5 metal, 5 stone | 350 | Strong block | Yes |
| Gate | 15 planks | 200 | Lets colonists and expeditions pass | Yes |
| Lantern Post | 5 wood, 1 fuel per night | 50 | Light radius 4, weakens monsters | Yes |
| Spike Trap | 10 wood | 80 | Damages enemies that walk over it | Yes |
| Watchtower | 25 planks | 150 | Needs 1 defender, ranged attack, reveals fog in radius 8 | Yes |
| Fire Barrel | 10 metal, 3 fuel | 60 | Area burn when triggered | No |
| Bolt Thrower | 20 metal, 10 parts | 250 | Needs 1 defender, heavy damage, slow | No |

### 9.2 Defender duty
Colonists can be assigned to night duty at watchtowers and bolt throwers. Defenders skip sleep and lose rest, which creates a real tradeoff for the next day.

### 9.3 Enemy pathing
- Enemies follow a flow field toward the hearth computed on the grid.
- Walls have a high path cost instead of being impassable. When the cheapest path goes through a wall, enemies attack that wall.
- The flow field is recomputed only when structures change.

### 9.4 Enemies
| Enemy | Threat cost | HP | Speed | Behavior | Prototype |
|---|---|---|---|---|---|
| Shambler | 1 | 40 | Slow | Walks the flow field, attacks what blocks it | Yes |
| Runner | 2 | 25 | Fast | Prefers gaps and gates | Yes |
| Brute | 6 | 300 | Slow | High wall damage | Yes |
| Spitter | 4 | 60 | Medium | Ranged attack on towers | No |
| Burrower | 5 | 120 | Medium | Ignores the first wall it reaches | No |
| Horde Mother | 40 | 2000 | Slow | Final night boss, spawns Shamblers | No |

### 9.5 Wave formula
- Threat points for night `n` equal `10 * 1.32^(n - 1)`, rounded.
- Every fifth night is a Blood Moon with double threat points.
- Points are spent on enemy types unlocked by that night: Runners from night 3, Brutes from night 6.
- The forecast panel shows threat level, active spawn edges, and enemy types for the next night at dawn, and exact counts at dusk.

---

## 10. Expeditions

### 10.1 Points of interest
Generated per map. Each has a name, distance, danger level from 1 to 5, and a loot table.

| POI | Danger | Typical loot |
|---|---|---|
| Farmhouse | 1 | Raw food, wood |
| Gas Station | 2 | Fuel, scrap |
| Hardware Store | 2 | Metal, parts |
| Clinic | 3 | Raw food, parts, survivors |
| Rail Depot | 4 | Engine parts, metal |
| Old Airfield | 5 | Airship rare items |

### 10.2 Flow
1. Build a Gate. Select 1 to 4 colonists and a target POI.
2. The squad walks out on the map and is visible the whole trip.
3. On arrival the squad searches for a set time. Each search tick rolls for loot and danger.
4. Danger events can injure or kill colonists. Larger squads reduce risk.
5. The squad returns with loot. If caught outside at night, risk rises sharply.
6. Results appear as short log entries, such as "Mara found a cracked valve. Tom was bitten."

### 10.3 Rules
- A cleared POI yields reduced loot on later visits.
- An expedition can be recalled at any time and starts walking home immediately.

### 10.4 Discovery
- Each point of interest is hidden, rumored, or known.
- The 3 closest are known at the start. The farther ones are more dangerous and more rewarding.
- A Lookout Post marks every point of interest within its sight radius as a rumor. The map shows a question mark there. Sight is 30 tiles at stage 1, 36 at stage 2, and 44 at stage 3, measured from the post.
- An expedition can be sent to a rumor. When the squad arrives the place becomes known and the search begins.
- A squad also discovers any point of interest that comes within 6 tiles of its path.

---

## 11. Escape Vehicle: The Airship

The airship is the spine of the run. Its progress is always visible on screen.

| Component | Materials | Rare item | Effect when built |
|---|---|---|---|
| Frame | 120 planks, 40 metal | None | Unlocks other components |
| Envelope | 80 planks, 20 parts | Silk Canopy from Clinic or Farmhouse | Hope plus 10 |
| Engine | 100 metal, 40 parts | Engine Block from Rail Depot | Hope plus 10 |
| Fuel Tank | 60 metal, 20 parts | Pressure Valve from Gas Station | None |
| Navigation | 20 parts | Compass Rig from Old Airfield | Unlocks The Last Night |

### 11.1 The Last Night
- When all components are built, the player can start the launch.
- Launch requires loading 200 fuel into the airship over 180 seconds.
- The final horde attacks during loading with three times the normal threat points and the Horde Mother.
- Colonists board in the final 30 seconds. Anyone not aboard at launch is left behind.

Later versions may offer a rocket or makeshift plane as alternate vehicles with different component sets. The prototype uses the airship only.

---

## 12. Art Direction

### 12.1 Camera
Orthographic camera at a classic isometric angle. Zoom with scroll. Rotate in 90 degree steps with Q and E. Pan with WASD, arrow keys, or middle mouse drag.

### 12.2 Warm inside, cold outside
- The ground shader samples the warmth map and blends between two palettes.
- Warm tiles show golden ground, soft light pools, and dry earth.
- Cold tiles show desaturated blue ground with a frost and snow overlay that grows over days.
- Snow particles fall only outside the warm radius.
- Fog is cold blue and thickens with distance from the hearth.

### 12.3 Palette
| Name | Hex | Use |
|---|---|---|
| Ember | #FF9A3C | Hearth core, fire |
| Lantern | #FFC56B | Windows, lanterns, warm highlights |
| Old Wood | #6B4A32 | Structures |
| Warm Shadow | #2A1A14 | Shadows inside the base |
| Frost | #A9C4D8 | Snow, frost, cold highlights |
| Night Blue | #1B2838 | Outside ambience |
| Deep Cold | #0E1621 | Far fog, map edges |
| Blight | #8BFF6A | Monster eyes and wounds |

### 12.4 Rendering techniques
- ACES tone mapping and bloom on emissive surfaces.
- Real point lights are limited to 8, chosen by importance and distance to camera. All other light sources use emissive materials plus additive ground decals that fake light pools.
- InstancedMesh for trees, rubble, walls, snow props, and enemies.
- Procedural geometry first. Real models can replace it later without changing the simulation.
- Target look: chunky stylized low poly, like a hand built diorama. Buildings have stone footings, timber framed plaster walls, overhanging gabled roofs with a ridge beam, chimneys, framed doors, and warm lit windows. Trees are tiered and slightly irregular. Rocks are rounded.
- Characters are small chunky figures with readable silhouettes: boots, legs, a belted tunic, sleeves with gloves, a head, a hood or hat, and two bright eyes. Monsters share the same build with torn clothes, horns, spines, and Blight eyes.
- The moon casts soft shadows from buildings, trees, and characters.
- Soft vignette and a light film grain.

### 12.5 Readability
- Every building shows a status icon when blocked.
- Enemies have glowing eyes visible in darkness.
- Health bars appear only on damaged entities.

---

## 13. Audio Direction

- Inside the base: crackling fire, soft wood creaks, muffled chatter, a warm acoustic theme.
- Outside: wind, silence, distant moans, and a sparse cold theme.
- Audio mix blends based on camera distance from the hearth.
- Distinct warning stingers for dusk, wave arrival, and wall breaches.
- The prototype may ship with placeholder audio or none.

---

## 14. UI and UX

- **Top bar.** Resources, colonist count, hope, temperature, day and time.
- **Forecast bar.** Next wave threat, spawn edges, and countdown.
- **Build menu.** Bottom of screen, grouped into Shelter, Production, Defense, and Escape.
- **Selection panel.** Shows details for the selected building, with worker plus and minus buttons.
- **Colonist panel.** List of colonists with needs and current job.
- **Expedition panel.** POI list, squad selection, and active expeditions.
- **Airship panel.** Component progress and requirements.
- **Event log.** Short messages in the corner, with click to focus the camera.

### 14.1 Controls
| Input | Action |
|---|---|
| Left click | Select or place |
| Right click or Escape | Cancel placement |
| R | Rotate building during placement |
| Q and E | Rotate camera |
| Space | Pause |
| 1, 2, 3 | Game speed |
| B | Open build menu |
| F1 | Debug panel in development builds |

---

## 15. Technical Architecture

### 15.1 Stack
- Vite, TypeScript in strict mode, and Three.js.
- UI uses plain DOM and CSS overlaid on the canvas. No UI framework.
- Vitest for simulation tests.

### 15.2 Core rule: simulation is separate from rendering
- `src/sim` contains all game logic. It never imports Three.js or touches the DOM.
- The simulation runs at a fixed 10 ticks per second and is deterministic for a given seed and input sequence.
- `src/render` reads simulation state and draws it. It never changes game state.
- `src/ui` reads state and sends player commands to the simulation through a command queue.
- This allows tests without a browser, save and load from plain data, and a later engine port without rewriting logic.

### 15.3 Data driven content
All buildings, enemies, resources, recipes, POIs, airship components, and balance numbers live in `src/data`. Adding or tuning content should not require changing system code.

### 15.4 Folder structure
```
src/
  main.ts
  sim/
    world.ts          state container and tick
    rng.ts            seeded random
    grid.ts
    commands.ts       player command queue
    mapgen.ts
    systems/
      time.ts
      warmth.ts
      needs.ts
      jobs.ts
      production.ts
      construction.ts
      pathfinding.ts  flow field
      waves.ts
      combat.ts
      expeditions.ts
      hope.ts
      vehicle.ts
  data/
    buildings.ts
    enemies.ts
    resources.ts
    recipes.ts
    pois.ts
    vehicle.ts
    balance.ts
  render/
    scene.ts
    camera.ts
    lighting.ts
    post.ts
    materials.ts
    groundShader.ts
    meshes/
    sync.ts           maps sim entities to scene objects
  ui/
  input/
  save/
tests/
docs/
  GAME_DESIGN.md
  CHANGELOG.md
  KNOWN_ISSUES.md
  DECISIONS.md
```

### 15.5 Save and load
Save the full simulation state as versioned JSON. Rendering state is rebuilt from simulation state on load.

### 15.6 Performance targets
- 60 FPS on a mid range laptop with 40 colonists, 300 structures, and 200 enemies.
- Simulation tick under 4 ms at that scale.

### 15.7 Debug tools
Debug panel showing seed, tick time, FPS, and buttons to spawn a wave, add resources, set speed to 10x, and toggle the warmth map overlay.

---

## 16. Milestones

Each milestone must meet its acceptance criteria before the next starts.

### M0: Scaffold
- Vite, TypeScript, Three.js, and Vitest set up.
- Folder structure created. Fixed tick loop running. Seeded RNG with tests.
- **Done when:** `npm run dev` shows an empty lit scene, and `npm test` passes.

### M1: Visual Direction
- Procedural map with ground, trees, rubble, and ruins.
- Hearth with warmth radius driving the ground shader blend.
- Bloom, fog, snow outside the warm radius, and the isometric camera.
- **Done when:** a still screenshot clearly reads as a warm safe circle in a cold dark world.

### M2: Core Economy
- Placement system with grid snapping and validity preview.
- Tent, Bunkhouse, Storage Shed, Woodcutter Camp, Salvage Yard, Quarry, Forager Hut, Kitchen, Sawmill, Charcoal Kiln.
- Colonists with needs, worker assignment, global stockpile, and the day cycle.
- Hearth fuel consumption and the hearth out loss condition.
- **Done when:** a player can survive 5 days with no monsters by managing food and fuel, and can lose by neglecting them.

### M3: Defense and Waves
- Barricade, Gate, Lantern Post, Spike Trap, and Watchtower.
- Flow field pathing, Shambler, Runner, and Brute.
- Wave formula, Blood Moon, forecast bar, and defender duty.
- **Done when:** nights feel tense, a good layout holds through night 8, and a bad layout falls.

### M4: Expeditions
- POIs, gate exits, visible squads, search ticks, loot, injuries, and death.
- Event log entries.
- **Done when:** sending a squad feels like a real decision with visible risk and reward.

### M5: Airship and Win State
- Smelter, Workshop, Heater, Airship Dock, all five components, and The Last Night.
- Score screen with survivors and cause of death list.
- **Done when:** a full run from start to launch is possible in about 45 minutes.

### M6: Prototype Polish
- Save and load, settings, tutorial hints for the first two days, and balance pass.
- Placeholder audio for fire, wind, and wave warnings.
- **Done when:** a new player can finish a run without outside help.

### M7: The Hearth House and the Compound
- The hearth becomes the Hearth House with five repair stages (section 5.2).
- Reinforced Wall and Lookout Post. Walls join visually into a palisade or stone curtain.
- Fog of war and point of interest discovery (sections 4 and 10.4).
- Visual polish to the target look in section 12.4: buildings, the house, trees, rocks, ruins, characters, monsters, and moon shadows.
- **Done when:** a screenshot reads as a cozy hand built compound around a repaired house in a cold dark world, and far places must be found before they can be searched.

### Later milestones
- Physical hauling, hand carts, and conveyor lines.
- Traits, more enemies, Greenhouse, Fire Barrel, and Bolt Thrower.
- Alternate escape vehicles and map biomes.
- Real art and audio replacement.
- Steam build with Tauri or Electron.

---

## 17. Out of Scope for the Prototype

- Multiplayer.
- Direct control of individual colonists.
- Colonist relationships and mood simulation.
- Research tree. Unlocks are tied to buildings built and days survived.
- Modding support.
- Controller support.

---

## 18. Starting Balance Values

All of these live in `src/data/balance.ts` and are expected to change.

| Value | Start |
|---|---|
| Colonists | 8 |
| Wood | 60 |
| Scrap | 10 |
| Raw Food | 30 |
| Meals | 16 |
| Fuel | 40 |
| Storage capacity | 300 |
| Hope | 60 |
| Day 1 temperature | Minus 2 degrees |
| First wave | Night 2 |
