"use client";

import { useCallback, useState } from "react";
import { supabase } from "@/data/auth/supabase";
import { isIOS, isStandalone } from "@/utils/platform";

export interface IssuedProof {
  partner: string;
  partnerLabel: string;
  tier: "india" | "standard";
  /** Unix seconds. */
  exp: number;
  claimUrl: string;
}

interface ProofResponse {
  success: boolean;
  data?: IssuedProof;
  error?: string;
}

/** Mint a partner proof for one ticket. Throws with a displayable message. */
async function mintTicketProof(
  ticketSecret: string,
  partner: string
): Promise<IssuedProof> {
  if (!supabase) throw new Error("Not signed in");
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("Not signed in");

  const res = await fetch("/api/ticket-proof", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ticketSecret, partner }),
  });

  const json: ProofResponse = await res.json().catch(() => ({
    success: false,
    error: "Unexpected response",
  }));

  if (!json.success || !json.data) {
    throw new Error(json.error || "Couldn't create your proof");
  }
  return json.data;
}

/**
 * How the proof link should leave the app.
 *
 * `direct` means we can just open a tab and be done. `escape` means we're inside
 * an installed PWA, where a link to another origin does not open the user's
 * browser: iOS renders it in an in-app web view with no API to escape, and
 * Android hands it to a Custom Tab. Neither can be overridden from web code, so
 * there is no way to genuinely force the default browser.
 *
 * That matters here because the partner page needs a wallet connection, and
 * deep-linking out to a wallet app from inside an in-app view (and getting the
 * user back) is the classic point of failure. On iOS the in-app view may also
 * not share Safari's storage, so an existing wallet session won't be there.
 */
export function handoffMode(): "direct" | "escape" {
  return isStandalone() ? "escape" : "direct";
}

/**
 * Hand the URL to a real browser, as far as the platform allows.
 *
 * MUST be called synchronously from the tap that triggered it. iOS blocks
 * app-handoff attempts that aren't tied directly to a user gesture, which is
 * why the proof is minted *before* this button is shown rather than on the way
 * out — an `await` between the tap and the hop is enough to lose it.
 *
 * Returns whether the attempt is confirmable. On iOS it never is (the scheme
 * hop either works or silently does nothing), so callers should keep a copyable
 * link visible regardless.
 */
export function escapeToBrowser(url: string): "confirmed" | "unconfirmable" {
  if (isIOS()) {
    // `x-safari-https://` is the one lever iOS gives us. It targets Safari
    // specifically, not "the default browser" — there is no API for that.
    window.location.href = url.replace(/^https:\/\//, "x-safari-https://");
    return "unconfirmable";
  }
  // Android PWA: this yields a Custom Tab, which at least shares Chrome's
  // cookie jar and profile. The `intent://` trick could sometimes reach the
  // standalone browser, but it is fragile and silently swallowed often enough
  // that it is not worth the failure mode.
  const opened = window.open(url, "_blank", "noopener,noreferrer");
  return opened ? "confirmed" : "unconfirmable";
}

/** Native share sheet — the most reliable way out of a PWA on both platforms. */
export function canShare(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

export async function shareLink(url: string, title: string): Promise<boolean> {
  try {
    await navigator.share({ title, url });
    return true;
  } catch {
    // Includes the user simply dismissing the sheet.
    return false;
  }
}

export async function copyLink(url: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Mint-on-demand state for one ticket's partner proof.
 *
 * Outside a PWA we open the tab straight away, since a plain link is all that's
 * needed. Inside a PWA we surface the sheet instead, so the escape hatch is a
 * separate, gesture-attached tap (see `escapeToBrowser`) and the user always
 * has share/copy as a fallback.
 */
export function useTicketProof(ticketSecret: string, partner: string) {
  const [proof, setProof] = useState<IssuedProof | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const request = useCallback(async () => {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const issued = proof ?? (await mintTicketProof(ticketSecret, partner));
      setProof(issued);

      if (handoffMode() === "direct") {
        const opened = window.open(
          issued.claimUrl,
          "_blank",
          "noopener,noreferrer"
        );
        // Popup blockers commonly veto a window.open that follows an await.
        // Falling back to the sheet keeps that from being a dead end.
        if (opened) return;
      }
      setSheetOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSheetOpen(true);
    } finally {
      setPending(false);
    }
  }, [pending, proof, ticketSecret, partner]);

  return {
    proof,
    pending,
    error,
    sheetOpen,
    request,
    closeSheet: () => setSheetOpen(false),
  };
}
