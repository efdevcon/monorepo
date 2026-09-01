"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { LogOut } from "lucide-react";
import { useUser } from "@/data/auth/useUser";
import { HEADER_ACTIONS_ID } from "@/components/AppHeader";
import { InstallAppButton } from "./InstallAppButton";
import { MyTickets } from "./MyTickets";
import { TicketSignIn } from "./TicketSignIn";

/**
 * Ticket screen (Figma "My Devcon", Dev Handoff 5088-116/-1059): signed out,
 * it's the app's one sign-in surface, framed around loading your tickets.
 * Signed in — mobile lays the content straight on the app background with the
 * sign-out circle up in the AppHeader bar; desktop wraps everything in the
 * bordered white panel with a labeled sign-out pill.
 */
export function Ticket() {
  const { user, loading, hasInitialized, signOut } = useUser();
  const busy = loading !== false;

  if (!hasInitialized) {
    return (
      <main className="flex min-h-screen items-center justify-center p-8">
        <p className="text-dc-muted">Loading…</p>
      </main>
    );
  }

  return (
    // `expand` breaks out of the .section column; the inner wrapper restores
    // mobile gutters and caps desktop at the design's 1312px (same pattern as
    // Schedule.tsx).
    <main className="expand py-4">
      <div className="px-4 lg:mx-auto lg:w-full lg:max-w-[1312px] lg:px-8 xl:px-0">
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
            className="font-heading"
          >
            {/* Mobile title comes from AppHeader; page h1 is desktop-only. */}
            <h1 className="mb-6 hidden text-[24px] font-extrabold leading-[28.8px] tracking-[-0.5px] text-dc-fg2 lg:block">
              My Devcon
            </h1>

            {/* Mobile sign-out lives in the sticky header bar (Figma 5088-140). */}
            <HeaderSignOut onSignOut={signOut} disabled={busy} />

            <div className="flex flex-col gap-6 lg:block lg:overflow-clip lg:rounded-xl lg:border lg:border-dc-hairline">
              <div className="flex items-center justify-between gap-3 lg:border-b lg:border-dc-hairline lg:bg-white lg:p-4">
                <p className="min-w-0 text-[16px] font-bold leading-6 text-dc-fg2 lg:text-[20px] lg:font-extrabold lg:leading-[26px]">
                  Hello!{" "}
                  <span className="break-all text-dc-purple">{user.email}</span>
                </p>
                {/* Desktop: labeled pill (mobile uses the header circle). */}
                <button
                  onClick={signOut}
                  disabled={busy}
                  className="hidden h-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full border border-dc-error bg-white/80 px-6 text-[14px] font-bold leading-none text-dc-error transition-[scale,background-color] duration-150 ease-out hover:bg-dc-live-bg disabled:cursor-default disabled:opacity-50 motion-safe:enabled:hover:scale-[1.03] motion-safe:enabled:active:scale-[0.97] motion-reduce:transition-none lg:flex"
                >
                  Sign out
                  <LogOut className="size-4" />
                </button>
              </div>

              <div className="lg:bg-white lg:p-6">
                <MyTickets />
              </div>
            </div>

            <div className="mt-6 flex justify-center empty:hidden">
              <InstallAppButton />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </main>
  );
}

/**
 * Sign-out circle portaled into the AppHeader's actions slot — the slot only
 * exists in the mobile bar, so this never shows on desktop. 32px circle per
 * the design; before:-inset-1.5 pads the touch target to 44px (headerCircle
 * convention) — this is the only sign-out control on mobile and a mis-tap
 * costs a full OTP round-trip.
 */
function HeaderSignOut({
  onSignOut,
  disabled,
}: {
  onSignOut: () => void;
  disabled: boolean;
}) {
  const [target, setTarget] = useState<Element | null>(null);
  useEffect(() => {
    setTarget(document.getElementById(HEADER_ACTIONS_ID));
  }, []);
  if (!target) return null;
  return (
    <>
      {createPortal(
        <button
          onClick={onSignOut}
          disabled={disabled}
          aria-label="Sign out"
          className="relative flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-dc-error bg-white transition-[scale,background-color] duration-150 ease-out before:absolute before:-inset-1.5 before:content-[''] hover:bg-dc-live-bg disabled:cursor-default disabled:opacity-50 motion-safe:enabled:hover:scale-[1.03] motion-safe:enabled:active:scale-[0.97] motion-reduce:transition-none"
        >
          <LogOut className="size-4 text-dc-error" />
        </button>,
        target
      )}
    </>
  );
}
