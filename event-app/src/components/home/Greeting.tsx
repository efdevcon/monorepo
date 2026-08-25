"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { LogIn, LogOut, UserCog } from "lucide-react";
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

/**
 * Home-page greeting row: rotating Devanagari/English greeting with
 * pronunciation, and the auth controls on the right (Sign in pill when signed
 * out; email + account/sign-out round buttons when signed in).
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
              initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
              animate={{
                opacity: 1,
                y: 0,
                transition: reducedMotion
                  ? { duration: 0 }
                  : { duration: 0.3, ease: [0.32, 0.72, 0, 1] },
              }}
              exit={
                reducedMotion
                  ? { opacity: 0, transition: { duration: 0 } }
                  : {
                      opacity: 0,
                      y: -12,
                      transition: { duration: 0.2, ease: "easeIn" },
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

      <div className="mt-1 flex shrink-0 items-center gap-3">
        {user ? (
          <>
            <span className="hidden font-heading text-base tracking-[-0.25px] text-dc-muted lg:block">
              {user.email}
            </span>
            <Link
              href="/ticket"
              aria-label="Account"
              className="flex size-10 items-center justify-center rounded-full border border-dc-hairline bg-white transition-colors hover:bg-dc-purple-wash"
            >
              <UserCog className="size-4 text-dc-fg2" />
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
