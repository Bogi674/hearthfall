# Decisions

Design and architecture decisions that are not already in `docs/GAME_DESIGN.md`. Each one has a reason.

## 2026-10-02 (M0)

- **RNG algorithm is mulberry32 with state in a plain object.** It is small, fast, and has a 32 bit state that fits in a JSON number. Saving the world saves the RNG position too.
- **The fixed step accumulator lives in `src/sim/loop.ts` as a pure function.** This keeps it testable without a browser. It caps catch up at 10 ticks per frame and drops the backlog after a long stall, so a hidden tab does not cause a burst of hundreds of ticks.
- **The command queue starts as an empty union type.** No player action exists before M2. The queue and the drain point in `stepWorld` are in place so UI code has one path to the simulation from the start.
- **The architecture test reads sources through `import.meta.glob`.** This avoids adding `@types/node` as a new dependency.
- **Empty folders from section 15.4 hold a `.gitkeep` file.** Git does not track empty folders.
