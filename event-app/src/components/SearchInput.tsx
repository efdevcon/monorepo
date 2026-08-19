"use client";

import { CircleX, Search } from "lucide-react";
import cn from "classnames";

/** Search input per Figma: 40px white field, purple search glyph, clear "x". */
export function SearchInput({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
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
