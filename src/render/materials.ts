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
 * Instance color red holds coldness from 0 to 1, green holds a brightness variation, and blue is 0 under fog of war.
 * Cold props shift to the cold tint and gather snow on upward faces.
 */
export function createPropMaterial(warm: THREE.Color, cold: THREE.Color, snow: boolean): THREE.MeshStandardMaterial {
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
  if (vColor.b < 0.5) discard;
  float hfCold = vColor.r;
  diffuseColor.rgb = mix(uWarmTint, uColdTint, hfCold) * (0.75 + 0.5 * vColor.g);
  diffuseColor.rgb = mix(diffuseColor.rgb, uSnow, smoothstep(0.3, 0.7, vHfUp) * hfCold);
`,
      );
  };
  return material;
}
