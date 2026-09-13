"use client";

import { useEffect, useRef, type MutableRefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { MathUtils, MOUSE, OrthographicCamera, PerspectiveCamera, Plane, Raycaster, Spherical, TOUCH, Vector2, Vector3 } from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { INITIAL_AZIMUTH, POLAR_ANGLE, PX, SCREEN_PX_PER_SVG_PX } from "./isoMath";
import { easeOutQuint, LEVEL_SWITCH_MS } from "./interaction";
import type { CameraFocus, CameraPose, GroundBounds, MapSettings } from "./types";

type CameraRigProps = {
  /** Floor rectangle in ground px: orbit centre and double-tap target clamp. */
  groundBounds: GroundBounds;
  /** Screen extent of the floor at the start view, in px: what "fit" means. */
  fit: { width: number; height: number };
  settings: MapSettings;
  /** Right-drag / two-finger pan in the 3D view (top-down always pans). */
  pannable: boolean;
  /** Floors stacked around y = 0 (count and world-unit gap), or null when one floor shows: widens the fit. */
  stack: { count: number; gap: number } | null;
  reducedMotion: boolean;
  /** Centre + zoom on a footprint (schedule deep link); a new `key` re-runs it. */
  focus: CameraFocus | null;
  /** Publish the camera state on window.__mapCamera for hit-testing scripts. */
  debug: boolean;
  /** Current orbit azimuth + polar angle, read every frame by the props. */
  poseRef: MutableRefObject<CameraPose>;
  /** Filled with a function that animates back to the start view (Map tab re-tap). */
  resetRef: MutableRefObject<() => void>;
};

const ORTHO_RADIUS = 60;
const FIT_MARGIN = 0.9;
/** Top-down fills the viewport's height, and the canvas runs under the sticky header: leave more room. */
const FIT_MARGIN_TOP = 0.68;
/** Share of the shorter viewport side a found group's ground diagonal may fill (the card covers the bottom). */
const GROUP_FIT_MARGIN = 0.55;
const TWEEN_MS = 350;
const DOUBLE_TAP_MS = 320;
const DOUBLE_TAP_PX = 40;
const TAP_MOVE_PX = 10;
/** Straight down; OrbitControls needs a hair above zero to keep a defined azimuth. */
const TOP_POLAR = 0.0005;

type ViewState = { target: Vector3; azimuth: number; polar: number; zoom: number; radius: number };
type Easing = (t: number) => number;
type Tween = { from: ViewState; to: ViewState; start: number; duration: number; ease: Easing };

const easeOutCubic: Easing = (t) => 1 - Math.pow(1 - t, 3);

/**
 * Orbit camera with the interaction rules of the venue map: horizontal
 * rotation only (the polar angle is pinned to the isometric tilt), clamped
 * to ±azimuthLimit around the start view, wheel/pinch zoom, double-click or
 * double-tap to zoom in on a point, and an animated reset. Panning is off so
 * the floor never drifts away.
 */
export function CameraRig({ groundBounds, fit, settings, pannable, stack, reducedMotion, focus, debug, poseRef, resetRef }: CameraRigProps) {
  const { camera, gl, size, invalidate } = useThree();
  const controlsRef = useRef<OrbitControls | null>(null);
  const tweenRef = useRef<Tween | null>(null);
  const interactedRef = useRef(false);
  const fitRef = useRef<{ zoom: number; radius: number }>({ zoom: 1, radius: ORTHO_RADIUS });
  const bounds = {
    minX: groundBounds.minX * PX,
    maxX: groundBounds.maxX * PX,
    minZ: groundBounds.minZ * PX,
    maxZ: groundBounds.maxZ * PX,
  };
  const center = new Vector3((bounds.minX + bounds.maxX) / 2, 0, (bounds.minZ + bounds.maxZ) / 2);
  const isOrtho = camera instanceof OrthographicCamera;
  const isTop = settings.view === "top";
  const targetPolar = isTop ? TOP_POLAR : POLAR_ANGLE;
  // Top-down reads like the plan drawing: X to the right, Z downwards (camera offset along +Z).
  const baseAzimuth = isTop ? 0 : INITIAL_AZIMUTH;
  // Latest per-view values for callbacks created in the mount effect (reset).
  const latest = useRef({ targetPolar, baseAzimuth, stack });
  latest.current = { targetPolar, baseAzimuth, stack };
  // Set by reset() when the view is also changing; the view effect then finishes the reset.
  const pendingResetRef = useRef(false);
  const debugRef = useRef(debug);
  debugRef.current = debug;

  // Zoom (ortho) or distance (perspective) at which the whole floor fits the viewport.
  const computeFit = (polar = targetPolar, stacked = latest.current.stack) => {
    // World extent to show: the floor's axis-aligned footprint from above, or the
    // artwork's screen extent (`fit`, measured at the isometric pitch) in 3D, plus
    // the vertical spread of the stack (world y projects at sin(polar)).
    let worldW: number;
    let worldH: number;
    if (polar < 0.01) {
      worldW = bounds.maxX - bounds.minX;
      worldH = bounds.maxZ - bounds.minZ;
    } else {
      worldW = fit.width * SCREEN_PX_PER_SVG_PX;
      worldH = ((fit.height * Math.cos(polar)) / Math.cos(POLAR_ANGLE)) * SCREEN_PX_PER_SVG_PX;
      if (stacked) worldH += (stacked.count - 1) * stacked.gap * Math.sin(polar);
    }
    const margin = polar < 0.01 ? FIT_MARGIN_TOP : FIT_MARGIN;
    if (isOrtho) {
      return { zoom: Math.min(size.width / worldW, size.height / worldH) * margin, radius: ORTHO_RADIUS };
    }
    const fov = MathUtils.degToRad((camera as PerspectiveCamera).fov);
    const aspect = size.width / size.height;
    const visibleH = Math.max(worldH, worldW / aspect) / margin;
    return { zoom: 1, radius: visibleH / (2 * Math.tan(fov / 2)) };
  };

  const applyView = (v: ViewState) => {
    const controls = controlsRef.current;
    if (!controls) return;
    controls.target.copy(v.target);
    controls.minPolarAngle = v.polar;
    controls.maxPolarAngle = v.polar;
    const offset = new Vector3().setFromSpherical(new Spherical(v.radius, v.polar, v.azimuth));
    camera.position.copy(v.target).add(offset);
    if (isOrtho) {
      camera.zoom = v.zoom;
      camera.updateProjectionMatrix();
    }
    controls.update();
    invalidate();
  };

  const currentView = (): ViewState => {
    const controls = controlsRef.current!;
    return {
      target: controls.target.clone(),
      azimuth: controls.getAzimuthalAngle(),
      polar: controls.getPolarAngle(),
      zoom: camera.zoom,
      radius: camera.position.distanceTo(controls.target),
    };
  };

  const tweenTo = (to: ViewState, duration = TWEEN_MS, ease: Easing = easeOutCubic) => {
    const from = currentView();
    tweenRef.current = { from, to, start: performance.now(), duration, ease };
    // OrbitControls.update() clamps the camera to min/max zoom every frame, so a
    // tween that starts outside freshly tightened clamps (stack → one floor) would
    // snap to the clamp before easing. Loosen them to cover both ends until it lands.
    const controls = controlsRef.current;
    if (controls) {
      controls.minZoom = Math.min(controls.minZoom, from.zoom, to.zoom);
      controls.maxZoom = Math.max(controls.maxZoom, from.zoom, to.zoom);
      controls.minDistance = Math.min(controls.minDistance, from.radius, to.radius);
      controls.maxDistance = Math.max(controls.maxDistance, from.radius, to.radius);
    }
    invalidate();
  };

  const applyZoomClamps = () => {
    const controls = controlsRef.current;
    if (!controls) return;
    if (isOrtho) {
      controls.minZoom = fitRef.current.zoom * 0.85;
      controls.maxZoom = fitRef.current.zoom * 6;
    } else {
      controls.minDistance = fitRef.current.radius / 6;
      controls.maxDistance = fitRef.current.radius * 1.2;
    }
  };

  const startView = (): ViewState => ({
    target: center.clone(),
    azimuth: latest.current.baseAzimuth,
    polar: latest.current.targetPolar,
    zoom: fitRef.current.zoom,
    radius: fitRef.current.radius,
  });

  // Create the controls once per camera.
  useEffect(() => {
    const controls = new OrbitControls(camera, gl.domElement);
    controlsRef.current = controls;
    controls.enableDamping = true;
    controls.zoomToCursor = true; // wheel / pinch zoom anchors on the pointer, not the screen centre
    controls.dampingFactor = 0.12;
    controls.rotateSpeed = 0.7;
    controls.zoomSpeed = 0.8;
    const onChange = () => invalidate();
    const onStart = () => {
      interactedRef.current = true;
      if (tweenRef.current) {
        tweenRef.current = null;
        applyZoomClamps(); // a tween loosens the clamps until it lands; the user grabbing the camera ends it early
      }
    };
    controls.addEventListener("change", onChange);
    controls.addEventListener("start", onStart);

    fitRef.current = computeFit();
    camera.near = 0.1;
    camera.far = 500;
    applyView(startView());

    resetRef.current = () => {
      interactedRef.current = false;
      pendingResetRef.current = true;
      tweenTo(startView());
    };

    return () => {
      controls.removeEventListener("change", onChange);
      controls.removeEventListener("start", onStart);
      controls.dispose();
      controlsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera, gl]);

  // Clamps follow the debug settings and the viewport.
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    // "Left" is the side that shows more of the venue's front (lower azimuth); the higher side looks at the empty back.
    controls.minAzimuthAngle = baseAzimuth - MathUtils.degToRad(settings.rotateLeftDeg);
    controls.maxAzimuthAngle = baseAzimuth + MathUtils.degToRad(settings.rotateRightDeg);
    if (isTop) {
      // Fixed orientation: the primary pointer pans, pinch / wheel zooms.
      controls.enableRotate = false;
      controls.enablePan = true;
      controls.screenSpacePanning = true;
      controls.mouseButtons = { LEFT: MOUSE.PAN, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.PAN };
      controls.touches = { ONE: TOUCH.PAN, TWO: TOUCH.DOLLY_PAN };
    } else {
      controls.enableRotate = true;
      controls.enablePan = pannable;
      controls.screenSpacePanning = false; // pan along the floor
      controls.mouseButtons = { LEFT: MOUSE.ROTATE, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.PAN };
      controls.touches = { ONE: TOUCH.ROTATE, TWO: TOUCH.DOLLY_PAN };
    }
    fitRef.current = computeFit();
    applyZoomClamps();
    if (!interactedRef.current && size.width > 0) applyView(startView());
    else controls.update();
    invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.rotateLeftDeg, settings.rotateRightDeg, size.width, size.height, isOrtho, baseAzimuth, isTop, pannable]);

  // 3D ↔ top-down: pitch the camera over the same target, square it up, and refit the zoom.
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls || size.width === 0) return;
    if (Math.abs(controls.getPolarAngle() - targetPolar) < 1e-4 && !pendingResetRef.current) return;
    fitRef.current = computeFit(targetPolar);
    applyZoomClamps();
    if (pendingResetRef.current) {
      // Re-aim the reset at the refitted start view. The flag stays up: a reset
      // that also re-stacks the floors is finished by the stack effect below
      // (same commit), otherwise the tween's landing clears it.
      tweenTo(startView());
      return;
    }
    // Recentre on the floor: a pan or cursor-anchored zoom may have moved the target off-centre.
    const cur = currentView();
    tweenTo({ ...cur, target: center.clone(), azimuth: baseAzimuth, polar: targetPolar, zoom: fitRef.current.zoom, radius: fitRef.current.radius });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetPolar]);

  // Stack ↔ single floor: refit the zoom on the floors' clock so the camera and the floors move as one.
  const stackKey = stack ? `${stack.count}:${stack.gap}` : "";
  const stackMounted = useRef(false);
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls || size.width === 0) return;
    if (!stackMounted.current) {
      stackMounted.current = true; // the mount effect already applied the start view
      return;
    }
    fitRef.current = computeFit(targetPolar, stack);
    applyZoomClamps();
    if (pendingResetRef.current) {
      // Reset from an open floor (Map-tab re-tap, Esc): resetRef tweened with the
      // floor's fit before this render, so re-aim at the stack's fit on the
      // floors' clock. Without this the stack landed at the single-floor zoom.
      pendingResetRef.current = false;
      tweenTo(startView(), reducedMotion ? 0 : LEVEL_SWITCH_MS, easeOutQuint);
      return;
    }
    if (isTop) return; // the view effect handles the tween
    const cur = currentView();
    // Flat → "All" changes the pitch in the same commit: the view effect above just
    // aimed at the 3D pitch, so aim there too (the user's rotation is meaningless
    // coming from top-down) instead of freezing the camera at the current pitch.
    const pitching = Math.abs(cur.polar - targetPolar) > 1e-4;
    tweenTo(
      { target: center.clone(), azimuth: pitching ? baseAzimuth : cur.azimuth, polar: targetPolar, zoom: fitRef.current.zoom, radius: fitRef.current.radius },
      reducedMotion ? 0 : LEVEL_SWITCH_MS,
      easeOutQuint
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stackKey]);

  // Deep link / Find: centre on the footprint and zoom past the fit. Declared
  // after the stack / view effects so, when a floor opens in the same commit,
  // this tween is the one that runs (same clock as the floors sliding in).
  useEffect(() => {
    const controls = controlsRef.current;
    if (!focus || !controls || size.width === 0) return;
    interactedRef.current = true; // a resize must not snap back to the start view
    const target = new Vector3(MathUtils.clamp(focus.x * PX, bounds.minX, bounds.maxX), 0, MathUtils.clamp(focus.z * PX, bounds.minZ, bounds.maxZ));
    const cur = currentView();
    let zoom = isOrtho ? Math.min(controls.maxZoom, fitRef.current.zoom * focus.zoom) : cur.zoom;
    if (isOrtho && focus.bounds) {
      // A group of footprints: fit its ground rectangle. The diagonal stands in for
      // the screen extent whatever the azimuth; the margin leaves room for the card.
      // Never closer than the single-footprint zoom, never wider than the floor fit.
      const diagonal = Math.hypot(focus.bounds.maxX - focus.bounds.minX, focus.bounds.maxZ - focus.bounds.minZ) * PX;
      const groupZoom = (Math.min(size.width, size.height) / Math.max(diagonal, 1e-3)) * GROUP_FIT_MARGIN;
      zoom = MathUtils.clamp(groupZoom, fitRef.current.zoom, zoom);
    }
    const radius = isOrtho ? fitRef.current.radius : Math.max(controls.minDistance, fitRef.current.radius / focus.zoom);
    tweenTo({ target, azimuth: baseAzimuth, polar: targetPolar, zoom, radius }, reducedMotion ? 0 : LEVEL_SWITCH_MS, easeOutQuint);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.key]);

  // Double-click / double-tap: zoom in on the tapped floor point.
  useEffect(() => {
    const el = gl.domElement;
    const raycaster = new Raycaster();
    const floor = new Plane(new Vector3(0, 1, 0), 0);
    let down: { x: number; y: number; t: number } | null = null;
    let lastTap: { x: number; y: number; t: number } | null = null;
    const pointers = new Set<number>();

    const zoomAt = (clientX: number, clientY: number) => {
      const controls = controlsRef.current;
      if (!controls) return;
      const rect = el.getBoundingClientRect();
      const ndc = new Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      const hit = new Vector3();
      if (!raycaster.ray.intersectPlane(floor, hit)) return;
      const cur = currentView();
      interactedRef.current = true;
      const zoom = isOrtho ? Math.min(controls.maxZoom, cur.zoom * settings.zoomStep) : cur.zoom;
      const radius = isOrtho ? cur.radius : Math.max(controls.minDistance, cur.radius / settings.zoomStep);
      // Keep the tapped floor point under the finger: move the target towards it by the zoom factor.
      const factor = isOrtho ? zoom / cur.zoom : cur.radius / radius;
      const target = hit.clone().add(cur.target.clone().sub(hit).divideScalar(factor));
      target.x = MathUtils.clamp(target.x, bounds.minX, bounds.maxX);
      target.z = MathUtils.clamp(target.z, bounds.minZ, bounds.maxZ);
      tweenTo({ target, azimuth: cur.azimuth, polar: cur.polar, zoom, radius });
    };

    const onDown = (e: PointerEvent) => {
      // A new primary pointer means every earlier one has ended, even if its
      // pointerup never reached us.
      if (e.isPrimary) pointers.clear();
      pointers.add(e.pointerId);
      // A second finger (pinch) is never a tap.
      down = pointers.size === 1 ? { x: e.clientX, y: e.clientY, t: e.timeStamp } : null;
    };
    const onUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (e.isPrimary) pointers.clear();
      if (!down || pointers.size > 0) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      const held = e.timeStamp - down.t;
      down = null;
      if (moved > TAP_MOVE_PX || held > 400) {
        lastTap = null;
        return;
      }
      if (lastTap && e.timeStamp - lastTap.t < DOUBLE_TAP_MS && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < DOUBLE_TAP_PX) {
        lastTap = null;
        zoomAt(e.clientX, e.clientY);
      } else {
        lastTap = { x: e.clientX, y: e.clientY, t: e.timeStamp };
      }
    };
    const onCancel = () => {
      pointers.clear();
      down = null;
    };
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onCancel);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onCancel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, camera, isOrtho, settings.zoomStep]);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;
    const tween = tweenRef.current;
    if (tween) {
      const t = tween.duration === 0 ? 1 : Math.min(1, (performance.now() - tween.start) / tween.duration);
      const p = tween.ease(t);
      applyView({
        target: tween.from.target.clone().lerp(tween.to.target, p),
        azimuth: MathUtils.lerp(tween.from.azimuth, tween.to.azimuth, p),
        polar: MathUtils.lerp(tween.from.polar, tween.to.polar, p),
        zoom: MathUtils.lerp(tween.from.zoom, tween.to.zoom, p),
        radius: MathUtils.lerp(tween.from.radius, tween.to.radius, p),
      });
      if (t >= 1) {
        tweenRef.current = null;
        pendingResetRef.current = false;
        applyZoomClamps(); // strict clamps again now that the camera is inside them
      }
      invalidate();
    } else if (controls.update(delta)) {
      invalidate();
    }
    // Panning never leaves the floor.
    const t = controls.target;
    const dx = MathUtils.clamp(t.x, bounds.minX, bounds.maxX) - t.x;
    const dz = MathUtils.clamp(t.z, bounds.minZ, bounds.maxZ) - t.z;
    if (dx !== 0 || dz !== 0) {
      t.x += dx;
      t.z += dz;
      camera.position.x += dx;
      camera.position.z += dz;
      invalidate();
    }
    poseRef.current.azimuth = controls.getAzimuthalAngle();
    poseRef.current.polar = controls.getPolarAngle();
    if (debugRef.current) {
      (window as unknown as { __mapCamera?: object }).__mapCamera = {
        zoom: camera.zoom,
        position: camera.position.toArray(),
        target: controls.target.toArray(),
        azimuth: poseRef.current.azimuth,
        polar: poseRef.current.polar,
        size: [size.width, size.height],
        canvas: [gl.domElement.width, gl.domElement.height, gl.domElement.clientWidth, gl.domElement.clientHeight],
      };
    }
  });

  return null;
}
