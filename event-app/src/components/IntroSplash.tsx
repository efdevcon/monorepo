"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { isStandalone } from "./InstallAppButton";
import { MOBILE_MEDIA_QUERY, useMediaQuery } from "@/hooks/useIsDesktop";

const STORAGE_KEY = "event_app_intro_seen";

const DURATION = 2.4; // seconds
// grow from right (0 → 0.4) · hold (0.4 → 0.6) · reveal from right (0.6 → 1)
const TIMES = [0, 0.4, 0.6, 1];

// Soft-edged mask: the image is visible between --l and --r, feathered over an
// 8% band at each side. Animating --l / --r sweeps those soft edges.
const MASK =
  "linear-gradient(to right, transparent var(--l), #000 calc(var(--l) + 8%), #000 calc(var(--r) - 8%), transparent var(--r))";

/**
 * One-time cinematic welcome, played over the app the first time it's
 * launched as an installed PWA (standalone display mode) on a device —
 * never again after. Skipped entirely for ordinary browser-tab visits, so
 * it reads as "welcome to your app" rather than an interruption on a casual
 * link click. Purely decorative: the app underneath is always mounted, this
 * never gates content (unlike the old login-gate transition it's adapted
 * from).
 */
export function IntroSplash({ children }: { children: React.ReactNode }) {
  const [playing, setPlaying] = useState(false);
  // Below `lg` (where the hero image is hidden).
  const isMobile = useMediaQuery(MOBILE_MEDIA_QUERY);

  useEffect(() => {
    if (!isStandalone()) return;
    if (localStorage.getItem(STORAGE_KEY) === "true") return;
    localStorage.setItem(STORAGE_KEY, "true");
    setPlaying(true);
  }, []);

  // Desktop grows from a right-half panel (matching the old login hero).
  // Mobile has no visible hero, so the image wipes in from off-screen right.
  const lInitial = isMobile ? "100%" : "50%";
  const lKeyframes = isMobile
    ? ["100%", "-8%", "-8%", "-8%"]
    : ["50%", "-8%", "-8%", "-8%"];
  const xInitial = isMobile ? "0%" : "25%";
  const xKeyframes = isMobile
    ? ["0%", "0%", "0%", "0%"]
    : ["25%", "0%", "0%", "0%"];

  return (
    <>
      {children}

      {playing && (
        // A FULL-SCREEN image (never resizes, so it never re-crops) revealed by
        // a soft-edged mask. --l sweeps in from the right half to full (grow),
        // then --r recedes from the right to uncover the app — both feathered.
        <motion.div
          className="fixed inset-0 z-[70] pointer-events-none"
          style={
            {
              "--l": lInitial,
              "--r": "108%",
              maskImage: MASK,
              WebkitMaskImage: MASK,
            } as React.CSSProperties
          }
          // Framer animates CSS variables at runtime; its types don't model
          // custom-property keys, so cast. (Only the mask edges live here — the
          // image transform is animated natively below.)
          initial={{ "--l": lInitial, "--r": "108%" } as Record<string, string>}
          animate={
            {
              "--l": lKeyframes,
              "--r": ["108%", "108%", "108%", "-8%"],
            } as Record<string, string[]>
          }
          transition={{ duration: DURATION, times: TIMES, ease: "easeInOut" }}
          onAnimationComplete={() => setPlaying(false)}
        >
          {/* Transform layer: holds the image AND the centered logo so they
              move/zoom together. Native Framer transforms (smoothly
              interpolated, unlike unitless CSS vars). x is a % of the layer's
              own width (= 100vw), so x:25% == 25vw, keeping the content centered
              in the window; scale zooms toward center. Synced to the mask. */}
          <motion.div
            className="absolute inset-0"
            initial={{ x: xInitial, scale: 1 }}
            animate={{ x: xKeyframes, scale: 1.18 }}
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
                className="w-[60vw] lg:w-[26vw]"
                style={{ filter: "brightness(0) invert(1)" }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: DURATION / 2, ease: "easeOut" }}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </>
  );
}
