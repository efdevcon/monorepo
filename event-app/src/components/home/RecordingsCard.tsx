"use client";

import { useMemo } from "react";
import { ArrowRight, MonitorPlay } from "lucide-react";
import { PrimaryAnchorButton } from "@/components/Buttons";
import { trackEvent } from "@/data/analytics/track";
import { archiveSessionsUrl, archiveWatchUrl } from "@/data/archiveLinks";
import { isCommunityHubSession } from "@/data/communityHubs";
import { getActiveDataset } from "@/data/dataset";
import { useEvent, useSessionsOfAllProgrammes } from "@/data/hooks";
import { useInterested } from "@/data/interested/useInterested";
import { useHydrated } from "@/hooks/useHydrated";
import { useRetryOnReconnect } from "@/hooks/useRetryOnReconnect";

/**
 * Home entry to the recordings, first on Home: a link to the Devcon Archive
 * built from the attendee's stars, the way the planner's prompt carries
 * them. My Interests from the main programme go to the archive's
 * /my-interests page by Pretalx code (data/archiveLinks.ts), which opens the
 * first recording in the player with the others listed beside it; hub
 * sessions are left out (not recorded).
 * Without stars, the edition's recordings on the archive's Watch page. The
 * counts read the device's stars, so they appear once hydrated.
 */
export function RecordingsCard() {
  const hydrated = useHydrated();
  const sessions = useSessionsOfAllProgrammes();
  const { ids } = useInterested();
  const { event } = useEvent();

  const starred = useMemo(
    () =>
      sessions
        .filter((s) => ids.has(s.id) && s.sourceId && !isCommunityHubSession(s))
        .sort((a, b) => a.start - b.start),
    [sessions, ids]
  );
  const recorded = starred.filter((s) => s.sources_youtubeId).length;
  const dataset = hydrated ? getActiveDataset() : null;
  const eventId = dataset?.eventId ?? "devcon8";
  const eventTitle = event?.title || dataset?.label || "Devcon";
  const mine = hydrated && starred.length > 0;
  const allUrl = archiveWatchUrl(eventId);
  const mineUrl = mine ? archiveSessionsUrl(eventId, starred.map((s) => s.sourceId ?? s.id)) : allUrl;

  const body = !mine
    ? `Every recorded session is on the Devcon Archive. Star sessions to get your own list here.`
    : recorded > 0
      ? `${recorded} of the ${starred.length} sessions in My Interests have a recording on the Devcon Archive, and more are added as videos are published.`
      : `Recordings of the ${starred.length} sessions in My Interests appear on the Devcon Archive as videos are published.`;

  return (
    <section aria-label="Recordings">
      {/* Same card as CommunityHubsCard (Figma 5171:433 / 5174:1013): photo on
          top on mobile, on the right on desktop, faded into the card, with the
          archive's logo in white over it the way the hubs' tent sits on theirs. */}
      <div className="flex flex-col overflow-clip rounded-xl border border-dc-hairline bg-gradient-to-t from-[#fbfafc] from-20% to-[#fff5fa] lg:flex-row lg:items-center lg:gap-8 lg:pl-6">
        <RecordingsArt />

        <div className="flex min-w-0 flex-col gap-6 p-5 lg:flex-1 lg:p-0">
          <div className="flex flex-col gap-3 lg:gap-1">
            <h3 className="text-[20px] font-bold leading-[1.2] tracking-[-0.5px] text-dc-fg2 lg:leading-[28.8px]">
              {mine ? "Rewatch your sessions" : `Rewatch ${eventTitle}`}
            </h3>
            <p className="text-[14px] leading-5 text-dc-muted lg:text-[16px] lg:leading-6">{body}</p>
          </div>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-6">
            <PrimaryAnchorButton
              size="sm"
              href={mineUrl}
              target="_blank"
              rel="noopener"
              onClick={() => trackEvent("recordings", mine ? "open-mine" : "open-all")}
            >
              <MonitorPlay className="size-4 shrink-0" />
              {mine ? "Watch your recordings" : "Browse the recordings"}
            </PrimaryAnchorButton>
            {/* The planner card's "Import a plan instead" text link style. */}
            {mine && (
              <a
                href={allUrl}
                target="_blank"
                rel="noopener"
                onClick={() => trackEvent("recordings", "open-all")}
                className="mx-auto flex h-8 w-fit items-center gap-1.5 text-[14px] font-bold leading-none text-dc-purple transition-colors duration-150 ease-out hover:text-dc-purple-600 lg:mx-0"
              >
                All {eventTitle} recordings
                <ArrowRight className="size-4 shrink-0" />
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * The card's picture: a Devcon 8 stage photo (the archive's Devcon 8 artwork,
 * public/home/recordings.jpg) under the Devcon Archive logo in white. Sized
 * and masked like CommunityHubsCard's photo; retries when the connection
 * returns (event-app/CLAUDE.md, Images rule 5).
 */
function RecordingsArt() {
  const { attempt, markFailed } = useRetryOnReconnect();
  return (
    <div className="relative h-[256px] w-full shrink-0 lg:order-last lg:h-[225px] lg:w-[503px] lg:max-w-[45%]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={attempt}
        src="/home/recordings.jpg"
        onError={markFailed}
        // Decoration: yields to route and data requests on a slow link.
        fetchPriority="low"
        decoding="async"
        alt=""
        className="absolute inset-0 size-full object-cover [mask-image:linear-gradient(to_top,transparent,black_48px)] lg:[mask-image:linear-gradient(to_right,transparent,black_64px)]"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={`logo-${attempt}`}
        src="/home/devcon-archive-logo-white.svg"
        alt="Devcon Archive"
        width={200}
        height={57}
        className="absolute inset-0 m-auto h-[57px] w-[200px]"
      />
    </div>
  );
}
