"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { LogIn, LogOut, UserCog } from "lucide-react";
import { HEADER_ACTIONS_ID } from "@/components/AppHeader";
import { Link } from "@/routing";
import { useUser } from "@/data/auth/useUser";

// Greeting variants from the Figma spec strip (5017:5368), rotated in order.
const GREETINGS = [
  { text: "नमस्कार", pron: "(na-muh-skaa)" },
  { text: "नमस्त", pron: "(na-ma-stay)" },
  { text: "नमस्ते", pron: "(na-ma-stay)" },
  { text: "Hello", pron: "(heh-low)" },
];
const ROTATE_MS = 6_000;

type AuthProps = {
  user: ReturnType<typeof useUser>["user"];
  signOut: () => Promise<void>;
};

/**
 * Mobile auth controls, portaled into the AppHeader's #header-actions target
 * (same pattern as the speakers page): a sign-in circle when signed out, the
 * account + sign-out circles when signed in. Desktop renders its own inline
 * controls next to the greeting instead.
 */
function HeaderAuthActions({ user, signOut }: AuthProps) {
  const [target, setTarget] = useState<Element | null>(null);
  useEffect(() => {
    setTarget(document.getElementById(HEADER_ACTIONS_ID));
  }, []);
  if (!target) return null;

  return (
    <>
      {createPortal(
        user ? (
          <>
            <Link
              href="/ticket"
              aria-label="Account"
              className="flex size-8 items-center justify-center rounded-full border border-dc-hairline bg-white"
            >
              <UserCog className="size-4 text-dc-purple" />
            </Link>
            <button
              onClick={signOut}
              aria-label="Sign out"
              className="flex size-8 cursor-pointer items-center justify-center rounded-full border border-dc-error bg-white/80"
            >
              <LogOut className="size-4 text-dc-error" />
            </button>
          </>
        ) : (
          <Link
            href="/ticket"
            aria-label="Sign in"
            className="flex size-8 items-center justify-center rounded-full border border-dc-hairline bg-white"
          >
            <LogIn className="size-4 text-dc-purple" />
          </Link>
        ),
        target
      )}
    </>
  );
}

/**
 * Home-page greeting row: rotating Devanagari/English greeting with
 * pronunciation. Auth controls sit inline on desktop (Sign in pill, or email +
 * account/sign-out round buttons); on mobile they live in the app header.
 */
export function Greeting() {
  const { user, signOut } = useUser();
  const reducedMotion = useReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      // Skip ticks in a hidden tab so the greeting doesn't churn unseen.
      if (document.hidden) return;
      setIndex((i) => (i + 1) % GREETINGS.length);
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, []);

  const greeting = GREETINGS[index];

  return (
    <div className="flex items-start justify-between gap-4 border-b border-dc-hairline pb-4">
      <div className="min-w-0 flex-1">
        {/* Fixed-height relative box: entering/exiting variants are absolutely
            positioned so the rotation never shifts the layout below. */}
        <div className="relative h-12">
          <AnimatePresence initial={false}>
            <motion.div
              key={index}
              className="absolute inset-y-0 left-0 flex items-center gap-2 whitespace-nowrap"
              initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 28 }}
              animate={{
                opacity: 1,
                y: 0,
                transition: reducedMotion
                  ? { duration: 0 }
                  : { duration: 0.35, ease: [0.32, 0.72, 0, 1] },
              }}
              exit={
                reducedMotion
                  ? { opacity: 0, transition: { duration: 0 } }
                  : {
                      opacity: 0,
                      y: -28,
                      transition: { duration: 0.25, ease: "easeIn" },
                    }
              }
            >
              <span className="font-heading text-[32px] font-extrabold leading-[1.5] tracking-[-1px] text-dc-purple">
                {greeting.text}
              </span>
              <span className="font-heading text-base italic tracking-[-0.25px] text-dc-muted">
                {greeting.pron}
              </span>
            </motion.div>
          </AnimatePresence>
        </div>
        {/* Mobile: email sits under the greeting (desktop shows it inline right) */}
        {user?.email && (
          <p className="mt-1 truncate font-heading text-base tracking-[-0.25px] text-dc-muted lg:hidden">
            {user.email}
          </p>
        )}
      </div>

      <HeaderAuthActions user={user} signOut={signOut} />

      {/* Desktop-only inline controls */}
      <div className="mt-1 hidden shrink-0 items-center gap-3 lg:flex">
        {user ? (
          <>
            <span className="font-heading text-base tracking-[-0.25px] text-dc-muted">
              {user.email}
            </span>
            <Link
              href="/ticket"
              aria-label="Account"
              className="flex size-10 items-center justify-center rounded-full border border-dc-hairline bg-white transition-colors hover:bg-dc-purple-wash"
            >
              <UserCog className="size-4 text-dc-purple" />
            </Link>
            <button
              onClick={signOut}
              aria-label="Sign out"
              className="flex size-10 cursor-pointer items-center justify-center rounded-full border border-dc-error bg-white/80 transition-colors hover:bg-dc-live-bg"
            >
              <LogOut className="size-4 text-dc-error" />
            </button>
          </>
        ) : (
          <Link
            href="/ticket"
            className="flex h-10 items-center gap-2 rounded-full border border-dc-hairline bg-white/80 pl-3 pr-4 font-heading text-sm font-bold text-dc-fg2 transition-colors hover:bg-white"
          >
            <LogIn className="size-4" />
            Sign in
          </Link>
        )}
      </div>
    </div>
  );
}
