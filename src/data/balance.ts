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
    perDegree: 1,
    /** Tiles at or above this are warm. */
    warmThreshold: 50,
    /** Tiles below this are freezing. Between the two thresholds is cold. */
    freezingThreshold: 20,
    /** Heat sources fall from the warm threshold to 0 over this many tiles past their radius. */
    edgeFalloff: 3,
  },
  hearth: {
    /** Radius in tiles per hearth level, from section 5.2. */
    /** The Hearth House stages from section 5.2. Cost is what it takes to reach that stage. */
    levels: [
      { name: 'Ruined House', radius: 8, fuelPerMinute: 3, hp: 4000, cost: {} },
      { name: 'Patched Roof', radius: 10, fuelPerMinute: 4, hp: 4500, cost: { wood: 20, planks: 10 } },
      { name: 'Rebuilt Walls', radius: 12, fuelPerMinute: 5, hp: 5000, cost: { planks: 40, stone: 10 } },
      { name: 'Glazed and Stoved', radius: 14, fuelPerMinute: 6, hp: 5500, cost: { planks: 40, metal: 20 } },
      { name: 'Restored Lodge', radius: 16, fuelPerMinute: 8, hp: 6000, cost: { planks: 80, metal: 60, parts: 10 } },
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
  /** Section 9.5. Threat for night n is base * growth^(n - 1), rounded. */
  waves: {
    base: 10,
    growth: 1.32,
    firstNight: 2,
    bloodMoonEvery: 5,
    /** Spawns are spread over the first part of the night. */
    spawnSeconds: 90,
    /** Spawn edges grow by one every this many nights, up to 4. */
    nightsPerEdge: 4,
  },
  /** Flow field costs per tile (section 9.3). Impassable tiles are not entered. */
  paths: {
    ground: 1,
    road: 1,
    tree: 4,
    rubble: 2,
    structure: 40,
    /** Runners avoid walls more and favor gates. */
    runnerStructure: 80,
    runnerGate: 10,
  },
  defense: {
    colonistHp: 100,
    attackInterval: 1,
    /** Enemies hit colonists within this many tiles. */
    reach: 0.7,
    towerRange: 6,
    towerDamage: 15,
    towerInterval: 0.8,
    trapDps: 20,
    trapWearPerSecond: 3,
    /** Light from the hearth and lanterns (section 5.3). */
    lightShamblerDamage: 0.7,
    lightRunnerSpeed: 0.8,
  },
  /** Fog of war and discovery (sections 4 and 10.4). */
  discovery: {
    startRadius: 14,
    knownAtStart: 3,
    squadReveal: 5,
    squadDiscover: 6,
    watchtowerReveal: 8,
    lookoutReveal: 10,
  },
  /** Section 10. */
  expeditions: {
    maxSquad: 4,
    /** Squads walk slower than colonists in camp. Tiles per second. */
    speed: 1.2,
    searchSeconds: 60,
    rollSeconds: 6,
    /** Chance of a danger event per roll is danger times this, divided by the square root of squad size. */
    riskPerDanger: 0.035,
    nightRisk: 3,
    /** Health lost per injury, min and max. */
    injury: [0.25, 0.5],
    rareChance: 0.15,
    /** Loot from a POI is multiplied by this for each full search already done there. */
    revisitLoot: 0.5,
  },
  /** Section 6.5. */
  hope: {
    start: 60,
    nightWithoutDeaths: 5,
    fedDawn: 2,
    death: -10,
    buildingDestroyed: -1,
    hungryDawn: -5,
    frozenDawn: -3,
    lowBelow: 30,
    lowWorkSpeed: 0.8,
  },
  production: {
    /** Work speed on cold tiles. Freezing tiles stop work. */
    coldSpeed: 0.5,
  },
} as const;
