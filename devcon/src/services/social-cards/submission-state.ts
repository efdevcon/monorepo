/**
 * Which Pretalx submission states may be shown publicly.
 *
 * Shared by the session share page and the card renderers so the page and its
 * og:image can never disagree: a proposal that 404s must not still expose its
 * title, speakers and track through the card URL.
 *
 * 'accepted' counts alongside 'confirmed' because the acceptance email carries
 * the share link and the speaker has not confirmed at that point — requiring
 * 'confirmed' would 404 the link in the very email that sends it. Everything
 * else (submitted, rejected, withdrawn, canceled) stays private.
 *
 * Client-safe: no server-only imports, so the page can use it too.
 */
export const PUBLIC_SUBMISSION_STATES = ['accepted', 'confirmed']

/** Dev/preview renders any state so unaccepted talks stay testable. */
export function isPublicSubmissionState(state: unknown): boolean {
  if (process.env.NODE_ENV !== 'production') return true
  return typeof state === 'string' && PUBLIC_SUBMISSION_STATES.includes(state)
}
