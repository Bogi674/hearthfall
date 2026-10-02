import type { CameraRig } from '../render/camera';

// Camera input: WASD or arrows to pan, middle mouse drag to pan, scroll to zoom, Q and E to rotate.

const PAN_SPEED = 24;

export interface CameraControls {
  update(dt: number): void;
}

export function bindCameraControls(rig: CameraRig, canvas: HTMLCanvasElement): CameraControls {
  const held = new Set<string>();
  let dragging = false;

  window.addEventListener('keydown', (e) => {
    held.add(e.code);
    if (e.code === 'KeyQ') rig.rotate(-1);
    if (e.code === 'KeyE') rig.rotate(1);
  });
  window.addEventListener('keyup', (e) => held.delete(e.code));
  window.addEventListener('blur', () => held.clear());

  canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      rig.zoomBy(e.deltaY < 0 ? 1.1 : 1 / 1.1);
    },
    { passive: false },
  );
  canvas.addEventListener('mousedown', (e) => {
    if (e.button !== 1) return;
    e.preventDefault();
    dragging = true;
  });
  window.addEventListener('mouseup', (e) => {
    if (e.button === 1) dragging = false;
  });
  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const k = rig.unitsPerPixel(canvas.clientHeight);
    rig.pan(-e.movementX * k, e.movementY * k);
  });

  return {
    update(dt) {
      const step = (PAN_SPEED * dt) / rig.camera.zoom;
      let right = 0;
      let up = 0;
      if (held.has('KeyA') || held.has('ArrowLeft')) right -= step;
      if (held.has('KeyD') || held.has('ArrowRight')) right += step;
      if (held.has('KeyW') || held.has('ArrowUp')) up += step;
      if (held.has('KeyS') || held.has('ArrowDown')) up -= step;
      if (right !== 0 || up !== 0) rig.pan(right, up);
    },
  };
}
