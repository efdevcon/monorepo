"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import cn from "classnames";

export type SegmentedOption<T extends string> = {
  value: T;
  /** Accessible name; also the visible label when `children` is omitted. */
  label: string;
  children?: ReactNode;
  /** Extra classes on the button (padding, widths). */
  className?: string;
  /** Native tooltip (e.g. the keyboard shortcut). */
  title?: string;
};

type SegmentedProps<T extends string> = {
  /** `null` shows no active segment (the indicator hides). */
  value: T | null;
  options: readonly SegmentedOption<T>[];
  onChange: (value: T) => void;
  ariaLabel: string;
  /** Positioning and per-instance track classes. */
  className?: string;
};

/**
 * Recessed segmented control (same track as the schedule's List/Timeline
 * toggle): a lavender well with a white indicator that slides under the
 * active segment. Shared by the source, view and level switches so they
 * read as one family.
 */
export function Segmented<T extends string>({ value, options, onChange, ariaLabel, className }: SegmentedProps<T>) {
  const buttonRefs = useRef(new Map<T, HTMLButtonElement | null>());
  const [indicator, setIndicator] = useState<{ x: number; w: number; h: number } | null>(null);

  useLayoutEffect(() => {
    const measure = () => {
      const el = value === null ? null : buttonRefs.current.get(value);
      setIndicator(el ? { x: el.offsetLeft, w: el.offsetWidth, h: el.offsetHeight } : null);
    };
    measure();
    // Labels can change with the breakpoint, so re-measure on resize.
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [value]);

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        "z-20 flex h-10 items-center gap-1 rounded-lg bg-dc-lavender p-1 shadow-[inset_0px_1px_1px_rgba(34,17,68,0.15),inset_0px_2px_4px_rgba(34,17,68,0.06)] lg:bg-dc-panel",
        className
      )}
    >
      <div
        aria-hidden
        style={indicator ? { transform: `translateX(${indicator.x}px)`, width: indicator.w, height: indicator.h } : { visibility: "hidden" }}
        className="absolute left-0 top-1 rounded-[4px] bg-white shadow-[0px_1px_3px_rgba(22,11,43,0.1),0px_1px_2px_rgba(22,11,43,0.1)] transition-[transform,width] duration-150 ease-out motion-reduce:transition-none"
      />
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          aria-label={option.label}
          title={option.title}
          ref={(el) => {
            buttonRefs.current.set(option.value, el);
          }}
          onClick={() => onChange(option.value)}
          className={cn(
            "relative z-10 flex min-h-8 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-[4px] py-1 text-[14px] leading-none transition-colors",
            value === option.value ? "font-bold text-dc-purple" : "font-medium text-dc-muted hover:text-dc-fg2",
            option.className ?? "px-3"
          )}
        >
          {option.children ?? option.label}
        </button>
      ))}
    </div>
  );
}
