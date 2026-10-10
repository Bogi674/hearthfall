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
  // A slight pull of the colors apart toward the edges, like an old lens.
  vec2 off = (vUv - 0.5) * 0.0016;
  vec4 color = vec4(texture2D(tDiffuse, vUv + off).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - off).b, 1.0);
  vec2 c = (vUv - 0.5) * vec2(uAspect, 1.0);
  // Grade: shadows lean cold and blue, highlights lean warm and gold, so the lit camp glows against the dark around it.
  float luma = dot(color.rgb, vec3(0.299, 0.587, 0.114));
  vec3 coldShadow = vec3(0.82, 0.93, 1.12);
  vec3 warmLight = vec3(1.1, 1.0, 0.86);
  color.rgb *= mix(coldShadow, warmLight, smoothstep(0.08, 0.7, luma));
  color.rgb = mix(vec3(luma), color.rgb, 1.08);
  float vignette = smoothstep(1.1, 0.3, length(c));
  color.rgb *= mix(0.32, 1.0, vignette);
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
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.55, 0.5, 0.95);
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
