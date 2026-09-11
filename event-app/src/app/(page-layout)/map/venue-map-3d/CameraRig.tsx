"use client";

import { useEffect, useRef, type MutableRefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { MathUtils, OrthographicCamera, PerspectiveCamera, Plane, Raycaster, Spherical, Vector2, Vector3 } from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { groundBounds, INITIAL_AZIMUTH, ISO_FORESHORTENING, POLAR_ANGLE, PX, SCREEN_PX_PER_SVG_PX, VIEW_DIR } from "./isoMath";
import type { MapSettings } from "./types";

type CameraRigProps = {
  viewBox: number[];
  settings: MapSettings;
  /** Current orbit azimuth, read every frame by the upright props. */
  azimuthRef: MutableRefObject<number>;
  /** Filled with a function that animates back to the start view (Map tab re-tap). */
  resetRef: MutableRefObject<() => void>;
};

const ORTHO_RADIUS = 60;
const FIT_MARGIN = 0.9;
const TWEEN_MS = 350;
const DOUBLE_TAP_MS = 320;
const DOUBLE_TAP_PX = 40;
const TAP_MOVE_PX = 10;

type ViewState = { target: Vector3; azimuth: number; zoom: number; radius: number };

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Orbit camera with the interaction rules of the venue map: horizontal
 * rotation only (the polar angle is pinned to the isometric tilt), clamped
 * to ±azimuthLimit around the start view, wheel/pinch zoom, double-click or
 * double-tap to zoom in on a point, and an animated reset. Panning is off so
 * the floor never drifts away.
 */
export function CameraRig({ viewBox, settings, azimuthRef, resetRef }: CameraRigProps) {
  const { camera, gl, size, invalidate } = useThree();
  const controlsRef = useRef<OrbitControls | null>(null);
  const tweenRef = useRef<{ from: ViewState; to: ViewState; start: number } | null>(null);
  const interactedRef = useRef(false);
  const fitRef = useRef<{ zoom: number; radius: number }>({ zoom: 1, radius: ORTHO_RADIUS });
  const bounds = groundBounds(viewBox);
  const center = new Vector3((bounds.minX + bounds.maxX) / 2, 0, (bounds.minZ + bounds.maxZ) / 2);
  const isOrtho = camera instanceof OrthographicCamera;

  // Zoom (ortho) or distance (perspective) at which the whole floor fits the viewport.
  const computeFit = () => {
    const [, , w, h] = viewBox;
    if (isOrtho) {
      const k = Math.min(size.width / w, size.height / h) * FIT_MARGIN;
      return { zoom: k / SCREEN_PX_PER_SVG_PX, radius: ORTHO_RADIUS };
    }
    const fov = MathUtils.degToRad((camera as PerspectiveCamera).fov);
    const aspect = size.width / size.height;
    const worldH = (Math.max(h * PX, (w * PX) / aspect) * ISO_FORESHORTENING) / FIT_MARGIN;
    return { zoom: 1, radius: worldH / (2 * Math.tan(fov / 2)) };
  };

  const applyView = (v: ViewState) => {
    const controls = controlsRef.current;
    if (!controls) return;
    controls.target.copy(v.target);
    const offset = new Vector3().setFromSpherical(new Spherical(v.radius, POLAR_ANGLE, v.azimuth));
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
      zoom: camera.zoom,
      radius: camera.position.distanceTo(controls.target),
    };
  };

  const tweenTo = (to: ViewState) => {
    tweenRef.current = { from: currentView(), to, start: performance.now() };
    invalidate();
  };

  const startView = (): ViewState => ({
    target: center.clone(),
    azimuth: INITIAL_AZIMUTH,
    zoom: fitRef.current.zoom,
    radius: fitRef.current.radius,
  });

  // Create the controls once per camera.
  useEffect(() => {
    const controls = new OrbitControls(camera, gl.domElement);
    controlsRef.current = controls;
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.12;
    controls.rotateSpeed = 0.7;
    controls.zoomSpeed = 0.8;
    controls.minPolarAngle = POLAR_ANGLE;
    controls.maxPolarAngle = POLAR_ANGLE;
    const onChange = () => invalidate();
    const onStart = () => {
      interactedRef.current = true;
      tweenRef.current = null;
    };
    controls.addEventListener("change", onChange);
    controls.addEventListener("start", onStart);

    fitRef.current = computeFit();
    camera.near = 0.1;
    camera.far = 500;
    camera.position.copy(center).addScaledVector(VIEW_DIR, fitRef.current.radius);
    controls.target.copy(center);
    applyView(startView());

    resetRef.current = () => {
      interactedRef.current = false;
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
    const limit = MathUtils.degToRad(settings.azimuthLimitDeg);
    controls.minAzimuthAngle = INITIAL_AZIMUTH - limit;
    controls.maxAzimuthAngle = INITIAL_AZIMUTH + limit;
    fitRef.current = computeFit();
    if (isOrtho) {
      controls.minZoom = fitRef.current.zoom * 0.85;
      controls.maxZoom = fitRef.current.zoom * 6;
    } else {
      controls.minDistance = fitRef.current.radius / 6;
      controls.maxDistance = fitRef.current.radius * 1.2;
    }
    if (!interactedRef.current && size.width > 0) applyView(startView());
    else controls.update();
    invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.azimuthLimitDeg, size.width, size.height, isOrtho]);

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
      hit.x = MathUtils.clamp(hit.x, bounds.minX, bounds.maxX);
      hit.z = MathUtils.clamp(hit.z, bounds.minZ, bounds.maxZ);
      const cur = currentView();
      interactedRef.current = true;
      tweenTo({
        target: hit,
        azimuth: cur.azimuth,
        zoom: isOrtho ? Math.min(controls.maxZoom, cur.zoom * settings.zoomStep) : cur.zoom,
        radius: isOrtho ? cur.radius : Math.max(controls.minDistance, cur.radius / settings.zoomStep),
      });
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
      const t = Math.min(1, (performance.now() - tween.start) / TWEEN_MS);
      const p = easeOutCubic(t);
      applyView({
        target: tween.from.target.clone().lerp(tween.to.target, p),
        azimuth: MathUtils.lerp(tween.from.azimuth, tween.to.azimuth, p),
        zoom: MathUtils.lerp(tween.from.zoom, tween.to.zoom, p),
        radius: MathUtils.lerp(tween.from.radius, tween.to.radius, p),
      });
      if (t >= 1) tweenRef.current = null;
      invalidate();
    } else if (controls.update(delta)) {
      invalidate();
    }
    azimuthRef.current = controls.getAzimuthalAngle();
  });

  return null;
}
