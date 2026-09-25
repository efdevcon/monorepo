"use client";

import { createContext, useContext, type ReactNode } from "react";
import { usePushSubscription } from "./usePushSubscription";

/**
 * One shared push opt-in state for the whole app shell.
 *
 * `usePushSubscription()` owns a state machine (permission, registration,
 * server prefs) that re-detects on mount and tracks in-flight taps. Two
 * separate instances would disagree: the onboarding sheet turning push on
 * would leave the Notifications modal showing "off" until a reload. So the
 * page layout calls it once here and every consumer reads it through
 * `usePush()`. Mounted inside `UserProvider` (root layout), which the hook
 * needs for `signedIn`.
 */
export type PushContextValue = ReturnType<typeof usePushSubscription>;

const PushContext = createContext<PushContextValue | null>(null);

export function PushProvider({ children }: { children: ReactNode }) {
  const push = usePushSubscription();
  return <PushContext.Provider value={push}>{children}</PushContext.Provider>;
}

export function usePush(): PushContextValue {
  const push = useContext(PushContext);
  if (!push) {
    throw new Error(
      "usePush() must be used inside <PushProvider> (mounted by the (page-layout) layout)"
    );
  }
  return push;
}
