"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { supabase } from "./supabase";

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

/**
 * Minimal email-OTP auth via Supabase.
 * Flow: sendOtp(email) -> user receives a code by email -> verifyOtp(email, code).
 */
export function useUser(): UseUserResult {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<string | false>("Initializing...");
  const [error, setError] = useState<string | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      setHasInitialized(true);
      return;
    }

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
        setHasInitialized(true);
      }
    );

    // Restore any existing session on mount.
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      setLoading(false);
      setHasInitialized(true);
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

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

      toast.success("Code sent! Check your email.");
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

      toast.success("Signed in!");
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      toast.error(`Failed to verify code: ${message}`);
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
