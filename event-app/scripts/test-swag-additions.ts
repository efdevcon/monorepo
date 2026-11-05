// Verifies swag additions: who can buy, at what price, how many, the voucher
// it creates, the full-catalog read, and that a bought addition shows on the
// swag shelf. Pure functions only: nothing touches Pretix.
// Run: pnpm swag:test

import { additionItemIds, flagSwagAdditionTickets, mergeSwagAdditions, remainingUses, voucherFixes, swagAdditionOffers, swagVoucherCode, swagVoucherPayload } from "../src/app/api/swag-additions/additions";
import type { Order, Ticket, TicketAddon } from "../src/data/tickets/types";
import { fetchAllPages } from "../src/app/api/tickets/pages";
import type { PretixItem } from "../src/app/api/tickets/pretix";
import { swagAdditionEligible, SWAG_ADDITIONS_VALID_UNTIL } from "../src/data/tickets/swagAdditions";
import { shelfSwag, type ShelfItem } from "../src/data/tickets/swagShelf";
import { displayItemName } from "../src/components/ticket/ticketTheme";

let failed = 0;
const check = (label: string, ok: boolean, note = "") => {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${note ? ` — ${note}` : ""}`);
};

// ---- the Pretix setup (trimmed from the real event): categories by name, items by add-on category.
const categories = new Map<number, string>([
  [1, "General Admission"],
  [2, "Swag"],
  [3, "Premium Add-ons"],
  [5, "Discounted Swag"],
  [6, "Discounted Premium Add-ons"],
  [11, "Free Swag"],
  [16, "Swag Additions"],
]);
const item = (id: number, name: string, category: number, price: string, extra: Partial<PretixItem> = {}): PretixItem => ({
  id,
  name: { en: name },
  category: String(category),
  default_price: price,
  active: true,
  addons: [],
  ...extra,
});
const ticket = (id: number, name: string, addonCategories: number[]) =>
  item(id, name, 1, "0.00", { admission: true, addons: addonCategories.map((c) => ({ addon_category: c })) });
const items: PretixItem[] = [
  ticket(1, "General Admission", [11, 3]), // free scarf
  ticket(12, "Community Reserve", [2, 3]), // $15 scarf
  ticket(40, "Indian Students", [5, 3]), // $7 scarf
  ticket(9, "EFer", [11, 6]), // free scarf, $75 chess
  ticket(2, "India Early Bird \u{1F1EE}\u{1F1F3}", [11, 3]), // free scarf, India flag
  ticket(110, "Child (Under 3) with Adult", []), // no swag offered at checkout
  item(38, "Devcon India Scarf", 2, "15.00"),
  item(56, "Devcon India Scarf (Discounted)", 5, "7.00"),
  item(67, "Devcon India Scarf (Free)", 11, "0.00"),
  item(43, "Ethereum Chess Set", 3, "150.00"),
  item(57, "Ethereum Chess Set (Discounted)", 6, "75.00"),
  item(114, "Ethereum Chess Set (Addition)", 16, "150.00", { max_per_order: 1, picture: "https://x/chess.jpg" }),
  item(115, "Devcon India Scarf (Addition)", 16, "15.00", { max_per_order: 2 }),
  item(116, "Retired Mug (Addition)", 16, "9.00", { active: false }),
];
const offers = (ticketItemId: number | undefined, cats = categories) =>
  Object.fromEntries(swagAdditionOffers(ticketItemId, items, cats).map((o) => [o.name, o]));

// ---- what is offered, at what price, how many
const ga = offers(1);
check("additions found by their Pretix category", Object.keys(ga).sort().join("|") === "Devcon India Scarf|Ethereum Chess Set", Object.keys(ga).join("|"));
check("inactive addition not offered", !("Retired Mug" in ga));
check("chess at the addition price", ga["Ethereum Chess Set"].price === "150.00" && ga["Ethereum Chess Set"].itemId === 114);
check("scarf at the addition price for a free-scarf ticket", ga["Devcon India Scarf"].price === "15.00");
check("scarf $15 where the ticket offered the $15 scarf", offers(12)["Devcon India Scarf"].price === "15.00");
check("scarf discounted where the ticket offered the Discounted Swag one", offers(40)["Devcon India Scarf"].price === "7.00");
check("chess stays full price even where a premium discount was offered", offers(9)["Ethereum Chess Set"].price === "150.00");
check("India flag ticket: scarf at the discounted price", offers(2)["Devcon India Scarf"].price === "7.00");
check("India flag ticket: chess still full price", offers(2)["Ethereum Chess Set"].price === "150.00");
check("ticket product that offered no swag: nothing offered", swagAdditionOffers(110, items, categories).length === 0);
check("unknown ticket product: nothing offered", swagAdditionOffers(9999, items, categories).length === 0);
check("limits come from Pretix max per order", ga["Ethereum Chess Set"].max === 1 && ga["Devcon India Scarf"].max === 2);
check("picture carried", ga["Ethereum Chess Set"].imageUrl === "https://x/chess.jpg");
check("no Swag Additions category: nothing offered", swagAdditionOffers(1, items, new Map([[2, "Swag"]])).length === 0);
const noLimit = swagAdditionOffers(1, items.map((i) => (i.id === 115 ? { ...i, max_per_order: null } : i)), categories);
check("no max per order: one", noLimit.find((o) => o.itemId === 115)?.max === 1);

check("addition products by category, active or not", additionItemIds(items, categories).sort().join(",") === "114,115,116");

// ---- bought additions follow their ticket, whatever email checked out
const tk = (secret: string, extra: Partial<Ticket> = {}): Ticket =>
  ({ secret, itemName: "General Admission", attendeeName: null, attendeeEmail: "a@x", admission: true, hasCheckedIn: true, addons: [], ...extra }) as Ticket;
const ord = (orderCode: string, tickets: Ticket[]): Order =>
  ({ orderCode, orderDate: "2026-11-04", email: "a@x", eventName: "Devcon", eventSlug: "8", eventId: null, tickets }) as Order;
const addon = (secret: string, itemName = "Devcon India Scarf (Addition)"): TicketAddon =>
  ({ id: 115, secret, itemName, attendeeName: null }) as TicketAddon;
const before = [
  ord("7EUWF", [tk("T1", { addons: [addon("FREE", "Devcon India Scarf (Free)")] }), tk("T3", { hasCheckedIn: false })]),
  // the same addition order, also found by email (swag-only order)
  ord("REG7S", [tk("S1", { admission: false, itemName: "Devcon India Scarf (Addition)" }), tk("S2", { admission: false })]),
  ord("OTHER", [tk("X1", { admission: false, itemName: "Ethereum Shirt" })]),
];
const merged = mergeSwagAdditions(before, [
  { ticketSecret: "T1", addon: addon("S1") },
  { ticketSecret: "T1", addon: addon("S2") },
]);
const t1 = merged[0].tickets.find((t) => t.secret === "T1")!;
check("additions become the ticket's add-ons", t1.addons.map((a) => a.secret).join(",") === "FREE,S1,S2");
check("the duplicate swag-only order is dropped", !merged.some((o) => o.orderCode === "REG7S"));
check("other swag-only orders stay", merged.some((o) => o.orderCode === "OTHER"));
check("other tickets untouched", merged[0].tickets.find((t) => t.secret === "T3")!.addons.length === 0);
check("input not mutated", before[0].tickets[0].addons.length === 1 && before.length === 3);
const again = mergeSwagAdditions(merged, [{ ticketSecret: "T1", addon: addon("S1") }]);
check("merging twice adds nothing twice", again[0].tickets.find((t) => t.secret === "T1")!.addons.length === 3);
check("no additions: same orders", mergeSwagAdditions(before, []).length === 3);
const flagged = flagSwagAdditionTickets(before, new Set(["T1"]));
check("eligible ticket flagged for extra swag", flagged[0].tickets.find((t) => t.secret === "T1")!.swagAdditions === true);
check("others not flagged", !flagged[0].tickets.find((t) => t.secret === "T3")!.swagAdditions);
check("flagging does not mutate", before[0].tickets[0].swagAdditions === undefined);

// ---- a bought addition reads like the original on the swag shelf
check("\"(Addition)\" never shown", displayItemName("Devcon India Scarf (Addition)") === "Devcon India Scarf");
check("chess addition name", displayItemName("Ethereum Chess Set (Addition)") === "Ethereum Chess Set");
check("free and discounted still stripped", displayItemName("Devcon India Scarf (Free)") === "Devcon India Scarf");

// ---- who can buy
check("checked-in ticket can buy", swagAdditionEligible({ admission: true, hasCheckedIn: true }));
check("not checked in: cannot", !swagAdditionEligible({ admission: true, hasCheckedIn: false }));
check("check-in unknown: cannot", !swagAdditionEligible({ admission: true }));
check("merchandise: cannot", !swagAdditionEligible({ admission: false, hasCheckedIn: true }));
check("vouchers end at 3 pm on the last day (Nov 6, IST)", SWAG_ADDITIONS_VALID_UNTIL === "2026-11-06T15:00:00+05:30");

// ---- voucher
const one = { secret: "SECRET-ONE", orderCode: "7EUWF", positionNumber: 1 };
const code = swagVoucherCode(one, 115);
check("voucher code names the ticket and product", /^7EUWF-1-115-[A-F0-9]{8}$/.test(code), code);
check("voucher code is stable per ticket and product", code === swagVoucherCode(one, 115));
check("differs per product", code !== swagVoucherCode(one, 114));
check("differs per ticket of the same order", !swagVoucherCode({ ...one, secret: "SECRET-THREE", positionNumber: 3 }, 115).startsWith("7EUWF-1-"));
check("the check suffix comes from the secret: same ref, other secret, other code", code !== swagVoucherCode({ ...one, secret: "SECRET-FORGED" }, 115));
check("no secret inside", !code.includes("SECRET"));
check("ticket without a position number still gets a code", /^7EUWF-X-115-[A-F0-9]{8}$/.test(swagVoucherCode({ ...one, positionNumber: undefined }, 115)));
const payload = swagVoucherPayload({ itemId: 115, max: 2, code, price: "7.00", ticketRef: "7EUWF-1" });
check("voucher unlocks the addition item", payload.item === 115);
check("voucher sets the price", payload.price_mode === "set" && payload.value === "7.00");
check("voucher allows the per-ticket limit", payload.max_usages === 2);
check("voucher expires with the event", payload.valid_until === SWAG_ADDITIONS_VALID_UNTIL);
check("voucher shows the hidden item and holds no quota", payload.show_hidden_items === true && payload.block_quota === false);
check("voucher is tagged and names the ticket", payload.tag === "app-swag-addition" && payload.comment.includes("7EUWF-1"));
check("remaining with no voucher yet: the limit", remainingUses(null, 2) === 2);
const oneUsed = { max_usages: 1, redeemed: 1 };
check("remaining follows the current limit, not the voucher's", remainingUses(oneUsed, 2) === 1);
check("remaining after one use", remainingUses({ redeemed: 1 }, 2) === 1);
check("remaining never below zero", remainingUses({ redeemed: 3 }, 1) === 0);

const v = (extra: Partial<{ price_mode: string; value: string; max_usages: number; redeemed: number; valid_until: string }> = {}) => ({
  price_mode: "set",
  value: "15.00",
  max_usages: 2,
  redeemed: 0,
  ...extra,
});
check("voucher at the app's price and limit: left alone", voucherFixes(v(), "15.00", 2) === null);
check("same price written differently: left alone", voucherFixes(v({ value: "15" }), "15.00", 2) === null);
const fix = voucherFixes(v({ value: "0.00" }), "15.00", 2);
check("voucher edited to $0: set back to the app's price", fix?.value === "15.00" && fix?.price_mode === "set");
check("voucher with another price mode: set", voucherFixes(v({ price_mode: "none", value: "0.00" }), "7.00", 2)?.value === "7.00");
check("limit raised in Pretix: voucher follows", voucherFixes(v({ max_usages: 1 }), "15.00", 2)?.max_usages === 2);
check("limit lowered below what was used: kept at what was used", voucherFixes(v({ max_usages: 3, redeemed: 2 }), "15.00", 1)?.max_usages === 2);
check("price-only fix leaves the limit out", !("max_usages" in (fix ?? {})));
check("older expiry moved to the current one", voucherFixes(v({ valid_until: "2026-11-06T23:59:59+05:30" }), "15.00", 2)?.valid_until === SWAG_ADDITIONS_VALID_UNTIL);
check("same expiry in another timezone: left alone", voucherFixes(v({ valid_until: "2026-11-06T09:30:00Z" }), "15.00", 2) === null);

// ---- every catalog page is read (the catalog outgrew one page: 52 items)
async function pages() {
  const served: string[] = [];
  const fake = async (url: string) => {
    served.push(url);
    const page = url.endsWith("page=2") ? 2 : 1;
    return new Response(
      JSON.stringify({ results: page === 1 ? [{ id: 1 }, { id: 2 }] : [{ id: 114 }], next: page === 1 ? "https://x/items/?page=2" : null }),
      { status: 200 }
    );
  };
  const all = await fetchAllPages<{ id: number }>("https://x/items/", {}, fake as typeof fetch);
  check("all pages read", all.map((i) => i.id).join(",") === "1,2,114" && served.length === 2);
  const failing = async () => new Response("no", { status: 500 });
  let threw = false;
  try {
    await fetchAllPages("https://x/items/", {}, failing as unknown as typeof fetch);
  } catch {
    threw = true;
  }
  check("a failed page throws", threw);
}

// ---- the swag shelf next to a primary ticket
const shelfItem = (secret: string, orderCode: string, extra: Partial<ShelfItem> = {}): ShelfItem => ({
  secret,
  ownerSecret: secret,
  standalone: true,
  orderCode,
  swagOnlyOrder: false,
  ...extra,
});
const shelf = [
  shelfItem("addon-of-lead", "LEAD1", { ownerSecret: "lead", standalone: false }),
  shelfItem("merch-on-lead-order", "LEAD1"),
  shelfItem("addition-order", "SWAG9", { swagOnlyOrder: true }),
  shelfItem("colleague-addon", "LEAD1", { ownerSecret: "colleague", standalone: false }),
  shelfItem("merch-on-other-ticket-order", "OTHER2"),
];
const shown = shelfSwag(shelf, { secret: "lead" }, "LEAD1").map((i) => i.secret);
check("lead's add-ons shown", shown.includes("addon-of-lead"));
check("merchandise on the lead's order shown", shown.includes("merch-on-lead-order"));
check("a swag-only order (an addition) shown", shown.includes("addition-order"));
check("a colleague's add-on hidden", !shown.includes("colleague-addon"));
check("merchandise on another ticket's order hidden", !shown.includes("merch-on-other-ticket-order"));
check("no primary: everything", shelfSwag(shelf, null, undefined).length === shelf.length);

pages()
  .catch((e) => {
    failed++;
    console.error(e);
  })
  .finally(() => {
    console.log(failed ? `\n${failed} FAILED` : "\nall passed");
    process.exit(failed ? 1 : 0);
  });
