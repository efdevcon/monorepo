/**
 * Relative timestamp in the redesign's long-form units ("3 mins ago",
 * "2 hrs ago", then a date). Future times ("In 10 mins") only show up where
 * scheduled content is previewed (announcements in ?preview mode). Callers
 * pass `nowMs` from the `useNow` family so the clock stays mockable.
 */
export function relativeTime(
  at: string | number | Date,
  nowMs: number
): string {
  const atMs = new Date(at).getTime();
  const diffMs = nowMs - atMs;
  const abs = Math.abs(diffMs);
  const minutes = Math.floor(abs / 60_000);
  const hours = Math.floor(abs / 3_600_000);
  // Pluralize from the value actually displayed.
  const unit = (n: number, u: string) => `${n} ${u}${n === 1 ? "" : "s"}`;

  if (diffMs < 0) {
    if (minutes < 60) return `In ${unit(Math.max(minutes, 1), "min")}`;
    if (hours < 24) return `In ${unit(hours, "hr")}`;
  } else {
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${unit(minutes, "min")} ago`;
    if (hours < 24) return `${unit(hours, "hr")} ago`;
  }
  return new Date(atMs).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
