import type { Hair, Look, Pants, Top } from '../../data/looks';
import { mixPalette, PALETTE } from '../materials';
import { ball, block, cloth, disc, flare, limb, pair, std, type Part } from './figures';

// Colonists as chunky low poly people (section 12.4). One rig holds every hair style, coat, and
// pair of trousers. Each figure shows only the parts its look asks for, colored from the look.

const boot = std(mixPalette(PALETTE.warmShadow, PALETTE.oldWood, 0.35));
const tights = std(mixPalette(PALETTE.warmShadow, PALETTE.nightBlue, 0.5));
const brass = std(mixPalette(PALETTE.lantern, PALETTE.oldWood, 0.35));
const eye = std(PALETTE.warmShadow);

const hair = (...styles: Hair[]) => (l: Look) => styles.includes(l.hair);
const top = (...styles: Top[]) => (l: Look) => styles.includes(l.top);
const pants = (...styles: Pants[]) => (l: Look) => styles.includes(l.pants);
const not = (f: (l: Look) => boolean) => (l: Look) => !f(l);

/** Hair that sits on the scalp as a cap, with extra pieces for the longer styles. */
const CAPPED = hair('short', 'quiff', 'long', 'bob', 'ponytail', 'bun', 'braids', 'pixie');
const HIP = 0.42;
const SHOULDER = 0.7;

const legs: Part[] = [
  ...pair((s) => ({ geo: limb, mat: cloth, tint: 'pantsColor', when: pants('trousers', 'tallBoots', 'overalls'), at: [s * 0.075, HIP, 0], size: [0.11, 0.35, 0.115], swing: s * 0.6 })),
  ...pair((s) => ({ geo: limb, mat: cloth, tint: 'pantsColor', when: pants('cargo'), at: [s * 0.078, HIP, 0], size: [0.13, 0.35, 0.13], swing: s * 0.6 })),
  ...pair((s) => ({ geo: block, mat: cloth, tint: 'pantsColor', when: pants('cargo'), at: [s * 0.078, HIP, 0], offset: [s * 0.06, -0.16, 0], size: [0.04, 0.08, 0.08], swing: s * 0.6 })),
  ...pair((s) => ({ geo: limb, mat: tights, when: pants('skirt'), at: [s * 0.07, HIP, 0], size: [0.095, 0.35, 0.1], swing: s * 0.6 })),
  ...pair((s) => ({ geo: block, mat: boot, at: [s * 0.075, HIP, 0], offset: [0, -0.36, 0.025], size: [0.13, 0.09, 0.19], swing: s * 0.6 })),
  ...pair((s) => ({ geo: block, mat: boot, when: pants('tallBoots'), at: [s * 0.075, HIP, 0], offset: [0, -0.27, 0], size: [0.135, 0.18, 0.135], swing: s * 0.6 })),
  { geo: block, mat: cloth, tint: 'pantsColor', when: not(pants('skirt')), at: [0, HIP + 0.01, 0], size: [0.25, 0.1, 0.17] },
  { geo: flare, mat: cloth, tint: 'pantsColor', when: pants('skirt'), at: [0, 0.36, 0], size: [0.3, 0.2, 0.24] },
];

