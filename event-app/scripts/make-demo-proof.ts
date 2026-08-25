// Mint a partner proof link straight from the command line, so the partner-side
// flow can be demoed without a real Supabase session or Pretix ticket.
// Reads TICKET_PROOF_* from .env. Dev tool only — it deliberately skips the
// ownership checks that /api/ticket-proof enforces.
//
//   pnpm proof:demo-link                                  # standard tier
//   pnpm proof:demo-link india                            # india tier
//   pnpm proof:demo-link india http://localhost:3477      # custom origin
//   pnpm proof:demo-link standard --expired               # already past its expiry
import "dotenv/config";
import {
  proofToSearchParams,
  signTicketProof,
  type TicketTier,
} from "../src/app/api/ticket-proof/proof";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const expired = args.includes("--expired");
  const positional = args.filter((a) => !a.startsWith("--"));
  const tier = (positional[0] === "india" ? "india" : "standard") as TicketTier;
  const origin = positional[1] || "http://localhost:3000";

  // A stand-in barcode. Vary it to simulate a different ticket (and so a
  // different identifier, which is what the partner's spent-set keys on).
  const ticketSecret = process.env.DEMO_TICKET_SECRET || "demo-ticket-0001";

  const proof = await signTicketProof({
    ticketSecret,
    tier,
    partner: "ens",
    event: process.env.PRETIX_EVENT || "devcon-8",
    // Backdating the issue time yields a genuinely signed but stale proof, so
    // the expiry branch can be exercised without waiting 30 minutes.
    now: expired ? Date.now() - 2 * 60 * 60 * 1000 : undefined,
  });

  console.log(`tier:       ${proof.tier}`);
  console.log(`identifier: ${proof.identifier}`);
  console.log(`expires:    ${new Date(proof.exp * 1000).toISOString()}`);
  console.log(`\n${origin}/demo/ens-perks?${proofToSearchParams(proof)}\n`);
}

main();
