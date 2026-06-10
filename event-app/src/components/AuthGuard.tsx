"use client";

import { usePathname } from "next/navigation";
import { useUser } from "@/data/auth/useUser";
import { useSkipLogin } from "@/data/auth/useSkipLogin";
import { useLoginTransition } from "./LoginTransition";
import { Auth } from "./Auth";

/**
 * Gates its children behind login. The guard OWNS the login screen (a single
 * `Auth` instance) — it renders it when logged out (or on /login even if
 * skipped) and during the transition's first phase. Because it's always the
 * same instance, toggling `leaving` fades it instead of remounting (no flash).
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
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

  // Logged-out users see the login screen everywhere; a skipped guest only sees
  // it on /login (where they go to sign in). During the transition's phase 1 we
  // keep it mounted (and fading) regardless.
  const showLogin = !user && (!skipped || pathname === "/login");
  const leaving = playing && !revealApp;

  if (showLogin || leaving) {
    return <Auth onSkip={handleSkip} leaving={leaving} />;
  }

  return <>{children}</>;
}
