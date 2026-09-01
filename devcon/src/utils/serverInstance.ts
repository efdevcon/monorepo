/**
 * Random per-serverless-instance tag, minted at module load. Two log lines
 * with different tags provably came from different (or recycled) instances —
 * the evidence that was missing when diagnosing the 2026-08-28 lost-voucher
 * timeout, where the verification callback and the browser's poll never
 * shared process memory.
 */
// On globalThis, not module scope: Next bundles each API route separately, so
// a module-scope value differs per ROUTE within one process (observed in the
// first test run: redeem-self and self-voucher showed different tags yet
// shared the in-memory store). globalThis is per-process, which is the thing
// the tag exists to identify.
const g = globalThis as typeof globalThis & { __serverInstanceId?: string }
export const SERVER_INSTANCE_ID = (g.__serverInstanceId ??= Math.random().toString(36).slice(2, 8))
