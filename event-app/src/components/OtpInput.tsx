"use client";

import { useRef } from "react";
import cn from "classnames";

/**
 * Segmented one-time-code input rendered as individual boxes (Figma
 * "Input OTP"). Handles auto-advance, backspace, arrow keys and paste.
 */
export function OtpInput({
  value,
  onChange,
  length = 6,
  onComplete,
  autoFocus,
  error,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  onComplete?: (value: string) => void;
  autoFocus?: boolean;
  /** Invalid-code state: every box gets a red border. */
  error?: boolean;
  /** Per-box placeholder characters, e.g. "123456". */
  placeholder?: string;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const setChar = (index: number, char: string) => {
    const next = value.split("");
    next[index] = char;
    const joined = next.join("").slice(0, length);
    onChange(joined);
    return joined;
  };

  const focus = (index: number) => {
    const clamped = Math.max(0, Math.min(length - 1, index));
    refs.current[clamped]?.focus();
    refs.current[clamped]?.select();
  };

  return (
    // Desktop caps the row at 348px (6×48 boxes + 5×12 gaps via
    // justify-between); mobile spreads across the full column.
    <div className="mx-auto flex w-full items-center justify-between gap-2 lg:max-w-[348px]">
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus={autoFocus && i === 0}
          maxLength={1}
          placeholder={placeholder?.[i] ?? ""}
          value={value[i] ?? ""}
          onChange={(e) => {
            const char = e.target.value.replace(/\D/g, "").slice(-1);
            if (!char) return;
            const joined = setChar(i, char);
            if (i < length - 1) focus(i + 1);
            else if (joined.length === length) onComplete?.(joined);
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace") {
              e.preventDefault();
              if (value[i]) setChar(i, "");
              else focus(i - 1), setChar(i - 1, "");
            } else if (e.key === "ArrowLeft") focus(i - 1);
            else if (e.key === "ArrowRight") focus(i + 1);
          }}
          onPaste={(e) => {
            e.preventDefault();
            const digits = e.clipboardData
              .getData("text")
              .replace(/\D/g, "")
              .slice(0, length);
            if (!digits) return;
            onChange(digits);
            focus(digits.length);
            if (digits.length === length) onComplete?.(digits);
          }}
          className={cn(
            "h-14 w-12 shrink-0 rounded-lg border bg-white text-center text-[20px] leading-none tracking-[-0.25px] text-dc-fg2 outline-none transition-colors duration-150 ease-out placeholder:text-dc-muted/50",
            error ? "border-dc-red" : "border-dc-hairline focus:border-dc-purple"
          )}
        />
      ))}
    </div>
  );
}
