import * as THREE from 'three';

// Painted surfaces for the whole game (M11, M12): worn plank floors, board siding, patched metal, stone, rusty roofing, woven cloth,
// bark, pine needles, and rock. Buildings, props, and people all use them, so everything shares the look of the house.
// The textures are drawn on a canvas at start, so they are part of the code and the offline build. A surface is
// mapped from where it is in the world, not from the model, so a wall of any length never stretches the boards.

export type Surface = 'planks' | 'stone' | 'siding' | 'metal' | 'roof' | 'brick' | 'cloth' | 'bark' | 'needles' | 'rock';

const SIZE = 256;

/** A small seeded random source so every load paints the same wear. */
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
}

const grey = (v: number) => {
  const c = Math.round(Math.max(0, Math.min(255, v * 255)));
  return `rgb(${c},${Math.round(c * 0.97)},${Math.round(c * 0.92)})`;
};

function paint(kind: Surface): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SIZE;
  const g = canvas.getContext('2d')!;
  const rnd = lcg(kind.length * 7919 + kind.charCodeAt(0));
  g.fillStyle = grey(0.85);
  g.fillRect(0, 0, SIZE, SIZE);

  if (kind === 'planks') {
    // Boards run along x. Each has its own tone, a few knots, and dark gaps.
    const rows = 6;
    const h = SIZE / rows;
    for (let r = 0; r < rows; r++) {
      let x = -rnd() * 120;
      while (x < SIZE) {
        const len = 90 + rnd() * 110;
        g.fillStyle = grey(0.72 + rnd() * 0.3);
        g.fillRect(x, r * h, len, h);
        for (let i = 0; i < 9; i++) {
          g.fillStyle = `rgba(40,25,12,${0.05 + rnd() * 0.08})`;
          g.fillRect(x, r * h + rnd() * h, len, 1 + rnd() * 1.5);
        }
        if (rnd() < 0.35) {
          g.fillStyle = 'rgba(40,24,10,0.35)';
          g.beginPath();
          g.ellipse(x + rnd() * len, r * h + h / 2, 3 + rnd() * 3, 2 + rnd() * 2, 0, 0, Math.PI * 2);
          g.fill();
        }
        g.fillStyle = 'rgba(25,14,6,0.65)';
        g.fillRect(x, r * h, 1.5, h);
        x += len;
      }
      g.fillStyle = 'rgba(25,14,6,0.6)';
      g.fillRect(0, r * h, SIZE, 2);
    }
  } else if (kind === 'siding') {
    // Horizontal boards with nail heads and weathering streaks running down.
    const rows = 8;
    const h = SIZE / rows;
    for (let r = 0; r < rows; r++) {
      g.fillStyle = grey(0.68 + rnd() * 0.3);
      g.fillRect(0, r * h, SIZE, h);
      g.fillStyle = 'rgba(20,12,6,0.55)';
      g.fillRect(0, r * h, SIZE, 2);
      g.fillStyle = 'rgba(255,230,190,0.12)';
      g.fillRect(0, r * h + 2, SIZE, 2);
      for (let n = 0; n < 4; n++) {
        g.fillStyle = 'rgba(30,22,16,0.7)';
        g.fillRect(20 + n * 64 + rnd() * 10, r * h + h * 0.5, 2, 2);
      }
    }
    for (let i = 0; i < 26; i++) {
      g.fillStyle = `rgba(30,20,12,${0.04 + rnd() * 0.07})`;
      g.fillRect(rnd() * SIZE, rnd() * SIZE * 0.6, 2 + rnd() * 5, 40 + rnd() * 120);
    }
  } else if (kind === 'metal') {
    // Corrugated sheet with rust blooms and a few bolts.
    for (let x = 0; x < SIZE; x += 16) {
      g.fillStyle = grey(0.78);
      g.fillRect(x, 0, 8, SIZE);
      g.fillStyle = grey(0.95);
      g.fillRect(x + 8, 0, 8, SIZE);
    }
    for (let i = 0; i < 30; i++) {
      const x = rnd() * SIZE;
      const y = rnd() * SIZE;
      const r = 6 + rnd() * 26;
      const grad = g.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, `rgba(120,55,22,${0.35 + rnd() * 0.3})`);
      grad.addColorStop(1, 'rgba(120,55,22,0)');
      g.fillStyle = grad;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    for (let i = 0; i < 12; i++) {
      g.fillStyle = 'rgba(30,20,14,0.7)';
      g.beginPath();
      g.arc(rnd() * SIZE, rnd() * SIZE, 2.2, 0, Math.PI * 2);
      g.fill();
    }
  } else if (kind === 'roof') {
    for (let y = 0; y < SIZE; y += 20) {
      g.fillStyle = grey(0.8 + rnd() * 0.12);
      g.fillRect(0, y, SIZE, 12);
      g.fillStyle = grey(1);
      g.fillRect(0, y + 12, SIZE, 8);
    }
    for (let i = 0; i < 22; i++) {
      const x = rnd() * SIZE;
      const y = rnd() * SIZE;
      const r = 10 + rnd() * 30;
      const grad = g.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, `rgba(110,50,20,${0.3 + rnd() * 0.3})`);
      grad.addColorStop(1, 'rgba(110,50,20,0)');
      g.fillStyle = grad;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    }
  } else if (kind === 'stone') {
    // Irregular flagstones with dark mortar.
    g.fillStyle = 'rgba(20,18,22,1)';
    g.fillRect(0, 0, SIZE, SIZE);
    for (let y = 0; y < SIZE; y += 64) {
      let x = -rnd() * 40;
      while (x < SIZE) {
        const w = 40 + rnd() * 50;
        g.fillStyle = grey(0.6 + rnd() * 0.35);
        g.fillRect(x + 2, y + 2, w - 4, 60);
        x += w;
      }
    }
  } else if (kind === 'cloth') {
    // Woven threads in both directions, soft folds, and a few stitched patches.
    for (let y = 0; y < SIZE; y += 4) {
      g.fillStyle = grey(0.78 + rnd() * 0.2);
      g.fillRect(0, y, SIZE, 2);
    }
    for (let x = 0; x < SIZE; x += 4) {
      g.fillStyle = `rgba(0,0,0,${0.06 + rnd() * 0.08})`;
      g.fillRect(x, 0, 2, SIZE);
    }
    for (let i = 0; i < 7; i++) {
      const x = rnd() * SIZE;
      const grad = g.createLinearGradient(x, 0, x + 40, 0);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(0.5, `rgba(0,0,0,${0.12 + rnd() * 0.1})`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grad;
      g.fillRect(x, 0, 40, SIZE);
    }
    for (let i = 0; i < 3; i++) {
      const x = rnd() * (SIZE - 50);
      const y = rnd() * (SIZE - 50);
      g.fillStyle = grey(0.62 + rnd() * 0.2);
      g.fillRect(x, y, 34 + rnd() * 16, 30 + rnd() * 14);
      g.strokeStyle = 'rgba(30,20,12,0.6)';
      g.setLineDash([4, 3]);
      g.strokeRect(x + 2, y + 2, 30, 26);
    }
  } else if (kind === 'bark') {
    // Furrows running up the trunk and rough scales between them.
    for (let x = 0; x < SIZE; x += 6) {
      g.fillStyle = grey(0.62 + rnd() * 0.34);
      g.fillRect(x, 0, 6, SIZE);
      g.fillStyle = `rgba(20,10,4,${0.35 + rnd() * 0.35})`;
      g.fillRect(x + rnd() * 3, 0, 1 + rnd() * 1.5, SIZE);
    }
    for (let i = 0; i < 90; i++) {
      g.fillStyle = `rgba(20,10,4,${0.12 + rnd() * 0.2})`;
      g.fillRect(rnd() * SIZE, rnd() * SIZE, 2 + rnd() * 4, 6 + rnd() * 18);
    }
  } else if (kind === 'needles') {
    // Dense short strokes in two tones, like layers of pine needles with snow dust.
    g.fillStyle = grey(0.55);
    g.fillRect(0, 0, SIZE, SIZE);
    for (let i = 0; i < 1400; i++) {
      const x = rnd() * SIZE;
      const y = rnd() * SIZE;
      g.strokeStyle = rnd() < 0.7 ? grey(0.4 + rnd() * 0.3) : grey(0.85 + rnd() * 0.15);
      g.lineWidth = 1 + rnd();
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + (rnd() - 0.5) * 10, y + 4 + rnd() * 8);
      g.stroke();
    }
  } else if (kind === 'rock') {
    // Speckled stone with faint cracks and lighter facets.
    g.fillStyle = grey(0.7);
    g.fillRect(0, 0, SIZE, SIZE);
    for (let i = 0; i < 24; i++) {
      g.fillStyle = grey(0.55 + rnd() * 0.45);
      g.beginPath();
      const cx = rnd() * SIZE;
      const cy = rnd() * SIZE;
      for (let k = 0; k < 5; k++) g.lineTo(cx + Math.cos(k * 1.26) * (14 + rnd() * 26), cy + Math.sin(k * 1.26) * (14 + rnd() * 26));
      g.fill();
    }
    for (let i = 0; i < 420; i++) {
      g.fillStyle = `rgba(0,0,0,${0.08 + rnd() * 0.18})`;
      g.fillRect(rnd() * SIZE, rnd() * SIZE, 1.5, 1.5);
    }
    for (let i = 0; i < 8; i++) {
      g.strokeStyle = 'rgba(15,12,14,0.5)';
      g.lineWidth = 1.2;
      g.beginPath();
      let x = rnd() * SIZE;
      let y = rnd() * SIZE;
      g.moveTo(x, y);
      for (let k = 0; k < 5; k++) g.lineTo((x += (rnd() - 0.5) * 40), (y += (rnd() - 0.2) * 30));
      g.stroke();
    }
  } else {
    // Brick courses.
    for (let y = 0, row = 0; y < SIZE; y += 32, row++) {
      for (let x = row % 2 ? -32 : 0; x < SIZE; x += 64) {
        g.fillStyle = grey(0.7 + rnd() * 0.3);
        g.fillRect(x + 2, y + 2, 60, 28);
      }
    }
  }
  return canvas;
}

