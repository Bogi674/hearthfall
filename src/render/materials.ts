import * as THREE from 'three';

// Palette from section 12.3 of docs/GAME_DESIGN.md. Every render color starts here.
export const PALETTE = {
  ember: new THREE.Color('#FF9A3C'),
  lantern: new THREE.Color('#FFC56B'),
  oldWood: new THREE.Color('#6B4A32'),
  warmShadow: new THREE.Color('#2A1A14'),
  frost: new THREE.Color('#A9C4D8'),
  nightBlue: new THREE.Color('#1B2838'),
  deepCold: new THREE.Color('#0E1621'),
  blight: new THREE.Color('#8BFF6A'),
} as const;
