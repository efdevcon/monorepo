/**
 * Run `task`; if it fails with a transient error, wait and run it once more.
 * Anything else (or a second failure) propagates. Used for first-load API
 * calls where a single dropped request would otherwise become a red error
 * with no data behind it (Safari's "Load failed" right after sign-in).
 */
export async function retryOnce<T>(
  task: () => Promise<T>,
  isTransient: (err: unknown) => boolean,
  delayMs: number,
  sleep: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms))
): Promise<T> {
  try {
    return await task();
  } catch (err) {
    if (!isTransient(err)) throw err;
    await sleep(delayMs);
    return task();
  }
}

/**
 * A fetch that never reached a JSON response: the network layer failed
 * (TypeError: "Load failed" / "Failed to fetch") or the body was not JSON
 * (SyntaxError, typically an HTML error page from a cold or failing edge).
 * Application errors (a parsed `{ success: false }`) are plain Errors and
 * are not retried.
 */
export function isTransientFetchError(err: unknown): boolean {
  return err instanceof TypeError || err instanceof SyntaxError;
}
