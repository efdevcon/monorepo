import Link from "next/link";
import { ShieldCheck, ShieldX, Clock, CircleSlash } from "lucide-react";
import { proofFromSearchParams } from "@/app/api/ticket-proof/proof";
import { checkProof } from "./partner";
import { ClaimPanel } from "./ClaimPanel";
import { DemoTools } from "./DemoTools";

export const metadata = {
  title: "Partner perks (reference implementation)",
  robots: { index: false, follow: false },
};

// The proof arrives in the query string, so this must render per request.
export const dynamic = "force-dynamic";

/**
 * Reference implementation of the *partner* side of ticket proofs.
 *
 * Built by Devcon as an integration example. It is not ENS, not affiliated with
 * ENS, and carries none of their branding — it exists so the flow can be
 * demonstrated end to end and so the verification steps are written down as
 * working code rather than prose.
 */
export default async function PartnerPerksDemo({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const proof = proofFromSearchParams(params);
  const check = await checkProof(proof);

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 p-6">
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-[12px] leading-relaxed text-amber-900">
        <strong>Reference implementation.</strong> A stand-in for the partner&apos;s
        own site, built by Devcon to demonstrate the proof hand-off. Not
        affiliated with or operated by ENS.
      </div>

      <header>
        <h1 className="text-2xl font-bold">Attendee perks</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Verifying a Devcon ticket proof.
        </p>
      </header>

      <Verdict check={check} />

      {check.state === "ok" && (
        <ClaimPanel
          tier={check.tier}
          identifier={check.identifier}
          proofParams={new URLSearchParams(
            Object.entries(params).flatMap(([k, v]) =>
              typeof v === "string" ? [[k, v] as [string, string]] : []
            )
          ).toString()}
        />
      )}

      {proof && <Disclosure proof={proof} />}

      <footer className="mt-auto flex flex-col gap-3 border-t border-neutral-200 pt-4 text-[12px] text-neutral-500">
        <DemoTools />
        <Link href="/ticket" className="underline">
          Back to the Devcon app
        </Link>
      </footer>
    </main>
  );
}

function Verdict({
  check,
}: {
  check: Awaited<ReturnType<typeof checkProof>>;
}) {
  const shell =
    "flex items-start gap-3 rounded-xl border p-4 text-sm leading-relaxed";

  switch (check.state) {
    case "no-proof":
      return (
        <div className={`${shell} border-neutral-300 bg-neutral-50`}>
          <CircleSlash className="mt-0.5 size-5 shrink-0 text-neutral-500" />
          <div>
            <p className="font-semibold">No proof in this link</p>
            <p className="text-neutral-600">
              Open your ticket in the Devcon app and tap “Claim ENS perks”.
            </p>
          </div>
        </div>
      );
    case "unconfigured":
      return (
        <div className={`${shell} border-red-300 bg-red-50`}>
          <ShieldX className="mt-0.5 size-5 shrink-0 text-red-600" />
          <div>
            <p className="font-semibold">Verifier not configured</p>
            <p className="text-neutral-700">
              No pinned signer address available, so nothing can be verified.
              Refusing to grant a perk rather than guessing.
            </p>
          </div>
        </div>
      );
    case "rejected":
      return (
        <div className={`${shell} border-red-300 bg-red-50`}>
          <ShieldX className="mt-0.5 size-5 shrink-0 text-red-600" />
          <div>
            <p className="font-semibold">Proof rejected</p>
            <p className="text-neutral-700">{check.reason}</p>
          </div>
        </div>
      );
    case "expired":
      return (
        <div className={`${shell} border-amber-300 bg-amber-50`}>
          <Clock className="mt-0.5 size-5 shrink-0 text-amber-600" />
          <div>
            <p className="font-semibold">Proof expired</p>
            <p className="text-neutral-700">
              The signature is genuine but past its expiry. Generate a fresh
              link from the Devcon app.
            </p>
          </div>
        </div>
      );
    case "already-claimed":
      return (
        <div className={`${shell} border-amber-300 bg-amber-50`}>
          <CircleSlash className="mt-0.5 size-5 shrink-0 text-amber-600" />
          <div>
            <p className="font-semibold">Already claimed</p>
            <p className="text-neutral-700">
              This ticket claimed its perk on{" "}
              {new Date(check.at).toLocaleString()}. One perk per event ticket.
            </p>
          </div>
        </div>
      );
    case "ok":
      return (
        <div className={`${shell} border-green-300 bg-green-50`}>
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-green-600" />
          <div>
            <p className="font-semibold">Verified Devcon ticket</p>
            <p className="text-neutral-700">
              Signature checked against the pinned Devcon signer.{" "}
              {check.tier === "india"
                ? "This is an India ticket."
                : "This is a standard ticket."}
            </p>
          </div>
        </div>
      );
  }
}

/**
 * Spelled out because it is the privacy claim, and it is easier to trust when
 * you can see the whole payload.
 */
function Disclosure({
  proof,
}: {
  proof: NonNullable<ReturnType<typeof proofFromSearchParams>>;
}) {
  return (
    <section className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
      <h2 className="text-sm font-semibold">What the partner receives</h2>
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[12px]">
        <dt className="text-neutral-500">Identifier</dt>
        <dd className="break-all font-mono">{proof.identifier}</dd>
        <dt className="text-neutral-500">Tier</dt>
        <dd className="font-mono">{proof.tier}</dd>
        <dt className="text-neutral-500">Event</dt>
        <dd className="font-mono">{proof.event}</dd>
        <dt className="text-neutral-500">Partner</dt>
        <dd className="font-mono">{proof.partner}</dd>
        <dt className="text-neutral-500">Expires</dt>
        <dd className="font-mono">
          {new Date(proof.exp * 1000).toLocaleString()}
        </dd>
      </dl>
      <p className="mt-3 text-[12px] leading-relaxed text-neutral-600">
        No email, name, order code, ticket barcode, price or product name. The
        identifier is a keyed hash, so it is stable for this ticket (which is
        what makes one-perk-per-ticket enforceable) but cannot be reversed to the
        ticket, and it is scoped to this partner, so two partners cannot
        correlate the same attendee across their giveaways.
      </p>
    </section>
  );
}
