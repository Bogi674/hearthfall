// Balance numbers and content tuning. Values follow docs/GAME_DESIGN.md and are expected to change.

/** Where a hearth stage may stand: anywhere on the ground, on a house floor, or on a floor in a closed room with its roof on. */
export type Stands = 'anywhere' | 'floor' | 'room';

export const BALANCE = {
  /** Section 18. */
  start: {
    colonists: 7,
    stock: { wood: 80, scrap: 10, rawFood: 30, meals: 16, fuel: 40 },
    /** Storage without any building. The Supply Cart holds the rest. */
    storage: 0,
    /** Where the Supply Cart stands, relative to the hearth. */
    cart: { x: 2, y: 8 },
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
    width: 160,
    height: 160,
    /** Tiles around the hearth that are always clear ground. */
    clearingRadius: 8,
    /** Ruined town extends this far from the hearth. Trees thicken beyond it. */
    townRadius: 50,
    houseAttempts: 560,
    houseCountMax: 70,
    houseWidth: [4, 7],
    houseDepth: [4, 6],
    /** Chance that a wall tile of a ruined house has collapsed. */
    wallGapChance: 0.3,
    houseRubbleChance: 0.25,
    streetRubbleChance: 0.04,
    ponds: 4,
    /** Side streets run parallel to the main roads at these offsets from the hearth. */
    sideStreets: [-32, -17, 16, 31],
    pondRadius: [3, 5],
    forestNoiseScale: 9,
    /** Trees start to thicken this far from the hearth and reach full density this many tiles later. */
    /** The paddock beside the house that is always open ground (section 4). Size is in tiles, distance from the hearth. */
    yard: { size: 12, distance: 13 },
    forestStart: 19,
    forestRamp: 44,
  },
  temperature: {
    day1: -2,
    dropPerDay: 1,
  },
  /** Weather (M10.2). A seeded chain picks each day's weather. Offsets add to the day's base temperature. */
  weather: {
    /** The first day is always this weather. */
    firstDay: 'clear' as const,
    /** Blizzards cannot start before this day. */
    blizzardFromDay: 4,
    /** Chance of each next weather, in the order clear, overcast, snow, blizzard. */
    chain: {
      clear: [0.45, 0.35, 0.2, 0],
      overcast: [0.3, 0.3, 0.4, 0],
      snow: [0.15, 0.3, 0.4, 0.15],
      blizzard: [0.1, 0.3, 0.5, 0.1],
    },
    kinds: {
      clear: { name: 'Clear', dayOffset: 2, nightOffset: -4, work: 1, sight: 1.1, heatReach: 1, risk: 1 },
      overcast: { name: 'Overcast', dayOffset: 0, nightOffset: -1, work: 1, sight: 0.95, heatReach: 1, risk: 1 },
      snow: { name: 'Snow', dayOffset: -1, nightOffset: -2, work: 0.9, sight: 0.85, heatReach: 1, risk: 1.1 },
      blizzard: { name: 'Blizzard', dayOffset: -5, nightOffset: -6, work: 0.7, sight: 0.5, heatReach: 0.85, risk: 1.5 },
    },
    /** Heat sources burn this much more fuel per degree below zero. */
    fuelPerDegree: 0.012,
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
    /** A closed room with a whole roof holds heat, so its tiles are this much warmer. */
    indoorBonus: 10,
    /** Heat that passes through a wall or window travels this many tiles farther. Doors cost nothing. */
    wallCost: 3,
  },
  hearth: {
    /** Radius in tiles per hearth level, from section 5.2. */
    /** The Hearth House stages from section 5.2. Cost is what it takes to reach that stage. */
    levels: [
      { name: 'Fire Pit', radius: 8, fuelPerMinute: 3, hp: 4000, cost: {}, stands: 'anywhere' as Stands },
      { name: 'Stone Hearth', radius: 10, fuelPerMinute: 4, hp: 4500, cost: { wood: 20, planks: 10 }, stands: 'anywhere' as Stands },
      { name: 'Iron Stove', radius: 12, fuelPerMinute: 5, hp: 5000, cost: { planks: 40, stone: 10 }, stands: 'floor' as Stands },
      { name: 'Brick Fireplace', radius: 14, fuelPerMinute: 6, hp: 5500, cost: { planks: 40, metal: 20 }, stands: 'room' as Stands },
      { name: 'Great Hearth', radius: 16, fuelPerMinute: 8, hp: 6000, cost: { planks: 80, metal: 60, parts: 10 }, stands: 'room' as Stands },
    ],
    /** The run is lost after a lit hearth is out this long. */
    outLossSeconds: 60,
    /** Fuel it takes to light a smoldering hearth, and the builder seconds of kindling. */
    lightFuel: 5,
    lightSeconds: 6,
    /** Moving the hearth costs this much wood plus half of its stage cost, and takes this many builder seconds. */
    moveWood: 10,
    moveSeconds: 12,
  },
  /** How worn ruined houses start (M12). Shares are chances per piece, and hit points are shares of the full amount. */
  ruin: {
    wallHp: [0.2, 0.8],
    wallMissing: 0.15,
    doorSurvives: 0.6,
    windowChance: 0.12,
    floorMissing: 0.12,
    rubbleOnLostFloor: 0.5,
    roofBroken: 0.4,
    furnitureBroken: 0.55,
    townExtraRoofBroken: 0.35,
    townFurniture: 0.12,
  },
  colonist: {
    /** Tiles per second. */
    speed: 3,
    arriveDistance: 0.6,
    /** Idle colonists wait in a ring this far from the hearth. */
    idleRadius: 2.2,
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
    growth: 1.18,
    firstNight: 2,
    bloodMoonEvery: 5,
    /** Threat on a Blood Moon night is this many times the normal threat. */
    bloodMoonMultiplier: 1.55,
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
    /** A gun on a higher storey reaches this many tiles farther for each storey up. */
    storeyRange: 1.2,
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
