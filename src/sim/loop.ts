// Fixed timestep accumulator. Pure so it can be tested without a browser.

export interface StepResult {
  /** Number of simulation ticks to run this frame. */
  steps: number;
  /** Leftover time to carry into the next frame, in ms. */
  accumulator: number;
  /** Fraction of a tick between the last tick and now, for render interpolation. */
  alpha: number;
}

export function fixedStep(
  accumulator: number,
  frameMs: number,
  tickMs: number,
  maxSteps: number,
): StepResult {
  let acc = accumulator + frameMs;
  let steps = Math.floor(acc / tickMs);
  acc -= steps * tickMs;
  if (steps > maxSteps) {
    // Drop the backlog instead of spiraling after a long stall such as a hidden tab.
    steps = maxSteps;
    acc = 0;
  }
  return { steps, accumulator: acc, alpha: acc / tickMs };
}
