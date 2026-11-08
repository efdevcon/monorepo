"use client";

import React, { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import watchCss from "./watch.module.scss";
import css from "./my-interests.module.scss";
import { Video } from "@/components/domain/archive/Video";
import { Loader } from "@/components/common/loader";
import { Link } from "@/components/common/link";
import { CONFIG } from "@/utils/config";
import { LATEST_EDITION, editionEventId, editionOf } from "@/utils/editions";

/** What the video page and the list cards use, so the list call skips transcripts. */
const FIELDS =
  "id,sourceId,eventId,title,type,duration,description,speakers,expertise,tags,sources_youtubeId,sources_ipfsHash,sources_swarmHash,slot_start";

/**
 * /my-interests?event=devcon8&sessions=CODE,CODE[&v=id]: the attendee's
 * recordings, straight into the video page. The first one (or `v`) is loaded
 * in the player and the others are the list beside it; picking one stays on
 * this page, so the list goes along. The Devcon App links here from Home
 * with the attendee's My Interests (event-app src/data/archiveLinks.ts);
 * sessions go by Pretalx code, a session id works too. One call for the
 * edition's recorded sessions, filtered here, so the list grows on its own
 * as videos are published and the API needs no id filter.
 */
export const MyInterests = () => {
  const params = useSearchParams();
  const eventId = params.get("event") || editionEventId(LATEST_EDITION);
  const edition = editionOf(eventId);
  const eventName = edition ? `Devcon ${edition}` : "Devcon";
  const sessionsParam = params.get("sessions") ?? "";
  const selectedId = params.get("v");
  const wanted = useMemo(
    () =>
      new Set(
        sessionsParam
          .split(",")
          .map((code) => code.trim().toUpperCase())
          .filter(Boolean)
      ),
    [sessionsParam]
  );

  const { data, isLoading, isError } = useQuery({
    queryKey: ["my-interests", eventId],
    enabled: wanted.size > 0,
    queryFn: async () => {
      const response = await fetch(
        `${CONFIG.API_BASE_URL}/sessions?event=${encodeURIComponent(eventId)}&video=true&size=1000&fields=${FIELDS}`
      );
      if (!response.ok) throw new Error("Failed to fetch archive data");
      const body = await response.json();
      return (body.data?.items ?? []) as any[];
    },
  });

  const videos = useMemo(
    () =>
      (data ?? [])
        .filter(
          (s) =>
            s.sources_youtubeId &&
            (wanted.has(String(s.sourceId ?? "").toUpperCase()) || wanted.has(String(s.id).toUpperCase()))
        )
        .sort((a, b) => (a.slot_start ?? 0) - (b.slot_start ?? 0)),
    [data, wanted]
  );

  const playlist = useMemo(
    () => ({
      id: "my-interests",
      title: `Your ${eventName} recordings`,
      description: "The sessions you starred in the Devcon App that have a recording.",
      videos,
      curators: [],
    }),
    [videos, eventName]
  );

  const sessionsQuery = sessionsParam
    .split(",")
    .map((code) => encodeURIComponent(code.trim()))
    .filter(Boolean)
    .join(",");
  const linkFor = (video: any) =>
    `/my-interests/?event=${encodeURIComponent(eventId)}&sessions=${sessionsQuery}&v=${encodeURIComponent(video.id)}`;

  const selected = videos.find((v) => v.id === selectedId) ?? videos[0];
  if (selected) {
    return <Video video={selected} relatedVideos={[]} activePlaylist={playlist} playlistLinkFor={linkFor} />;
  }

  // Nothing to play: no sessions in the link, still loading, an error, or none recorded yet.
  const intro =
    wanted.size === 0
      ? "This link carries no sessions. Star sessions in the Devcon App and open this page from its Home screen."
      : "Recordings of the sessions you starred in the Devcon App show here as videos are published.";

  return (
    <div className="section">
      <div className={`${watchCss["container"]} content`}>
        <div className={css["header"]}>
          <h1 className="bold font-xl font-primary">Your {eventName} recordings</h1>
          <p className="font-sm">{intro}</p>
          <Link className={`${css["all"]} label label-hover plain`} href={`/watch?event=${encodeURIComponent(eventId)}`}>
            <span>Browse every {eventName} recording</span>
          </Link>
        </div>

        <div className={watchCss["view"]}>
          <div className={`${watchCss["videos"]} ${css["videos"]}`}>
            <Loader
              loading={wanted.size > 0 && isLoading}
              error={isError}
              noResults={!!data && videos.length === 0}
              messages={{
                error: { message: "Could not fetch the recordings - try again later." },
                loading: { message: "Finding your recordings..." },
                noResults: { message: "None of these sessions has a recording yet - check back soon." },
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
