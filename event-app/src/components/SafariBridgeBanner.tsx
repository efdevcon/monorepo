"use client";

import { Copy } from "lucide-react";
import { useShouldShowSafariBridge, useCopySignInLink } from "./InstallAppButton";

/**
 * Prominent CTA for the case that actually happens after the reminder
 * email: the magic link opens in the phone's default browser (Brave,
 * Chrome...) instead of Safari. Installing the PWA on iOS only works from
 * Safari, so this is the primary action in that state — not a fallback
 * buried in the install modal.
 */
export function SafariBridgeBanner() {
  const shouldShow = useShouldShowSafariBridge();
  const copySignInLink = useCopySignInLink();

  if (!shouldShow) return null;

  return (
    <div className="mb-6 rounded-2xl border border-[#7D52F4]/20 bg-[#f3eeff] p-4 text-center">
      <p className="mb-3 text-sm font-medium text-[#1B1B1B]">
        You&apos;re not in Safari — installing on iPhone only works from Safari.
      </p>
      <button
        onClick={copySignInLink}
        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-[#7D52F4] py-2.5 font-medium text-white transition-colors hover:bg-[#6A3FD1] active:scale-[0.98]"
      >
        <Copy className="h-4 w-4" />
        Copy sign-in link for Safari
      </button>
      <p className="mt-2 text-xs text-gray-500">
        Paste it into Safari&apos;s address bar, then use Share → Add to Home
        Screen.
      </p>
    </div>
  );
}
