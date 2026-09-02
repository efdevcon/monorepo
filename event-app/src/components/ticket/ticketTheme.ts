import type { Ticket, TicketStyle } from "@/data/tickets/types";

/**
 * Per-ticket-type card themes for the My Devcon ticket redesign (Figma Dev
 * Handoff 5088-*). Same shape of idea as `schedule/trackTheme.ts`: exact
 * design values keyed by a resolved style, consumed via inline `style={{...}}`
 * for the dynamic gradients (Tailwind can't take runtime hexes).
 *
 * Styles: `india` for India-only products, `golden` for early birds /
 * volunteers / speakers / supporters, `devcon` (pink/purple) for everything
 * else. The server can pin a style per Pretix item id (TICKET_STYLE_*_ITEM_IDS,
 * see api/tickets/pretix.ts); otherwise we match item-name keywords below —
 * deliberately NOT the bare word "India", which appears in the main product
 * and swag names (see CLAUDE.md, partner ticket proofs).
 */

export interface TicketTheme {
  /** Gradient tint hugging the tear line (both halves). */
  tint: string;
  /** Gradient base at the card's outer edges. */
  base: string;
  /** Ticket-type label color. */
  label: string;
  /** Accent gradient (top→bottom) for QR frame borders. */
  accent: string;
  /** The same accent as SVG stops for the DC8 glyph (Figma userSpace order, bottom→top). */
  glyphStops: ReadonlyArray<{ offset: number; color: string }>;
}

export const TICKET_THEMES: Record<TicketStyle, TicketTheme> = {
  devcon: {
    tint: "#fff5fa",
    base: "#fbfafc",
    label: "#9256d2",
    accent: "linear-gradient(to bottom, #ff66aa, #aabbff)",
    glyphStops: [
      { offset: 0, color: "#AABBFF" },
      { offset: 1, color: "#FF66AA" },
    ],
  },
  golden: {
    tint: "#fff7e5",
    base: "#fcfbfa",
    label: "#bb8607",
    accent: "linear-gradient(to bottom, #f6b20f, #fed21f 55.89%, #f6b20f)",
    glyphStops: [
      { offset: 0, color: "#F6B20F" },
      { offset: 0.441129, color: "#FED21F" },
      { offset: 1, color: "#F6B20F" },
    ],
  },
  india: {
    tint: "#edfcf7",
    base: "#fbfafc",
    label: "#ff6600",
    accent: "linear-gradient(to bottom, #ff6600, #44ffdd)",
    glyphStops: [
      { offset: 0, color: "#44FFDD" },
      { offset: 1, color: "#FF6600" },
    ],
  },
};

/** Top-half background: tint sits at the bottom (tear line), base at the top. */
export function ticketTopBackground(theme: TicketTheme): string {
  return `linear-gradient(to top, ${theme.tint} 19.982%, ${theme.base} 100%)`;
}

/** Bottom-half background: mirrored, so the tint hugs the tear line again. */
export function ticketBottomBackground(theme: TicketTheme): string {
  return `linear-gradient(to top, ${theme.base} 19.982%, ${theme.tint} 100%)`;
}

// The ticketing team flags India-priced products with the emoji. Mirrors the
// server-side tier heuristic in api/ticket-proof (classifyTier), which is why
// EnsPerkCard's free-.eth-name hint tests this flag rather than the card style.
export const INDIA_FLAG = /\u{1F1EE}\u{1F1F3}/u;
const INDIA_PRODUCTS = /india resident|indian student|daily india pass/i;
const GOLDEN_PRODUCTS = /early bird|volunteer|speaker|supporter/i;

/** Resolve a ticket's card style: server-pinned `style` wins, then keywords. */
export function resolveTicketStyle(
  ticket: Pick<Ticket, "itemName" | "style">
): TicketStyle {
  if (ticket.style) return ticket.style;
  const name = ticket.itemName ?? "";
  if (INDIA_FLAG.test(name) || INDIA_PRODUCTS.test(name)) return "india";
  if (GOLDEN_PRODUCTS.test(name)) return "golden";
  return "devcon";
}

// Pricing qualifiers baked into Pretix product names — never shown to users.
const PRICE_QUALIFIERS = /\s*\((?:free|discounted)\)/gi;
// Product-specific display renames (requested copy; keys are cleaned names).
const NAME_OVERRIDES: ReadonlyArray<[RegExp, string]> = [
  [/^premium oversized ethereum shirt/i, "Oversized Ethereum Shirt"],
];

/** Item name as shown on the card/modal: emoji flag and "(Free)" /
 *  "(Discounted)" qualifiers stripped, product renames applied. */
export function displayItemName(itemName: string): string {
  let name = itemName
    .replace(INDIA_FLAG, "")
    .replace(PRICE_QUALIFIERS, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  for (const [pattern, replacement] of NAME_OVERRIDES) {
    name = name.replace(pattern, replacement);
  }
  return name;
}
