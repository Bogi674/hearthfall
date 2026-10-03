// Distance from every tile to the nearest revealed tile, for the fog of war haze (section 4).
// Render only. A two pass chamfer sweep is fast enough to rerun whenever tiles are revealed.

/** Fog deeper than this many tiles is fully black. */
export const FOG_DEPTH_TILES = 20;
/** Props stay faintly visible through the haze up to this many tiles into the fog. */
export const FOG_PROP_TILES = 8;

export function fogDistance(revealed: number[], width: number, height: number): Float32Array {
  const d = new Float32Array(width * height);
  for (let i = 0; i < d.length; i++) d[i] = revealed[i] ? 0 : 1e6;
  const pass = (i: number, x: number, y: number, dx: number, dy: number, cost: number) => {
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= width || ny >= height) return;
    d[i] = Math.min(d[i], d[ny * width + nx] + cost);
  };
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      pass(i, x, y, -1, 0, 1);
      pass(i, x, y, 0, -1, 1);
      pass(i, x, y, -1, -1, Math.SQRT2);
      pass(i, x, y, 1, -1, Math.SQRT2);
    }
  }
  for (let y = height - 1; y >= 0; y--) {
    for (let x = width - 1; x >= 0; x--) {
      const i = y * width + x;
      pass(i, x, y, 1, 0, 1);
      pass(i, x, y, 0, 1, 1);
      pass(i, x, y, 1, 1, Math.SQRT2);
      pass(i, x, y, -1, 1, Math.SQRT2);
    }
  }
  return d;
}
