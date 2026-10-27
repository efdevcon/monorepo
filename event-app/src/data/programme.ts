import {
  communityHubForRoom,
  communityHubLockup,
  communityHubLogo,
  isCommunityHubSession,
  shortCommunityHubName,
} from "@/data/communityHubs";
import { communityLedGroup, communityLedLogo } from "@/data/communityLed";
import type { Session } from "@/data/models/sessions";
import type { ScheduleSource } from "@/data/store/schedule-source";

/**
 * Which programme a session is shown in. The two stores stay what they are
 * (the Pretalx bundle and the Community Hubs' sheets); a programme is a view
 * over both, never a store move, so every id-keyed feature (stars, reminders,
 * plan codes, share links) is untouched by where a session is listed.
 *
 * "Community" is everything a community manages: the hubs' own slots and the
 * community-led sessions of the Pretalx schedule, which the programme team
 * marks with a "[CLS]" prefix on the track. That marker is theirs and must
 * not be renamed upstream. "Sessions" (the main programme) is the rest.
 */

const CLS_MARKER = "[CLS]";

/** A Pretalx session run by a community: its track starts with the "[CLS]" marker. */
export function isCommunityLed(session: Pick<Session, "track">): boolean {
  return (session.track ?? "").trim().startsWith(CLS_MARKER);
}

export function programmeOf(session: Pick<Session, "track" | "room">): ScheduleSource {
  return isCommunityHubSession(session) || isCommunityLed(session) ? "hubs" : "main";
}

/**
 * The sessions of one programme, from both stores' sessions: the Devcon
 * programme is the Pretalx list minus the community-led sessions; the
 * Community programme is those sessions followed by the hub store's. The two
 * results partition the union exactly.
 */
export function programmeSessions(main: Session[], hubs: Session[], source: ScheduleSource): Session[] {
  if (source === "hubs") return [...main.filter(isCommunityLed), ...hubs];
  return main.filter((s) => !isCommunityLed(s));
}

/**
 * A community as the filters and themes see it, hub or community-led, one
 * shape so nothing downstream branches on origin. `key` is namespaced
 * (`hub:<id>` / `cls:<id>`): a hub and a group sharing a name never collide.
 */
export interface CommunityRef {
  key: string;
  id: string;
  name: string;
  badge: string;
  color: string;
  logo?: string;
  lockup?: string;
  kind: "hub" | "cls";
  /** Which filter section lists it: a hub can opt into the community-led one (the Music Stage). */
  section: "hub" | "cls";
}

/** The community behind a session: the hub by room first (a hub row's track is blank), else the group by track. */
export function communityOf(session: Pick<Session, "track" | "room">): CommunityRef | undefined {
  const hub = communityHubForRoom(session.room?.id);
  if (hub) {
    return {
      key: `hub:${hub.id}`,
      id: hub.id,
      name: hub.name,
      badge: shortCommunityHubName(hub.name),
      color: hub.color,
      logo: communityHubLogo(hub),
      lockup: communityHubLockup(hub) ?? undefined,
      kind: "hub",
      section: hub.listedWithCommunityLed ? "cls" : "hub",
    };
  }
  const group = communityLedGroup(session.track);
  if (!group) return undefined;
  return {
    key: `cls:${group.id}`,
    id: group.id,
    name: group.name,
    badge: group.badge,
    color: group.color,
    logo: communityLedLogo(group),
    lockup: group.lockup,
    kind: "cls",
    section: "cls",
  };
}

/** The communities present in a list of sessions, once each, by name. */
export function communityOptions(sessions: Session[]): CommunityRef[] {
  const byKey = new Map<string, CommunityRef>();
  for (const session of sessions) {
    const ref = communityOf(session);
    if (ref && !byKey.has(ref.key)) byKey.set(ref.key, ref);
  }
  return [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name));
}
