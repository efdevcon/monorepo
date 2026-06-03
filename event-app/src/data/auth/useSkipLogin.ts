"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "event_app_skip_login";

/**
 * Tracks whether the user chose to skip login. Persisted in localStorage so
 * the choice survives reloads. `ready` is false until the stored value is read
 * (avoids a flash of the login screen on mount).
 */
export function useSkipLogin() {
  const [skipped, setSkipped] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSkipped(localStorage.getItem(STORAGE_KEY) === "true");
    setReady(true);
  }, []);

  const skip = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setSkipped(true);
  };

  const clearSkip = () => {
    localStorage.removeItem(STORAGE_KEY);
    setSkipped(false);
  };

  return { skipped, ready, skip, clearSkip };
}
