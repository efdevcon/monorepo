import crypto from "crypto";
import { encodeAbiParameters, keccak256, verifyMessage, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";

/**
 * Ticket proofs: privacy-preserving, partner-scoped attestations of "this is a
 * distinct Devcon ticket, and it belongs to tier X".
 *
 * Issued by us, verified by the partner (ENS) with nothing but our public
 * address. Deliberately asymmetric: unlike the Meerkat handover (HS256, shared
 * secret), a partner must not be able to mint proofs it can also redeem — these
 * gate things with real value (a free ENS name), so verify-only is the whole
 * point.
 *
 * What a proof does NOT contain: the attendee's email, name, order code, ticket
 * secret, price, or product name. A partner learns exactly two facts (a stable
 * pseudonym, and a coarse tier) plus an expiry.
 */

/**
 * Domain separator, baked into every signature. Two jobs: it stops a signature
 * from this key ever being replayable in another context, and the trailing
 * version lets us roll the payload format later without honouring old proofs.
 * Bump the version and every previously issued proof stops verifying.
 */
export const PROOF_DOMAIN = "devcon-ticket-proof-v1";

/** Wire-format version, surfaced in the URL so partners can branch on it. */
export const PROOF_VERSION = 1;

/**
 * Coarse ticket tier. Intentionally *not* the Pretix product name or item id:
 * those leak what someone paid and whether they were on a student, grant or
 * complimentary ticket, and they drift between our dev and prod Pretix events
 * (dev and prod key the local-launch discount off different item ids). A closed
 * enum we own is a stable contract, and it is the minimum that answers the only
 * question the partner actually asked.
 *
 * Because the tier is cryptographically bound, changing this enum invalidates
 * every proof already issued.
 */
export type TicketTier = "india" | "standard";

/** Seconds a proof stays valid. */
const PROOF_TTL_SECONDS = 30 * 60;

/**
 * Deliberately generous, and it is a trade-off rather than an oversight. The
 * attendee has to leave the PWA, land in another browser, then connect a wallet
 * on the partner's side before the proof is consumed, and a tight window loses
 * that race. Replay is fenced off by the partner's spent-set (one perk per
 * identifier, first claim wins), not by the clock — so the expiry only has to
 * stop a link being hoarded and reshared days later.
 *
 * The stronger version, which the partner controls: consume the proof the
 * moment their page loads and exchange it for their own session, the way
 * Meerkat treats its handover token. Then the hop happens before the wallet
 * dance and a short expiry costs nothing.
 */

export interface TicketProof {
  version: number;
  /** Stable per-ticket pseudonym, scoped to this partner. */
  identifier: Hex;
  tier: TicketTier;
  partner: string;
  /** Pretix event slug the ticket belongs to. */
  event: string;
  /** Unix seconds. */
  exp: number;
  /** EIP-191 signature over the payload hash. */
  signature: Hex;
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
}

/**
 * A dedicated, funds-free signing key. Explicitly NOT the payment relayer key
 * (`ETH_RELAYER_PAYMENT_PRIVATE_KEY`), which signs real token transfers: mixing
 * them would make an attestation bug a funds bug and tie the two rotation
 * schedules together.
 */
function getSigner() {
  const key = requiredEnv("TICKET_PROOF_PRIVATE_KEY");
  return privateKeyToAccount(key as Hex);
}

/** The public address partners pin. Safe to publish. */
export function getSignerAddress(): string {
  return getSigner().address;
}

/**
 * Per-ticket pseudonym: HMAC-SHA256 over the ticket secret, keyed with a
 * server-only salt and scoped to (event, partner).
 *
 * Why keyed rather than a bare `keccak256(secret)` (which is what our earlier
 * prototype did): the ticket secret *is* the QR code payload. It is printed on
 * badges, shown on screens, scanned at every check-in desk and photographed
 * constantly. A bare hash therefore lets anyone who has ever seen a QR code
 * recompute that attendee's identifier and link their partner claim back to
 * their badge, which would make "private proof of uniqueness" untrue. Keying it
 * with a secret we never release closes that off.
 *
 * Scoping to the partner also means two partners cannot correlate identifiers
 * to build a cross-perk profile of the same attendee.
 *
 * Stability is the property we need to preserve: same ticket always maps to the
 * same identifier, so the partner's spent-set can enforce one perk per ticket.
 */
export function deriveIdentifier(
  ticketSecret: string,
  event: string,
  partner: string
): Hex {
  const salt = requiredEnv("TICKET_PROOF_SALT");
  // \x1f (unit separator) can't appear in any of the three inputs, so the
  // concatenation is unambiguous — no "a|bc" vs "ab|c" collisions.
  const message = [event, partner, ticketSecret].join("\x1f");
  const digest = crypto
    .createHmac("sha256", salt)
    .update(message)
    .digest("hex");
  return `0x${digest}`;
}

/**
 * The hash that gets signed. ABI-encoded (not packed) so every field is
 * length-prefixed and no two different payloads can encode identically; also
 * keeps the digest reproducible in Solidity via `abi.encode`, should a partner
 * ever want to gate an onchain mint on `ecrecover` instead of a server check.
 */
const PROOF_ABI_PARAMS = [
  { name: "domain", type: "string" },
  { name: "identifier", type: "bytes32" },
  { name: "tier", type: "string" },
  { name: "partner", type: "string" },
  { name: "event", type: "string" },
  { name: "exp", type: "uint64" },
] as const;

export function proofPayloadHash(payload: {
  identifier: Hex;
  tier: TicketTier;
  partner: string;
  event: string;
  exp: number;
}): Hex {
  return keccak256(
    encodeAbiParameters(PROOF_ABI_PARAMS, [
      PROOF_DOMAIN,
      payload.identifier,
      payload.tier,
      payload.partner,
      payload.event,
      BigInt(payload.exp),
    ])
  );
}

/** Issue a proof for one ticket. */
export async function signTicketProof(args: {
  ticketSecret: string;
  tier: TicketTier;
  partner: string;
  event: string;
  now?: number;
}): Promise<TicketProof> {
  const { ticketSecret, tier, partner, event } = args;
  const nowSeconds = Math.floor((args.now ?? Date.now()) / 1000);
  const exp = nowSeconds + PROOF_TTL_SECONDS;

  const identifier = deriveIdentifier(ticketSecret, event, partner);
  const hash = proofPayloadHash({ identifier, tier, partner, event, exp });

  const signature = await getSigner().signMessage({
    message: { raw: hash },
  });

  return {
    version: PROOF_VERSION,
    identifier,
    tier,
    partner,
    event,
    exp,
    signature,
  };
}

export type ProofVerdict =
  | { valid: true; expired: boolean }
  | { valid: false; reason: string };

/**
 * Verify a proof against a *pinned* signer address.
 *
 * `expectedSigner` is required, and that is the whole point. Our earlier
 * prototype passed the signer address through the URL alongside the signature
 * and checked `recovered === url.signer`, which only proves a proof is
 * internally consistent: anyone could sign with their own key, pass their own
 * address, and get a green checkmark. It is a forgery hole that every happy-path
 * test walks straight past, so the address is never carried in the link at all
 * — the partner pins it out of band (see `/api/ticket-proof/signer`).
 *
 * Expiry is reported rather than folded into `valid` so a partner can tell
 * "forged" apart from "genuine but stale" and show a useful message.
 */
export async function verifyTicketProof(
  proof: TicketProof,
  expectedSigner: string,
  now: number = Date.now()
): Promise<ProofVerdict> {
  if (proof.version !== PROOF_VERSION) {
    return { valid: false, reason: `Unsupported proof version ${proof.version}` };
  }
  if (!/^0x[0-9a-fA-F]{64}$/.test(proof.identifier)) {
    return { valid: false, reason: "Malformed identifier" };
  }
  if (!Number.isFinite(proof.exp)) {
    return { valid: false, reason: "Malformed expiry" };
  }

  const hash = proofPayloadHash({
    identifier: proof.identifier,
    tier: proof.tier,
    partner: proof.partner,
    event: proof.event,
    exp: proof.exp,
  });

  let signatureOk = false;
  try {
    signatureOk = await verifyMessage({
      address: expectedSigner as Hex,
      message: { raw: hash },
      signature: proof.signature,
    });
  } catch {
    return { valid: false, reason: "Malformed signature" };
  }

  if (!signatureOk) {
    return { valid: false, reason: "Signature does not match the pinned signer" };
  }

  return { valid: true, expired: Math.floor(now / 1000) > proof.exp };
}

/**
 * India detection, in two structural steps rather than a checked-in catalogue.
 *
 * Step one is the `admission` flag (see `isProvableTicket`), which removes
 * merchandise from consideration entirely. That matters more than it looks:
 * name matching on the raw product list was wrong in both directions, and its
 * worst case was the three "Devcon India Scarf" items, which a name rule reads
 * as India tickets. Once swag is gone, the only India-named products left are
 * real tickets.
 *
 * Step two is the \u{1F1EE}\u{1F1F3} flag in the product name, which the
 * ticketing team puts on the India-priced products specifically. Preferred over
 * matching the word "India" because Devcon 8 is *in* India: a name like "Devcon
 * India ..." says where the event is, not that the holder gets a discount, and
 * a word match would hand a sponsored registration to every attendee the moment
 * someone renamed the main product. The flag is a deliberate marker; the country
 * name is ambient.
 *
 * New products need no code change: a flagged one is picked up as india, an
 * unflagged one is standard.
 */
const INDIA_FLAG = /\u{1F1EE}\u{1F1F3}/u;

/**
 * Only used to flag an ambiguous product for a human, never to classify one.
 * Catches an India ticket created without the flag emoji, and names like
 * "Daily India Pass" where whether a discount applies is a judgement call.
 */
const INDIA_MENTION = /\bindian?\b/i;

/**
 * Escape hatch for a product that doesn't follow the naming convention.
 * When set it is exclusive: only these ids are india, nothing else.
 */
function indiaItemIdOverride(): Set<number> | null {
  const raw = process.env.TICKET_PROOF_INDIA_ITEM_IDS;
  if (!raw) return null;
  const ids = raw
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((id) => Number.isInteger(id));
  // An unparseable override would silently downgrade every India ticket, so
  // treat it as absent rather than as an empty allowlist.
  return ids.length > 0 ? new Set(ids) : null;
}

/**
 * Is this something we will issue a proof for at all?
 *
 * Gated on Pretix's own `admission` flag rather than "is it an add-on". Those
 * are different questions: merchandise can be sold as a standalone position, so
 * an add-on check alone would let a "Devcon India Scarf" through as a provable
 * ticket.
 *
 * Fails closed on a missing flag: an unknown shape should not be provable.
 */
export function isProvableTicket(ticket: { admission?: boolean }): boolean {
  return ticket.admission === true;
}

/**
 * Map an admission ticket to its tier. Assumes `isProvableTicket` already
 * passed; swag has no tier.
 *
 * Anything not positively identified as India is `standard`, which is the
 * direction we want to fail: a ticket wrongly marked `standard` gets a smaller
 * gift and is trivially fixed, while one wrongly marked `india` has already cost
 * a sponsored registration and cannot be taken back.
 */
export function classifyTier(ticket: {
  itemId?: number;
  itemName?: string;
}): TicketTier {
  const override = indiaItemIdOverride();
  if (override) {
    return ticket.itemId !== undefined && override.has(ticket.itemId)
      ? "india"
      : "standard";
  }

  const name = ticket.itemName ?? "";
  if (INDIA_FLAG.test(name)) return "india";

  if (INDIA_MENTION.test(name)) {
    console.warn(
      `[ticket-proof] item ${ticket.itemId ?? "?"} ("${name}") mentions India ` +
        "but carries no \u{1F1EE}\u{1F1F3} flag — treating it as standard. Add the " +
        "flag to the product name, or list its id in " +
        "TICKET_PROOF_INDIA_ITEM_IDS, if it should be an India ticket."
    );
  }
  return "standard";
}

/**
 * Partners we will mint for. An allowlist rather than a free-text field: the
 * partner name is bound into both the identifier and the signature, so letting
 * a caller pass anything would let them farm a fresh unlinkable identifier per
 * made-up partner name and defeat the partner's one-perk-per-ticket check.
 */
export interface PartnerConfig {
  label: string;
  /** Where the attendee is sent, with the proof in the query string. */
  claimUrl: string;
}

export const PARTNERS: Record<string, PartnerConfig> = {
  ens: {
    label: "ENS",
    // Defaults to the bundled reference implementation so the flow is
    // demoable end-to-end; set to the partner's real claim page in prod.
    claimUrl: process.env.TICKET_PROOF_ENS_CLAIM_URL || "/demo/ens-perks",
  },
};

export function getPartner(name: string): PartnerConfig | null {
  return PARTNERS[name.trim().toLowerCase()] ?? null;
}

/** Serialise a proof into query params for the partner's claim URL. */
export function proofToSearchParams(proof: TicketProof): URLSearchParams {
  return new URLSearchParams({
    v: String(proof.version),
    id: proof.identifier,
    tier: proof.tier,
    partner: proof.partner,
    event: proof.event,
    exp: String(proof.exp),
    sig: proof.signature,
  });
}

/** Inverse of `proofToSearchParams`. Returns null if a field is missing. */
export function proofFromSearchParams(
  params: URLSearchParams | Record<string, string | string[] | undefined>
): TicketProof | null {
  const read = (key: string): string | undefined => {
    if (params instanceof URLSearchParams) return params.get(key) ?? undefined;
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const version = Number(read("v"));
  const identifier = read("id");
  const tier = read("tier");
  const partner = read("partner");
  const event = read("event");
  const exp = Number(read("exp"));
  const signature = read("sig");

  if (
    !Number.isInteger(version) ||
    !identifier ||
    !tier ||
    !partner ||
    !event ||
    !Number.isFinite(exp) ||
    !signature
  ) {
    return null;
  }
  if (tier !== "india" && tier !== "standard") return null;

  return {
    version,
    identifier: identifier as Hex,
    tier,
    partner,
    event,
    exp,
    signature: signature as Hex,
  };
}
