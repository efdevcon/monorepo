"use client";

import { useEffect, useRef, useState } from "react";

const MIN_THUMB = 36;

/**
 * Overlay scrollbar for the document. The native scrollbar is hidden in CSS;
 * this renders a thin draggable thumb on the right edge that takes no layout
 * space (so scrollable content never shifts the layout width). Auto-hides when
 * the page isn't scrollable.
 */
export function CustomScrollbar() {
  const [thumb, setThumb] = useState({ height: 0, top: 0, visible: false });
  const drag = useRef<{ startY: number; startScroll: number } | null>(null);

  useEffect(() => {
    const doc = document.documentElement;

    const measure = () => {
      const { scrollHeight, clientHeight } = doc;
      if (scrollHeight <= clientHeight + 1) {
        setThumb((t) => (t.visible ? { ...t, visible: false } : t));
        return;
      }
      const height = Math.max((clientHeight / scrollHeight) * clientHeight, MIN_THUMB);
      const maxScroll = scrollHeight - clientHeight;
      const top = (window.scrollY / maxScroll) * (clientHeight - height);
      setThumb({ height, top, visible: true });
    };

    measure();
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    const ro = new ResizeObserver(measure);
    ro.observe(doc);
    return () => {
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
      ro.disconnect();
    };
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!drag.current) return;
      const doc = document.documentElement;
      const { scrollHeight, clientHeight } = doc;
      const thumbH = Math.max((clientHeight / scrollHeight) * clientHeight, MIN_THUMB);
      const maxScroll = scrollHeight - clientHeight;
      const range = clientHeight - thumbH;
      const delta = ((e.clientY - drag.current.startY) / range) * maxScroll;
      window.scrollTo(0, drag.current.startScroll + delta);
    };
    const onUp = () => {
      drag.current = null;
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  if (!thumb.visible) return null;

  return (
    <div className="fixed top-0 right-0 z-[80] h-full w-2.5 pointer-events-none">
      <div
        className="absolute right-0.5 w-1.5 rounded-full bg-black/20 hover:bg-black/40 transition-colors pointer-events-auto cursor-grab active:cursor-grabbing"
        style={{ height: thumb.height, top: thumb.top }}
        onMouseDown={(e) => {
          e.preventDefault();
          drag.current = { startY: e.clientY, startScroll: window.scrollY };
          document.body.style.userSelect = "none";
        }}
      />
    </div>
  );
}
