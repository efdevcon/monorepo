"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import cn from "classnames";

/**
 * A long text folded to a few lines (`clamp`: the `line-clamp-*` classes,
 * the fold depth lives there alone) with a bold "Show more" link centred
 * under it (Scott, 2026-10-14: long abstracts pushed the meta, tags and
 * speakers off the panel). Phones had the link inline at the end of the
 * last visible line until 2026-10-31; that needed a measure of where the
 * line ended and, when the measure was off, the link climbed over the lines
 * above, so they now fold like the desktop does, three lines deep. One way
 * only: once opened it stays open, there is no "Show less"; the fold returns
 * when the details close (the caller unmounts or re-keys this). The link
 * shows only while the text really overflows the fold, measured, not
 * guessed from the character count, since the width differs between the
 * side panel, the phone layer and the expanded page, and the measure
 * re-runs on resize, so a text that fits after a rotation loses its link
 * and one that stops fitting gains it. Shared by the session blurb and the
 * speaker bio.
 */
export function FoldedText({
  text,
  children,
  clamp,
  className,
  contentClassName,
}: {
  /** The source text; a change re-measures the fold. */
  text: string;
  /** How the text renders (markdown, plain); defaults to `text` itself. */
  children?: ReactNode;
  /** The fold: `line-clamp-*` classes, per breakpoint as needed. */
  clamp: string;
  /** Type and colour of the text; the link inherits its size. */
  className?: string;
  /** Extra classes on the clamped box itself (child spacing, wrapping). */
  contentClassName?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    if (expanded) return;
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      // Inside a hidden tab pane everything measures 0×0: keep the last
      // answer rather than deciding "fits" on nothing.
      if (el.clientHeight === 0) return;
      setOverflows(el.scrollHeight > el.clientHeight + 1);
    };
    measure();
    // Web fonts change how many lines the text takes.
    void document.fonts?.ready.then(measure);
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [expanded, text]);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {/* [overflow-wrap:anywhere]: the texts carry long unbroken URLs,
          which otherwise widen the fixed detail layer past the viewport
          (iOS Safari then widens the whole layout viewport). */}
      <div
        ref={ref}
        className={cn("[overflow-wrap:anywhere]", contentClassName, !expanded && clamp)}
      >
        {children ?? text}
      </div>
      {!expanded && overflows && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="cursor-pointer self-center font-bold text-dc-purple hover:underline"
        >
          Show more
        </button>
      )}
    </div>
  );
}