const textures = new Map<Surface, THREE.CanvasTexture>();

export function surfaceTexture(kind: Surface): THREE.CanvasTexture {
  let t = textures.get(kind);
  if (!t) {
    t = new THREE.CanvasTexture(paint(kind));
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    textures.set(kind, t);
  }
  return t;
}

/** How many world units one copy of each texture covers. */
const SPAN: Record<Surface, number> = { planks: 1.2, stone: 1.6, siding: 1.15, metal: 1.0, roof: 1.2, brick: 1.4, cloth: 0.8, bark: 0.7, needles: 1.1, rock: 1.3 };

/**
 * Adds the painted surface to a standard shader. The texture is mapped from where a fragment is in the world, along the side the face
 * looks at, and it multiplies the diffuse color. With grounded the surface darkens near the ground, so buildings sit in the snow.
 * Works with instancing.
 */
export function injectSurface(shader: { uniforms: Record<string, { value: unknown }>; vertexShader: string; fragmentShader: string }, kind: Surface, grounded = false): void {
  shader.uniforms.uSurface = { value: surfaceTexture(kind) };
  shader.uniforms.uSpan = { value: SPAN[kind] };
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vSurfPos;\nvarying vec3 vSurfNor;')
    .replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
vec4 surfP = vec4(transformed, 1.0);
vec3 surfN = objectNormal;
#ifdef USE_INSTANCING
surfP = instanceMatrix * surfP;
surfN = mat3(instanceMatrix) * surfN;
#endif
vSurfPos = (modelMatrix * surfP).xyz;
vSurfNor = normalize(mat3(modelMatrix) * surfN);`,
    );
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vSurfPos;\nvarying vec3 vSurfNor;\nuniform sampler2D uSurface;\nuniform float uSpan;')
    .replace(
      '#include <alphatest_fragment>',
      `vec3 sAbs = abs(normalize(vSurfNor));
vec2 sUv = sAbs.y > 0.6 ? vSurfPos.xz : (sAbs.x > sAbs.z ? vSurfPos.zy : vSurfPos.xy);
diffuseColor.rgb *= texture2D(uSurface, sUv / uSpan).rgb * 1.18;
${grounded ? 'diffuseColor.rgb *= mix(0.6, 1.0, smoothstep(0.0, 0.5, vSurfPos.y));' : ''}
#include <alphatest_fragment>`,
    );
}

