"use client";

import { useEffect } from "react";
import { SearchX } from "lucide-react";
import { PrimaryLinkButton, SecondaryButton } from "@/components/Buttons";
import { StateMessage } from "@/components/StateMessage";
import { trackEvent } from "@/data/analytics/track";
import { openFeedback } from "@/data/feedback/feedbackState";
import { resetApp } from "@/data/feedback/resetApp";

/**
 * The 404 page, in the app's centred state recipe on the app gradient, the
 * same frame as the route error boundary (error.tsx) so a wrong link reads
 * like the app, not like the server. "Report this" hands the path to the
 * feedback sheet; "Reset the app" is the same escape hatch as on a crash, for
 * a poisoned cache that keeps answering a real route with this page.
 */
export default function NotFound() {
  useEffect(() => {
    trackEvent("error", "not-found", window.location.pathname);
  }, []);

  return (
    <main className="flex min-h-dvh items-center justify-center py-16">
      <div className="app-bg" aria-hidden />
      <StateMessage
        icon={SearchX}
        title="Page not found"
        body="This page does not exist or has moved. Head back to Home to find what you were after."
        headingLevel="h1"
      >
        <PrimaryLinkButton href="/" className="w-full">
          Back to Home
        </PrimaryLinkButton>
        <SecondaryButton type="button" onClick={() => openFeedback({ source: "feedback" })} className="w-full">
          Report this
        </SecondaryButton>
        <p className="mt-2 text-center text-[12px] leading-4 text-dc-muted">
          Keeps happening?{" "}
          <button
            type="button"
            onClick={() => void resetApp()}
            className="cursor-pointer font-bold text-dc-purple underline underline-offset-2 hover:no-underline"
          >
            Reset the app
          </button>
          . Clears cached files, keeps your interests and sign-in.
        </p>
      </StateMessage>
    </main>
  );
}