const body: Part[] = [
  { geo: block, mat: cloth, tint: 'topColor', when: not(top('vest')), at: [0, 0.585, 0], size: [0.29, 0.3, 0.19] },
  // A vest: the sweater underneath, the vest over it, and the sweater showing in the open front.
  { geo: block, mat: cloth, tint: 'accent', when: top('vest'), at: [0, 0.585, 0], size: [0.28, 0.3, 0.18] },
  { geo: block, mat: cloth, tint: 'topColor', when: top('vest'), at: [0, 0.6, -0.005], size: [0.305, 0.27, 0.19] },
  { geo: block, mat: cloth, tint: 'accent', when: top('vest'), at: [0, 0.6, 0.09], size: [0.05, 0.25, 0.02] },
  // Parka: a padded hem, a fur collar, and two pockets.
  { geo: flare, mat: cloth, tint: 'topColor', when: top('parka'), at: [0, 0.43, 0], size: [0.33, 0.14, 0.24] },
  { geo: ball, mat: cloth, tint: 'accent', when: top('parka'), at: [0, 0.72, -0.015], size: [0.3, 0.1, 0.24] },
  ...pair((s) => ({ geo: block, mat: cloth, tint: 'topColor', when: top('parka'), at: [s * 0.08, 0.47, 0.11], size: [0.08, 0.07, 0.03] })),
  // Jacket: a zip and a turned up collar.
  { geo: block, mat: brass, when: top('jacket'), at: [0, 0.585, 0.096], size: [0.015, 0.28, 0.01] },
  { geo: block, mat: cloth, tint: 'topColor', when: top('jacket'), at: [0, 0.72, -0.01], size: [0.22, 0.06, 0.17] },
  // Long coat: skirts down to the knees, a belt, and lapels.
  { geo: flare, mat: cloth, tint: 'topColor', when: top('longcoat'), at: [0, 0.36, 0], size: [0.34, 0.26, 0.25] },
  { geo: disc, mat: boot, when: top('longcoat'), at: [0, 0.47, 0], size: [0.3, 0.04, 0.21] },
  ...pair((s) => ({ geo: block, mat: cloth, tint: 'topColor', when: top('longcoat'), at: [s * 0.05, 0.66, 0.095], size: [0.07, 0.12, 0.02], rot: [0, 0, s * 0.35] })),
  // Sweater: ribbed hem and a scarf in the accent color.
  { geo: disc, mat: cloth, tint: 'topColor', when: top('sweater'), at: [0, 0.445, 0], size: [0.3, 0.04, 0.2] },
  { geo: ball, mat: cloth, tint: 'accent', when: top('sweater'), at: [0, 0.725, 0], size: [0.25, 0.08, 0.21] },
  { geo: block, mat: cloth, tint: 'accent', when: top('sweater'), at: [0.06, 0.63, 0.1], size: [0.06, 0.17, 0.025], rot: [0, 0, 0.12] },
  // Belt with a buckle over trousers, under short tops.
  { geo: disc, mat: boot, when: (l) => l.pants !== 'skirt' && l.pants !== 'overalls' && ['jacket', 'sweater', 'vest'].includes(l.top), at: [0, 0.45, 0], size: [0.27, 0.035, 0.185] },
  { geo: block, mat: brass, when: (l) => l.pants !== 'skirt' && l.pants !== 'overalls' && ['jacket', 'sweater', 'vest'].includes(l.top), at: [0, 0.45, 0.094], size: [0.05, 0.04, 0.015] },
  // Overalls: a bib and two straps over the top.
  { geo: block, mat: cloth, tint: 'pantsColor', when: pants('overalls'), at: [0, 0.54, 0.093], size: [0.17, 0.16, 0.02] },
  ...pair((s) => ({ geo: block, mat: cloth, tint: 'pantsColor', when: pants('overalls'), at: [s * 0.08, 0.66, 0.09], size: [0.03, 0.14, 0.02] })),
];

const arms: Part[] = [
  ...pair((s) => ({ geo: limb, mat: cloth, tint: 'topColor', when: not(top('vest')), at: [s * 0.18, SHOULDER, 0], size: [0.09, 0.28, 0.09], rot: [0, 0, s * 0.12], swing: -s * 0.5 })),
  ...pair((s) => ({ geo: limb, mat: cloth, tint: 'accent', when: top('vest'), at: [s * 0.18, SHOULDER, 0], size: [0.085, 0.28, 0.085], rot: [0, 0, s * 0.12], swing: -s * 0.5 })),
  ...pair((s) => ({ geo: ball, mat: cloth, tint: 'skin', at: [s * 0.18, SHOULDER, 0], offset: [0, -0.3, 0], size: [0.08, 0.085, 0.08], rot: [0, 0, s * 0.12], swing: -s * 0.5 })),
];

const head: Part[] = [
  { geo: ball, mat: cloth, tint: 'skin', at: [0, 0.84, 0.005], size: [0.24, 0.25, 0.235] },
  ...pair((s) => ({ geo: ball, mat: cloth, tint: 'skin', at: [s * 0.12, 0.84, 0], size: [0.04, 0.06, 0.04] })),
  { geo: block, mat: cloth, tint: 'skin', at: [0, 0.83, 0.122], size: [0.035, 0.05, 0.035] },
  ...pair((s) => ({ geo: ball, mat: eye, at: [s * 0.045, 0.855, 0.112], size: [0.03, 0.04, 0.02] })),
  ...pair((s) => ({ geo: block, mat: cloth, tint: 'hairColor', when: (l) => l.hat === 'none', at: [s * 0.048, 0.89, 0.112], size: [0.05, 0.015, 0.02] })),
];

