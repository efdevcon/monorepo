/**
 * Checks if the user has internal debugging access
 * (restricted to @ethereum.org email addresses)
 */
export function internalDebuging(email: string | null | undefined): boolean {
  return !!(email && (email.endsWith('@ethereum.org') || email.endsWith('@simplefi.tech') || email.endsWith('@getpara.com') || email.endsWith('@usecapsule.com')));
}

