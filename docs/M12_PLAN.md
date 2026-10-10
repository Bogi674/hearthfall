# M12 Plan: The Ruin Is the House

Goal: the starting house is a half destroyed building made of the same pieces the player builds with. The player repairs, extends, converts, or tears it down. The hearth is a smoldering object that people light, then move and upgrade. Every ruined house on the map works the same way. Every asset shares the painted look.

Analogies: RimWorld ancient structures, Fallout 4 Sanctuary Hills, Project Zomboid building, the Sims build mode, RimWorld campfire to fireplace.

## Decisions (from the player)

1. The hearth starts smoldering inside the starting ruin. People light it. It can be moved freely and upgraded into a fireplace inside the house.
2. The build limit is gone. Build anywhere on open ground.
3. Every ruined house can be salvaged or claimed. The starting ruin is the one with the hearth already in it.
4. Roofs are tracked per tile in ruins. Broken roofs are patched with planks. New rooms get a roof once closed.
5. The airship blueprint is a story event. When enough rooms are repaired and hope is up, a hidden stash is found. Opening it gives the blueprint.

## Model

- A house piece (floor, wall edge, door, window, furniture) has a `ruin` flag and a condition. Ruin walls start with low hit points. Ruin furniture may start broken. Ruin floors may have a broken roof.
- The hearth is an object with a position, a stage, and an ignited state. It occupies one tile. It does not own a lot, a roof, or walls.
- Rooms are found per cluster of pieces, so a ruin anywhere on the map is analysed the same way.
- Heat spreads from a source through open space and doors, not through walls. A closed room with an intact roof holds heat.
- The stash is a map object with a state: hidden, found, opened.

## Stages

1. **Ruin of real pieces.** Remove the fixed Hearth House, the lot, and the virtual walls. Generate the starting ruin and the town ruins as house pieces. Analysis by cluster. Routes in local boxes. Drawing of ruin pieces with damage.
2. **Using the ruin.** Repair walls, doors, windows, and furniture. Patch roofs. Clear rubble. Tear down ruin pieces for salvage. Broken furniture does not work until repaired.
3. **The hearth.** Light it. Move it. Upgrade it to a stove and then a fireplace that needs a closed room. Heat that walls stop and roofs hold.
4. **The stash.** Replace the hearth level gate for the blueprint with the stash event.
5. **Test player and balance.** Rebuild the scripted player around repairs, rooms, and the hearth. Sweep seeds.
6. **One look for everything.** Painted surfaces on barricades, gates, towers, camps, production buildings, furniture, rocks, rubble, trees, ground, and people.

Each stage ends with tests, both builds, a changelog entry, and a push to main.
