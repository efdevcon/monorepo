/**
 * Last-write-wins merge of a star between the device and the account (pure).
 * A row is `interested` or a tombstone, stamped with the device time of the
 * change; `pending` is 1 until the account has seen it.
 */
export interface LocalInterest {
  interested: boolean;
  updatedAt: number;
  pending: number;
}

/**
 * Apply a change from the account to the local row: a newer remote change
 * wins; a tie or an older one keeps the local row (returns null).
 */
export function mergeRemote(
  local: LocalInterest | undefined,
  remote: { interested: boolean; updatedAt: number }
): LocalInterest | null {
  if (local && local.updatedAt >= remote.updatedAt) return null;
  return { interested: remote.interested, updatedAt: remote.updatedAt, pending: 0 };
}

/**
 * After a push: the row is settled (no longer pending) only if it did not
 * change again while the request was in flight; otherwise the newer change
 * stays pending for the next sync (returns null).
 */
export function settlePending(local: LocalInterest, pushedUpdatedAt: number): LocalInterest | null {
  if (local.updatedAt !== pushedUpdatedAt) return null;
  return { ...local, pending: 0 };
}
