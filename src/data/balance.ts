// Balance numbers and content tuning. Values follow docs/GAME_DESIGN.md and are expected to change.

export const BALANCE = {
  /** Section 18. */
  start: {
    colonists: 7,
    stock: { wood: 80, scrap: 10, rawFood: 30, meals: 16, fuel: 40 },
    /** Storage without any building. The Supply Cart holds the rest. */
    storage: 0,
    /** Where the Supply Cart stands, relative to the hearth. */
    cart: { x: -1, y: 4 },
    weapon: 'pipe',
  },
  /** Section 3.2. Phases run in this order and repeat every day. */
  phases: [
    { name: 'Day', seconds: 300, work: true },
    { name: 'Dusk', seconds: 60, work: false },
    { name: 'Night', seconds: 180, work: false },
    { name: 'Dawn', seconds: 30, work: true },
  ],
  map: {
    width: 128,
    height: 128,
    /** Tiles around the hearth that are always clear ground. */
    clearingRadius: 6,
    /** Ruined town extends this far from the hearth. Trees thicken beyond it. */
    townRadius: 40,
    houseAttempts: 420,
    houseCountMax: 50,
    houseWidth: [4, 7],
    houseDepth: [4, 6],
    /** Chance that a wall tile of a ruined house has collapsed. */
    wallGapChance: 0.3,
    houseRubbleChance: 0.25,
    streetRubbleChance: 0.04,
    ponds: 4,
    /** Side streets run parallel to the main roads at these offsets from the hearth. */
    sideStreets: [-26, -14, 13, 25],
    pondRadius: [3, 5],
    forestNoiseScale: 9,
    /** Trees start to thicken this far from the hearth and reach full density this many tiles later. */
    forestStart: 17,
    forestRamp: 40,
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
    /** Past its radius a heat source fades from the warm threshold to 0 over this fraction of its radius. */
    edgeFalloff: 0.6,
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
    /** Tiles kept for house rooms in every direction from the hearth (section 5.5). */
    lot: 3,
  },
  colonist: {
    /** Tiles per second. */
    speed: 3,
    arriveDistance: 0.6,
    /** Idle colonists wait in a ring this far from the hearth, outside the house lot. */
    idleRadius: 4.6,
    /** Builders per construction site. */
    buildersPerSite: 3,
  },
  /** Section 6.3. Durations are seconds to drain or fill the whole bar. */
  needs: {
    hungerDays: 2,
    restDays: 1.5,
    eatBelow: 0.5,
    /** With a table in the house colonists eat there in the evening, unless they get this hungry. */
    eatAnywhereBelow: 0.25,
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
    /** Monsters spawn on the sides of a square this many tiles out from the hearth. */
    spawnDistance: 42,
    /** From this day a small raid prowls in at this many seconds into the day (section 9.5). */
    raidFromDay: 3,
    raidAt: 120,
    /** Raid threat as a share of the coming night's threat. */
    raidShare: 0.25,
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
    /** Monsters that cannot break buildings hunt people this close. */
    huntRadius: 10,
    trapDps: 20,
    trapWearPerSecond: 3,
  },
  /**
   * Light steps from the core of a light out to its fringe (section 5.3). Reach is the distance as a
   * fraction of the light radius. Damage scales what monsters deal to people. Speed scales monster speed.
   */
  light: {
    steps: [
      { name: 'Bright', reach: 0.7, damage: 0, speed: 0.6 },
      { name: 'Lit', reach: 0.8, damage: 0.25, speed: 0.75 },
      { name: 'Dim', reach: 0.9, damage: 0.5, speed: 0.85 },
      { name: 'Fringe', reach: 1, damage: 0.75, speed: 1 },
    ],
  },
  /** Fog of war and discovery (sections 4 and 10.4). */
  discovery: {
    startRadius: 18,
    knownAtStart: 3,
    squadReveal: 6,
    squadDiscover: 8,
    watchtowerReveal: 8,
    lookoutReveal: 12,
  },
  /** Section 10. */
  expeditions: {
    maxSquad: 4,
    /** Squads walk slower than colonists in camp. Tiles per second. */
    speed: 1.6,
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
  /** Drifters join the colony (section 6.6). They come on the dusk of these days if hope and beds allow. */
  arrivals: {
    days: [3, 6, 9],
    minHope: 50,
    /** The most colonists the colony can hold. It matches the most seats on the airship. */
    maxColonists: 20,
    /** Tiles from the hearth where they appear, and how fast they walk toward the light. */
    distance: 34,
    speed: 1.2,
    joinDistance: 3,
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
    /** The evening in the house (section 5.7). Seconds of sitting at a table or sofa per hope point, and the most the evening gives. */
    mingleSecondsPerPoint: 120,
    mingleMax: 3,
    /** Each lamp, rug, or plant in a closed room lifts the most the evening gives by this much, up to decorMax. */
    decorBonus: 0.25,
    decorMax: 1,
    /** Hope lost at dawn for each colonist who slept on a mat because no bed was free, up to matMax. */
    matSleeper: -0.5,
    matMax: -1.5,
    lowBelow: 30,
    lowWorkSpeed: 0.8,
  },
  /** The house (section 5.6 and 5.7). */
  house: {
    /** Sleepers in a bed inside a closed room rest and heal this many times faster. */
    roomRest: 1.5,
    /** Sleepers on a mat by the hearth rest and heal this fast. */
    matRest: 0.5,
  },
  production: {
    /** Work speed on cold tiles. Freezing tiles stop work. */
    coldSpeed: 0.5,
  },
} as const;
