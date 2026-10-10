import { it } from 'vitest';
import { createWorld, stepWorld } from '../src/sim/world';
import { fullRunPlayer } from './fullrun';
declare const process: { env: Record<string, string | undefined> };
for (const seed of [4,5,]) {
  it(`seed ${seed}`, () => {
    const world = createWorld(seed);
    const player = fullRunPlayer();
    // PERT is the share of player turns skipped at random, to model an inattentive player.
    const pert = Number(process.env.PERT ?? 0);
    let rs = seed * 7919 + 13;
    const rnd = () => ((rs = (Math.imul(rs, 1664525) + 1013904223) >>> 0) / 4294967296);
    let ready = 0;
    let minHearth = 1;
    const when: Record<string, number> = {};
    const mark = (k: string) => { if (!when[k]) when[k] = world.day + world.dayTime / 570; };
    for (let t = 0; t < 18 * 570 * 10 && !world.lost && !world.won; t++) {
      if (t % 10 === 0 && rnd() >= pert) player(world);
      stepWorld(world);
      minHearth = Math.min(minHearth, world.hearth.hp / [4000, 4500, 5000, 5500, 6000][world.hearth.level - 1]);
      if (!ready && world.airship.built.length >= 5) ready = world.day + world.dayTime / 570;
      const dock = world.buildings.find((b) => b.type === 'airshipDock');
      if (dock) mark('dockPlaced');
      if (dock && dock.construct <= 0) mark('dockDone');
      if (world.airship.built.length >= 1) mark('frame');
      if (world.airship.built.length >= 3) mark('three');
      if (world.hearth.level >= 3) mark('lvl3');
      if (world.hearth.ignited) mark('lit');
      if (world.stash && world.stash.state !== 'hidden') mark('found');
      if (world.airship.blueprint) mark('bp');
    }
    console.log('RESULT seed', seed, world.won ? 'won day ' + world.day : 'lost ' + world.lost + ' day ' + world.day, 'colonists', world.colonists.length, 'dead', world.dead.length, 'minHearth', minHearth.toFixed(2), 'ready', ready ? ready.toFixed(2) : 'never', 'lvl3', (when.lvl3 ?? 0).toFixed(1), 'dockPlaced', (when.dockPlaced ?? 0).toFixed(1), 'dockDone', (when.dockDone ?? 0).toFixed(1), 'frame', (when.frame ?? 0).toFixed(1), 'three', (when.three ?? 0).toFixed(1), 'lit', (when.lit ?? 0).toFixed(1), 'found', (when.found ?? 0).toFixed(1), 'bp', (when.bp ?? 0).toFixed(1));
  }, 900000);
}
