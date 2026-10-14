"use client";

import {
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import { MicVocal } from "lucide-react";
import cn from "classnames";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

/** Section key for the "Featured speakers" section (rendered as a mic cell
 *  above the letters — can't collide with the single-char letter keys). */
export const FEATURED_SECTION = "featured";

/**
 * A–Z jump rail (Figma "A–Z Scrollbar"): the letter stack inside the lavender
 * right-edge column — 24px cells, 12px semibold, `justify-between` so the
 * letters spread over whatever height the sticky wrapper gives the stack.
 * A featured-speakers cell (handheld mic — a heavier silhouette than the
 * studio mic it replaced; the star is My Interests) always tops the rail,
 * above the optional "#" cell.
 *
 * The active section (topmost section in view) sits on a purple pill in
 * bold white. The pill is one absolutely-positioned element translated to the
 * active cell, so scroll-spy changes and click-jumps slide it along the rail
 * on the app's 300ms house curve — a transition (not keyframes) so rapid
 * scroll-spy retargets stay smooth. Letter color shares the same clock so the
 * swap lands with the pill. Sections with no speakers are faded and inert.
 *
 * Press-and-slide (tester feedback, 2026-10-14; same feel as the venue map's
 * FloorSlider): pointer events are handled on the rail, not the cells. A
 * press jumps to the section under the finger at once, and holding and
 * sliding along the rail jumps to each section the finger passes — the
 * nearest section WITH speakers, so a thumb over an empty letter still lands
 * somewhere, and dragging past either end sticks to the end cell. Every jump
 * is the same instant teleport a tap does (see Speakers.jumpToSection), so a
 * slide is a run of teleports, like a native iOS index bar. A pointer tap has
 * already jumped on pointerdown, so the click that follows a handled press is
 * ignored; every other click on a cell (Enter / Space, and assistive
 * technology, which synthesises a click with no pointer events) jumps. Empty
 * cells are aria-disabled rather than disabled: a disabled button swallows
 * pointer events in some engines, which would make the slide stutter across
 * gaps.
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
      // Inside a hidden tab pane (display:none) every cell measures 0×0;
      // keep the last real position instead of parking the pill at the top,
      // which made it sweep down the rail on every return to the tab.
      if (el && el.offsetHeight === 0) return;
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

  // The section last jumped to during the current press, so a finger resting
  // inside one cell doesn't re-jump on every pointermove.
  const press = useRef<{ last: string | null } | null>(null);
  // Set by a handled press and cleared by the click it produces (or the next
  // frame, for a press that produces none): the click after a press must not
  // jump a second time, but a click with no press behind it must.
  const pressedRef = useRef(false);

  /** The enabled cell whose centre is nearest the pointer. */
  const sectionAt = (clientY: number): string | null => {
    let best: string | null = null;
    let bestD = Infinity;
    for (const [section, el] of cellRefs.current) {
      if (!el || !available.has(section)) continue;
      const r = el.getBoundingClientRect();
      const d = Math.abs(clientY - (r.top + r.height / 2));
      if (d < bestD) {
        bestD = d;
        best = section;
      }
    }
    return best;
  };

  const onPointerDown = (e: PointerEvent<HTMLElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const section = sectionAt(e.clientY);
    press.current = { last: section };
    pressedRef.current = true;
    if (section) onJump(section);
  };
  const onPointerMove = (e: PointerEvent<HTMLElement>) => {
    const p = press.current;
    if (!p || !e.currentTarget.hasPointerCapture(e.pointerId)) return;
    const section = sectionAt(e.clientY);
    if (section && section !== p.last) {
      p.last = section;
      onJump(section);
    }
  };
  const onPointerEnd = () => {
    press.current = null;
    // The click, if any, is dispatched right after pointerup; a press that
    // ends without one (drag released elsewhere, cancel) must not leave the
    // flag set for an unrelated click later.
    window.setTimeout(() => {
      pressedRef.current = false;
    }, 0);
  };
  const onCellClick = (section: string) => {
    if (pressedRef.current) {
      pressedRef.current = false;
      return;
    }
    onJump(section);
  };

  return (
    <nav
      ref={navRef}
      aria-label="Jump to section"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      // touch-action none: a vertical drag on the rail slides through the
      // letters, it never scrolls the page.
      style={{ touchAction: "none" }}
      // h-full on desktop; on mobile the wrapper stretches to the viewport
      // bottom for the background, so the cells take the shorter stack height
      // the measure effect publishes (keeps Z above the floating nav pill).
      // Grab hand: the rail is something you hold and slide (as the map's
      // floor track), not a column of links.
      className="relative flex h-full cursor-grab select-none flex-col items-center justify-between py-2 active:cursor-grabbing max-lg:h-[var(--az-rail-stack-h,100%)]"
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
            onClick={() => enabled && onCellClick(section)}
            aria-disabled={!enabled || undefined}
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
              // Cursor inherits the rail's grab hand (the whole strip is one
              // control), so the cells don't flip to a pointer per letter.
              "cursor-[inherit]",
              !enabled && "text-dc-muted/40",
              enabled &&
                (active
                  ? "font-bold text-white"
                  : "text-dc-muted hover:text-dc-purple")
            )}
          >
            {section === FEATURED_SECTION ? (
              // 2.5 stroke so the icon reads as heavy as the semibold letters
              <MicVocal className="size-3.5" strokeWidth={2.5} />
            ) : (
              section
            )}
          </button>
        );
      })}
    </nav>
  );
}
