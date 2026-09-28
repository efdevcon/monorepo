"use client";

import { useEffect } from "react";
import { RefreshCw, TriangleAlert } from "lucide-react";
import { PrimaryButton, SecondaryButton } from "@/components/Buttons";
import { StateMessage } from "@/components/StateMessage";

/**
 * Route error boundary: the app's centred state recipe on the app gradient.
 * The raw error goes to the console only; users never see exception text.
 * Preview outside production: `/?previewState=crash`.
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
  }, [error]);

  return (
    <main className="flex min-h-dvh items-center justify-center py-16">
      <div className="app-bg" aria-hidden />
      <StateMessage
        icon={TriangleAlert}
        title="Something went wrong"
        body="Please try again in a moment, or head back to Home."
        headingLevel="h1"
      >
        <PrimaryButton type="button" onClick={reset} className="w-full">
          Try again
          <RefreshCw className="size-4" />
        </PrimaryButton>
        {/* Full load, not client routing: the router is what just failed. */}
        <SecondaryButton type="button" onClick={() => window.location.assign("/")} className="w-full">
          Back to Home
        </SecondaryButton>
      </StateMessage>
    </main>
  );
}
