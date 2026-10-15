import type { Session } from "@/data/models";
import { isCommunityHubSession } from "@/data/communityHubs";

/**
 * The topic vocabulary for the Pretalx programme: the 16 most-used public
 * tags across every Devcon 8 proposal on cfp.devcon.org (767 submissions,
 * all states, counted 2026-10-13), in that order, plus Post-quantum and
 * Consensus (19th and 20th by proposals, but the two that make the most
 * otherwise topic-less confirmed sessions findable: 281 of 328 covered). A
 * fixed list rather than the top tags of whatever is confirmed, so the pills
 * don't reshuffle with each schedule release and the list reflects what
 * people proposed talks about, not what happened to be accepted. A tag no
 * current session carries is left out at runtime, so an option never
 * matches nothing.
 */
export const TOPIC_OPTIONS: readonly string[] = [
  "Security",
  "AI",
  "Decentralization",
  "Open Source",
  "Privacy",
  "Core Protocol",
  "Real World",
  "DeFi",
  "Censorship Resistance",
  "Coordination",
  "Wallets",
  "ZK",
  "UX",
  "Public Goods",
  "Governance",
  "EVM",
  "Post-quantum",
  "Consensus",
];

/** How many Community Hub topics the filter surfaces offer (top by frequency). */
export const TOPIC_OPTION_COUNT = 15;

/**
 * The topic-filter options for a set of sessions, shared by the Speakers
 * page (pill row + mobile sheet) and the schedule Filters panel so every
 * surface offers the same list: the curated `TOPIC_OPTIONS` that at least
 * one speakered Pretalx session carries, in curated order, then the
 * Community Hubs' own vocabulary (a hub row's tags are its hub name and the
 * sheet's Topic, deliberate whether or not it names a speaker) by frequency
 * with an alphabetical tiebreak, cut to the top slice. Speakerless Pretalx
 * entries (breaks, ceremonies) are skipped: a tag that exists solely on them
 * would render a Speakers pill that can never match a speaker.
 */
export function deriveTopicOptions(sessions: Session[]): string[] {
  const pretalxTags = new Set<string>();
  const hubCounts = new Map<string, number>();
  for (const session of sessions) {
    const isHub = isCommunityHubSession(session);
    if (!isHub && (session.speakers ?? []).length === 0) continue;
    for (const raw of session.tags ?? []) {
      const tag = raw.trim();
      if (!tag) continue;
      if (isHub) hubCounts.set(tag, (hubCounts.get(tag) ?? 0) + 1);
      else pretalxTags.add(tag);
    }
  }
  const curated = TOPIC_OPTIONS.filter((tag) => pretalxTags.has(tag));
  const hubTopics = [...hubCounts.entries()]
    .filter(([tag]) => !curated.includes(tag))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([tag]) => tag)
    .slice(0, TOPIC_OPTION_COUNT);
  return [...curated, ...hubTopics];
}
