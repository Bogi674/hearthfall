# Known Issues

Bugs, shortcuts, and loose ends that are known but not fixed yet.

## Open

- The production bundle is about 530 kB and Vite warns about chunk size. Almost all of it is Three.js. Code splitting can wait until load time matters.
- `src/save` holds only a `.gitkeep` file until save and load arrive in M6.
- Performance was only checked in headless Chromium with software WebGL. It has not been measured on a real GPU. Seed 1 has about 1700 trees, 230 rubble tiles, and 220 wall tiles. That is 4 instanced draw calls plus 9000 snow points.
- The `Blocked` tile type exists but map generation does not place it yet.
- The fog patch measures distance from the world origin. This works because the hearth is always at the map center. Sprite materials would fail to compile with the patched chunk because the sprite shader has no `transformed` variable. Nothing uses sprites yet.
- Trees inside the warm circle are lit from the hearth side only. From the default camera angle the side facing the camera can look dark.
- Snow flake positions use `Math.random` in the renderer, so the flake pattern differs per load. This is render only and does not affect the simulation.
- No shadows yet. The ground shader fakes the light pool from the warmth map, so the ground does not receive real shadows.
- Every push to `main` creates a new GitHub Release named `build-<run number>`. Releases will pile up over time. Old ones can be deleted by hand or by a cleanup job later.
- The release step needs the workflow token to have write access to contents. The workflow asks for it, but an organization or repository setting that forces read only tokens would make the release step fail.
- The offline file is about 570 kB, almost all Three.js. It grows with every inlined asset because everything is base64 encoded into one file.
- Colonists walk in straight lines through trees and walls. There is no colonist pathfinding.
- Buildings cannot be demolished or moved yet. A gatherer with nothing left nearby stays on the map.
- The auto pause at dusk cannot be turned off yet. The setting arrives with the settings screen in M6.
- Cold snaps, hearth modes, and the hearth stoker slot are not built yet.
- The game over screen reloads the page to restart.
- The HUD has been checked at 1440 by 900. Very small windows can squeeze the side panels.
- Fog of war is not built yet, so the watchtower does not reveal anything.
- Monsters move on a 4 neighbor grid, so they walk in steps. They also stack on the same tile with no separation.
- Monsters that survive the night vanish at dawn. There is no retreat animation.
- Tower shots, trap hits, and wall hits have no visual effect yet. Only health bars show damage.
- There is no repair. Damaged walls stay damaged until the player replaces them.
- Gates do nothing special for colonists yet, because colonists walk through walls anyway.
- Performance with 200 monsters has not been measured on a real GPU. A full 8 night simulation runs at about 55 microseconds per tick in tests.
- Dev builds put the world on `window.world` for scripted visual checks. Production and offline builds do not.
- Squads walk in straight lines from the gate to the POI, through trees and ruins.
- Loot that does not fit in storage when a squad returns is lost. The return message only lists what was kept.
- POIs are not hidden by fog of war, because fog of war is not built yet.
- Colonists away on expeditions still eat from the stockpile, since hauling is abstracted.
- **Design conflict.** The threat formula `10 * 1.32^(n - 1)` gives about 10000 threat on night 26, where the run arc in section 3.3 puts the late game. Only a launch around day 8 to 10 is survivable now. The full game arc needs a different curve or a cap.
- The scripted full run launches on seeds 1 and 2 but loses on seed 3 around day 12. Some maps are harder for a simple player.
- The Last Night always starts at the start of a night, even when launched by day.
- The airship model is placeholder boxes and a sphere, and the launch climb is a simple render animation.
- Desertion is recorded in the list of the dead with the cause "deserted the colony".
