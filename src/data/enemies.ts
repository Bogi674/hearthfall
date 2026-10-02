// Enemies from section 9.4. Speed is tiles per second. Damage is per hit, one hit per attack interval.
// Walls take damage times wallDamage.

export interface EnemyDef {
  name: string;
  plural: string;
  threat: number;
  hp: number;
  speed: number;
  damage: number;
  wallDamage: number;
  /** First night this enemy can appear. */
  fromNight: number;
  /** Uses the runner flow field, which prefers gaps and gates. */
  runner?: boolean;
}

const DEFS = {
  shambler: { name: 'Shambler', plural: 'Shamblers', threat: 1, hp: 40, speed: 0.7, damage: 5, wallDamage: 1, fromNight: 1 },
  runner: { name: 'Runner', plural: 'Runners', threat: 2, hp: 25, speed: 2, damage: 4, wallDamage: 1, fromNight: 3, runner: true },
  brute: { name: 'Brute', plural: 'Brutes', threat: 6, hp: 300, speed: 0.6, damage: 12, wallDamage: 3, fromNight: 6 },
} satisfies Record<string, EnemyDef>;

export type EnemyType = keyof typeof DEFS;
export const ENEMIES: Record<EnemyType, EnemyDef> = DEFS;
export const ENEMY_TYPES = Object.keys(ENEMIES) as EnemyType[];
