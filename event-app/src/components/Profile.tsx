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
    <main className="py-6">
      <div>
        <h1 className="mb-6 text-lg font-bold">
          Hello!{" "}
          <span className="font-bold break-all text-[#7D52F4]">
            {user.email}
          </span>
        </h1>

        <div className="mb-8">
          <Tickets />
        </div>

        <button
          onClick={handleSignOut}
          disabled={busy}
          className="w-full cursor-pointer rounded-full bg-[#7D52F4] py-3 px-5 font-medium text-white transition-colors hover:bg-[#6A3FD1] disabled:cursor-default disabled:opacity-50"
        >
          {busy ? loading : "Sign out"}
        </button>
      </div>
    </main>
  );
}
