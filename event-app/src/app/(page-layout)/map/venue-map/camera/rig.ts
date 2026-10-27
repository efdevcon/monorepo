import { MathUtils, MOUSE, OrthographicCamera, PerspectiveCamera, Plane, Raycaster, Spherical, TOUCH, Vector2, Vector3 } from "three";

/** The two cameras R3F can mount; both carry near/far/zoom. */
export type MapCamera = OrthographicCamera | PerspectiveCamera;
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { GroundBounds } from "../data/planSchema";
import { DESKTOP_SHIFT_PX, FIT_MARGIN, GROUP_FIT_MARGIN, MAX_ZOOM_FACTOR, MAX_ZOOM_FACTOR_MOBILE, MIN_ZOOM_FACTOR, ORTHO_RADIUS, PHONE_FIT_GUTTER_PX, PHONE_LABEL_ROOM_PX, PHONE_STACK_LIFT_PX, POLAR_ANGLE, START_AZIMUTH, TOUCH_PAN_SPEED } from "./constants";
import { fitZoom, projectedExtent } from "./fit";
import { easeOutCubic, progress, type Easing } from "./tween";

export type ViewState = { target: Vector3; azimuth: number; polar: number; zoom: number; radius: number };
type Tween = { from: ViewState; to: ViewState; start: number; duration: number; ease: Easing };

export type RigEnv = {
  /** Viewport in CSS px. */
  size: { width: number; height: number };
  /** Floors stacked (the stack's height in metres, lowest to highest rest pose) or null when one floor shows: widens the fit. */
  stack: { span: number } | null;
  /** The open floor's own ground bounds (the whole-floor views fit and centre on it; the south-band floors sit low in the building's box otherwise), null while stacked. */
  floorBounds: GroundBounds | null;
  desktop: boolean;
  rotateLeftDeg: number;
  rotateRightDeg: number;
};

/**
 * The orbit camera of the venue map as one imperative object: horizontal
 * rotation only (polar pinned to the isometric tilt), azimuth clamped around
 * the start view, pan along the floor and never off it, wheel / pinch zoom on
 * the pointer, tweens for every programmatic move. Mouse: drag rotates,
 * right-drag pans. Touch: one finger pans, two fingers rotate and pinch-zoom.
 *
 * During a tween the rig writes the camera directly and skips
 * `controls.update()`, so the controls' per-frame zoom clamp never snaps a
 * tween that starts outside freshly tightened clamps. A grab (`start`)
 * interrupts the tween, applies the destination clamps and marks the camera
 * touched; a resize re-fits and re-applies the start pose only while untouched.
 */
export class CameraRigController {
  readonly controls: OrbitControls;
  private tween: Tween | null = null;
  private fit = { zoom: 1, radius: ORTHO_RADIUS };
  touched = false;
  env: RigEnv;
  /** Called when the user grabs, scrolls, pinches or double-taps. */
  onInteract: (() => void) | null = null;
  private readonly raycaster = new Raycaster();
  private readonly floorPlane = new Plane(new Vector3(0, 1, 0), 0);

  constructor(
    readonly camera: MapCamera,
    readonly element: HTMLElement,
    readonly bounds: GroundBounds,
    env: RigEnv,
    private readonly invalidate: () => void
  ) {
    this.env = env;
    const controls = new OrbitControls(camera, element);
    this.controls = controls;
    controls.cursorStyle = "grab";
    controls.enableDamping = true;
    controls.dampingFactor = 0.12;
    controls.zoomToCursor = true;
    controls.rotateSpeed = 0.7;
    controls.zoomSpeed = 0.8;
    controls.screenSpacePanning = false;
    controls.mouseButtons = { LEFT: MOUSE.ROTATE, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.PAN };
    controls.touches = { ONE: TOUCH.PAN, TWO: TOUCH.DOLLY_ROTATE };
    controls.addEventListener("change", this.invalidate);
    controls.addEventListener("start", this.interrupt);
    camera.near = 1;
    camera.far = 4000;
    this.applyEnv();
    this.refit();
    this.applyView(this.startView());
  }

