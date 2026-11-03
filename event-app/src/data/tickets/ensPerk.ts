import APP_CONFIG from "@/CONFIG";
import { PARTNER_PREVIEW_DOMAINS, TEAM_DOMAIN } from "@/data/release/previewAccess";
import { INDIA_FLAG } from "@/components/ticket/ticketTheme";

/**
 * Who gets the ENS perk (a free .eth name for a year). Shared by the perk card
 * on My Devcon and the proof route, so the card never offers what the route
 * refuses.
 *
 * The perk is for India tickets and the extra products below (local-leaning
 * groups ENS asked for), and only once the ticket has been checked in at the
 * venue (a resold or unused ticket cannot collect it). A general admission
 * ticket never shows it.
 *
 * INTERNAL TESTING: while `ENS_PERK_INTERNAL_TESTING` is on, EF and ENS
 * accounts get it on any admission ticket, treated as an India ticket with the
 * check-in bypassed, so both teams can run the flow before the event.
 */

/** EF (the team) and ENS (the partner's preview domain). */
const TESTER_DOMAINS: readonly string[] = [TEAM_DOMAIN, ...(PARTNER_PREVIEW_DOMAINS.ensPerk ?? [])];

/** An EF or ENS account, the ones the internal-testing switch applies to. */
export function isEnsPerkTester(email: string | null | undefined): boolean {
  const lower = email?.toLowerCase();
  return !!lower && TESTER_DOMAINS.some((domain) => lower.endsWith(domain.toLowerCase()));
}

/** True when this account is in ENS perk internal testing (switch on, EF or ENS account). */
export function ensPerkTesting(
  email: string | null | undefined,
  switchOn: boolean = APP_CONFIG.ENS_PERK_INTERNAL_TESTING
): boolean {
  return switchOn && isEnsPerkTester(email);
}

/**
 * Products that get the ENS perk besides the India tickets, matched on the
 * Pretix product name (word-bounded, any case):
 * - "Community Reserve", which also matches "Free Community Reserve"; the
 *   product named plain "Reserve" does not qualify.
 * - "Volunteer".
 * Adding a group is one more alternative here.
 */
const ENS_EXTRA_PRODUCTS = /\b(?:community reserve|volunteer)\b/i;

/**
 * A ticket that gets the ENS perk although it is not an India ticket. The
 * proof route mints these as `india` for ENS only (`mintsAsIndia` in
 * api/ticket-proof/proof.ts), since the tier is what the ENS claim page reads.
 */
export function isEnsExtraTicket(itemName: string | undefined): boolean {
  return ENS_EXTRA_PRODUCTS.test(itemName ?? "");
}

/**
 * The ENS perk card for one admission ticket: `hidden`, `eligible` (an India
 * ticket or one of the extra products, checked in) or `testing` (internal
 * testing, shown on any ticket with a note saying so).
 */
export type EnsPerkAccess = "hidden" | "eligible" | "testing";

export function ensPerkAccess(
  ticket: { itemName?: string; hasCheckedIn?: boolean },
  email: string | null | undefined,
  switchOn: boolean = APP_CONFIG.ENS_PERK_INTERNAL_TESTING
): EnsPerkAccess {
  if (ensPerkTesting(email, switchOn)) return "testing";
  // The flag, as classifyTier reads it (api/ticket-proof/proof.ts), never the card style.
  const name = ticket.itemName ?? "";
  if (!INDIA_FLAG.test(name) && !isEnsExtraTicket(name)) return "hidden";
  return ticket.hasCheckedIn === true ? "eligible" : "hidden";
}
