// Verifies the partner ticket-proof signing/verification rules.
// Run: pnpm proof:test

// Well-known public test keys (Hardhat accounts 0 and 1) — set before the
// module is exercised, since proof.ts reads its env lazily at call time.
const ISSUER_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const ATTACKER_KEY =
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";

process.env.TICKET_PROOF_PRIVATE_KEY = ISSUER_KEY;
process.env.TICKET_PROOF_SALT = "test-salt-not-a-real-one";

import { privateKeyToAccount } from "viem/accounts";
import {
  classifyTier,
  deriveIdentifier,
  getSignerAddress,
  proofFromSearchParams,
  proofToSearchParams,
  signTicketProof,
  verifyTicketProof,
  type TicketProof,
} from "../src/app/api/ticket-proof/proof";

let failed = 0;
const check = (label: string, ok: boolean, note = "") => {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${note ? ` — ${note}` : ""}`);
};

const ISSUER = privateKeyToAccount(ISSUER_KEY as `0x${string}`).address;
const ATTACKER = privateKeyToAccount(ATTACKER_KEY as `0x${string}`).address;

const base = {
  ticketSecret: "abcdef1234567890",
  partner: "ens",
  event: "devcon-8",
} as const;

async function main() {
  // ---- Happy path -------------------------------------------------------
  const proof = await signTicketProof({ ...base, tier: "standard" });
  check("signer address matches the configured key", getSignerAddress() === ISSUER);

  const good = await verifyTicketProof(proof, ISSUER);
  check("genuine proof verifies against pinned signer", good.valid === true);
  check("genuine proof is not expired", good.valid && good.expired === false);

  // ---- The forgery the earlier prototype allowed ------------------------
  // An attacker signs their own payload and presents their own address. This
  // is exactly what passing `signer` through the URL would have let through.
  const forged: TicketProof = { ...proof, tier: "india" };
  const attackerAccount = privateKeyToAccount(ATTACKER_KEY as `0x${string}`);
  const { proofPayloadHash } = await import(
    "../src/app/api/ticket-proof/proof"
  );
  forged.signature = await attackerAccount.signMessage({
    message: { raw: proofPayloadHash(forged) },
  });

  const selfConsistent = await verifyTicketProof(forged, ATTACKER);
  check(
    "forged proof IS self-consistent against the attacker's own address",
    selfConsistent.valid === true,
    "this is why the address must never come from the link"
  );
  const againstPinned = await verifyTicketProof(forged, ISSUER);
  check(
    "forged proof is rejected against the pinned issuer",
    againstPinned.valid === false
  );

  // ---- Tampering with each bound field ---------------------------------
  const tamperTier = await verifyTicketProof(
    { ...proof, tier: "india" },
    ISSUER
  );
  check("tier upgrade standard -> india is rejected", tamperTier.valid === false);

  const tamperId = await verifyTicketProof(
    { ...proof, identifier: `0x${"11".repeat(32)}` },
    ISSUER
  );
  check("swapped identifier is rejected", tamperId.valid === false);

  const tamperPartner = await verifyTicketProof(
    { ...proof, partner: "someone-else" },
    ISSUER
  );
  check("repointed partner is rejected", tamperPartner.valid === false);

  const tamperExp = await verifyTicketProof(
    { ...proof, exp: proof.exp + 86_400 },
    ISSUER
  );
  check("extended expiry is rejected", tamperExp.valid === false);

  const tamperEvent = await verifyTicketProof(
    { ...proof, event: "devcon-7" },
    ISSUER
  );
  check("swapped event is rejected", tamperEvent.valid === false);

  // ---- Expiry ----------------------------------------------------------
  const stale = await verifyTicketProof(
    proof,
    ISSUER,
    (proof.exp + 1) * 1000
  );
  check(
    "past its expiry: still a genuine signature, flagged expired",
    stale.valid === true && stale.expired === true
  );

  // ---- Identifier properties -------------------------------------------
  const idA = deriveIdentifier("secret-1", "devcon-8", "ens");
  const idAgain = deriveIdentifier("secret-1", "devcon-8", "ens");
  check("identifier is stable for the same ticket", idA === idAgain,
    "one-perk-per-ticket depends on this");

  const idOtherTicket = deriveIdentifier("secret-2", "devcon-8", "ens");
  check("different tickets get different identifiers", idA !== idOtherTicket);

  const idOtherPartner = deriveIdentifier("secret-1", "devcon-8", "other");
  check(
    "same ticket is unlinkable across partners",
    idA !== idOtherPartner
  );

  const idOtherEvent = deriveIdentifier("secret-1", "devcon-7", "ens");
  check("identifier is scoped per event", idA !== idOtherEvent);

  // The QR-code linkability fix: knowing the barcode must not be enough.
  const { keccak256, toHex } = await import("viem");
  check(
    "identifier is not a bare hash of the barcode",
    idA !== keccak256(toHex("secret-1")),
    "a bare hash would let anyone who saw a QR code deanonymise the claim"
  );

  // ---- Tier classification --------------------------------------------
  const tiers: Array<[string, string]> = [
    ["India Early Bird (Limited Availability) 🇮🇳", "india"],
    ["India Resident 🇮🇳", "india"],
    ["Indian Students", "india"],
    ["Student Discount 🎓", "standard"],
    ["Youth Ticket (3-17) 🌱", "standard"],
    ["General Admission 🎟️", "standard"],
    ["Early Bird GA 🐤", "standard"],
    ["Builder Discount 🦄", "standard"],
    ["Grant Recipients", "standard"],
  ];
  for (const [itemName, want] of tiers) {
    const got = classifyTier({ itemName });
    check(`tier "${itemName}" -> ${want}`, got === want, got === want ? "" : `got ${got}`);
  }

  // Explicit item ids win over name matching when configured.
  process.env.TICKET_PROOF_INDIA_ITEM_IDS = "2, 3";
  check(
    "configured item id is india",
    classifyTier({ itemId: 2, itemName: "Renamed Product" }) === "india"
  );
  check(
    "unconfigured item id is standard even if the name says India",
    classifyTier({ itemId: 99, itemName: "India Resident 🇮🇳" }) === "standard"
  );
  delete process.env.TICKET_PROOF_INDIA_ITEM_IDS;

  // ---- URL round trip --------------------------------------------------
  const params = proofToSearchParams(proof);
  const parsed = proofFromSearchParams(params);
  check("proof survives the URL round trip", JSON.stringify(parsed) === JSON.stringify(proof));
  check(
    "the signer address is never carried in the link",
    !params.has("signer") && !params.toString().toLowerCase().includes(ISSUER.toLowerCase())
  );

  check("missing fields parse to null", proofFromSearchParams(new URLSearchParams("id=0x1")) === null);
  check(
    "an unknown tier is refused at parse time",
    proofFromSearchParams(
      new URLSearchParams({ ...Object.fromEntries(params), tier: "vip" })
    ) === null
  );

  const malformed = await verifyTicketProof({ ...proof, signature: "0xdead" }, ISSUER);
  check("malformed signature is rejected, not thrown", malformed.valid === false);

  console.log(failed === 0 ? "\nall good" : `\n${failed} failing`);
  process.exit(failed === 0 ? 0 : 1);
}

main();
