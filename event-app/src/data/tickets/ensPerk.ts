/**
 * Who gets the ENS perk (a free .eth name for a year). Shared by the perk card
 * on My Devcon and the proof route, so the card never offers what the route
 * refuses.
 *
 * The perk is for every event ticket once it has been checked in at the venue
 * (a resold or unused ticket cannot collect it), with no exception for EF or
 * ENS accounts. The proof still carries the `india` tier, which is what the
 * ENS claim page keys the free name on (`mintsAsIndia` in
 * api/ticket-proof/proof.ts).
 */
export type EnsPerkAccess = "hidden" | "eligible";

/** The ENS perk card for one admission ticket: shown once it is checked in. */
export function ensPerkAccess(ticket: { hasCheckedIn?: boolean }): EnsPerkAccess {
  return ticket.hasCheckedIn === true ? "eligible" : "hidden";
}
