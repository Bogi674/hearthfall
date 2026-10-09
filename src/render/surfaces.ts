import * as THREE from 'three';

// Painted surfaces for the house (M11): worn plank floors, board siding, patched metal, stone, and rusty roofing.
// The textures are drawn on a canvas at start, so they are part of the code and the offline build. A surface is
// mapped from where it is in the world, not from the model, so a wall of any length never stretches the boards.

export type Surface = 'planks' | 'stone' | 'siding' | 'metal' | 'roof' | 'brick';

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
const SPAN: Record<Surface, number> = { planks: 1.2, stone: 1.6, siding: 1.15, metal: 1.0, roof: 1.2, brick: 1.4 };

/**
 * A standard material that takes its surface from a painted texture, mapped by world position along the side the face looks at.
 * Instance colors tint it, so one mesh can hold boards of many tones.
 */
export function createSurfaceMaterial(kind: Surface, options: { roughness?: number; transparent?: boolean } = {}): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({ roughness: options.roughness ?? 0.9, transparent: options.transparent ?? false, metalness: kind === 'metal' ? 0.15 : 0 });
  const tex = surfaceTexture(kind);
  const span = SPAN[kind];
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uSurface = { value: tex };
    shader.uniforms.uSpan = { value: span };
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
        '#include <color_fragment>',
        `#include <color_fragment>
vec3 sAbs = abs(normalize(vSurfNor));
vec2 sUv = sAbs.y > 0.6 ? vSurfPos.xz : (sAbs.x > sAbs.z ? vSurfPos.zy : vSurfPos.xy);
diffuseColor.rgb *= texture2D(uSurface, sUv / uSpan).rgb * 1.18;`,
      );
  };
  return mat;
}
