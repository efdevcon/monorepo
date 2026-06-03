"use client";

import { useEffect } from "react";
import { useUser } from "@/data/auth/useUser";
import { useSkipLogin } from "@/data/auth/useSkipLogin";
import { useRouter } from "@/routing";
import { Tickets } from "./Tickets";

/**
 * Profile screen: shows the signed-in user and a sign-out action.
 * Logged-out visitors are redirected straight to the login screen.
 */
export function Profile() {
  const { user, loading, hasInitialized, signOut } = useUser();
  const { clearSkip } = useSkipLogin();
  const router = useRouter();
  const busy = loading !== false;

  useEffect(() => {
    if (hasInitialized && !user) router.push("/login");
  }, [hasInitialized, user, router]);

  const handleSignOut = async () => {
    await signOut();
    // Clear the skip flag so the login screen shows after signing out.
    clearSkip();
  };

  if (!hasInitialized || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center p-8">
        <p className="text-gray-500">Loading…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-6">
      <div>
        <h1 className="text-3xl font-bold mb-6">Profile</h1>

        <div className="p-4 border rounded-lg mb-6">
          <span className="text-sm text-gray-500 block">Signed in as</span>
          <span className="font-semibold break-all">{user.email}</span>
        </div>

        <div className="mb-8">
          <Tickets />
        </div>

        <button
          onClick={handleSignOut}
          disabled={busy}
          className="w-full rounded-full border border-[#E1E4EA] py-3 px-5 font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          {busy ? loading : "Sign out"}
        </button>
      </div>
    </main>
  );
}
