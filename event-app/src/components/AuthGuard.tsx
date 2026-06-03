"use client";

import { useUser } from "@/data/auth/useUser";
import { useSkipLogin } from "@/data/auth/useSkipLogin";
import { useLoginTransition } from "./LoginTransition";
import { Auth } from "./Auth";

/**
 * Gates its children behind login. Shows the login screen when the user is
 * neither signed in nor has chosen to skip. The skip choice is persisted, so
 * skipped users pass straight through on subsequent visits.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, hasInitialized } = useUser();
  const { skipped, ready, skip } = useSkipLogin();
  const { play, playing, revealApp } = useLoginTransition();

  const handleSkip = () => {
    skip();
    play(); // play() also navigates home
  };

  if (!hasInitialized || !ready) {
    return (
      <main className="flex min-h-screen items-center justify-center p-8">
        <p className="text-gray-600">Loading…</p>
      </main>
    );
  }

  // During the transition's first phase, keep the (fading) login screen mounted
  // behind the overlay; hand off to the app once the image has filled.
  if (playing && !revealApp) {
    return <Auth onSkip={handleSkip} leaving />;
  }

  if (!user && !skipped) {
    return <Auth onSkip={handleSkip} />;
  }

  return <>{children}</>;
}
