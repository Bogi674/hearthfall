// Fog of war and discovery (sections 4 and 10.4). The start area, watchtowers, lookouts, and squads reveal tiles.
// Lookout Posts spot far places as rumors. Squads confirm rumors and find places near their path.
import { BALANCE } from '../../data/balance';
import { BUILDINGS } from '../../data/buildings';
import { POIS } from '../../data/pois';
import { center } from '../query';
import { addLog, type World } from '../world';

const D = BALANCE.discovery;
const DIRECTIONS = ['east', 'south east', 'south', 'south west', 'west', 'north west', 'north', 'north east'];

function reveal(world: World, cx: number, cy: number, r: number): void {
  const { width, height } = world.map;
  let changed = false;
  for (let y = Math.max(0, Math.floor(cy - r)); y <= Math.min(height - 1, Math.ceil(cy + r)); y++) {
    for (let x = Math.max(0, Math.floor(cx - r)); x <= Math.min(width - 1, Math.ceil(cx + r)); x++) {
      const i = y * width + x;
      if (!world.revealed[i] && Math.hypot(x - cx, y - cy) <= r) {
        world.revealed[i] = 1;
        changed = true;
      }
    }
  }
  if (changed) world.revealRev++;
}

/** Compass direction from the hearth, for rumors such as "something to the north". */
function direction(world: World, x: number, y: number): string {
  const a = Math.atan2(y - world.hearth.y, x - world.hearth.x);
  return DIRECTIONS[(Math.round(a / (Math.PI / 4)) + 8) % 8];
}

export function discoverySystem(world: World, _dt: number): void {
  const h = world.hearth;
  if (world.tick === 0 && world.revealRev === 0) {
    reveal(world, h.x, h.y, D.startRadius);
    const nearest = [...world.pois].sort((a, b) => Math.hypot(a.x - h.x, a.y - h.y) - Math.hypot(b.x - h.x, b.y - h.y));
    for (const p of nearest.slice(0, D.knownAtStart)) p.seen = 'known';
  }

  for (const b of world.buildings) {
    const def = BUILDINGS[b.type];
    const at = center(b);
    if (def.nightDuty) reveal(world, at.x, at.y, D.watchtowerReveal);
    if (!def.sight) continue;
    reveal(world, at.x, at.y, D.lookoutReveal);
    for (const p of world.pois) {
      if (p.seen === 'hidden' && Math.hypot(p.x - at.x, p.y - at.y) <= def.sight[b.level - 1]) {
        p.seen = 'rumored';
        addLog(world, `The lookout spotted something to the ${direction(world, p.x, p.y)}.`, p);
      }
    }
  }

  for (const ex of world.expeditions) {
    reveal(world, ex.x, ex.y, D.squadReveal);
    world.pois.forEach((p, i) => {
      const arrived = i === ex.poi && ex.stage === 'search';
      if (p.seen !== 'known' && (arrived || Math.hypot(p.x - ex.x, p.y - ex.y) <= D.squadDiscover)) {
        p.seen = 'known';
        reveal(world, p.x, p.y, D.squadReveal);
        addLog(world, `The squad found the ${POIS[p.type].name}.`, p);
      }
    });
  }
}
