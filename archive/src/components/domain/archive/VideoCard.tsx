"use client";

import React from "react";
import css from "./video-card.module.scss";
import { BasicCard } from "@/components/common/card";
import { ArchiveVideo, Playlist } from "@/types";
import { editionOf } from "@/utils/editions";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

/**
 * YouTube's 4:3 "hqdefault" carries letterbox bars that peek out of the 16:9
 * card as a grey strip; "hq720" is the 16:9 render. The fallback covers the
 * rare video without one.
 */
const thumbnail = (youtubeId: string, size: "hq720" | "hqdefault") =>
  `https://img.youtube.com/vi/${youtubeId}/${size}.jpg`;

const editionLabel = (video: ArchiveVideo) => {
  if (video.eventId === "devconnect-arg") return "Devconnect";
  const edition = editionOf(video.eventId) ?? video.edition;
  return edition != null ? `Devcon ${edition}` : "Devcon";
};

interface Props {
  video: ArchiveVideo;
  playlist?: Playlist;
  showDescription?: boolean;
  className?: string;
  slide?: Boolean;
  horizontal?: boolean;
  canSlide?: boolean;
  vertical?: boolean;
  compact?: boolean;
}

export const VideoCard = (props: Props) => {
  let className = css["video-card"];

  if (props.slide) className += ` ${css["slide"]}`;
  if (props.horizontal) className = css["horizontal"];
  if (props.compact) className = css["compact"];
  if (props.className) className += ` ${props.className}`;

  function getWatchUrl() {
    let url = `/${props.video.eventId}/${props.video.id}`;

    if (props.playlist) {
      url += `?playlist=${props.playlist.title}`;
    }

    return url;
  }

  return (
    <BasicCard
      className={className}
      slide={props.canSlide}
      expandLink
      linkUrl={getWatchUrl()}
      allowDrag
    >
      {/* Need the wrapper so we can constrain the aspect div */}
      <div className={css["aspect-wrapper"]}>
        <div className="aspect">
          <img
            src={
              props.video.sources_youtubeId
                ? thumbnail(props.video.sources_youtubeId, "hq720")
                : "/images/video-soon.png"
            }
            onError={(e) => {
              const id = props.video.sources_youtubeId;
              const fallback = id && thumbnail(id, "hqdefault");
              if (fallback && e.currentTarget.src !== fallback) e.currentTarget.src = fallback;
            }}
            alt={`${props.video.title} preview`}
          />

          <div className={`${css["labels"]}`}>
            <div className={`label sm black`}>{editionLabel(props.video)}</div>
            <div className={`label sm black`}>{props.video.type}</div>
            {props.video.duration && (
              <div className={`${css["duration"]} label sm black`}>
                {dayjs
                  .utc(props.video.duration * 1000)
                  .format("H:mm:ss")
                  .replace(/^0:/, "")}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={css["body"]}>
        <div className={css["top"]}>
          <p className={css["title"]}>{props.video.title}</p>
          <p className={css["description"]}>{props.video.description}</p>
          {/* {props.showDescription && <p className={css['description']}>{props.video.description}</p>} */}
        </div>

        <div className={css["bottom"]}>
          <div>
            {props.video.speakers && (
              <p className={`${css["speakers"]}`}>
                {props.video.speakers.map((speaker) => speaker.name).join(", ")}
              </p>
            )}
          </div>
        </div>
      </div>
    </BasicCard>
  );
};
