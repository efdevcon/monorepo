/**
 * Sliding-window limiter kept in memory. Per serverless instance, so it bounds
 * bursts against one warm function rather than the whole fleet; enough here,
 * since a wrong code cannot be brute-forced (Pretix secrets are long random
 * strings) and each attempt costs one Pretix lookup.
 */
export interface RateLimiter {
  allow(key: string): boolean;
}

export function createRateLimiter(
  max: number,
  windowMs: number,
  now: () => number = Date.now
): RateLimiter {
  const hits = new Map<string, number[]>();
  return {
    allow(key) {
      const t = now();
      const cutoff = t - windowMs;
      const recent = (hits.get(key) ?? []).filter((stamp) => stamp > cutoff);
      if (recent.length >= max) {
        hits.set(key, recent);
        return false;
      }
      recent.push(t);
      hits.set(key, recent);
      if (hits.size > 5000) {
        for (const [k, stamps] of hits) {
          if (stamps.every((stamp) => stamp <= cutoff)) hits.delete(k);
        }
      }
      return true;
    },
  };
}
