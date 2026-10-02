// Balance numbers and content tuning. Values follow docs/GAME_DESIGN.md and are expected to change.

export const BALANCE = {
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
    levels: [{ radius: 8 }, { radius: 12 }, { radius: 16 }],
  },
} as const;
