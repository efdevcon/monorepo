"use client";

import { RefreshCw, TriangleAlert } from "lucide-react";
import "./globals.css";
import { PrimaryButton } from "@/components/Buttons";
import { StateMessage } from "@/components/StateMessage";

/**
 * Root-layout crash: replaces the whole document, so it brings its own
 * html/body and stylesheet. Poppins isn't loaded here (the root layout's
 * next/font variables are gone), so text falls back to the system font.
 */
export default function GlobalError({
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
          >
            <PrimaryButton type="button" onClick={reset} className="w-full">
              Try again
              <RefreshCw className="size-4" />
            </PrimaryButton>
          </StateMessage>
        </main>
      </body>
    </html>
  );
}
