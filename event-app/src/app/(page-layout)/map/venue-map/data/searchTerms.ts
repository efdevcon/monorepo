import type { AreaId } from "./areas";
import type { CategoryId } from "./categories";

/**
 * What people type that the place names do not say: each entry's terms
 * bring up the listed categories and areas in Search, on top of the name
 * and category-label matches (Scott, 2026-10-26). A term matches when the
 * query is it, starts it (three letters or more) or contains it whole.
 * Keep the terms lower-case; a multi-word term matches the spaced form.
 */
export type SearchTerms = { terms: readonly string[]; categories?: readonly CategoryId[]; areas?: readonly AreaId[] };

export const SEARCH_TERMS: readonly SearchTerms[] = [
  { terms: ["meeting", "meeting room"], categories: ["suites"] },
  { terms: ["snack", "meal", "lunch", "dinner"], categories: ["food"] },
  { terms: ["exit", "entrance", "entry"], areas: ["escalator", "stairs"] },
];