/**
 * The painted surface for a part of a moving figure. The texture is mapped from the part's own shape, scaled to world size, so it
 * travels with the limb instead of sliding over it. Works with instancing.
 */
export function injectLocalSurface(shader: { uniforms: Record<string, { value: unknown }>; vertexShader: string; fragmentShader: string }, kind: Surface): void {
  shader.uniforms.uSurface = { value: surfaceTexture(kind) };
  shader.uniforms.uSpan = { value: SPAN[kind] };
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vSurfPos;\nvarying vec3 vSurfNor;')
    .replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
vec3 surfScale = vec3(1.0);
#ifdef USE_INSTANCING
surfScale = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
#endif
vSurfPos = transformed * surfScale;
vSurfNor = objectNormal;`,
    );
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vSurfPos;\nvarying vec3 vSurfNor;\nuniform sampler2D uSurface;\nuniform float uSpan;')
    .replace(
      '#include <alphatest_fragment>',
      `vec3 sAbs = abs(normalize(vSurfNor));
vec2 sUv = sAbs.y > 0.6 ? vSurfPos.xz : (sAbs.x > sAbs.z ? vSurfPos.zy : vSurfPos.xy);
diffuseColor.rgb *= texture2D(uSurface, sUv / uSpan).rgb * 1.18;
#include <alphatest_fragment>`,
    );
}

/**
 * A standard material that takes its surface from a painted texture, mapped by world position along the side the face looks at.
 * Instance colors tint it, so one mesh can hold boards of many tones. A color tints the whole material.
 */
export function createSurfaceMaterial(kind: Surface, options: { roughness?: number; transparent?: boolean; color?: THREE.Color; grounded?: boolean; flat?: boolean } = {}): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({
    roughness: options.roughness ?? 0.9,
    transparent: options.transparent ?? false,
    metalness: kind === 'metal' ? 0.15 : 0,
    flatShading: options.flat ?? false,
  });
  if (options.color) mat.color.copy(options.color);
  mat.onBeforeCompile = (shader) => injectSurface(shader, kind, options.grounded ?? false);
  return mat;
}
