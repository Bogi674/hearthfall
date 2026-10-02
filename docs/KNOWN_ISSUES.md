# Known Issues

Bugs, shortcuts, and loose ends that are known but not fixed yet.

## Open

- The production bundle is about 530 kB and Vite warns about chunk size. Almost all of it is Three.js. Code splitting can wait until load time matters.
- `src/save` holds only a `.gitkeep` file until save and load arrive in M6.
- Performance was only checked in headless Chromium with software WebGL. It has not been measured on a real GPU. Seed 1 has about 1700 trees, 230 rubble tiles, and 220 wall tiles. That is 4 instanced draw calls plus 9000 snow points.
- Day and temperature are fixed at day 1 and minus 2 degrees. The time system only counts ticks until M2 adds the day cycle.
- The `Blocked` tile type exists but map generation does not place it yet.
- The fog patch measures distance from the world origin. This works because the hearth is always at the map center. Sprite materials would fail to compile with the patched chunk because the sprite shader has no `transformed` variable. Nothing uses sprites yet.
- Trees inside the warm circle are lit from the hearth side only. From the default camera angle the side facing the camera can look dark.
- Snow flake positions use `Math.random` in the renderer, so the flake pattern differs per load. This is render only and does not affect the simulation.
- No shadows yet. The ground shader fakes the light pool from the warmth map, so the ground does not receive real shadows.
- Resource nodes have no amounts yet. Depletion arrives with gathering buildings in M2.
- Every push to `main` creates a new GitHub Release named `build-<run number>`. Releases will pile up over time. Old ones can be deleted by hand or by a cleanup job later.
- The release step needs the workflow token to have write access to contents. The workflow asks for it, but an organization or repository setting that forces read only tokens would make the release step fail.
- The offline file is about 570 kB, almost all Three.js. It grows with every inlined asset because everything is base64 encoded into one file.
