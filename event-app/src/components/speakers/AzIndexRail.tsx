"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { Mic } from "lucide-react";
import cn from "classnames";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

/** Section key for the "Featured speakers" section (rendered as a mic cell
 *  above the letters — can't collide with the single-char letter keys). */
export const FEATURED_SECTION = "featured";

/**
 * A–Z jump rail (Figma "A–Z Scrollbar"): the letter stack inside the lavender
 * right-edge column — 24px cells, 12px semibold, `justify-between` so the
 * letters spread over whatever height the sticky wrapper gives the stack.
 * A keynote (mic) cell always tops the rail, above the optional "#" cell.
 *
 * The active section (topmost section in view) sits on a purple pill in
 * bold white. The pill is one absolutely-positioned element translated to the
 * active cell, so scroll-spy changes and click-jumps slide it along the rail
 * on the app's 300ms house curve — a transition (not keyframes) so rapid
 * scroll-spy retargets stay smooth. Letter color shares the same clock so the
 * swap lands with the pill. Sections with no speakers are faded and inert.
 */
export function AzIndexRail({
  sections,
  activeSection,
  onJump,
}: {
  /** Section keys that exist in the data (FEATURED_SECTION, "#", letters). */
  sections: string[];
  /** Key of the topmost visible section (scroll-spy). */
  activeSection: string | null;
  onJump: (section: string) => void;
}) {
  const available = new Set(sections);
  const rail = [
    FEATURED_SECTION,
    ...(sections.includes("#") ? ["#"] : []),
    ...ALPHABET,
  ];

  const navRef = useRef<HTMLElement | null>(null);
  const cellRefs = useRef(new Map<string, HTMLButtonElement | null>());
  // Pill position + height, measured after render (and re-measured whenever
  // the rail's height animates, via ResizeObserver) so it hugs the live cell
  // — cells flex-shrink below 24px on short viewports.
  const [pill, setPill] = useState<{ y: number; h: number } | null>(null);
  // Whether the pill had a position in the previous commit: the transition
  // only applies between two real positions, otherwise the first placement
  // would visibly sweep down from translateY(0) every time the rail appears.
  const hadPillRef = useRef(false);
  useLayoutEffect(() => {
    hadPillRef.current = pill !== null;
  }, [pill]);

  useLayoutEffect(() => {
    const measure = () => {
      const el = activeSection ? cellRefs.current.get(activeSection) : null;
      setPill(el ? { y: el.offsetTop, h: el.offsetHeight } : null);
    };
    measure();
    // The sticky wrapper animates the rail's height (compact ↔ fill), which
    // moves every cell; track it so the pill stays glued to its letter.
    const nav = navRef.current;
    if (!nav || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(nav);
    return () => observer.disconnect();
  }, [activeSection, sections]);

  return (
    <nav
      ref={navRef}
      aria-label="Jump to section"
      // h-full on desktop; on mobile the wrapper stretches to the viewport
      // bottom for the background, so the cells take the shorter stack height
      // the measure effect publishes (keeps Z above the floating nav pill).
      className="relative flex h-full flex-col items-center justify-between py-2 max-lg:h-[var(--az-rail-stack-h,100%)]"
    >
      <span
        aria-hidden
        style={
          pill === null
            ? { visibility: "hidden" }
            : { transform: `translateY(${pill.y}px)`, height: pill.h }
        }
        className={cn(
          "absolute inset-x-0 top-0 bg-dc-purple",
          hadPillRef.current &&
            "transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none"
        )}
      />
      {rail.map((section) => {
        const enabled = available.has(section);
        const active = section === activeSection;
        return (
          <button
            key={section}
            ref={(el) => {
              cellRefs.current.set(section, el);
            }}
            onClick={() => enabled && onJump(section)}
            disabled={!enabled}
            tabIndex={enabled ? 0 : -1}
            aria-current={active ? "true" : undefined}
            aria-label={
              section === FEATURED_SECTION ? "Featured speakers" : undefined
            }
            className={cn(
              "relative z-10 flex h-6 w-full items-center justify-center text-[12px] font-semibold leading-none",
              // Color shares the pill's 300ms clock so the swap lands as the
              // pill arrives (stacked effects on one clock).
              "transition-colors duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none",
              !enabled && "text-dc-muted/40",
              enabled &&
                (active
                  ? "cursor-pointer font-bold text-white"
                  : "cursor-pointer text-dc-muted hover:text-dc-purple")
            )}
          >
            {section === FEATURED_SECTION ? (
              // 2.5 stroke so the icon reads as heavy as the semibold letters
              <Mic className="size-3.5" strokeWidth={2.5} />
            ) : (
              section
            )}
          </button>
        );
      })}
    </nav>
  );
}
