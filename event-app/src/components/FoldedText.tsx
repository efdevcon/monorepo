"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import cn from "classnames";
import { useIsDesktop } from "@/hooks/useIsDesktop";

/** Space before an inline "Show more", about a word space at 14px. */
const LINK_GAP = 4;

/** Right edge of the text on the fold's last visible line (its line box). */
function lastLineEnd(el: HTMLElement, box: DOMRect, lineHeight: number) {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  let end = box.left;
  while (walker.nextNode()) {
    range.selectNodeContents(walker.currentNode);
    for (const rect of range.getClientRects()) {
      const middle = (rect.top + rect.bottom) / 2;
      if (middle > box.bottom - lineHeight && middle < box.bottom) {
        end = Math.max(end, rect.right);
      }
    }
  }
  return end;
}

/**
 * A long text folded to a few lines (`clamp`: the `line-clamp-*` classes,
 * the fold depth lives there alone) with a bold "Show more" link: on phones
 * at the end of the last visible line, after an ellipsis, and from lg
 * centred under the text (Scott, 2026-10-14: long abstracts pushed the
 * meta, tags and speakers off the panel). One way only: once opened it
 * stays open, there is no "Show less"; the fold returns when the details
 * close (the caller unmounts or re-keys this). The link shows only while
 * the text really overflows the fold — measured, not guessed from the
 * character count, since the width differs between the side panel, the
 * phone layer and the expanded page — and the measure re-runs on resize,
 * so a text that fits after a rotation loses its link and one that stops
 * fitting gains it. On phones, a last line with room to spare (a paragraph
 * ended there) takes the link straight after its last word, with no
 * ellipsis. Shared by the session blurb and the speaker bio.
 */
export function FoldedText({
  text,
  children,
  clamp,
  lineHeight,
  className,
  contentClassName,
}: {
  /** The source text; a change re-measures the fold. */
  text: string;
  /** How the text renders (markdown, plain); defaults to `text` itself. */
  children?: ReactNode;
  /** The fold: `line-clamp-*` classes, per breakpoint as needed. */
  clamp: string;
  /** The line box height in px, which the inline link measure walks. */
  lineHeight: number;
  /** Type and colour of the text; the link inherits its size. */
  className?: string;
  /** Extra classes on the clamped box itself (child spacing, wrapping). */
  contentClassName?: string;
}) {
  const isDesktop = useIsDesktop();
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const [inlineAt, setInlineAt] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement | null>(null);
  const linkRef = useRef<HTMLButtonElement | null>(null);
  useLayoutEffect(() => {
    if (expanded) return;
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      // Inside a hidden tab pane everything measures 0×0: keep the last
      // answer rather than deciding "fits" on nothing.
      if (el.clientHeight === 0) return;
      setOverflows(el.scrollHeight > el.clientHeight + 1);
      if (isDesktop) return;
      const box = el.getBoundingClientRect();
      const end = lastLineEnd(el, box, lineHeight) - box.left;
      const fits = end + LINK_GAP + (linkRef.current?.offsetWidth ?? 0) <= box.width;
      setInlineAt(fits ? end : null);
    };
    measure();
    // Web fonts change where the text ends without changing the box's size.
    void document.fonts?.ready.then(measure);
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [expanded, text, overflows, isDesktop, lineHeight]);

  return (
    <div className={cn("relative flex flex-col gap-2", className)}>
      {/* [overflow-wrap:anywhere]: the texts carry long unbroken URLs,
          which otherwise widen the fixed detail layer past the viewport
          (iOS Safari then widens the whole layout viewport). */}
      <div
        ref={ref}
        className={cn("[overflow-wrap:anywhere]", contentClassName, !expanded && clamp)}
      >
        {children ?? text}
      </div>
      {!expanded && overflows && isDesktop && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="cursor-pointer self-center font-bold text-dc-purple hover:underline"
        >
          Show more
        </button>
      )}
      {!expanded && overflows && !isDesktop && (
        // Sits over the end of the last folded line, fading out the text it
        // covers (and the clamp's own ellipsis, hence the "…" here), or right
        // after the last word, solid so it hides the clamp's ellipsis. The
        // before: box extends the tap target past the line box.
        <div
          className={cn(
            "absolute bottom-0 flex",
            inlineAt === null
              ? "right-0 bg-[linear-gradient(to_right,transparent,var(--color-dc-panel)_1rem)] pl-4"
              : "bg-dc-panel"
          )}
          style={inlineAt === null ? undefined : { left: inlineAt, paddingLeft: LINK_GAP }}
        >
          {inlineAt === null && (
            <span aria-hidden>
              …&nbsp;
            </span>
          )}
          <button
            ref={linkRef}
            type="button"
            onClick={() => setExpanded(true)}
            className="relative cursor-pointer font-bold text-dc-purple before:absolute before:-inset-x-1 before:-inset-y-3 before:content-[''] hover:underline"
          >
            Show more
          </button>
        </div>
      )}
    </div>
  );
}
