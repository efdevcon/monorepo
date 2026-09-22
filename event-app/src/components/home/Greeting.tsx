"use client";

import { usePaneActive } from "@/components/paneContext";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import cn from "classnames";
import { Bell, LogIn } from "lucide-react";
import APP_CONFIG from "@/CONFIG";
import {
  HEADER_ACTIONS_ID,
  headerCircle,
  headerCircleResting,
} from "@/components/AppHeader";
import { Link } from "@/routing";
import { useUser } from "@/data/auth/useUser";
import { useInboxUnreadCount } from "@/data/announcements/useInboxUnread";

// Greeting variants from the Figma spec strip (5017:5368), rotated in order.
// The strip's नमस्त entry was a truncated duplicate of नमस्ते (same
// pronunciation, missing matra) — dropped after review.
const GREETINGS = [
  { text: "नमस्कार", pron: "(na-muh-skaa)" },
  { text: "नमस्ते", pron: "(na-ma-stay)" },
  { text: "Hello", pron: "(heh-low)" },
];
const ROTATE_MS = 5_000;

type AuthProps = {
  user: ReturnType<typeof useUser>["user"];
  /** Unread inbox items (Event announcements + Personal reminders). */
  unread: number;
};

/**
 * Round bell linking to the inbox, with the unread count as a pill on its
 * shoulder (the same 16px purple pill the inbox tabs use, so the two
 * counters read as one). Signing out moved to the Me tab; this is the
 * signed-in control on the home page at both breakpoints.
 */
function BellLink({
  unread,
  size,
}: {
  unread: number;
  size: "sm" | "lg";
}) {
  const label =
    unread > 0
      ? `Announcements, ${unread} unread`
      : "Announcements";
  return (
    <Link
      href="/announcements"
      aria-label={label}
      className={cn(
        size === "sm"
          ? cn(headerCircle, headerCircleResting)
          : // after:-inset-0.5 pads the 40px circle to a 44px hit area
            "relative flex size-10 items-center justify-center rounded-full border border-dc-hairline bg-white/80 transition-colors after:absolute after:-inset-0.5 after:content-[''] hover:bg-white"
      )}
    >
      <Bell className="size-4 text-dc-purple" />
      {unread > 0 && (
        <span
          aria-hidden
          className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-dc-purple px-1 text-[10px] font-semibold leading-none tabular-nums text-white"
        >
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}

/**
 * Mobile controls, portaled into the AppHeader's #header-actions target
 * (same pattern as the speakers page): a sign-in circle when signed out, the
 * inbox bell when signed in. Desktop renders its own inline controls next to
 * the greeting instead.
 */
function HeaderAuthActions({ user, unread }: AuthProps) {
  const [target, setTarget] = useState<Element | null>(null);
  const paneActive = usePaneActive();
  useEffect(() => {
    setTarget(document.getElementById(HEADER_ACTIONS_ID));
  }, []);
  if (!target || !paneActive) return null;

  return (
    <>
      {createPortal(
        user ? (
          <BellLink unread={unread} size="sm" />
        ) : (
          <Link
            href="/ticket"
            aria-label="Sign in"
            className="relative flex size-8 items-center justify-center rounded-full border border-dc-hairline bg-white after:absolute after:-inset-1.5 after:content-['']"
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
 * pronunciation. Controls sit inline on desktop (Sign in pill, or email +
 * the inbox bell with its unread count); on mobile they live in the app
 * header.
 */
export function Greeting() {
  const { user } = useUser();
  const unread = useInboxUnreadCount(APP_CONFIG.ANNOUNCEMENTS_ENABLED);
  const reducedMotion = useReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    // Reduced motion: no auto-rotation at all (WCAG 2.2.2 — auto-updating
    // content), not just instant swaps.
    if (reducedMotion) return;
    const id = setInterval(() => {
      // Skip ticks in a hidden tab so the greeting doesn't churn unseen.
      if (document.hidden) return;
      setIndex((i) => (i + 1) % GREETINGS.length);
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, [reducedMotion]);

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
                // Slight delay so the outgoing text has cleared further
                // before the incoming one lands.
                transition: reducedMotion
                  ? { duration: 0 }
                  : { duration: 0.3, ease: [0.32, 0.72, 0, 1], delay: 0.08 },
              }}
              exit={
                reducedMotion
                  ? { opacity: 0, transition: { duration: 0 } }
                  : {
                      opacity: 0,
                      y: -28,
                      transition: { duration: 0.2, ease: "easeIn" },
                    }
              }
            >
              <span
                className="text-[32px] font-extrabold leading-[1.5] tracking-[-1px] text-dc-purple"
                // Latin glyphs come from the main Poppins; Devanagari falls
                // through to the slim 800-weight devanagari loader
                // (unicode-range picks per glyph). See layout.tsx.
                style={{
                  fontFamily:
                    "var(--font-poppins), var(--font-poppins-dev), ui-sans-serif, sans-serif",
                }}
              >
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

      <HeaderAuthActions user={user} unread={unread} />

      {/* Desktop-only inline controls */}
      <div className="mt-1 hidden shrink-0 items-center gap-3 lg:flex">
        {user ? (
          <>
            <span className="font-heading text-base tracking-[-0.25px] text-dc-muted">
              {user.email}
            </span>
            <BellLink unread={unread} size="lg" />
          </>
        ) : (
          <Link
            href="/ticket"
            className="flex h-10 items-center gap-2 rounded-full border border-dc-hairline bg-white/80 pl-3 pr-4 font-heading text-sm font-bold text-dc-fg2 transition-[scale,background-color] duration-150 ease-out hover:bg-white motion-safe:hover:scale-[1.03] motion-safe:active:scale-[0.97] motion-reduce:transition-none"
          >
            <LogIn className="size-4 text-dc-purple" />
            Sign in
          </Link>
        )}
      </div>
    </div>
  );
}
