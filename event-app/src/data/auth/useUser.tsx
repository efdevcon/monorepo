"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import useSWR from "swr";
import type { User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { supabase } from "./supabase";

/**
 * Last user auth-js handed us, persisted through the Dexie-backed SWR cache so
 * it survives reloads offline (no fetcher: the key is only written via mutate).
 * It is a fallback for one situation: auth-js can't produce a session but
 * hasn't signed us out either, i.e. the access token expired and the refresh
 * failed on a dead connection. auth-js keeps the stored session in that case
 * and retries once the network is back; a definitive sign-out (explicit, or a
 * refresh the server rejected) fires SIGNED_OUT, which clears this record. The
 * server still verifies the real token on every API call, so the fallback only
 * ever unlocks locally cached data.
 */
const LAST_USER_KEY = ["auth", "last-user"];

export type UseUserResult = {
  user: User | null;
  /** A status string while a request is in flight, otherwise false. */
  loading: string | false;
  error: string | null;
  hasInitialized: boolean;
  /** Resolves true if the code was sent, false on failure. */
  sendOtp: (email: string) => Promise<boolean>;
  /** Resolves true if the code verified (signed in), false on failure. */
  verifyOtp: (email: string, token: string) => Promise<boolean>;
  signOut: () => Promise<void>;
};

const UserContext = createContext<UseUserResult | null>(null);

/**
 * Minimal email-OTP auth via Supabase.
 * Flow: sendOtp(email) -> user receives a code by email -> verifyOtp(email, code).
 *
 * One instance of this state lives in `UserProvider` (root layout) and every
 * `useUser()` reads it. It used to be a plain hook: each of its ~12 call
 * sites registered its own auth listener and re-ran the mount-time session
 * restore, starting from `hasInitialized: false` — so screens like /ticket
 * that gate on it re-showed "Loading…" on every visit. Mounted once, the
 * state is already settled by the time any page renders.
 */
function useUserState(): UseUserResult {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<string | false>("Initializing...");
  const [error, setError] = useState<string | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);

  const { data: lastUser, mutate: setLastUser } = useSWR<User | null>(
    LAST_USER_KEY,
    null,
    {
      revalidateOnMount: false,
      revalidateIfStale: false,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );
  // Ref so the one-shot auth effect below reads the latest value. Declared
  // before it so the mount-time sync runs first.
  const lastUserRef = useRef(lastUser);
  useEffect(() => {
    lastUserRef.current = lastUser;
  }, [lastUser]);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      setHasInitialized(true);
      return;
    }

    const settle = (next: User | null) => {
      if (next) void setLastUser(next, { revalidate: false });
      // No session but not signed out: keep the remembered user (see
      // LAST_USER_KEY) so cached tickets stay reachable offline.
      setUser(next ?? lastUserRef.current ?? null);
      setLoading(false);
      setHasInitialized(true);
    };

    // Offline with a remembered user: don't wait for auth-js. On an expired
    // token its refresh attempt backs off for up to ~30s on a dead connection
    // before resolving (with null).
    if (
      typeof navigator !== "undefined" &&
      navigator.onLine === false &&
      lastUserRef.current
    ) {
      setUser(lastUserRef.current);
      setLoading(false);
      setHasInitialized(true);
    }

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_OUT") {
          void setLastUser(null, { revalidate: false });
          setUser(null);
          setLoading(false);
          setHasInitialized(true);
          return;
        }
        settle(session?.user ?? null);
      }
    );

    // Restore any existing session on mount from local storage. getSession()
    // makes no network request; getUser() would round-trip to Supabase and
    // return null on a dead connection, sending offline users to the sign-in
    // screen over their cached tickets. The server verifies the token on every
    // API call anyway.
    supabase.auth.getSession().then(({ data }) => {
      settle(data.session?.user ?? null);
    });

    return () => authListener.subscription.unsubscribe();
  }, [setLastUser]);

  const sendOtp = async (email: string): Promise<boolean> => {
    try {
      if (!email) throw new Error("Email is required");
      if (!supabase) throw new Error("Supabase not initialized");
      setLoading("Sending code...");
      setError(null);

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          // OTP and magic-link share one email template on this Supabase
          // project; the template renders the OTP code only when a redirect
          // URL is present. The OTP flow ignores the redirect itself, so this
          // value must match the template's condition exactly — do not change.
          emailRedirectTo: "https://app.devconnect.org",
        },
      });
      if (error) throw error;

      toast.success("Code sent! Please check your email.");
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      toast.error(`Failed to send code: ${message}`);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (email: string, token: string): Promise<boolean> => {
    try {
      if (!email) throw new Error("Email is required");
      if (!token) throw new Error("Code is required");
      if (!supabase) throw new Error("Supabase not initialized");
      setLoading("Verifying code...");
      setError(null);

      const { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: "email",
      });
      if (error) throw error;

      toast.success("Signed in. Welcome to Devcon India!");
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      // Only claim "wrong code" when it actually was one. Reporting every
      // failure that way sent offline users into a retry loop — request a new
      // code, fail again on the same dead connection, hit Supabase's rate
      // limit, and still be told the code was invalid.
      const offline =
        typeof navigator !== "undefined" && navigator.onLine === false;
      const looksNetwork = /fetch|network|timeout|connection/i.test(message);
      const looksRateLimit = /rate limit|too many|429/i.test(message);
      toast.error(
        offline || looksNetwork
          ? "Can't reach the server — check your connection and try again."
          : looksRateLimit
            ? "Too many attempts. Wait a minute, then try again."
            : "Verification failed: the code is invalid or has expired."
      );
      return false;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      if (!supabase) throw new Error("Supabase not initialized");
      setLoading("Signing out...");
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      toast.success("Signed out.");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      toast.error(`Failed to sign out: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    loading,
    error,
    hasInitialized,
    sendOtp,
    verifyOtp,
    signOut,
  };
}

/** Mount once, above every screen (root layout). */
export function UserProvider({ children }: { children: ReactNode }) {
  const value = useUserState();
  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser(): UseUserResult {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error("useUser() must be used inside <UserProvider>");
  }
  return ctx;
}
