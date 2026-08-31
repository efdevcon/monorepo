"use client";

import { useState } from "react";
import { Check, Gift, Loader2, Wallet } from "lucide-react";
import { useEnsExpiry } from "./useEnsExpiry";

/**
 * The claim step: one panel per perk the ticket is eligible for, each spending
 * its own claim. The perks are independent — a local attendee can take the
 * subsidized name and, with a qualifying wallet, the frENS reward too.
 *
 * The wallet connection itself is stubbed. Everything it would provide is the
 * partner's own business — registering the subsidized name to the wallet
 * connected in the Devcon app, or reading how many years remain on a name that
 * wallet controls — and needs nothing from the ticket proof, so plain inputs
 * stand in for it and keep the POC focused on the part actually being
 * demonstrated.
 */

// Mirror of the thresholds in partner.ts (server-only there, so not
// importable into a client component).
const MIN_NAME_LENGTH = 5;
const FRENS_MIN_YEARS = 10;

type PerkKind = "subsidy" | "frens";

type ClaimResult =
  | { ok: true; headline: string; detail: string }
  | { ok: false; error: string }
  | null;

function useClaim(proofParams: string, perk: PerkKind) {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<ClaimResult>(null);

  const claim = async (input: Record<string, unknown>) => {
    setPending(true);
    setResult(null);
    try {
      const res = await fetch("/api/demo/ens-claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proofParams, perk, ...input }),
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

  return { pending, result, claim };
}

export function ClaimPanel({
  tier,
  identifier,
  proofParams,
  claimedPerks,
}: {
  tier: "india" | "standard";
  identifier: string;
  proofParams: string;
  claimedPerks: PerkKind[];
}) {
  return (
    <div className="flex flex-col gap-4">
      {tier === "india" && (
        <SubsidyPanel
          identifier={identifier}
          proofParams={proofParams}
          alreadyClaimed={claimedPerks.includes("subsidy")}
        />
      )}
      <FrensPanel
        identifier={identifier}
        proofParams={proofParams}
        alreadyClaimed={claimedPerks.includes("frens")}
      />
    </div>
  );
}

/** Subsidized first-year .eth registration for verified local attendees. */
function SubsidyPanel({
  identifier,
  proofParams,
  alreadyClaimed,
}: {
  identifier: string;
  proofParams: string;
  alreadyClaimed: boolean;
}) {
  const [ensName, setEnsName] = useState("");
  const { pending, result, claim } = useClaim(proofParams, "subsidy");

  const nameLabel = ensName.trim().toLowerCase().replace(/\.eth$/, "");
  const nameTooShort = nameLabel.length < MIN_NAME_LENGTH;

  if (alreadyClaimed) {
    return <AlreadyClaimed title="Subsidized .eth name" />;
  }

  return (
    <section className="rounded-xl border border-neutral-200 p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <Gift className="size-4 text-purple-600" />
        Claim your subsidized .eth name
      </h2>

      <div className="mt-2">
        <p className="text-sm text-neutral-600">
          Verified local attendees get a .eth name with the first year&apos;s
          registration on us (the $8/year fee — that&apos;s why names are{" "}
          {MIN_NAME_LENGTH}+ characters). One per person, tied to this ticket.
        </p>
        <label
          htmlFor="ens-name"
          className="mt-3 flex items-center gap-2 text-[13px] font-medium"
        >
          <Wallet className="size-4 text-neutral-500" />
          Pick your name
        </label>
        <p className="mt-1 text-[12px] text-neutral-500">
          Availability check and wallet connection are stubbed here — the real
          flow registers the name to the wallet connected in the Devcon app.
        </p>
        <div className="mt-2 flex items-center gap-1.5">
          <input
            id="ens-name"
            type="text"
            value={ensName}
            onChange={(e) => setEnsName(e.target.value)}
            placeholder="yourname"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="w-44 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
          <span className="text-sm font-medium text-neutral-500">.eth</span>
        </div>
        {ensName && nameTooShort && (
          <p className="mt-1.5 text-[12px] text-amber-700">
            {MIN_NAME_LENGTH}+ characters — shorter names are premium-priced,
            beyond what the subsidy covers.
          </p>
        )}
      </div>

      <ClaimButton
        pending={pending}
        claimed={result?.ok ?? false}
        disabled={nameTooShort}
        onClick={() => claim({ ensName: nameLabel })}
      />
      <ResultNote result={result} identifier={identifier} />
    </section>
  );
}

/** frENS long-term-user reward, open to every tier. */
function FrensPanel({
  identifier,
  proofParams,
  alreadyClaimed,
}: {
  identifier: string;
  proofParams: string;
  alreadyClaimed: boolean;
}) {
  const [manualYears, setManualYears] = useState(FRENS_MIN_YEARS);
  const { pending, result, claim } = useClaim(proofParams, "frens");
  const { state: expiry, connect } = useEnsExpiry();

  if (alreadyClaimed) {
    return <AlreadyClaimed title="frENS reward" />;
  }

  const detected = expiry.status === "found" ? expiry : null;
  // Detection failed in a way connecting again won't fix by itself — offer
  // the manual stand-in so the demo can proceed anyway.
  const manualMode =
    expiry.status === "no-wallet" ||
    expiry.status === "no-name" ||
    expiry.status === "unsupported-name" ||
    expiry.status === "error";
  const busy = expiry.status === "connecting" || expiry.status === "looking-up";
  const yearsToClaim = detected
    ? Math.floor(detected.yearsRemaining)
    : manualYears;

  return (
    <section className="rounded-xl border border-neutral-200 p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <Gift className="size-4 text-purple-600" />
        Claim your frENS reward
      </h2>

      <div className="mt-2">
        <p className="text-sm text-neutral-600">
          A gift for long-term users: {FRENS_MIN_YEARS}+ years remaining on an
          ENS name earns an ENS frens plushie or premium swag. One reward per
          verified attendee, and the connected wallet must control the
          qualifying name.
        </p>

        {detected ? (
          <div className="mt-3 rounded-lg bg-neutral-50 p-3 text-sm">
            <p className="font-semibold">{detected.name}</p>
            <p className="mt-0.5 text-[13px] text-neutral-600">
              Expires {detected.expiresAt.toLocaleDateString()} —{" "}
              {detected.yearsRemaining.toFixed(1)} years remaining.
            </p>
            <button
              type="button"
              onClick={connect}
              className="mt-1.5 cursor-pointer text-[12px] text-neutral-500 underline underline-offset-2"
            >
              Use a different wallet
            </button>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={connect}
              disabled={busy}
              className="mt-3 inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-full border border-neutral-300 px-4 text-sm font-semibold text-neutral-800 transition-colors hover:bg-neutral-50 disabled:cursor-default disabled:opacity-60"
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Wallet className="size-4" />
              )}
              {expiry.status === "connecting"
                ? "Connecting…"
                : expiry.status === "looking-up"
                  ? "Checking your ENS name…"
                  : manualMode
                    ? "Retry wallet connect"
                    : "Connect wallet"}
            </button>
            <p className="mt-1.5 text-[12px] text-neutral-500">
              We read the expiry of your wallet&apos;s primary ENS name on
              mainnet.
            </p>
          </>
        )}

        {manualMode && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-[12px] text-amber-800">
              {expiry.status === "no-wallet"
                ? "No browser wallet detected."
                : expiry.status === "no-name"
                  ? "This wallet has no primary ENS name set."
                  : expiry.status === "unsupported-name"
                    ? `${expiry.name} isn't a direct .eth name, so its expiry can't be read from the registrar.`
                    : expiry.message}
            </p>
            <label
              htmlFor="years"
              className="mt-2 block text-[13px] font-medium"
            >
              Years remaining (manual stand-in)
            </label>
            <input
              id="years"
              type="number"
              min={0}
              max={50}
              value={manualYears}
              onChange={(e) => setManualYears(Number(e.target.value))}
              className="mt-1 w-24 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm"
            />
          </div>
        )}
      </div>

      <ClaimButton
        pending={pending}
        claimed={result?.ok ?? false}
        disabled={!detected && !manualMode}
        onClick={() => claim({ yearsRemaining: yearsToClaim })}
      />
      <ResultNote result={result} identifier={identifier} />
    </section>
  );
}

