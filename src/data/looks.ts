// Colonist appearances (section 12.4). Ten designs for women and ten for men.
// Colors name entries in LOOK_COLORS in src/render/materials.ts.

export type LookColor =
  | 'skinFair' | 'skinLight' | 'skinTan' | 'skinBrown' | 'skinDeep'
  | 'hairBlack' | 'hairDarkBrown' | 'hairBrown' | 'hairAuburn' | 'hairRed' | 'hairBlonde' | 'hairAsh' | 'hairGrey'
  | 'rust' | 'moss' | 'navy' | 'mustard' | 'charcoal' | 'plum' | 'teal' | 'cream' | 'leather' | 'olive' | 'denim' | 'wine' | 'sand';

export type Hair = 'short' | 'buzz' | 'quiff' | 'long' | 'bob' | 'ponytail' | 'bun' | 'braids' | 'curly' | 'pixie' | 'bald';
export type Beard = 'none' | 'full' | 'short' | 'moustache';
export type Hat = 'none' | 'beanie';
/** A vest is worn over a sweater in the accent color. A sweater comes with a scarf in the accent color. */
export type Top = 'parka' | 'jacket' | 'sweater' | 'vest' | 'longcoat';
export type Pants = 'trousers' | 'cargo' | 'tallBoots' | 'skirt' | 'overalls';

export interface Look {
  /** Height and build scale the whole figure. Build widens it, height stretches it. */
  height: number;
  build: number;
  skin: LookColor;
  hair: Hair;
  hairColor: LookColor;
  beard: Beard;
  hat: Hat;
  top: Top;
  topColor: LookColor;
  /** Fur collar, scarf, sweater under a vest, or knit hat. */
  accent: LookColor;
  pants: Pants;
  pantsColor: LookColor;
}

const look = (l: Partial<Look> & Pick<Look, 'hair' | 'top' | 'pants'>): Look => ({
  height: 1, build: 1, skin: 'skinLight', hairColor: 'hairBrown', beard: 'none', hat: 'none',
  topColor: 'rust', accent: 'cream', pantsColor: 'charcoal', ...l,
});

export const WOMEN: Look[] = [
  look({ height: 0.96, build: 0.9, hair: 'long', hairColor: 'hairAuburn', top: 'parka', topColor: 'rust', accent: 'cream', pants: 'trousers', pantsColor: 'charcoal' }),
  look({ height: 0.98, build: 0.9, skin: 'skinBrown', hair: 'bob', hairColor: 'hairBlack', top: 'longcoat', topColor: 'navy', pants: 'tallBoots', pantsColor: 'charcoal' }),
  look({ height: 0.94, build: 0.92, skin: 'skinFair', hair: 'ponytail', hairColor: 'hairBlonde', top: 'jacket', topColor: 'moss', pants: 'cargo', pantsColor: 'sand' }),
  look({ height: 0.92, build: 0.96, hair: 'bun', hairColor: 'hairGrey', top: 'sweater', topColor: 'plum', accent: 'mustard', pants: 'skirt', pantsColor: 'wine' }),
  look({ height: 0.97, build: 0.9, skin: 'skinDeep', hair: 'braids', hairColor: 'hairDarkBrown', top: 'vest', topColor: 'olive', accent: 'cream', pants: 'trousers', pantsColor: 'denim' }),
  look({ height: 0.9, build: 0.94, skin: 'skinTan', hair: 'curly', hairColor: 'hairBlack', top: 'jacket', topColor: 'plum', pants: 'overalls', pantsColor: 'denim' }),
  look({ height: 0.95, build: 0.88, skin: 'skinFair', hair: 'pixie', hairColor: 'hairRed', top: 'sweater', topColor: 'moss', accent: 'rust', pants: 'trousers', pantsColor: 'charcoal' }),
  look({ height: 0.96, build: 0.9, hair: 'long', hairColor: 'hairBlonde', hat: 'beanie', top: 'parka', topColor: 'teal', accent: 'mustard', pants: 'cargo', pantsColor: 'olive' }),
  look({ height: 1.02, build: 0.9, skin: 'skinTan', hair: 'long', hairColor: 'hairBrown', top: 'longcoat', topColor: 'wine', pants: 'tallBoots', pantsColor: 'leather' }),
  look({ height: 0.88, build: 0.95, hair: 'bob', hairColor: 'hairAsh', top: 'parka', topColor: 'cream', accent: 'leather', pants: 'skirt', pantsColor: 'navy' }),
];

export const MEN: Look[] = [
  look({ height: 1.0, build: 1.12, hair: 'short', hairColor: 'hairBrown', beard: 'full', top: 'parka', topColor: 'olive', accent: 'cream', pants: 'cargo', pantsColor: 'sand' }),
  look({ height: 1.06, build: 1.02, skin: 'skinDeep', hair: 'buzz', hairColor: 'hairBlack', top: 'jacket', topColor: 'charcoal', pants: 'trousers', pantsColor: 'denim' }),
  look({ height: 1.02, build: 0.96, skin: 'skinFair', hair: 'quiff', hairColor: 'hairBlonde', top: 'sweater', topColor: 'navy', accent: 'rust', pants: 'trousers', pantsColor: 'leather' }),
  look({ height: 0.98, build: 1.08, hair: 'bald', hairColor: 'hairGrey', beard: 'full', top: 'vest', topColor: 'leather', accent: 'cream', pants: 'trousers', pantsColor: 'charcoal' }),
  look({ height: 1.04, build: 1.0, skin: 'skinTan', hair: 'ponytail', hairColor: 'hairDarkBrown', beard: 'short', top: 'longcoat', topColor: 'charcoal', pants: 'tallBoots', pantsColor: 'leather' }),
  look({ height: 1.0, build: 1.04, skin: 'skinFair', hair: 'curly', hairColor: 'hairRed', beard: 'short', top: 'jacket', topColor: 'mustard', pants: 'cargo', pantsColor: 'olive' }),
  look({ height: 1.03, build: 1.06, skin: 'skinBrown', hair: 'short', hairColor: 'hairBlack', beard: 'moustache', top: 'parka', topColor: 'navy', accent: 'leather', pants: 'trousers', pantsColor: 'charcoal' }),
  look({ height: 0.97, build: 1.0, hair: 'short', hairColor: 'hairAsh', hat: 'beanie', top: 'sweater', topColor: 'teal', accent: 'rust', pants: 'overalls', pantsColor: 'denim' }),
  look({ height: 1.08, build: 0.98, skin: 'skinTan', hair: 'short', hairColor: 'hairGrey', top: 'longcoat', topColor: 'moss', pants: 'trousers', pantsColor: 'charcoal' }),
  look({ height: 1.0, build: 1.18, hair: 'quiff', hairColor: 'hairAuburn', beard: 'full', top: 'vest', topColor: 'wine', accent: 'sand', pants: 'cargo', pantsColor: 'leather' }),
];

/** The look for a colonist. The name decides woman or man, and the seed shuffles which design each gets. */
export function lookFor(seed: number, nameIndex: number): Look {
  const list = nameIndex % 2 === 0 ? WOMEN : MEN;
  const n = list.length;
  return list[(((Math.floor(nameIndex / 2) + seed) % n) + n) % n];
}
