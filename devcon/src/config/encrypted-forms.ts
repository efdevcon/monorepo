/**
 * Public recipients for client-side form-field encryption.
 *
 * Every form field whose title begins with "[encrypted]" is encrypted in the
 * submitter's browser, to all recipients listed here, before it touches the
 * network. The matching private keys live ONLY on the operator's machine (in
 * a secrets manager or comparable secure store, primary) and on paper in a
 * safe (break-glass). The server, NocoDB, and backups never see plaintext.
 *
 * To rotate or add a recipient, append a new entry — old submissions stay
 * decryptable by whoever still holds the corresponding private key.
 *
 * Setup:
 *   1. On the reviewer's laptop:  `age-keygen -o ~/visa-team.age`
 *   2. Copy the `age1...` public line below.
 *   3. Store the `AGE-SECRET-KEY-1...` private line in a secrets manager.
 *   4. Verify the fingerprint out-of-band with at least one other person,
 *      so a future tampered deploy can be detected.
 *
 * NEVER paste a private key (`AGE-SECRET-KEY-...`) into this file.
 */

export const AGE_RECIPIENTS: readonly string[] = [
  // Primary (reviewer).
  'age17tfgl467lgftks47n8qmdsxd50970fv5emee9fdhjj6l2a5rzewqrqxrxr',

  // Break-glass.
  'age1xm8pcn4a0mawrkyczpwxtenqu5fc5csz9agvzkpzdngtpkzeuyjq5ph9sg',
]

/**
 * Sanity-check that someone didn't accidentally paste a private key. We do not
 * want to ship a private key to the browser bundle.
 */
function assertPublicRecipients(rs: readonly string[]): void {
  for (const r of rs) {
    if (!r.startsWith('age1')) {
      throw new Error(`AGE_RECIPIENTS: "${r.slice(0, 12)}..." is not a public recipient (must start with "age1")`)
    }
    if (r.includes('SECRET')) {
      throw new Error('AGE_RECIPIENTS: a private key was pasted where a public key should be.')
    }
  }
}

assertPublicRecipients(AGE_RECIPIENTS)

/** A column should be encrypted if its (form-view or table) title starts with "[encrypted]". */
export const ENCRYPTED_PREFIX = '[encrypted]'

export function isEncryptedTitle(title: string | undefined | null): boolean {
  return !!title && title.trim().toLowerCase().startsWith(ENCRYPTED_PREFIX)
}

export function stripEncryptedPrefix(title: string): string {
  const t = title.trim()
  if (!isEncryptedTitle(t)) return title
  return t.slice(ENCRYPTED_PREFIX.length).trim()
}
