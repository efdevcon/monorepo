"use client";

import { createContext, useContext, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "@/routing";

const DURATION = 2.4; // seconds
// grow from right (0 → 0.4) · hold (0.4 → 0.6) · reveal app from right (0.6 → 1)
const TIMES = [0, 0.4, 0.6, 1];

// Soft-edged mask: the image is visible between --l and --r, feathered over an
// 8% band at each side. Animating --l / --r sweeps those soft edges.
const MASK =
  "linear-gradient(to right, transparent var(--l), #000 calc(var(--l) + 8%), #000 calc(var(--r) - 8%), transparent var(--r))";

type LoginTransitionContextValue = {
  play: () => void;
  /** True for the whole transition. */
  playing: boolean;
  /** True once the image has filled the screen — app may mount behind it. */
  revealApp: boolean;
};

const LoginTransitionContext = createContext<LoginTransitionContextValue>({
  play: () => {},
  playing: false,
  revealApp: false,
});

export const useLoginTransition = () => useContext(LoginTransitionContext);

/**
 * Cinematic login → app transition. Lives ABOVE the AuthGuard.
 *
 * A window over a full-screen image grows from the right half (matching the
 * login hero panel) to full screen, holds (while the app mounts behind it),
 * then the image's right edge recedes leftward, revealing the app from the
 * right. The image is full-screen the whole time, so its crop never changes.
 */
export function LoginTransitionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [playing, setPlaying] = useState(false);
  const [revealApp, setRevealApp] = useState(false);
  const router = useRouter();

  const play = () => {
    router.push("/");
    setPlaying(true);
    // Mount the app during the hold — while the image is full and opaque — so
    // the mount cost is hidden and the fade that follows stays smooth.
    setTimeout(() => setRevealApp(true), DURATION * TIMES[1] * 1000);
  };

  return (
    <LoginTransitionContext.Provider value={{ play, playing, revealApp }}>
      {children}

      {playing && (
        // A FULL-SCREEN image (never resizes, so it never re-crops) revealed by
        // a soft-edged mask. --l sweeps in from the right half to full (grow),
        // then --r recedes from the right to uncover the app — both feathered.
        <motion.div
          className="fixed inset-0 z-[70] pointer-events-none"
          style={
            {
              "--l": "50%",
              "--r": "108%",
              maskImage: MASK,
              WebkitMaskImage: MASK,
            } as React.CSSProperties
          }
          // Framer animates CSS variables at runtime; its types don't model
          // custom-property keys, so cast. (Only the mask edges live here — the
          // image transform is animated natively below.)
          initial={{ "--l": "50%", "--r": "108%" } as Record<string, string>}
          animate={
            {
              "--l": ["50%", "-8%", "-8%", "-8%"],
              "--r": ["108%", "108%", "108%", "-8%"],
            } as Record<string, string[]>
          }
          transition={{ duration: DURATION, times: TIMES, ease: "easeInOut" }}
          onAnimationComplete={() => {
            setPlaying(false);
            setRevealApp(false);
          }}
        >
          {/* Transform layer: holds the image AND the centered logo so they
              move/zoom together. Native Framer transforms (smoothly
              interpolated, unlike unitless CSS vars). x is a % of the layer's
              own width (= 100vw), so x:25% == 25vw, keeping the content centered
              in the window; scale zooms toward center. Synced to the mask. */}
          <motion.div
            className="absolute inset-0"
            initial={{ x: "25%", scale: 1 }}
            animate={{ x: ["25%", "0%", "0%", "0%"], scale: 1.18 }}
            transition={{
              duration: DURATION,
              times: TIMES,
              ease: "easeInOut",
              // One steady, linear zoom across the whole duration — constant
              // velocity, so no acceleration/"extra zoom" at the end.
              scale: { duration: DURATION, ease: "linear" },
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/login/backdrop.jpg"
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
            {/* Devcon 8 logo, centered on the image — fades in to fully visible
                by the midpoint of the overall animation (white for contrast). */}
            <div className="absolute inset-0 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <motion.img
                src="/login/devcon-8-logo.svg"
                alt="Devcon 8 India"
                className="w-[26vw]"
                style={{ filter: "brightness(0) invert(1)" }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: DURATION / 2, ease: "easeOut" }}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </LoginTransitionContext.Provider>
  );
}