  dispose() {
    this.controls.removeEventListener("change", this.invalidate);
    this.controls.removeEventListener("start", this.interrupt);
    this.controls.dispose();
  }

  get isOrtho() {
    return this.camera instanceof OrthographicCamera;
  }

  /** The user took the camera: drop any tween, restore strict clamps, remember it. */
  private interrupt = () => {
    this.touched = true;
    this.onInteract?.();
    if (this.tween) {
      this.tween = null;
      this.applyZoomClamps();
    }
  };

  /** Azimuth clamps and pan speed follow the environment. */
  applyEnv() {
    const c = this.controls;
    c.panSpeed = this.env.desktop ? 1 : TOUCH_PAN_SPEED;
    c.minAzimuthAngle = START_AZIMUTH - MathUtils.degToRad(this.env.rotateLeftDeg);
    c.maxAzimuthAngle = START_AZIMUTH + MathUtils.degToRad(this.env.rotateRightDeg);
  }

  /** What the whole-floor views frame: the building while stacked, the open floor alone otherwise. */
  private viewBounds(): GroundBounds {
    return this.env.stack ? this.bounds : (this.env.floorBounds ?? this.bounds);
  }

  /**
   * Zoom (ortho) or distance (perspective) at which the floor, or the stack, fits the viewport at `azimuth`.
   * Desktop keeps FIT_MARGIN all round; phones fit the width to the gutters (the stack leaves the
   * labels' column on the right) and only the height to the margin.
   */
  computeFit(azimuth = START_AZIMUTH) {
    const { size, stack, desktop } = this.env;
    const spread = stack ? stack.span / 2 : 0;
    const extent = projectedExtent(this.viewBounds(), -spread, spread, azimuth, POLAR_ANGLE);
    if (this.isOrtho) {
      if (desktop) return { zoom: fitZoom(extent, size, FIT_MARGIN), radius: ORTHO_RADIUS };
      const width = size.width - PHONE_FIT_GUTTER_PX - (stack ? PHONE_LABEL_ROOM_PX : PHONE_FIT_GUTTER_PX);
      return { zoom: Math.min(width / extent.width, (size.height * FIT_MARGIN) / extent.height), radius: ORTHO_RADIUS };
    }
    const cam = this.camera as PerspectiveCamera;
    const fov = MathUtils.degToRad(cam.fov);
    const visibleH = Math.max(extent.height, extent.width / (size.width / size.height)) / FIT_MARGIN;
    return { zoom: 1, radius: visibleH / (2 * Math.tan(fov / 2)) };
  }

  refit(azimuth = START_AZIMUTH) {
    this.fit = this.computeFit(azimuth);
    this.applyZoomClamps();
  }

  applyZoomClamps() {
    const c = this.controls;
    const maxFactor = this.env.desktop ? MAX_ZOOM_FACTOR : MAX_ZOOM_FACTOR_MOBILE;
    if (this.isOrtho) {
      c.minZoom = this.fit.zoom * MIN_ZOOM_FACTOR;
      c.maxZoom = this.fit.zoom * maxFactor;
    } else {
      c.minDistance = this.fit.radius / maxFactor;
      c.maxDistance = this.fit.radius / MIN_ZOOM_FACTOR;
    }
  }

  /**
   * Orbit target of the whole-floor views: the centre of what is framed
   * (the building or the open floor), pushed along the camera's right vector
   * on phones while stacked (the floor labels' column sits in the right
   * gutter, so the stack is centred in the band left of it) and towards the
   * camera there too (the stack sits higher, clear of the floor slider), and
   * away from the camera on desktop (the view sits lower, centred between the
   * legend strip and the bottom controls). In ortho, zoom is screen px per
   * world unit, so the shifts are exact in px.
   */
  homeTarget(azimuth: number, zoom: number, stacked: boolean): Vector3 {
    const b = this.viewBounds();
    const t = new Vector3((b.minX + b.maxX) / 2, 0, (b.minZ + b.maxZ) / 2);
    if (!this.isOrtho || zoom <= 0) return t;
    if (stacked && !this.env.desktop) {
      const shift = (PHONE_LABEL_ROOM_PX - PHONE_FIT_GUTTER_PX) / 2 / zoom;
      t.x += Math.cos(azimuth) * shift;
      t.z -= Math.sin(azimuth) * shift;
      if (this.env.size.height > this.env.size.width) {
        // Portrait only: in landscape the height is the fit's constraint and the stack is centred.
        const lift = PHONE_STACK_LIFT_PX / (zoom * Math.cos(POLAR_ANGLE));
        t.x += Math.sin(azimuth) * lift;
        t.z += Math.cos(azimuth) * lift;
      }
    }
    if (this.env.desktop) {
      const shift = DESKTOP_SHIFT_PX / (zoom * Math.cos(POLAR_ANGLE));
      t.x -= Math.sin(azimuth) * shift;
      t.z -= Math.cos(azimuth) * shift;
    }
    return t;
  }

