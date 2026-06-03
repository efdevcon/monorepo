"use client";

import { useRef } from "react";

/**
 * Segmented one-time-code input rendered as individual boxes.
 * Handles auto-advance, backspace, arrow keys and paste.
 */
export function OtpInput({
  value,
  onChange,
  length = 6,
  onComplete,
  autoFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  onComplete?: (value: string) => void;
  autoFocus?: boolean;
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
    <div className="flex items-center justify-center gap-2">
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
          className="h-12 w-10 rounded-xl border border-[#E1E4EA] text-center text-lg font-semibold outline-none transition-colors focus:border-[#7D52F4] focus:ring-2 focus:ring-[#7D52F4]/20"
        />
      ))}
    </div>
  );
}
