// Verifies that a sign-in code is sent to Supabase at most once at a time,
// and never again once it worked (a second send of a used code fails and
// showed "the code is invalid or has expired" next to "Signed in").
// Run: pnpm otp:test
import { createVerifyOnce } from "../src/data/auth/verifyOnce";

let failed = 0;
const check = (label: string, got: unknown, want: unknown) => {
  const ok = got === want;
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}: ${String(got)}${ok ? "" : ` (expected ${String(want)})`}`);
};

/** A stand-in for the Supabase call: counts calls, resolves when told to. */
function fakeVerify() {
  const calls: string[] = [];
  const pending: ((ok: boolean) => void)[] = [];
  const run = (email: string, token: string) => {
    calls.push(`${email} ${token}`);
    return new Promise<boolean>((resolve) => pending.push(resolve));
  };
  const settle = (ok: boolean) => pending.shift()?.(ok);
  return { calls, run, settle };
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

async function main() {
  {
    // Auto-submit on the sixth digit plus a tap on "Confirm" while it runs.
    const f = fakeVerify();
    const verify = createVerifyOnce(f.run);
    const a = verify("a@x.org", "123456");
    const b = verify("a@x.org", "123456");
    check("same code while in flight: one request", f.calls.length, 1);
    f.settle(true);
    check("both callers get the success", `${await a} ${await b}`, "true true");
  }
  {
    // The form fades out for 200 ms after sign-in with the button enabled again.
    const f = fakeVerify();
    const verify = createVerifyOnce(f.run);
    const first = verify("a@x.org", "123456");
    f.settle(true);
    await first;
    const again = await verify("a@x.org", "123456");
    check("same code after it worked: no request", f.calls.length, 1);
    check("same code after it worked: reported as success", again, true);
  }
  {
    // A wrong code (or a dropped connection) can be tried again.
    const f = fakeVerify();
    const verify = createVerifyOnce(f.run);
    const first = verify("a@x.org", "111111");
    f.settle(false);
    check("failed code resolves false", await first, false);
    const retry = verify("a@x.org", "111111");
    check("same code after a failure: sent again", f.calls.length, 2);
    f.settle(true);
    await retry;
  }
  {
    // A corrected code while the first is still out goes out on its own.
    const f = fakeVerify();
    const verify = createVerifyOnce(f.run);
    void verify("a@x.org", "111111");
    void verify("a@x.org", "222222");
    check("different code: its own request", f.calls.length, 2);
    f.settle(false);
    f.settle(true);
    await tick();
  }
  {
    // Signing out forgets the used code, so it is checked for real next time.
    const f = fakeVerify();
    const verify = createVerifyOnce(f.run);
    const first = verify("a@x.org", "123456");
    f.settle(true);
    await first;
    verify.reset();
    void verify("a@x.org", "123456");
    check("after reset: sent again", f.calls.length, 2);
    f.settle(false);
    await tick();
  }
  {
    // Email case and padding do not make it a different sign-in.
    const f = fakeVerify();
    const verify = createVerifyOnce(f.run);
    void verify("A@x.org ", "123456");
    void verify("a@x.org", "123456");
    check("email compared trimmed, any case", f.calls.length, 1);
    f.settle(true);
    await tick();
  }

  console.log(failed === 0 ? "\nall good" : `\n${failed} failing`);
  process.exit(failed === 0 ? 0 : 1);
}

void main();
