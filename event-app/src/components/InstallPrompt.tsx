"use client";

import { Copy, Share } from "lucide-react";
import { PrimaryButton } from "./Buttons";
import { useShouldShowSafariBridge, useCopySignInLink } from "./InstallAppButton";

/**
 * Install CTA for /ticket — the landing page right after following the
 * reminder email's magic link. Only shown on iOS while signed in and not
 * yet installed (see useShouldShowSafariBridge).
 *
 * Deliberately does NOT branch content on isSafari(): that's pure
 * User-Agent sniffing, and on iOS it's genuinely unreliable in both
 * directions — confirmed by testing, not just theory (real Safari showing
 * the "you're not in Safari" message, and non-Safari browsers showing
 * install steps that don't apply there). Apple's WebKit-only policy means
 * there's no dependable way to ask "am I in Safari?" from JS. So instead of
 * guessing and sometimes showing the wrong thing, this always shows the
 * complete picture — correct regardless of which browser it actually is.
 */
export function InstallPrompt() {
  const shouldShow = useShouldShowSafariBridge();
  const copySignInLink = useCopySignInLink();

  if (!shouldShow) return null;

  return (
    <div className="mb-6 rounded-xl border border-dc-hairline bg-dc-lavender p-4 text-center font-heading">
      <p className="mb-3 text-sm font-medium text-dc-fg2">
        Install the app to keep your ticket handy offline.
      </p>
      <ol className="mb-4 space-y-2 text-left text-sm text-dc-muted">
        <Step n={1}>
          Not already in Safari? Tap below to copy a sign-in link and open it
          there.
        </Step>
        <Step n={2}>
          In Safari, tap the <Share className="inline-block h-4 w-4 align-text-bottom" /> Share
          button.
        </Step>
        <Step n={3}>
          Choose <b>&ldquo;Add to Home Screen&rdquo;</b>.
        </Step>
      </ol>
      <PrimaryButton onClick={copySignInLink} className="w-full">
        <Copy className="size-4" />
        Copy sign-in link for Safari
      </PrimaryButton>
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-dc-purple-soft text-xs font-bold text-dc-purple">
        {n}
      </span>
      <span>{children}</span>
    </li>
  );
}
