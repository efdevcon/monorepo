/**
 * Sends each sign-in code to Supabase at most once at a time, and not again
 * once it worked.
 *
 * Supabase accepts a code once. A second send of the same code is refused,
 * and the person then saw "Signed in" next to "the code is invalid or has
 * expired". It happened in the field: the auto-submit on the sixth digit
 * plus a tap on "Confirm", or a tap during the form's fade-out after
 * sign-in, when the button is enabled again. So:
 * - the same code while it is being checked shares that check;
 * - the same code after it worked reports success without a request;
 * - a code that failed (wrong, or a dropped connection) can be tried again.
 *
 * `reset()` forgets the used code (sign-out), so a later attempt with it is
 * checked for real instead of being reported as a success.
 */
export type VerifyOnce = ((email: string, token: string) => Promise<boolean>) & { reset: () => void };

export function createVerifyOnce(run: (email: string, token: string) => Promise<boolean>): VerifyOnce {
  let last: { key: string; result: Promise<boolean> } | null = null;
  const verify = (email: string, token: string) => {
    const key = `${email.trim().toLowerCase()}\n${token}`;
    if (last?.key === key) return last.result;
    const entry = { key, result: run(email, token) };
    last = entry;
    // Only a success is remembered: a failure leaves the code free to retry.
    void entry.result.then(
      (ok) => {
        if (!ok && last === entry) last = null;
      },
      () => {
        if (last === entry) last = null;
      }
    );
    return entry.result;
  };
  return Object.assign(verify, {
    reset: () => {
      last = null;
    },
  });
}
