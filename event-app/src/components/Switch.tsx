"use client";

import cn from "classnames";

/**
 * iOS-style on/off switch (51×31 track, 27px knob). Purely presentational:
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
  className,
  "aria-label": ariaLabel,
  "aria-describedby": ariaDescribedBy,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  busy?: boolean;
  className?: string;
  "aria-label": string;
  "aria-describedby"?: string;
}) {
  const inert = disabled || busy;
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
        "relative box-content h-[31px] w-[51px] shrink-0 rounded-full p-0 transition-colors duration-150 ease-out before:absolute before:-inset-1.5 before:content-[''] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-purple motion-reduce:transition-none",
        checked ? "bg-dc-purple" : "bg-dc-border",
        inert ? "cursor-default opacity-40" : "cursor-pointer",
        className
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute left-0.5 top-0.5 block size-[27px] rounded-full bg-white shadow-[0_3px_8px_rgba(0,0,0,0.15),0_1px_1px_rgba(0,0,0,0.16)] transition-transform duration-150 ease-out motion-reduce:transition-none",
          checked ? "translate-x-5" : "translate-x-0"
        )}
      />
    </button>
  );
}
