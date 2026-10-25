"use client";

import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import { hoverStore } from "./hoverStore";
import { attachPointer, type PointerHandlers } from "./pointer";

/**
 * Mounts the raycast owner on the canvas and keeps the canvas cursor in step
 * with the hover store: pointer over a tappable, grab elsewhere, grabbing
 * while a pointer is held. OrbitControls (three r186) owns the element's
 * inline cursor and writes `grab` / `grabbing` itself; this re-applies the
 * hover state over it after every release, since an inline value beats
 * anything inherited (tester video, 2026-10-13).
 */
export function usePointer(handlers: PointerHandlers, debug: boolean) {
  const { gl, camera, scene, invalidate } = useThree();
  // Latest handlers for the listeners created once in the mount effect.
  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    const el = gl.domElement;
    const detach = attachPointer(
      el,
      camera,
      scene,
      {
        onTapArea: (k) => handlersRef.current.onTapArea(k),
        onTapFloor: (l) => handlersRef.current.onTapFloor(l),
        onTapBackground: () => handlersRef.current.onTapBackground(),
        onDoubleTap: (x, y) => handlersRef.current.onDoubleTap(x, y),
      },
      invalidate
    );
    let held = false;
    const apply = () => {
      if (held) return;
      el.style.setProperty("cursor", hoverStore.get() !== null ? "pointer" : "grab");
    };
    const unsubscribe = hoverStore.subscribe(apply);
    const onDown = () => {
      held = true;
    };
    const onUp = () => {
      held = false;
      apply();
    };
    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    apply();
    return () => {
      detach();
      unsubscribe();
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [gl, camera, scene, invalidate]);

  useEffect(() => {
    if (!debug) return;
    const w = window as unknown as { __mapHover?: string | null };
    const write = () => {
      w.__mapHover = hoverStore.get();
    };
    write();
    return hoverStore.subscribe(write);
  }, [debug]);
}
