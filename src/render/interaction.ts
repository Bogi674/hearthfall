import * as THREE from 'three';
import type { Target } from '../input/pick';
import { PALETTE } from './materials';

// Glow frames for what the cursor is over and what is selected, and a ring that expands on a click (section 14.2).
// These are drawn on the ground around the thing. They only read state and never change the simulation.

const AMBER = PALETTE.lantern.clone().multiplyScalar(1.7);
const THICK = 0.07;
const PULSE_SECONDS = 0.45;

interface Frame {
  group: THREE.Group;
  glow: THREE.Mesh;
  bars: THREE.Mesh[];
  material: THREE.MeshBasicMaterial;
  glowMaterial: THREE.MeshBasicMaterial;
}

function createFrame(scene: THREE.Scene): Frame {
  const material = new THREE.MeshBasicMaterial({ color: AMBER, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending });
  const glowMaterial = new THREE.MeshBasicMaterial({ color: AMBER, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, opacity: 0 });
  const box = new THREE.BoxGeometry(1, 1, 1);
  const bars = Array.from({ length: 4 }, () => new THREE.Mesh(box, material));
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), glowMaterial);
  const group = new THREE.Group();
  group.add(glow, ...bars);
  group.visible = false;
  group.renderOrder = 10;
  for (const o of [glow, ...bars]) o.renderOrder = 10;
  scene.add(group);
  return { group, glow, bars, material, glowMaterial };
}

/** Puts the frame around a target. Scale is a multiplier for the pulse. */
function place(f: Frame, t: Target, width: number, height: number, scale = 1): void {
  const [w, h] = [(t.w + 0.14) * scale, (t.h + 0.14) * scale];
  f.group.position.set(t.x - width / 2, 0.06, t.y - height / 2);
  const [top, bottom, left, right] = f.bars;
  top.scale.set(w + THICK, 0.05, THICK);
  top.position.set(0, 0, -h / 2);
  bottom.scale.set(w + THICK, 0.05, THICK);
  bottom.position.set(0, 0, h / 2);
  left.scale.set(THICK, 0.05, h + THICK);
  left.position.set(-w / 2, 0, 0);
  right.scale.set(THICK, 0.05, h + THICK);
  right.position.set(w / 2, 0, 0);
  f.glow.scale.set(w, 1, h);
}

export interface Interaction {
  /** Starts the click ring around a target. */
  click(target: Target, time: number): void;
  update(world: { map: { width: number; height: number } }, time: number, hover: Target | null, selected: Target | null): void;
}

export function createInteraction(scene: THREE.Scene): Interaction {
  const hoverFrame = createFrame(scene);
  const selectFrame = createFrame(scene);
  const pulseFrame = createFrame(scene);
  let pulse: { target: Target; at: number } | null = null;

  return {
    click(target, time) {
      pulse = { target, at: time };
    },
    update(world, time, hover, selected) {
      const { width, height } = world.map;
      // The hover frame breathes softly so it reads as alive. A selected thing keeps a steady brighter frame.
      hoverFrame.group.visible = hover !== null && !(selected && hover.id === selected.id);
      if (hover) {
        place(hoverFrame, hover, width, height, 1 + Math.sin(time * 6) * 0.015);
        const breath = 0.55 + Math.sin(time * 6) * 0.2;
        hoverFrame.material.opacity = breath;
        hoverFrame.glowMaterial.opacity = 0.1 + Math.sin(time * 6) * 0.04;
      }
      selectFrame.group.visible = selected !== null;
      if (selected) {
        place(selectFrame, selected, width, height);
        selectFrame.material.opacity = 0.95;
        selectFrame.glowMaterial.opacity = 0.14;
      }
      const age = pulse ? time - pulse.at : 1;
      pulseFrame.group.visible = pulse !== null && age < PULSE_SECONDS;
      if (pulse && age < PULSE_SECONDS) {
        const k = age / PULSE_SECONDS;
        place(pulseFrame, pulse.target, width, height, 1 + k * 0.7);
        pulseFrame.material.opacity = (1 - k) * 0.9;
        pulseFrame.glowMaterial.opacity = (1 - k) * 0.25;
      }
    },
  };
}
