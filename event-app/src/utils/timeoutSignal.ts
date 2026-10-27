/**
 * An AbortSignal that fires after `ms`, for fetches that must fail rather
 * than hang. A connection that never answers (seen on an installed iOS app
 * whose requests to this origin stayed pending while other hosts replied)
 * otherwise keeps the request, and whatever waits on it, open until the
 * browser gives up minutes later. Undefined where `AbortSignal.timeout` is
 * missing (Safari before 16, Chrome before 103): the fetch then runs without
 * a deadline, as it always did.
 */
export function timeoutSignal(ms: number): AbortSignal | undefined {
  return typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
    ? AbortSignal.timeout(ms)
    : undefined;
}