  startView(): ViewState {
    return { target: this.homeTarget(START_AZIMUTH, this.fit.zoom, this.env.stack !== null), azimuth: START_AZIMUTH, polar: POLAR_ANGLE, zoom: this.fit.zoom, radius: this.fit.radius };
  }

  /** The fitted view at the user's current rotation (floor changes keep the turn). */
  settledView(): ViewState {
    const cur = this.currentView();
    this.refit(cur.azimuth);
    return { target: this.homeTarget(cur.azimuth, this.fit.zoom, this.env.stack !== null), azimuth: cur.azimuth, polar: POLAR_ANGLE, zoom: this.fit.zoom, radius: this.fit.radius };
  }

  currentView(): ViewState {
    const c = this.controls;
    return { target: c.target.clone(), azimuth: c.getAzimuthalAngle(), polar: c.getPolarAngle(), zoom: this.camera.zoom, radius: this.camera.position.distanceTo(c.target) };
  }

  applyView(v: ViewState) {
    const c = this.controls;
    c.target.copy(v.target);
    c.minPolarAngle = v.polar;
    c.maxPolarAngle = v.polar;
    this.camera.position.copy(v.target).add(new Vector3().setFromSpherical(new Spherical(v.radius, v.polar, v.azimuth)));
    if (this.isOrtho) {
      this.camera.zoom = v.zoom;
      (this.camera as OrthographicCamera).updateProjectionMatrix();
    }
    c.update();
    this.invalidate();
  }

  tweenTo(to: ViewState, duration: number, ease: Easing = easeOutCubic) {
    const from = this.currentView();
    this.tween = { from, to, start: performance.now(), duration, ease };
    // Loosen the clamps to span both ends until it lands (update() would snap the camera otherwise).
    const c = this.controls;
    c.minZoom = Math.min(c.minZoom, from.zoom, to.zoom);
    c.maxZoom = Math.max(c.maxZoom, from.zoom, to.zoom);
    c.minDistance = Math.min(c.minDistance, from.radius, to.radius);
    c.maxDistance = Math.max(c.maxDistance, from.radius, to.radius);
    this.invalidate();
  }

  /** Back to the start pose: untouched again, so the next resize re-applies it. */
  reset(duration: number, ease: Easing) {
    this.touched = false;
    this.refit();
    this.tweenTo(this.startView(), duration, ease);
  }

  /** Re-fit after a floor change on the floors' clock, keeping the user's rotation. */
  settle(duration: number, ease: Easing) {
    this.tweenTo(this.settledView(), duration, ease);
  }

  /** The viewport changed: re-fit, and re-apply the start pose while the user has not taken the camera. */
  resize() {
    this.refit();
    if (!this.touched && this.env.size.width > 0) this.applyView(this.startView());
    else this.controls.update();
    this.invalidate();
  }

