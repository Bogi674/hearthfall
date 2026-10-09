// Colonist figures for the renderer: where each one stands, which way it faces, its pose, and what it holds.
// Workers play the animation of their building's trade (section 12.4). Render only.
import { BUILDINGS, type WorkAnim } from '../data/buildings';
import { COLONIST_NAMES } from '../data/colonists';
import { lookFor } from '../data/looks';
import { center } from '../sim/query';
import type { World } from '../sim/world';
import type { Figure } from './meshes/figures';

const TOOL_FOR: Record<WorkAnim, string | undefined> = {
  chop: 'axe', pick: 'pick', pry: 'crowbar', gather: undefined, stir: 'ladle', saw: 'saw', hammer: 'hammer', tend: 'poker',
};
/** Guards stand on the platform of these posts. */
const POST_HEIGHT: Partial<Record<string, number>> = { watchtower: 2, roofTurret: 1.28 };

export function colonistFigures(w: World, alpha: number, heading: Map<number, number>): Figure[] {
  const { width, height } = w.map;
  const byId = new Map(w.buildings.map((b) => [b.id, b]));
  const people: Figure[] = [];
  for (const c of w.colonists) {
    const job = c.job === null ? undefined : byId.get(c.job);
    // Sleepers and people taking shelter are indoors and out of sight.
    if (c.asleep || c.task === 'shelter') continue;
    const dx = c.x - c.px;
    const dy = c.y - c.py;
    const moving = dx !== 0 || dy !== 0;
    let pose: Figure['pose'] = 'stand';
    let tool: string | undefined = c.weapon;
    let face: { x: number; y: number } | null = null;
    let y = 0;
    let shift = 0;
    if (c.task === 'work' && job) {
      pose = BUILDINGS[job.type].work ?? 'hammer';
      tool = TOOL_FOR[pose];
      face = job.node >= 0 ? { x: job.node % width, y: Math.floor(job.node / width) } : center(job);
    } else if (c.task === 'build' && c.site !== null && byId.has(c.site)) {
      [pose, tool] = ['hammer', 'hammer'];
      face = center(byId.get(c.site)!);
    } else if (c.task === 'guard') {
      pose = 'guard';
      const post = c.duty === null ? undefined : byId.get(c.duty);
      y = post ? (POST_HEIGHT[post.type] ?? 0) : 0;
      // Two guards on one post stand side by side.
      shift = w.colonists.filter((o) => o.duty === c.duty && o.task === 'guard').indexOf(c) === 1 ? 0.3 : -0.15;
      // Guards look out, away from the house.
      face = { x: c.x * 2 - w.hearth.x, y: c.y * 2 - w.hearth.y };
    }
    if (moving) heading.set(c.id, Math.atan2(dx, dy));
    else if (face && Math.hypot(face.x - c.x, face.y - c.y) > 0.05) heading.set(c.id, Math.atan2(face.x - c.x, face.y - c.y));
    people.push({
      id: c.id, x: c.px + dx * alpha - width / 2 + shift, y, z: c.py + dy * alpha - height / 2, yaw: heading.get(c.id) ?? 0, moving,
      look: lookFor(w.seed, COLONIST_NAMES.indexOf(c.name)), pose, tool,
    });
  }
  return people;
}
