# CLAUDE.md

Project instructions for HEARTHFALL, a colony survival, base building, and tower defense game built with Three.js. Read this file fully at the start of every session.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

---

## 0. Start and End of Every Session

**At the start of a session:**
1. Read `docs/GAME_DESIGN.md`. It is the single source of truth for design.
2. Read `docs/CHANGELOG.md` to see what was done last.
3. Read `docs/KNOWN_ISSUES.md` and `docs/DECISIONS.md`.
4. Identify the current milestone from the design document and the changelog. Work only on that milestone unless told otherwise.
5. State a short plan before writing code.

**At the end of a session or after a finished task:**
1. Run `npm test` and `npm run build`. Both must pass.
2. Add a dated entry to `docs/CHANGELOG.md` with what changed and which milestone it belongs to.
3. Add any bugs or shortcuts you are aware of to `docs/KNOWN_ISSUES.md`.
4. Record any design or architecture decision that was not already in the design document in `docs/DECISIONS.md`, with the reason.

If any of these docs files do not exist yet, create them during M0.

---

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them instead of picking silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.
- If a request conflicts with `docs/GAME_DESIGN.md`, point out the conflict before changing anything.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked or what the current milestone requires.
- No abstractions for single use code.
- No "flexibility" or "configurability" that wasn't requested. The one exception is game content and balance numbers, which always live in `src/data`.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.
- No new dependencies without asking first.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it instead of deleting it.
- Prefer targeted edits over rewriting whole files.

When your changes create orphans:
- Remove imports, variables, and functions that YOUR changes made unused.
- Don't remove pre existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"
- "Add a building" → "Add its data entry, write a sim test that it produces output, then render it"

For multi step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Each milestone in `docs/GAME_DESIGN.md` has a "Done when" line. Treat it as the success criterion for that milestone.

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

## 5. Project Commands

```
npm install        install dependencies
npm run dev        start the dev server
npm run build      production build, must pass before finishing a task
npm test           run Vitest simulation tests
```

---

## 6. Architecture Rules

These rules are not optional. Breaking them makes the game hard to test, save, and port.

1. **Simulation and rendering are separate.** Code in `src/sim` never imports `three` and never touches the DOM.
2. **Rendering never changes game state.** `src/render` only reads simulation state.
3. **UI talks to the simulation through commands.** UI code pushes commands into the queue in `src/sim/commands.ts`. It never mutates state directly.
4. **Fixed tick.** The simulation advances at 10 ticks per second. Rendering interpolates between ticks.
5. **Determinism.** All randomness in the simulation uses the seeded RNG in `src/sim/rng.ts`. Never use `Math.random()` inside `src/sim`.
6. **Data driven content.** Buildings, enemies, resources, recipes, POIs, airship components, and balance numbers live in `src/data`. Systems read from data and do not hard code content values.
7. **Plain serializable state.** Simulation state contains only plain data that survives `JSON.stringify`. No class instances with hidden state, no Three.js objects, no functions.

---

## 7. Code Conventions

- TypeScript strict mode. No `any` unless there is a written reason in a comment.
- One system per file in `src/sim/systems`. Each system exports a single function that takes the world state and the tick delta.
- Name things after the design document. If the document says "Charcoal Kiln", the code says `charcoalKiln`.
- Keep files under roughly 400 lines. Split by responsibility when a file grows past that.
- Write Vitest tests for simulation logic. Rendering and UI do not need unit tests.

---

## 8. Rendering Rules

- Use `InstancedMesh` for anything that appears many times, such as trees, rubble, walls, and enemies.
- Keep a maximum of 8 real point lights active. Use emissive materials and additive ground decals for all other light sources.
- Procedural geometry is the default until real models are introduced. Build meshes in `src/render/meshes`.
- Colors come from the palette in section 12.3 of `docs/GAME_DESIGN.md`. Define them once in `src/render/materials.ts`.
- The warm inside and cold outside contrast is the core visual identity. Any rendering change must preserve it.
- Check performance against the targets in section 15.6 of the design document when adding entities or effects.

---

## 9. UI Rules

- Plain DOM and CSS overlay. No UI framework.
- Text must never overflow its container. Panels must never overlap each other or important game view areas unless the design asks for it.
- Every blocked building must show a visible reason.

---

## 10. Writing Style for Docs and In Game Text

- Do not use em dashes or dashes that join sentences in any docs, comments, or UI text.
- Keep sentences short and direct. Avoid nesting extra information inside a sentence. Use a new sentence instead.
- In game log messages are short and concrete, for example "Mara found a cracked valve. Tom was bitten."

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, clarifying questions come before implementation rather than after mistakes, and every session leaves the changelog and known issues up to date.
