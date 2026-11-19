// Small helpers shared by the survey review pages (browser) and the endpoints
// (server). Keep this file free of server-only imports.

// Overview comments are only shown from respondents whose average star rating
// is below this.
export const LOW_AVERAGE = 4

/**
 * Text reduced to lower-case words separated by single spaces: curly quotes
 * become straight ones (phones type "didn’t"), punctuation becomes a space,
 * and apostrophes/hyphens are kept only inside words ("didn't", "check-in").
 * The Overview's "most mentioned" words and every answer search use this, so
 * they always agree.
 */
export function normalizeSearchText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[’‘ʼ`´]/g, "'")
    .replace(/[^\p{L}\p{N}\s'-]/gu, ' ')
    .split(/\s+/)
    .map(w => w.replace(/^['-]+|['-]+$/g, ''))
    .filter(Boolean)
    .join(' ')
}

/**
 * Whether normalised text contains the normalised words as whole words, in
 * order ("food" matches "the food was" but not "seafood"). Used for the
 * Overview's word links, whose counts are whole words.
 */
export function containsWords(normalizedText: string, normalizedWords: string): boolean {
  return normalizedWords !== '' && ` ${normalizedText} `.includes(` ${normalizedWords} `)
}
