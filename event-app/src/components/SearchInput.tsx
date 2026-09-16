"use client";

import { CircleX, Search } from "lucide-react";
import cn from "classnames";

/** Structural ref type — `import type { Ref } from "react"` resolves to the
 *  hoisted @types/react copy, which the JSX element types (from the other
 *  copy) reject. Structurally identical to React.Ref minus `null`. */
type InputRef =
  | { current: HTMLInputElement | null }
  | ((el: HTMLInputElement | null) => void);

/** Search input per Figma: 40px white field, purple search glyph, clear "x". */
export function SearchInput({
  value,
  onChange,
  placeholder,
  className,
  inputRef,
  resultCount,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  /** Ref to the inner <input>, for programmatic focus (header search icon). */
  inputRef?: InputRef;
  /**
   * Match count shown as a small "N results" label beside the clear × while
   * something is typed (null/undefined: no label).
   */
  resultCount?: number | null;
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
      {value && resultCount != null && (
        <span
          aria-live="polite"
          className="shrink-0 whitespace-nowrap text-[11px] leading-none tabular-nums text-dc-muted"
        >
          {resultCount} {resultCount === 1 ? "result" : "results"}
        </span>
      )}
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          // Keep focus in the field: clearing shouldn't drop the iOS keyboard,
          // and the search panel's empty-field auto-close (SearchDrawerPanel)
          // must only fire when focus really leaves the search.
          onMouseDown={(e) => e.preventDefault()}
          aria-label="Clear search"
          className="shrink-0 cursor-pointer"
        >
          <CircleX className="size-4 text-dc-purple" />
        </button>
      )}
    </div>
  );
}
