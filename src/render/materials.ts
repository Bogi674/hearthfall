import * as THREE from 'three';
import type { LookColor } from '../data/looks';
import { injectSurface, type Surface } from './surfaces';

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

/**
 * Character tones for colonist looks (src/data/looks.ts). Natural skin, hair, and cloth colors go
 * beyond the eight palette colors, so they are kept muted and slightly warm to sit with the palette.
 */
export const LOOK_COLORS: Record<LookColor, THREE.Color> = {
  skinFair: new THREE.Color('#E8BFA0'),
  skinLight: new THREE.Color('#D9A27E'),
  skinTan: new THREE.Color('#B87B55'),
  skinBrown: new THREE.Color('#8A5A3C'),
  skinDeep: new THREE.Color('#5C3A28'),
  hairBlack: new THREE.Color('#1E1A1A'),
  hairDarkBrown: new THREE.Color('#3A2619'),
  hairBrown: new THREE.Color('#5E3D26'),
  hairAuburn: new THREE.Color('#7E3B22'),
  hairRed: new THREE.Color('#A8502A'),
  hairBlonde: new THREE.Color('#D2A85E'),
  hairAsh: new THREE.Color('#B9A88A'),
  hairGrey: new THREE.Color('#A7A39C'),
  rust: new THREE.Color('#9C4A2A'),
  moss: new THREE.Color('#5A6B3A'),
  navy: new THREE.Color('#2E3E5C'),
  mustard: new THREE.Color('#C4932F'),
  charcoal: new THREE.Color('#3A3838'),
  plum: new THREE.Color('#5E3550'),
  teal: new THREE.Color('#2F6464'),
  cream: new THREE.Color('#D8CBB0'),
  leather: new THREE.Color('#5A3A24'),
  olive: new THREE.Color('#5E5A34'),
  denim: new THREE.Color('#3C5170'),
  wine: new THREE.Color('#6E2A2E'),
  sand: new THREE.Color('#A68E66'),
};

/** Mix of two palette colors. Derived colors are built this way so the palette stays the only source. */
export function mixPalette(a: THREE.Color, b: THREE.Color, t: number): THREE.Color {
  return a.clone().lerp(b, t);
}

/**
 * Fog thickens with distance from the hearth, not from the camera (section 12.2).
 * The hearth sits at the world origin, so the standard fog chunk is patched to use
 * the horizontal distance from the origin. Call once before any material compiles.
 */
export function installHearthFog(): void {
  THREE.ShaderChunk.fog_vertex = /* glsl */ `
#ifdef USE_FOG
  vec4 hfFogPos = vec4( transformed, 1.0 );
  #ifdef USE_INSTANCING
    hfFogPos = instanceMatrix * hfFogPos;
  #endif
  vFogDepth = length( ( modelMatrix * hfFogPos ).xz );
#endif
`;
}

/**
 * Material for instanced props that change look with warmth.
 * Instance color red holds coldness from 0 to 1, green holds a brightness variation, and blue holds fog of war
 * visibility: 1 when revealed, lower in the fog, where the prop turns to a grey silhouette, and hidden near 0.
 * Cold props shift to the cold tint and gather snow on upward faces.
 */
export function createPropMaterial(warm: THREE.Color, cold: THREE.Color, snow: boolean, surface?: Surface): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({ roughness: 0.95, metalness: 0, flatShading: true });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uWarmTint = { value: warm };
    shader.uniforms.uColdTint = { value: cold };
    shader.uniforms.uSnow = { value: snow ? PALETTE.frost.clone().multiplyScalar(0.7) : cold };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying float vHfUp;')
      .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\nvHfUp = objectNormal.y;');
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nvarying float vHfUp;\nuniform vec3 uWarmTint;\nuniform vec3 uColdTint;\nuniform vec3 uSnow;',
      )
      .replace(
        '#include <color_fragment>',
        /* glsl */ `
  if (vColor.b < 0.03) discard;
  float hfCold = vColor.r;
  diffuseColor.rgb = mix(uWarmTint, uColdTint, hfCold) * (0.75 + 0.5 * vColor.g);
  diffuseColor.rgb = mix(diffuseColor.rgb, uSnow, smoothstep(0.3, 0.7, vHfUp) * hfCold);
  if (vColor.b < 0.99) diffuseColor.rgb = vec3(dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11))) * (0.15 + 0.45 * vColor.b);
`,
      );
    // The painted surface of the house, so trees, rubble, and ruins share its look.
    if (surface) injectSurface(shader, surface);
  };
  return material;
}
