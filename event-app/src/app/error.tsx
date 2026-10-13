"use client";

import { trackEvent } from "@/data/analytics/track";
import { useEffect } from "react";
import { RefreshCw, TriangleAlert } from "lucide-react";
import { PrimaryButton, SecondaryButton } from "@/components/Buttons";
import { StateMessage } from "@/components/StateMessage";
import { describeError, openFeedback } from "@/data/feedback/feedbackState";
import { resetApp } from "@/data/feedback/resetApp";

/**
 * Route error boundary: the app's centred state recipe on the app gradient.
 * The raw error goes to the console only; users never see exception text,
 * but "Report this" hands it to the feedback sheet (mounted in the root
 * layout, which survives this boundary) with the device details. "Reset the
 * app" is the escape hatch for a poisoned cache. Preview outside production:
 * `/?previewState=crash`.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled error:", error);
    trackEvent("error", "page", window.location.pathname);
  }, [error]);

  return (
    <main className="flex min-h-dvh items-center justify-center py-16">
      <div className="app-bg" aria-hidden />
      <StateMessage
        icon={TriangleAlert}
        title="Something went wrong"
        body="Please try again in a moment, or head back to Home."
        headingLevel="h1"
        tone="critical"
      >
        <PrimaryButton type="button" onClick={reset} className="w-full">
          Try again
          <RefreshCw className="size-4" />
        </PrimaryButton>
        <SecondaryButton
          type="button"
          onClick={() => openFeedback({ source: "crash", error: describeError(error) })}
          className="w-full"
        >
          Report this
        </SecondaryButton>
        {/* Full load, not client routing: the router is what just failed. */}
        <SecondaryButton type="button" onClick={() => window.location.assign("/")} className="w-full">
          Back to Home
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
