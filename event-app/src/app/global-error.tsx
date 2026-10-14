"use client";

import { RefreshCw, TriangleAlert } from "lucide-react";
import "./globals.css";
import { PrimaryButton, SecondaryButton } from "@/components/Buttons";
import { StateMessage } from "@/components/StateMessage";
import { FEEDBACK_PARAM, rememberCrash } from "@/data/feedback/feedbackState";
import { resetApp } from "@/data/feedback/resetApp";

/**
 * Root-layout crash: replaces the whole document, so it brings its own
 * html/body and stylesheet. Poppins isn't loaded here (the root layout's
 * next/font variables are gone), so text falls back to the system font.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <main className="flex min-h-dvh items-center justify-center py-16">
          <div className="app-bg" aria-hidden />
          <StateMessage
            icon={TriangleAlert}
            title="Something went wrong"
            body="Please try again in a moment."
            headingLevel="h1"
            tone="critical"
          >
            <PrimaryButton type="button" onClick={reset} className="w-full">
              Try again
              <RefreshCw className="size-4" />
            </PrimaryButton>
            {/* No providers here, so no sheet: park the error and let Home's
                sheet pick it up (FeedbackSheet reads ?feedback=crash). */}
            <SecondaryButton
              type="button"
              onClick={() => {
                rememberCrash(error);
                window.location.assign(`/?${FEEDBACK_PARAM}=crash`);
              }}
              className="w-full"
            >
              Report this
            </SecondaryButton>
            <SecondaryButton type="button" onClick={() => void resetApp()} className="w-full">
              Reset the app
            </SecondaryButton>
          </StateMessage>
        </main>
      </body>
    </html>
  );
}
