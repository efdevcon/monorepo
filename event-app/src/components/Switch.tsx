"use client";

import cn from "classnames";

/**
 * iOS-style on/off switch (51×31 track, 27px knob; `size="sm"`: the same
 * proportions at 24px tall, 39×24 with a 20px knob, for a row inside a
 * panel). Purely presentational:
 * the caller owns the state and does the work in `onChange`. Track colour and
 * knob travel share one 150ms ease-out clock so the two never drift apart;
 * `busy` keeps the switch shown but inert while an async toggle settles.
 * before:-inset-1.5 grows the hit area to the 44px floor without changing
 * the drawn size.
 */
export function Switch({
  checked,
  onChange,
  disabled = false,
  busy = false,
  size = "md",
  className,
  "aria-label": ariaLabel,
  "aria-describedby": ariaDescribedBy,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  busy?: boolean;
  size?: "md" | "sm";
  className?: string;
  "aria-label": string;
  "aria-describedby"?: string;
}) {
  const inert = disabled || busy;
  const sm = size === "sm";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      aria-busy={busy || undefined}
      disabled={inert}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative shrink-0 rounded-full p-0 transition-colors duration-150 ease-out before:absolute before:content-[''] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-purple motion-reduce:transition-none",
        // before: pads each size to the 44px touch floor.
        sm ? "h-6 w-[39px] before:-inset-x-1 before:-inset-y-2.5" : "h-[31px] w-[51px] before:-inset-1.5",
        checked ? "bg-dc-purple" : "bg-dc-border",
        inert ? "cursor-default opacity-40" : "cursor-pointer",
        className
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute left-0.5 top-0.5 block rounded-full bg-white shadow-[0_3px_8px_rgba(0,0,0,0.15),0_1px_1px_rgba(0,0,0,0.16)] transition-transform duration-150 ease-out motion-reduce:transition-none",
          sm ? "size-5" : "size-[27px]",
          checked ? (sm ? "translate-x-[15px]" : "translate-x-5") : "translate-x-0"
        )}
      />
    </button>
  );
}
