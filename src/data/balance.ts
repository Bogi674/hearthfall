// Balance numbers and content tuning. Values follow docs/GAME_DESIGN.md and are expected to change.

export const BALANCE = {
  /** Section 18. */
  start: {
    colonists: 8,
    stock: { wood: 60, scrap: 10, rawFood: 30, meals: 16, fuel: 40 },
    storage: 300,
  },
  /** Section 3.2. Phases run in this order and repeat every day. */
  phases: [
    { name: 'Day', seconds: 300, work: true },
    { name: 'Dusk', seconds: 60, work: false },
    { name: 'Night', seconds: 180, work: false },
    { name: 'Dawn', seconds: 30, work: true },
  ],
  map: {
    width: 80,
    height: 80,
    /** Tiles around the hearth that are always clear ground. */
    clearingRadius: 6,
    /** Ruined town extends this far from the hearth. Trees thicken beyond it. */
    townRadius: 28,
    houseAttempts: 220,
    houseCountMax: 26,
    houseWidth: [4, 7],
    houseDepth: [4, 6],
    /** Chance that a wall tile of a ruined house has collapsed. */
    wallGapChance: 0.3,
    houseRubbleChance: 0.25,
    streetRubbleChance: 0.04,
    ponds: 2,
    pondRadius: [3, 5],
    forestNoiseScale: 9,
  },
  temperature: {
    day1: -2,
    dropPerDay: 1,
  },
  warmth: {
    /** Baseline tile warmth at 0 degrees outdoor temperature. */
    baselineAtZero: 30,
    /** Baseline warmth lost per degree below zero. */
    perDegree: 1.5,
    /** Tiles at or above this are warm. */
    warmThreshold: 50,
    /** Tiles below this are freezing. Between the two thresholds is cold. */
    freezingThreshold: 20,
    /** Heat sources fall from the warm threshold to 0 over this many tiles past their radius. */
    edgeFalloff: 3,
  },
  hearth: {
    /** Radius in tiles per hearth level, from section 5.2. */
    levels: [
      { radius: 8, fuelPerMinute: 3 },
      { radius: 12, fuelPerMinute: 5 },
      { radius: 16, fuelPerMinute: 8 },
    ],
    /** The run is lost after the hearth is out this long. */
    outLossSeconds: 60,
  },
  colonist: {
    /** Tiles per second. */
    speed: 3,
    arriveDistance: 0.6,
  },
  /** Section 6.3. Durations are seconds to drain or fill the whole bar. */
  needs: {
    hungerDays: 2,
    restDays: 1.5,
    eatBelow: 0.5,
    mealRestores: 0.5,
    sleepFillSeconds: 200,
    tiredWorkSpeed: 0.6,
    warmFillSeconds: 30,
    coldDrainSeconds: 400,
    freezingDrainSeconds: 150,
    starveKillSeconds: 300,
    freezeKillSeconds: 120,
    healSeconds: 600,
  },
  production: {
    /** Work speed on cold tiles. Freezing tiles stop work. */
    coldSpeed: 0.5,
  },
} as const;
