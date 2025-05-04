"use client";

import React from "react";
import css from "./curated.module.scss";
import { BasicCard } from "@/components/common/card";
import { Button } from "@/components/common/button";
import ArrowRight from "@/assets/icons/arrow_right.svg";
import { Slider, useSlider } from "@/components/common/slider";
import { Playlist } from "@/types";
import Image from "next/image";
import { getTrackColor } from "@/utils/config";

interface PlaylistProps {
  title: string;
  borderless?: boolean;
  eventList?: boolean;
  viewMore?: boolean;
  items: Array<Playlist>;
}

export const PlaylistCard = (props: {
  playlist: Playlist;
  canSlide: boolean;
  small?: boolean;
  eventList?: boolean;
}) => {
  let className = `${css["video-card"]} ${css["big"]}`;

  if (props.canSlide) className += ` ${css["slide"]}`;

  const linkUrl = props.eventList
    ? `/watch?event=${props.playlist.id}`
    : `/watch?tags=${props.playlist.title}`;

  return (
    <BasicCard
      key={props.playlist.id}
      className={className}
      allowDrag
      linkUrl={linkUrl}
      expandLink
    >
      <div className={`aspect ${props.small ? "" : "square"}`}>
        <div
          className={`${css["image-wrapper"]} ${getTrackColor(
            props.playlist.title
          )}`}
        >
          <Image
            src={props.playlist.imageUrl ?? ""}
            alt={`${props.playlist.title} Devcon playlist`}
            className={props.eventList ? css["image"] : css["image-small"]}
            width={400}
            height={400}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            priority={true}
          />
        </div>
      </div>
      <div className={css["body"]}>
        {props.playlist.nrOfSessions && (
          <div className="label">{props.playlist.nrOfSessions} talks</div>
        )}
        <h4 className="title">{props.playlist.title}</h4>
        {props.playlist.curators && props.playlist.curators.length > 0 && (
          <p className="semi-bold font-xs">
            <span className={css["opaque"]}>BY</span>{" "}
            {props.playlist.curators.join(", ").toUpperCase()}
          </p>
        )}
      </div>
    </BasicCard>
  );
};

export const CuratedPlaylists = (props: PlaylistProps) => {
  const nItems = props.items.length;

  const sliderSettings = {
    infinite: false,
    speed: 500,
    slidesToShow: Math.min(nItems, 4),
    arrows: false,
    touchThreshold: 100,
    mobileFirst: true,
    swipeToSlide: true,
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: Math.min(nItems, 2),
        },
      },
      {
        breakpoint: 600,
        settings: {
          slidesToShow: Math.min(nItems, 1.1),
        },
      },
    ],
  };

  const sliderProps = useSlider(sliderSettings);

  return (
    <div className="section">
      <div className="content">
        <div
          className={`${css["curated-playlists"]} ${
            props.borderless ? "" : "border-top"
          } margin-bottom`}
        >
          <Slider
            sliderProps={sliderProps}
            className={css["slider"]}
            style={props.borderless ? { marginTop: "0px" } : undefined}
            title={props.title}
          >
            {props.items.map((i: Playlist) => {
              return (
                <PlaylistCard
                  key={i.id}
                  playlist={i}
                  canSlide={sliderProps[1].canSlide}
                  eventList={props.eventList}
                />
              );
            })}
          </Slider>

          {props.viewMore && (
            <Button
              to={"/archive/playlists"}
              className={`${css["button"]} white ghost sm`}
            >
              View more <ArrowRight />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
