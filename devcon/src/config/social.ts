/**
 * Social share card behaviour per page.
 *
 * X (Twitter) overlays `twitter:title` on the bottom of a `summary_large_image`
 * card. Our share cards already carry the title in the artwork, so on those
 * pages the overlay duplicates it and covers the design. A single space keeps
 * the tag present (X falls back to `og:title` when it is missing) while
 * rendering nothing. Flip a page to `true` here to enable that; other
 * crawlers (Slack, Telegram, LinkedIn) read `og:title` and are unaffected.
 */
export const HIDE_TWITTER_TITLE = {
  /** /schedule/[event]/[code] session share pages */
  session: true,
  /** /ticket/[slug] attendee ticket share pages */
  ticket: false,
} as const

export type SocialSharePage = keyof typeof HIDE_TWITTER_TITLE

export const TWITTER_TITLE_BLANK = ' '

/** The `twitter:title` value for a share page: blank when configured, else the real title. */
export function twitterTitle(page: SocialSharePage, title: string): string {
  return HIDE_TWITTER_TITLE[page] ? TWITTER_TITLE_BLANK : title
}
