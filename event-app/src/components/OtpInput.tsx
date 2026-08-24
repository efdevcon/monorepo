"use client";

import { useRef } from "react";
import cn from "classnames";

/**
 * Write `digits` across the code starting at `start`, keeping everything
 * else. Pure so the autofill/paste path can be tested without a browser
 * (scripts/test-otp-input.ts).
 */
export function spreadDigits(
  value: string,
  start: number,
  digits: string,
  length: number
): string {
  const next = value.split("");
  for (let n = 0; n < digits.length && start + n < length; n++) {
    next[start + n] = digits[n];
  }
  return next.join("").slice(0, length);
}

/**
 * Segmented one-time-code input rendered as individual boxes (Figma
 * "Input OTP"). Handles auto-advance, backspace, arrow keys, paste and
 * one-time-code autofill.
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

  /** Apply a run of digits from `start`, then advance focus / report done. */
  const fill = (start: number, digits: string) => {
    const joined = spreadDigits(value, start, digits, length);
    onChange(joined);
    focus(start + digits.length);
    if (joined.length === length) onComplete?.(joined);
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
          aria-invalid={error || undefined}
          autoFocus={autoFocus && i === 0}
          // No maxLength: engines that honour it truncate an autofilled code
          // to a single character before onChange can spread it. The
          // controlled `value[i]` already keeps each box to one digit.
          placeholder={placeholder?.[i] ?? ""}
          value={value[i] ?? ""}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, "");
            if (!digits) return;
            // One-time-code autofill (iOS AutoFill, Android SMS, password
            // managers) drops the ENTIRE code into the focused box as a plain
            // input event — never a paste — so anything longer than a single
            // digit is spread across the boxes. Previously this kept only
            // `.slice(-1)`, discarding five of the six digits and forcing the
            // user to retype the code by hand.
            if (digits.length > 1) {
              fill(i, digits.slice(0, length - i));
              return;
            }
            const joined = setChar(i, digits);
            if (i < length - 1) focus(i + 1);
            else if (joined.length === length) onComplete?.(joined);
          }}
          onFocus={(e) => e.target.select()}
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
            fill(0, digits);
          }}
          className={cn(
            // Flexible width, capped at 48px: six fixed 48px boxes plus the
            // gaps need 328px, but the card only offers ~309px on a 375px
            // iPhone (SE / 12-mini) — and with shrink-0 the 6th box was
            // pushed outside the card's `overflow-clip`, unreachable and
            // impossible to scroll to. Letting them shrink keeps all six on
            // screen at any width, while max-w-12 + justify-between leaves
            // the 348px desktop row pixel-identical.
            "h-14 min-w-0 flex-1 max-w-12 rounded-lg border bg-white text-center text-[20px] leading-none tracking-[-0.25px] text-dc-fg2 outline-none transition-colors duration-150 ease-out placeholder:text-dc-muted/50",
            // The error branch needs its own focus style: outline-none above
            // removed the UA indicator, so after a wrong code every box was
            // red with no way to see which one had focus (WCAG 2.4.7).
            error
              ? "border-dc-red focus:border-dc-purple focus:ring-2 focus:ring-dc-purple/20"
              : "border-dc-hairline focus:border-dc-purple"
          )}
        />
      ))}
    </div>
  );
}
