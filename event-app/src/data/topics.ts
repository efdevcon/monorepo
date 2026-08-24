import type { Session } from "@/data/models";

/** How many topic options the filter surfaces offer (top tags by frequency). */
export const TOPIC_OPTION_COUNT = 15;

/**
 * The topic-filter vocabulary, shared by the Speakers page (pill row + mobile
 * sheet) and the schedule Filters panel so every surface offers the same
 * list: session tags counted over speakered sessions only (a tag that exists
 * solely on speakerless sessions — breaks, ceremonies — would render a
 * Speakers pill that can never match a speaker), sorted by frequency with an
 * alphabetical tiebreak, cut to the top slice.
 */
export function deriveTopicOptions(sessions: Session[]): string[] {
  const tagCounts = new Map<string, number>();
  for (const session of sessions) {
    if ((session.speakers ?? []).length === 0) continue;
    for (const raw of session.tags ?? []) {
      const tag = raw.trim();
      if (!tag) continue;
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }
  return [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([tag]) => tag)
    .slice(0, TOPIC_OPTION_COUNT);
}
