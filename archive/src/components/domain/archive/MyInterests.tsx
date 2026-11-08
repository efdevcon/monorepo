"use client";

import React, { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import watchCss from "./watch.module.scss";
import css from "./my-interests.module.scss";
import { VideoCard } from "@/components/domain/archive/VideoCard";
import { Loader } from "@/components/common/loader";
import { Link } from "@/components/common/link";
import { CONFIG } from "@/utils/config";
import { LATEST_EDITION, editionEventId, editionOf } from "@/utils/editions";

/** What the cards need, so the list call skips transcripts. */
const FIELDS = "id,sourceId,eventId,title,type,duration,description,speakers,sources_youtubeId,slot_start";

/**
 * /my-interests?event=devcon8&sessions=CODE,CODE: the recordings of a list of
 * sessions, in schedule order. The Devcon App links here from Home with the
 * attendee's My Interests (event-app src/data/archiveLinks.ts); sessions go
 * by Pretalx code, a session id works too. One call for the edition's
 * recorded sessions, filtered here, so the list grows on its own as videos
 * are published and the API needs no id filter.
 */
export const MyInterests = () => {
  const params = useSearchParams();
  const eventId = params.get("event") || editionEventId(LATEST_EDITION);
  const edition = editionOf(eventId);
  const eventName = edition ? `Devcon ${edition}` : "Devcon";
  const wanted = useMemo(
    () =>
      new Set(
        (params.get("sessions") ?? "")
          .split(",")
          .map((code) => code.trim().toUpperCase())
          .filter(Boolean)
      ),
    [params]
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

  const intro =
    wanted.size === 0
      ? "This link carries no sessions. Star sessions in the Devcon App and open this page from its Home screen."
      : data
        ? `${videos.length} of the ${wanted.size} sessions you starred in the Devcon App ${
            videos.length === 1 ? "has" : "have"
          } a recording so far. More appear here as videos are published.`
        : "The sessions you starred in the Devcon App that have a recording.";

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

            {videos.length > 0 && (
              <>
                <div className={watchCss["video-list"]}>
                  {videos.map((video) => (
                    <VideoCard key={video.id} video={video} />
                  ))}
                </div>
                <div className={`${watchCss["video-list"]} ${watchCss["mobile"]}`}>
                  {videos.map((video, index) => (
                    <VideoCard key={video.id} horizontal vertical={index === 0} video={video} />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
