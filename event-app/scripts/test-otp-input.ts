// Verifies the OTP digit-distribution used by autofill and paste.
// Run: pnpm otp:test
import { spreadDigits } from "../src/components/OtpInput";

let failed = 0;
const check = (label: string, got: string, want: string) => {
  const ok = got === want;
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}: "${got}"${ok ? "" : ` (expected "${want}")`}`);
};

// iOS/Android autofill drops the whole code into the focused (first) box.
check("autofill into empty, box 0", spreadDigits("", 0, "482913", 6), "482913");
// Autofill while focus sits mid-row: fill from there, never past the end.
check("autofill from box 2", spreadDigits("48", 2, "2913", 6), "482913");
check("overlong input is clipped", spreadDigits("", 0, "4829137777", 6), "482913");
// Paste replaces from the start, including a partially filled code.
check("paste over partial", spreadDigits("99", 0, "482913", 6), "482913");
check("short paste keeps tail", spreadDigits("482913", 0, "77", 6), "772913");
// Single keystroke path still works through the same helper.
check("single digit at box 3", spreadDigits("482", 3, "9", 6), "4829");
// A hole stays a hole (matches the existing setChar semantics).
check("gap is not invented", spreadDigits("4", 3, "9", 6), "49");

console.log(failed === 0 ? "\nall good" : `\n${failed} failing`);
process.exit(failed === 0 ? 0 : 1);
