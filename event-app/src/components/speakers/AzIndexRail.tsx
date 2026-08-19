"use client";

import { useLayoutEffect, useRef, useState } from "react";
import cn from "classnames";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

/**
 * A–Z jump rail (Figma "A–Z Scrollbar"): the letter stack inside the lavender
 * right-edge column — 24px cells, 12px semibold, `justify-between` so the
 * letters spread over whatever height the sticky wrapper gives the stack.
 *
 * The active letter (topmost letter section in view) sits on a purple pill in
 * bold white. The pill is one absolutely-positioned element translated to the
 * active cell, so scroll-spy changes and click-jumps slide it along the rail
 * on the app's 300ms house curve — a transition (not keyframes) so rapid
 * scroll-spy retargets stay smooth. Letter color shares the same clock so the
 * swap lands with the pill. Letters with no speakers are faded and inert.
 */
export function AzIndexRail({
  letters,
  activeLetter,
  onJump,
}: {
  /** Letters that exist in the data (may include "#"). */
  letters: string[];
  /** Letter of the topmost visible section (scroll-spy). */
  activeLetter: string | null;
  onJump: (letter: string) => void;
}) {
  const available = new Set(letters);
  const rail = letters.includes("#") ? ["#", ...ALPHABET] : ALPHABET;

  const navRef = useRef<HTMLElement | null>(null);
  const cellRefs = useRef(new Map<string, HTMLButtonElement | null>());
  // Pill position + height, measured after render (and re-measured whenever
  // the rail's height animates, via ResizeObserver) so it hugs the live cell
  // — cells flex-shrink below 24px on short viewports.
  const [pill, setPill] = useState<{ y: number; h: number } | null>(null);

  useLayoutEffect(() => {
    const measure = () => {
      const el = activeLetter ? cellRefs.current.get(activeLetter) : null;
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
  }, [activeLetter, letters]);

  return (
    <nav
      ref={navRef}
      aria-label="Jump to letter"
      className="relative flex h-full flex-col items-center justify-between py-2"
    >
      <span
        aria-hidden
        style={
          pill === null
            ? { visibility: "hidden" }
            : { transform: `translateY(${pill.y}px)`, height: pill.h }
        }
        className="absolute inset-x-0 top-0 bg-dc-purple transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none"
      />
      {rail.map((letter) => {
        const enabled = available.has(letter);
        const active = letter === activeLetter;
        return (
          <button
            key={letter}
            ref={(el) => {
              cellRefs.current.set(letter, el);
            }}
            onClick={() => enabled && onJump(letter)}
            disabled={!enabled}
            tabIndex={enabled ? 0 : -1}
            aria-current={active ? "true" : undefined}
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
            {letter}
          </button>
        );
      })}
    </nav>
  );
}
