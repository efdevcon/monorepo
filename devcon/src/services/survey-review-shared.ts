// Small helpers shared by the survey review pages (browser) and the stats
// endpoint (server). Keep this file free of server-only imports.

// Overview comments are only shown from respondents whose average star rating
// is below this.
export const LOW_AVERAGE = 4

/**
 * Lower-case text with punctuation turned into spaces (apostrophes and hyphens
 * kept, so "didn't" and "check-in" stay whole). Used both to find common
 * phrases and to search answers, so a phrase from the Overview always finds
 * the answers it was counted in.
 */
export function normalizeSearchText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s'-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