  /**
   * Centre on a footprint (or fit a group's ground rectangle, never closer
   * than the single-footprint zoom nor wider than the floor fit) and zoom past the fit.
   */
  focus(target: [number, number], zoomFactor: number, groupBounds: GroundBounds | null, duration: number, ease: Easing) {
    this.touched = true;
    const c = this.controls;
    const t = new Vector3(MathUtils.clamp(target[0], this.bounds.minX, this.bounds.maxX), 0, MathUtils.clamp(target[1], this.bounds.minZ, this.bounds.maxZ));
    const cur = this.currentView();
    let zoom = this.isOrtho ? Math.min(c.maxZoom, this.fit.zoom * zoomFactor) : cur.zoom;
    if (this.isOrtho && groupBounds) {
      const diagonal = Math.hypot(groupBounds.maxX - groupBounds.minX, groupBounds.maxZ - groupBounds.minZ);
      const groupZoom = (Math.min(this.env.size.width, this.env.size.height) / Math.max(diagonal, 1e-3)) * GROUP_FIT_MARGIN;
      zoom = MathUtils.clamp(groupZoom, this.fit.zoom, zoom);
    }
    const radius = this.isOrtho ? this.fit.radius : Math.max(c.minDistance, this.fit.radius / zoomFactor);
    this.tweenTo({ target: t, azimuth: START_AZIMUTH, polar: POLAR_ANGLE, zoom, radius }, duration, ease);
  }

  /** Double-click / double-tap: zoom in by `step`, keeping the tapped floor point under the pointer. */
  zoomAt(clientX: number, clientY: number, step: number, duration: number) {
    const rect = this.element.getBoundingClientRect();
    const ndc = new Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const hit = new Vector3();
    if (!this.raycaster.ray.intersectPlane(this.floorPlane, hit)) return;
    const c = this.controls;
    const cur = this.currentView();
    this.touched = true;
    this.onInteract?.();
    const zoom = this.isOrtho ? Math.min(c.maxZoom, cur.zoom * step) : cur.zoom;
    const radius = this.isOrtho ? cur.radius : Math.max(c.minDistance, cur.radius / step);
    const factor = this.isOrtho ? zoom / cur.zoom : cur.radius / radius;
    const target = hit.clone().add(cur.target.clone().sub(hit).divideScalar(factor));
    target.x = MathUtils.clamp(target.x, this.bounds.minX, this.bounds.maxX);
    target.z = MathUtils.clamp(target.z, this.bounds.minZ, this.bounds.maxZ);
    this.tweenTo({ target, azimuth: cur.azimuth, polar: cur.polar, zoom, radius }, duration);
  }

  /** Per frame: advance the tween or let the controls damp, then keep the target on the floor. Returns true when another frame is needed. */
  tick(delta: number): boolean {
    let busy = false;
    const tween = this.tween;
    if (tween) {
      const t = progress(tween.start, tween.duration, performance.now());
      const p = tween.ease(t);
      this.applyView({
        target: tween.from.target.clone().lerp(tween.to.target, p),
        azimuth: MathUtils.lerp(tween.from.azimuth, tween.to.azimuth, p),
        polar: MathUtils.lerp(tween.from.polar, tween.to.polar, p),
        zoom: MathUtils.lerp(tween.from.zoom, tween.to.zoom, p),
        radius: MathUtils.lerp(tween.from.radius, tween.to.radius, p),
      });
      if (t >= 1) {
        this.tween = null;
        this.applyZoomClamps();
      }
      busy = true;
    } else if (this.controls.update(delta)) busy = true;
    const t = this.controls.target;
    const dx = MathUtils.clamp(t.x, this.bounds.minX, this.bounds.maxX) - t.x;
    const dz = MathUtils.clamp(t.z, this.bounds.minZ, this.bounds.maxZ) - t.z;
    if (dx !== 0 || dz !== 0) {
      t.x += dx;
      t.z += dz;
      this.camera.position.x += dx;
      this.camera.position.z += dz;
      busy = true;
    }
    return busy;
  }

  get azimuth() {
    return this.controls.getAzimuthalAngle();
  }

  /** Debug snapshot (window.__mapCamera). */
  snapshot() {
    return {
      zoom: this.camera.zoom,
      position: this.camera.position.toArray(),
      target: this.controls.target.toArray(),
      azimuth: this.controls.getAzimuthalAngle(),
      polar: this.controls.getPolarAngle(),
      size: [this.env.size.width, this.env.size.height],
      canvas: [(this.element as HTMLCanvasElement).width, (this.element as HTMLCanvasElement).height, this.element.clientWidth, this.element.clientHeight],
    };
  }
}