const hairParts: Part[] = [
  { geo: ball, mat: cloth, tint: 'hairColor', when: CAPPED, at: [0, 0.9, -0.025], size: [0.258, 0.17, 0.25] },
  { geo: ball, mat: cloth, tint: 'hairColor', when: hair('buzz'), at: [0, 0.88, -0.012], size: [0.25, 0.2, 0.24] },
  { geo: block, mat: cloth, tint: 'hairColor', when: hair('quiff'), at: [0, 0.97, 0.05], size: [0.16, 0.06, 0.11], rot: [-0.4, 0, 0] },
  // Long hair falls to the shoulders at the back and frames the face at the sides.
  { geo: block, mat: cloth, tint: 'hairColor', when: hair('long'), at: [0, 0.77, -0.08], size: [0.25, 0.3, 0.09] },
  ...pair((s) => ({ geo: block, mat: cloth, tint: 'hairColor', when: hair('long'), at: [s * 0.115, 0.8, -0.005], size: [0.04, 0.2, 0.12] })),
  { geo: block, mat: cloth, tint: 'hairColor', when: hair('bob'), at: [0, 0.83, -0.075], size: [0.27, 0.17, 0.1] },
  ...pair((s) => ({ geo: block, mat: cloth, tint: 'hairColor', when: hair('bob'), at: [s * 0.125, 0.83, -0.01], size: [0.05, 0.15, 0.17] })),
  { geo: limb, mat: cloth, tint: 'hairColor', when: hair('ponytail'), at: [0, 0.9, -0.12], size: [0.07, 0.22, 0.07], rot: [0.5, 0, 0] },
  { geo: ball, mat: cloth, tint: 'hairColor', when: hair('bun'), at: [0, 0.98, -0.07], size: [0.12, 0.11, 0.12] },
  ...pair((s) => ({ geo: limb, mat: cloth, tint: 'hairColor', when: hair('braids'), at: [s * 0.1, 0.82, -0.02], size: [0.05, 0.26, 0.05], rot: [-0.25, 0, 0] })),
  { geo: ball, mat: cloth, tint: 'hairColor', when: hair('curly'), at: [0, 0.92, -0.02], size: [0.3, 0.2, 0.28] },
  ...pair((s) => ({ geo: ball, mat: cloth, tint: 'hairColor', when: hair('curly'), at: [s * 0.12, 0.85, -0.04], size: [0.12, 0.16, 0.16] })),
  { geo: ball, mat: cloth, tint: 'hairColor', when: hair('curly'), at: [0, 0.83, -0.1], size: [0.24, 0.18, 0.12] },
  { geo: block, mat: cloth, tint: 'hairColor', when: hair('pixie'), at: [0.03, 0.935, 0.085], size: [0.18, 0.05, 0.06], rot: [0, 0, -0.2] },
  // Beards.
  { geo: ball, mat: cloth, tint: 'hairColor', when: (l) => l.beard === 'full', at: [0, 0.77, 0.06], size: [0.2, 0.15, 0.15] },
  { geo: ball, mat: cloth, tint: 'hairColor', when: (l) => l.beard === 'short', at: [0, 0.775, 0.055], size: [0.19, 0.1, 0.13] },
  { geo: block, mat: cloth, tint: 'hairColor', when: (l) => l.beard === 'moustache', at: [0, 0.8, 0.118], size: [0.09, 0.022, 0.025] },
  // A knit hat with a turned up rim and a bobble.
  { geo: ball, mat: cloth, tint: 'accent', when: (l) => l.hat === 'beanie', at: [0, 0.91, -0.01], size: [0.27, 0.19, 0.265] },
  { geo: disc, mat: cloth, tint: 'accent', when: (l) => l.hat === 'beanie', at: [0, 0.9, -0.01], size: [0.275, 0.04, 0.27] },
  { geo: ball, mat: cloth, tint: 'accent', when: (l) => l.hat === 'beanie', at: [0, 1.01, -0.01], size: [0.07, 0.07, 0.07] },
];

export const PERSON_RIG: Part[] = [...legs, ...body, ...arms, ...head, ...hairParts];
