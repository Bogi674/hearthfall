// Colonist figures for the renderer: where each one stands, which way it faces, its pose, and what it holds.
// Workers play the animation of their building's trade (section 12.4). Render only.
import { BUILDINGS, type WorkAnim } from '../data/buildings';
import { COLONIST_NAMES } from '../data/colonists';
import { STOREY_HEIGHT } from '../data/house';
import { lookFor } from '../data/looks';
import { center, isBuilt } from '../sim/query';
import type { World } from '../sim/world';
import type { Figure } from './meshes/figures';

const TOOL_FOR: Record<WorkAnim, string | undefined> = {
  chop: 'axe', pick: 'pick', pry: 'crowbar', gather: undefined, stir: 'ladle', saw: 'saw', hammer: 'hammer', tend: 'poker',
};
/** Guards stand on the platform of these posts. */
const POST_HEIGHT: Partial<Record<string, number>> = { watchtower: 2, roofTurret: 1.28 };

export function colonistFigures(w: World, alpha: number, heading: Map<number, number>, rise: Map<number, number>, dt: number, shownStorey = Infinity): Figure[] {
  const { width, height } = w.map;
  const byId = new Map(w.buildings.map((b) => [b.id, b]));
  const people: Figure[] = [];
  for (const c of w.colonists) {
    const job = c.job === null ? undefined : byId.get(c.job);
    // Everyone eases up or down to the storey they are on, so a flight of stairs is a smooth climb.
    const standing = c.storey * STOREY_HEIGHT;
    const floorY = (rise.get(c.id) ?? standing) + (standing - (rise.get(c.id) ?? standing)) * Math.min(1, dt * 6);
    rise.set(c.id, floorY);
    // People taking shelter are out of sight. Sleepers show only in house beds and on mats, since a tent hides them.
    if (c.task === 'shelter' || c.storey > shownStorey) continue;
    if (c.asleep) {
      const bed = c.bed === null ? undefined : byId.get(c.bed);
      if (bed && !BUILDINGS[bed.type].furniture && isBuilt(bed)) continue;
      const on = bed && isBuilt(bed) ? center(bed) : { x: c.x, y: c.y };
      people.push({ id: c.id, x: on.x - width / 2, y: floorY + (bed && isBuilt(bed) ? 0.31 : 0.06), z: on.y - height / 2, yaw: bed ? 0 : (c.id % 4) * 0.6, moving: false, look: lookFor(w.seed, COLONIST_NAMES.indexOf(c.name)), pose: 'lie' });
      continue;
    }
    const dx = c.x - c.px;
    const dy = c.y - c.py;
    const moving = dx !== 0 || dy !== 0;
    let pose: Figure['pose'] = 'stand';
    let tool: string | undefined = c.weapon;
    let face: { x: number; y: number } | null = null;
    let y = floorY;
    let shift = 0;
    let sit = { x: 0, y: 0 };
    if (c.task === 'work' && job) {
      pose = BUILDINGS[job.type].work ?? 'hammer';
      tool = TOOL_FOR[pose];
      face = job.node >= 0 ? { x: job.node % width, y: Math.floor(job.node / width) } : center(job);
    } else if (c.task === 'build' && c.site !== null && byId.has(c.site)) {
      [pose, tool] = ['hammer', 'hammer'];
      face = center(byId.get(c.site)!);
    } else if (c.task === 'hunt') {
      // A hunter beside the animal, spear raised.
      [pose, tool] = ['guard', 'spear'];
      const prey = c.hunt ? w.animals.find((a) => a.id === c.hunt!.animal) : undefined;
      if (prey) face = { x: prey.x, y: prey.y };
    } else if (c.task === 'guard') {
      pose = 'guard';
      const post = c.duty === null ? undefined : byId.get(c.duty);
      y = floorY + (post ? (POST_HEIGHT[post.type] ?? 0) : 0);
      // Two guards on one post stand side by side.
      shift = w.colonists.filter((o) => o.duty === c.duty && o.task === 'guard').indexOf(c) === 1 ? 0.3 : -0.15;
      // Guards look out, away from the house.
      face = { x: c.x * 2 - w.hearth.x, y: c.y * 2 - w.hearth.y };
    }
    else if ((c.task === 'eat' || c.task === 'mingle') && !moving) {
      // Seated at a table stool or on a sofa, facing the table or out from the sofa back.
      const seat = w.buildings.find((b) => isBuilt(b) && BUILDINGS[b.type].social === c.task && c.x >= b.x - 0.5 && c.x < b.x + b.w - 0.5 && c.y >= b.y - 0.5 && c.y < b.y + b.h - 0.5);
      if (seat) {
        const long = seat.w >= seat.h;
        const side = c.task === 'eat' ? 0.38 : 0.1;
        pose = c.task === 'eat' ? 'eat' : c.id % 3 === 0 ? 'sit' : 'talk';
        sit = long ? { x: 0, y: side } : { x: side, y: 0 };
        face = { x: c.x + (long ? 0 : c.task === 'eat' ? -1 : 1), y: c.y + (long ? (c.task === 'eat' ? -1 : 1) : 0) };
      }
    }
    if (moving) heading.set(c.id, Math.atan2(dx, dy));
    else if (face && Math.hypot(face.x - c.x, face.y - c.y) > 0.05) heading.set(c.id, Math.atan2(face.x - c.x, face.y - c.y));
    people.push({
      id: c.id, x: c.px + dx * alpha - width / 2 + shift + sit.x, y, z: c.py + dy * alpha - height / 2 + sit.y, yaw: heading.get(c.id) ?? 0, moving,
      look: lookFor(w.seed, COLONIST_NAMES.indexOf(c.name)), pose, tool,
    });
  }
  // A drifter walking in from the dark toward the light.
  const d = w.drifter;
  if (d) {
    const dx = d.x - d.px;
    const dy = d.y - d.py;
    heading.set(-1, Math.atan2(dx, dy));
    people.push({
      id: -1, x: d.px + dx * alpha - width / 2, y: 0, z: d.py + dy * alpha - height / 2, yaw: heading.get(-1) ?? 0, moving: true,
      look: lookFor(w.seed, w.colonists.length + w.dead.length), pose: 'stand', tool: undefined,
    });
  }
  return people;
}
