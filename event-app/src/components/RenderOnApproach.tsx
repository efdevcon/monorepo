"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Defers rendering `children` until the slot is within `rootMargin` of the
 * viewport, holding its place with an `estimatedHeight` box until then. Once
 * rendered it stays rendered. For long lists (759 speaker cards, ~190 session
 * cards a day) this is what makes a page mount cheap: the cost was React
 * creating every card up front, not the browser painting them, so
 * `content-visibility` alone would not have helped.
 *
 * Anchors and section refs must live on the element *around* this component
 * so jumps (A–Z rail, "jump to now") keep working while the slot is still a
 * placeholder; the estimate only needs to be close enough that the jump lands
 * near the right place before the real cards fill in.
 */
export function RenderOnApproach({
  estimatedHeight,
  children,
  rootMargin = "900px 0px",
}: {
  estimatedHeight: number;
  children: React.ReactNode;
  rootMargin?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [rendered, setRendered] = useState(
    () => typeof IntersectionObserver === "undefined"
  );

  useEffect(() => {
    if (rendered) return;
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setRendered(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [rendered, rootMargin]);

  if (rendered) return <>{children}</>;
  return <div ref={ref} style={{ minHeight: estimatedHeight }} aria-hidden />;
}
