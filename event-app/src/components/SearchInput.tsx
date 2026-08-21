"use client";

import { CircleX, Search } from "lucide-react";
import cn from "classnames";

/** Structural ref type — `import type { Ref } from "react"` resolves to the
 *  hoisted @types/react copy, which the JSX element types (from the other
 *  copy) reject. Structurally identical to React.Ref minus `null`. */
type InputRef =
  | { current: HTMLInputElement | null }
  | ((el: HTMLInputElement | null) => void);

/**
 * Header search-icon action: smooth-scroll to the top (where the search bar
 * lives) and focus the input once the scroll settles. Focusing mid-flight
 * would make the browser fight the smooth scroll (it scrolls the focused
 * field into view and iOS opens the keyboard), so wait for "scrollend" with
 * a timeout fallback for browsers without the event or interrupted scrolls.
 */
export function scrollToTopAndFocusSearch(input: HTMLInputElement | null) {
  // Focus FIRST, synchronously inside the click gesture: iOS Safari only
  // raises the on-screen keyboard for a focus() call made during a user
  // gesture. Waiting for the scroll to finish (scrollend / a timeout) put the
  // focus outside the gesture, so the field got a caret but no keyboard —
  // and since the header search button only appears once scrolled, that was
  // the path every tap took. `preventScroll` stops the focus itself from
  // yanking the viewport before we scroll deliberately below.
  input?.focus({ preventScroll: true });
  // Instant, not smooth: this runs from wherever the user had scrolled to,
  // and on a list ~98 viewports tall (/speakers) animating the whole way
  // makes WebKit rasterize everything in between — the cost that was
  // crashing iOS on rapid A–Z jumps.
  window.scrollTo({ top: 0, behavior: "auto" });
}

/** Search input per Figma: 40px white field, purple search glyph, clear "x". */
export function SearchInput({
  value,
  onChange,
  placeholder,
  className,
  inputRef,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  /** Ref to the inner <input>, for programmatic focus (header search icon). */
  inputRef?: InputRef;
}) {
  return (
    <div
      className={cn(
        "flex h-10 items-center gap-2 rounded-lg border border-dc-hairline bg-white px-3 transition-colors hover:border-dc-muted focus-within:border-dc-muted",
        className
      )}
    >
      <Search className="size-4 shrink-0 text-dc-purple" />
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent text-[14px] leading-5 text-dc-fg outline-none placeholder:text-dc-muted [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="shrink-0 cursor-pointer"
        >
          <CircleX className="size-4 text-dc-purple" />
        </button>
      )}
    </div>
  );
}
