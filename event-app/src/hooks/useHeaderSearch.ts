"use client";

import { useRef, useState } from "react";

/**
 * Shared state + behavior for the mobile header search drawer: the pages'
 * portaled search circle toggles it, HeaderSearchDrawer renders it. One home
 * for the fragile iOS invariant so Schedule and Speakers can't drift apart:
 * Safari only raises the on-screen keyboard for a focus() made synchronously
 * inside a user gesture, so everything the open path needs (inert removal,
 * focus, scroll reset) happens right here in the tap handler, before React
 * re-renders.
 */
export function useHeaderSearch() {
  const [searchOpen, setSearchOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  /** The drawer's collapsible wrapper — carries `inert` while closed. */
  const drawerRef = useRef<HTMLDivElement | null>(null);

  const toggleSearch = () => {
    const next = !searchOpen;
    setSearchOpen(next);
    if (next) {
      // The collapsed wrapper is inert (no invisible tab stops for keyboard
      // or VoiceOver users); an inert element also refuses programmatic
      // focus, so lift it NOW — React's own attribute removal only lands
      // after this handler returns.
      drawerRef.current?.removeAttribute("inert");
      // Focus synchronously inside the tap gesture — a focus deferred to an
      // effect gets a caret but no iOS keyboard. The input is mounted-but-
      // collapsed, so it's focusable before the drawer animates open;
      // preventScroll stops the browser yanking the overflow-hidden
      // wrapper's scrollTop to reveal it.
      inputRef.current?.focus({ preventScroll: true });
      // Back to the top, instantly — smooth would make WebKit rasterize
      // everything in between on an ~82k-px list (the old iOS crash).
      // Without this, searching from deep in the list strands the viewport
      // below the results when the filtered document collapses (the browser
      // just clamps scrollY).
      window.scrollTo({ top: 0, behavior: "auto" });
    } else {
      inputRef.current?.blur();
    }
  };

  const closeSearch = () => {
    setSearchOpen(false);
    inputRef.current?.blur();
  };

  return { searchOpen, toggleSearch, closeSearch, inputRef, drawerRef };
}
