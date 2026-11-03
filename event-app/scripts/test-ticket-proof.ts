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
  isProvableTicket,
  getSignerAddress,
  PARTNERS,
  passesCheckInGate,
  proofFromSearchParams,
  proofToSearchParams,
  resolveMint,
  signTicketProof,
  verifyTicketProof,
  type TicketProof,
} from "../src/app/api/ticket-proof/proof";
import { ensPerkAccess } from "../src/data/tickets/ensPerk";

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
  // Rules, not a copy of the catalogue: the live product list is not checked in
  // here, so these cases stand for the shapes the rules have to handle.
  const realWarn = console.warn;
  const quiet = () => {
    console.warn = () => {};
  };
  const loud = () => {
    console.warn = realWarn;
  };

  const IN = "\u{1F1EE}\u{1F1F3}";

  // The flag marks an India-priced product.
  check(
    "flagged product is india",
    classifyTier({ itemId: 2, itemName: `India Early Bird ${IN}` }) === "india"
  );
  check(
    "flag anywhere in the name counts",
    classifyTier({ itemId: 40, itemName: `${IN} Indian Students` }) === "india"
  );

  // Ordinary tickets, and anything new, are standard.
  for (const itemName of [
    "General Admission",
    "ETH Early Bird",
    "International Students",
    "Youth Ticket (3-17)",
    "Speakers",
    "Some Ticket Type Invented Next Year",
  ]) {
    check(`"${itemName}" is standard`, classifyTier({ itemName }) === "standard");
  }

  // The reason the flag beats matching the word: Devcon 8 is in India, so the
  // country name in a product title says nothing about pricing.
  quiet();
  check(
    "a country name without the flag does NOT grant india",
    classifyTier({ itemId: 1, itemName: "Devcon India General Admission" }) ===
      "standard"
  );
  check(
    "an ambiguous pass without the flag is standard",
    classifyTier({ itemId: 53, itemName: "Daily India Pass" }) === "standard"
  );
  loud();

  // ...but it is surfaced rather than swallowed.
  let warned = "";
  console.warn = (msg: string) => {
    warned = String(msg);
  };
  classifyTier({ itemId: 53, itemName: "Daily India Pass" });
  loud();
  check(
    "an unflagged India mention logs a warning",
    warned.includes("53") && warned.includes("India")
  );

  // Merchandise never reaches a tier, and this is the case name matching alone
  // got wrong: a scarf reads as an India ticket.
  check(
    "swag is not provable however it is named",
    isProvableTicket({ admission: false }) === false
  );
  check(
    "an admission ticket is provable",
    isProvableTicket({ admission: true }) === true
  );
  check("missing admission flag is not provable", isProvableTicket({}) === false);

  // ---- Env override ----------------------------------------------------
  process.env.TICKET_PROOF_INDIA_ITEM_IDS = "2, 3";
  check(
    "override makes listed ids india",
    classifyTier({ itemId: 2, itemName: "Renamed With No Flag" }) === "india"
  );
  check(
    "override is exclusive: a flagged id not listed becomes standard",
    classifyTier({ itemId: 40, itemName: `Indian Students ${IN}` }) === "standard"
  );

  process.env.TICKET_PROOF_INDIA_ITEM_IDS = "not,a,number";
  check(
    "an unparseable override is ignored, falling back to flag detection",
    classifyTier({ itemId: 2, itemName: `India Early Bird ${IN}` }) === "india"
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

  // ---- Check-in gate ---------------------------------------------------
  check("no gate: an unscanned ticket can mint", passesCheckInGate({}, { hasCheckedIn: false }));
  check("gate on: an unscanned ticket is refused", !passesCheckInGate({ requireCheckIn: true }, { hasCheckedIn: false }));
  check("gate on: a ticket without check-in data is refused", !passesCheckInGate({ requireCheckIn: true }, {}));
  check("gate on: a checked-in ticket can mint", passesCheckInGate({ requireCheckIn: true }, { hasCheckedIn: true }));

  // ---- ENS perk: India tickets after check-in, internal testers --------
  const ens = PARTNERS.ens;
  check("ENS mints for India tickets only", JSON.stringify(ens.tiers) === JSON.stringify(["india"]));
  check("ENS requires a check-in", ens.requireCheckIn === true);
  const ensRule = { ...ens, internalTester: (email: string) => email.endsWith("@ens.domains") };
  const indiaTicket = { itemId: 2, itemName: `India Resident ${IN}` };
  const gaTicket = { itemId: 1, itemName: "General Admission" };
  const attendee = "someone@example.com";
  const tester = "someone@ens.domains";
  check(
    "ENS refuses a GA ticket, checked in or not",
    !resolveMint(ensRule, { ...gaTicket, hasCheckedIn: true }, attendee).ok
  );
  check(
    "ENS refuses an India ticket before check-in",
    !resolveMint(ensRule, { ...indiaTicket, hasCheckedIn: false }, attendee).ok
  );
  const indiaMint = resolveMint(ensRule, { ...indiaTicket, hasCheckedIn: true }, attendee);
  check(
    "ENS mints india for a checked-in India ticket",
    indiaMint.ok && indiaMint.tier === "india" && !indiaMint.testing
  );
  const testerMint = resolveMint(ensRule, { ...gaTicket, hasCheckedIn: false }, tester);
  check(
    "an internal tester mints india on a GA ticket with no check-in",
    testerMint.ok && testerMint.tier === "india" && testerMint.testing
  );
  // Community Reserve tickets get the ENS perk too, minted as india for ENS
  // only; the plain "Reserve" product does not.
  const reserveTicket = { itemId: 12, itemName: "Community Reserve" };
  const plainReserveTicket = { itemId: 52, itemName: "Reserve" };
  const reserveMint = resolveMint(ensRule, { ...reserveTicket, hasCheckedIn: true }, attendee);
  check(
    "ENS mints india for a checked-in Community Reserve ticket",
    reserveMint.ok && reserveMint.tier === "india" && !reserveMint.testing
  );
  check(
    "ENS refuses a Community Reserve ticket before check-in",
    !resolveMint(ensRule, { ...reserveTicket, hasCheckedIn: false }, attendee).ok
  );
  check(
    "ENS still refuses a plain Reserve ticket",
    !resolveMint(ensRule, { ...plainReserveTicket, hasCheckedIn: true }, attendee).ok
  );
  check("Community Reserve stays standard everywhere else", classifyTier(reserveTicket) === "standard");
  // "Free Community Reserve" (the free community allocation) and Volunteer
  // get it too, on the same terms.
  const freeReserveTicket = { itemId: 100, itemName: "Free Community Reserve" };
  const volunteerTicket = { itemId: 49, itemName: "Volunteer" };
  for (const [label, ticket] of [["Free Community Reserve", freeReserveTicket], ["Volunteer", volunteerTicket]] as const) {
    const mint = resolveMint(ensRule, { ...ticket, hasCheckedIn: true }, attendee);
    check(`ENS mints india for a checked-in ${label} ticket`, mint.ok && mint.tier === "india" && !mint.testing);
    check(`ENS refuses a ${label} ticket before check-in`, !resolveMint(ensRule, { ...ticket, hasCheckedIn: false }, attendee).ok);
    check(`${label} stays standard everywhere else`, classifyTier(ticket) === "standard");
  }
  check(
    "a partner without tiers or testers keeps minting standard",
    (() => {
      const r = resolveMint({ label: "Faucet" }, { ...gaTicket, hasCheckedIn: false }, tester);
      return r.ok && r.tier === "standard" && !r.testing;
    })()
  );

  // ---- Testnet faucets: any ticket type, after check-in ----------------
  for (const key of ["powfaucet-sepolia", "powfaucet-hoodi"]) {
    const faucet = PARTNERS[key];
    check(`${key} requires a check-in`, faucet.requireCheckIn === true);
    check(`${key} refuses a ticket before check-in`, !resolveMint(faucet, { ...gaTicket, hasCheckedIn: false }, attendee).ok);
    const gaMint = resolveMint(faucet, { ...gaTicket, hasCheckedIn: true }, attendee);
    check(`${key} mints for a checked-in GA ticket`, gaMint.ok && gaMint.tier === "standard");
    const inMint = resolveMint(faucet, { ...indiaTicket, hasCheckedIn: true }, attendee);
    check(`${key} mints for a checked-in India ticket`, inMint.ok && inMint.tier === "india");
    check(`${key} has no internal-testing bypass`, !resolveMint(faucet, { ...gaTicket, hasCheckedIn: false }, "someone@ethereum.org").ok);
    const reserveFaucetMint = resolveMint(faucet, { ...reserveTicket, hasCheckedIn: true }, attendee);
    check(`${key} mints standard for a Community Reserve ticket`, reserveFaucetMint.ok && reserveFaucetMint.tier === "standard");
  }

  // The card follows the same rule (switch passed explicitly).
  check("card: hidden on a GA ticket", ensPerkAccess({ ...gaTicket, hasCheckedIn: true }, attendee, true) === "hidden");
  check("card: hidden on an India ticket before check-in", ensPerkAccess({ ...indiaTicket, hasCheckedIn: false }, attendee, true) === "hidden");
  check("card: shown on a checked-in India ticket", ensPerkAccess({ ...indiaTicket, hasCheckedIn: true }, attendee, true) === "eligible");
  check("card: shown on a checked-in Community Reserve ticket", ensPerkAccess({ ...reserveTicket, hasCheckedIn: true }, attendee, true) === "eligible");
  check("card: hidden on a Community Reserve ticket before check-in", ensPerkAccess({ ...reserveTicket, hasCheckedIn: false }, attendee, true) === "hidden");
  check("card: hidden on a plain Reserve ticket", ensPerkAccess({ ...plainReserveTicket, hasCheckedIn: true }, attendee, true) === "hidden");
  check("card: shown on a checked-in Volunteer ticket", ensPerkAccess({ ...volunteerTicket, hasCheckedIn: true }, attendee, true) === "eligible");
  check("card: hidden on a Volunteer ticket before check-in", ensPerkAccess({ ...volunteerTicket, hasCheckedIn: false }, attendee, true) === "hidden");
  check("card: shown on a checked-in Free Community Reserve ticket", ensPerkAccess({ ...freeReserveTicket, hasCheckedIn: true }, attendee, true) === "eligible");
  check("card: EF account tests on a GA ticket", ensPerkAccess(gaTicket, "someone@ethereum.org", true) === "testing");
  check("card: ENS account tests on a GA ticket", ensPerkAccess(gaTicket, "SomeOne@ENS.domains", true) === "testing");
  check("card: switch off, an EF account is an attendee again", ensPerkAccess(gaTicket, "someone@ethereum.org", false) === "hidden");
  check("card: a look-alike domain is not a tester", ensPerkAccess(gaTicket, "someone@notethereum.org.evil.com", true) === "hidden");

  console.log(failed === 0 ? "\nall good" : `\n${failed} failing`);
  process.exit(failed === 0 ? 0 : 1);
}

main();