function AlreadyClaimed({ title }: { title: string }) {
  return (
    <section className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
      <Check className="size-4 shrink-0 text-green-600" />
      <p className="text-sm text-neutral-600">
        <span className="font-semibold text-neutral-800">{title}</span> —
        already claimed by this ticket.
      </p>
    </section>
  );
}

function ClaimButton({
  pending,
  claimed,
  disabled,
  onClick,
}: {
  pending: boolean;
  claimed: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending || claimed || disabled}
      className="mt-4 inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full bg-purple-600 px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-default disabled:opacity-60"
    >
      {pending && <Loader2 className="size-4 animate-spin" />}
      {claimed ? "Claimed" : "Claim"}
    </button>
  );
}

function ResultNote({
  result,
  identifier,
}: {
  result: ClaimResult;
  identifier: string;
}) {
  if (!result) return null;
  return (
    <div
      className={`mt-4 rounded-lg p-3 text-sm ${
        result.ok ? "bg-green-50 text-green-900" : "bg-red-50 text-red-900"
      }`}
    >
      {result.ok ? (
        <>
          <p className="font-semibold">{result.headline}</p>
          <p className="mt-1 text-[13px]">{result.detail}</p>
          <p className="mt-2 text-[12px] opacity-75">
            This perk is now spent for ticket {identifier.slice(0, 10)}… —
            claiming it again will be refused.
          </p>
        </>
      ) : (
        <p>{result.error}</p>
      )}
    </div>
  );
}
