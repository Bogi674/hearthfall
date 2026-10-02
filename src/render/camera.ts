import * as THREE from 'three';

// Orthographic camera at a classic isometric angle (section 12.1).
// Rotation snaps in 90 degree steps and eases between them.

const VIEW_HEIGHT = 32;
const DISTANCE = 80;
const ELEVATION = Math.atan(1 / Math.SQRT2);
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;

export class CameraRig {
  readonly camera: THREE.OrthographicCamera;
  readonly target = new THREE.Vector3();
  private yaw = Math.PI / 4;
  private targetYaw = Math.PI / 4;

  constructor(private readonly bounds: number) {
    const h = VIEW_HEIGHT / 2;
    this.camera = new THREE.OrthographicCamera(-h, h, h, -h, 0.1, 400);
  }

  setAspect(aspect: number): void {
    const h = VIEW_HEIGHT / 2;
    this.camera.left = -h * aspect;
    this.camera.right = h * aspect;
    this.camera.updateProjectionMatrix();
  }

  /** Screen pixels per world unit at the current zoom. */
  pixelsPerUnit(viewportHeight: number): number {
    return (viewportHeight / VIEW_HEIGHT) * this.camera.zoom;
  }

  rotate(steps: number): void {
    this.targetYaw += steps * (Math.PI / 2);
  }

  zoomBy(factor: number): void {
    this.camera.zoom = THREE.MathUtils.clamp(this.camera.zoom * factor, MIN_ZOOM, MAX_ZOOM);
    this.camera.updateProjectionMatrix();
  }

  /** Pans in screen space. Right and up are in world units along the current view. */
  pan(right: number, up: number): void {
    const rightX = Math.cos(this.yaw);
    const rightZ = -Math.sin(this.yaw);
    const fwdX = -Math.sin(this.yaw);
    const fwdZ = -Math.cos(this.yaw);
    // The ground is foreshortened, so moving up on screen covers more ground.
    const k = 1 / Math.sin(ELEVATION);
    this.target.x = THREE.MathUtils.clamp(this.target.x + rightX * right + fwdX * up * k, -this.bounds, this.bounds);
    this.target.z = THREE.MathUtils.clamp(this.target.z + rightZ * right + fwdZ * up * k, -this.bounds, this.bounds);
  }

  /** World units per screen pixel, for mouse drag panning. */
  unitsPerPixel(viewportHeight: number): number {
    return 1 / this.pixelsPerUnit(viewportHeight);
  }

  update(dt: number): void {
    this.yaw += (this.targetYaw - this.yaw) * Math.min(1, dt * 10);
    const flat = Math.cos(ELEVATION) * DISTANCE;
    this.camera.position.set(
      this.target.x + Math.sin(this.yaw) * flat,
      this.target.y + Math.sin(ELEVATION) * DISTANCE,
      this.target.z + Math.cos(this.yaw) * flat,
    );
    this.camera.lookAt(this.target);
  }
}
