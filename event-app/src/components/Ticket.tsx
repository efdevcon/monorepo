"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useUser } from "@/data/auth/useUser";
import { InstallAppButton } from "./InstallAppButton";
import { TicketSignIn } from "./TicketSignIn";
import { Tickets } from "./Tickets";

/**
 * Ticket screen: signed out, it's the app's one sign-in surface, framed
 * around loading your tickets. Signed in, it shows them plus a sign-out
 * action.
 */
export function Ticket() {
  const { user, loading, hasInitialized, signOut } = useUser();
  const busy = loading !== false;

  if (!hasInitialized) {
    return (
      <main className="flex min-h-screen items-center justify-center p-8">
        <p className="text-gray-500">Loading…</p>
      </main>
    );
  }

  return (
    <main className="py-6">
      <AnimatePresence mode="wait">
        {!user ? (
          <motion.div
            key="signin"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <TicketSignIn />
          </motion.div>
        ) : (
          <motion.div
            key="tickets"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <h1 className="mb-6 text-lg font-bold">
              Hello!{" "}
              <span className="font-bold break-all text-[#7D52F4]">
                {user.email}
              </span>
            </h1>

            <div className="mb-8">
              <Tickets />
            </div>

            <div className="mb-4 flex justify-center">
              <InstallAppButton />
            </div>

            <button
              onClick={signOut}
              disabled={busy}
              className="w-full cursor-pointer rounded-full bg-[#7D52F4] py-3 px-5 font-medium text-white transition-colors hover:bg-[#6A3FD1] disabled:cursor-default disabled:opacity-50"
            >
              {busy ? loading : "Sign out"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
