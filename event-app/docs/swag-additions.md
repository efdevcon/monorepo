# Swag additions

Attendees buy extra swag in the app at the price their ticket was offered, and collect it at the Swag Station with its own QR. "Get more swag" on My Devcon, behind `RELEASED.swagAdditions`.

## Rules (all read from the Pretix setup, `src/app/api/swag-additions/additions.ts`)

- **Products:** the active items in the "Swag Additions" category. In Pretix they require a voucher and are hidden without one, so they are only sold through this flow.
- **Who:** checked-in event tickets whose product offered swag at checkout (any add-on category; in this event they are all merchandise). Products with no add-ons (Under-3 children, lost wristbands, ...) get none.
- **How many:** per ticket, each addition's "max per order" in Pretix.
- **Price:** the addition's own price, unless the ticket's product offered the same product in the "Discounted Swag" category, or carries the 🇮🇳 flag; then that discounted price. Other discounts (free swag, discounted premium add-ons) do not carry over. Products match by name without the trailing "(...)".
- Catalog and categories are cached an hour, so a Pretix change takes up to an hour to show.

## Flow

1. The tickets list (`api/tickets/payload.ts` → `swag-additions/attach.ts`) flags the tickets that can buy (`Ticket.swagAdditions`) and attaches what each one already bought.
2. The Swag shelf (`components/ticket/TicketSections.tsx`) lists what the ticket can buy after what it holds (under a smaller "Get more swag" title on phones; on the desktop shelf they simply follow): the same `SwagCard`, with the price and a Buy button (`SwagBuyButton.tsx`) instead of the QR. Prices and what is left come from `POST /api/swag-additions` `{ action: "status" }`.
3. Buy: `{ action: "buy", itemId }` gets or creates the ticket's voucher (price set, uses = the limit, valid until 3 pm IST on Nov 6, tag `app-swag-addition`), fixes its price, uses and expiry if they drifted, and returns the shop's `redeem?voucher=` page. Checkout (crypto, card, UPI) happens on Pretix; card and UPI follow the voucher's price through the payment plugin.

## Vouchers

One per ticket and product: `<order>-<ticket number>-<item>-<check>`, e.g. `ABCDE-1-<item>-1A2B3C4D`. The check is the first 8 hex characters of SHA-256 of `devcon8-swag-addition:<item>:<ticket secret>`, so knowing an order code is not enough to use another ticket's voucher. The same code is how bought swag finds its ticket: the paid positions that used it (`orderpositions?voucher__code=`) become that ticket's add-ons, whatever email checked out.

Vouchers do not hold stock (`block_quota: false`): each addition has its own Pretix quota, and a sold-out quota shows on the Pretix page, not in the app.

## Test

`pnpm swag:test`. To find or clean up the app's vouchers in Pretix, filter vouchers by the tag `app-swag-addition`.
