// The light map for the ground shader (section 5.3). Render only. Each light is full strength in its
// bright core and fades to nothing at its radius, matching the steps that protect people.
import { BALANCE } from '../data/balance';
import type { LightSource } from '../sim/query';

const CORE = BALANCE.light.steps[0].reach;

/** Writes light 0 to 255 per tile. Small lights glow a little dimmer than the hearth. */
export function paintLight(sources: LightSource[], width: number, height: number, out: Uint8Array): void {
  out.fill(0);
  for (const s of sources) {
    const strength = Math.min(1, 0.45 + s.r * 0.08);
    for (let y = Math.max(0, Math.floor(s.y - s.r)); y <= Math.min(height - 1, Math.ceil(s.y + s.r)); y++) {
      for (let x = Math.max(0, Math.floor(s.x - s.r)); x <= Math.min(width - 1, Math.ceil(s.x + s.r)); x++) {
        const f = Math.hypot(x - s.x, y - s.y) / s.r;
        if (f >= 1) continue;
        const t = Math.min(1, Math.max(0, (f - CORE) / (1 - CORE)));
        const v = Math.round(255 * strength * (1 - t * t * (3 - 2 * t)));
        const i = y * width + x;
        if (v > out[i]) out[i] = v;
      }
    }
  }
}
