"use client";

import { useState } from "react";
import { Gift, Loader2, Wallet } from "lucide-react";

/**
 * The claim step: pick up the wallet, work out the gift tier, spend the proof.
 *
 * The wallet connection itself is stubbed. Everything it would provide is the
 * partner's own business (an address, and how long that address has held an ENS
 * name, read onchain) and needs nothing from the ticket proof, so a number input
 * stands in for it and keeps the POC focused on the part that is actually being
 * demonstrated.
 */
export function ClaimPanel({
  tier,
  identifier,
  proofParams,
}: {
  tier: "india" | "standard";
  identifier: string;
  proofParams: string;
}) {
  const [yearsHeld, setYearsHeld] = useState(3);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<
    | { ok: true; headline: string; detail: string }
    | { ok: false; error: string }
    | null
  >(null);

  const claim = async () => {
    setPending(true);
    setResult(null);
    try {
      const res = await fetch("/api/demo/ens-claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proofParams,
          yearsHeld: tier === "india" ? null : yearsHeld,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setResult({ ok: false, error: json.error || "Claim failed" });
      } else {
        setResult({
          ok: true,
          headline: json.data.headline,
          detail: json.data.detail,
        });
      }
    } catch {
      setResult({ ok: false, error: "Network error" });
    } finally {
      setPending(false);
    }
  };

  return (
    <section className="rounded-xl border border-neutral-200 p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <Gift className="size-4 text-purple-600" />
        Claim your perk
      </h2>

      {tier === "india" ? (
        <p className="mt-2 text-sm text-neutral-600">
          India ticket holders qualify outright. No wallet history needed.
        </p>
      ) : (
        <div className="mt-3">
          <label
            htmlFor="years"
            className="flex items-center gap-2 text-[13px] font-medium"
          >
            <Wallet className="size-4 text-neutral-500" />
            Years holding an ENS name
          </label>
          <p className="mt-1 text-[12px] text-neutral-500">
            Stands in for a wallet connection plus an onchain lookup.
          </p>
          <input
            id="years"
            type="number"
            min={0}
            max={10}
            value={yearsHeld}
            onChange={(e) => setYearsHeld(Number(e.target.value))}
            className="mt-2 w-24 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>
      )}

      <button
        type="button"
        onClick={claim}
        disabled={pending || (result?.ok ?? false)}
        className="mt-4 inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full bg-purple-600 px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-default disabled:opacity-60"
      >
        {pending && <Loader2 className="size-4 animate-spin" />}
        {result?.ok ? "Claimed" : "Claim"}
      </button>

      {result && (
        <div
          className={`mt-4 rounded-lg p-3 text-sm ${
            result.ok
              ? "bg-green-50 text-green-900"
              : "bg-red-50 text-red-900"
          }`}
        >
          {result.ok ? (
            <>
              <p className="font-semibold">{result.headline}</p>
              <p className="mt-1 text-[13px]">{result.detail}</p>
              <p className="mt-2 text-[12px] opacity-75">
                Ticket {identifier.slice(0, 10)}… is now spent. Reloading and
                claiming again will be refused.
              </p>
            </>
          ) : (
            <p>{result.error}</p>
          )}
        </div>
      )}
    </section>
  );
}
