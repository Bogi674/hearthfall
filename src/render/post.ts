import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// Bloom on bright emissive surfaces, ACES tone mapping in the output pass, then vignette and film grain.

const VignetteGrainShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uAspect: { value: 1 },
  },
  vertexShader: /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`,
  fragmentShader: /* glsl */ `
uniform sampler2D tDiffuse;
uniform float uTime;
uniform float uAspect;
varying vec2 vUv;
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  vec4 color = texture2D(tDiffuse, vUv);
  vec2 c = (vUv - 0.5) * vec2(uAspect, 1.0);
  float vignette = smoothstep(1.05, 0.35, length(c));
  color.rgb *= mix(0.45, 1.0, vignette);
  color.rgb += (hash(vUv * 1000.0 + fract(uTime) * 100.0) - 0.5) * 0.035;
  gl_FragColor = color;
}
`,
};

export interface Post {
  render(time: number): void;
  setSize(width: number, height: number): void;
}

export function createPost(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera): Post {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.7, 0.5, 0.9);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const grain = new ShaderPass(VignetteGrainShader);
  composer.addPass(grain);

  return {
    render(time) {
      grain.uniforms.uTime.value = time;
      composer.render();
    },
    setSize(width, height) {
      composer.setSize(width, height);
      grain.uniforms.uAspect.value = width / height;
    },
  };
}
