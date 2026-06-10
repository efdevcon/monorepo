/**
 * Custom-component markers for NocoDB form fields.
 *
 * A field whose title begins with one of these prefixes is rendered with a
 * dedicated component instead of a plain input, mirroring the existing
 * `[encrypted]` convention (see `config/encrypted-forms`). This makes the
 * intent explicit on the form definition itself rather than relying on a
 * hardcoded column name in the renderer.
 *
 * The marker lives on the form-view LABEL only (NocoDB column "label"
 * override); the underlying data column keeps its real name (e.g.
 * "GitHub Username"), so the server (`submit.ts`) and admin read it unchanged.
 * The prefix is stripped before the label is displayed.
 */

export const GITHUB_PREFIX = '[github]'
export const WALLET_PREFIX = '[wallet]'

function hasPrefix(title: string | undefined | null, prefix: string): boolean {
  return !!title && title.trim().toLowerCase().startsWith(prefix)
}

function stripPrefix(title: string, prefix: string): string {
  const t = title.trim()
  return hasPrefix(t, prefix) ? t.slice(prefix.length).trim() : title
}

/** Render the GitHub connector when a field's title starts with "[github]". */
export const isGithubTitle = (title: string | undefined | null): boolean => hasPrefix(title, GITHUB_PREFIX)
export const stripGithubPrefix = (title: string): string => stripPrefix(title, GITHUB_PREFIX)

/** Render the Wallet connector when a field's title starts with "[wallet]". */
export const isWalletTitle = (title: string | undefined | null): boolean => hasPrefix(title, WALLET_PREFIX)
export const stripWalletPrefix = (title: string): string => stripPrefix(title, WALLET_PREFIX)
