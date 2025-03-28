"use client";
import React from "react";
import { VideoCard } from "@/components/domain/archive/VideoCard";
import { Slider, useSlider } from "@/components/common/slider";
import { Playlist } from "@/types";
import css from "./playlists.module.scss";

interface PlaylistSliderProps {
  title: string;
  playlist?: Playlist;
}

export const PlaylistSlider = ({ title, playlist }: PlaylistSliderProps) => {
  const length = playlist?.videos.length || 0;
  const sliderSettings = {
    infinite: false,
    speed: 500,
    slidesToShow: Math.min(length, 4),
    arrows: false,
    swipeToSlide: true,
    slidesToScroll: 3,
    touchThreshold: 100,
    mobileFirst: true,
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: Math.min(length, 3),
          slidesToScroll: 3,
        },
      },
      {
        breakpoint: 600,
        settings: {
          slidesToShow: Math.min(length, 1.1),
          slidesToScroll: 1,
        },
      },
    ],
  };

  const sliderProps = useSlider(sliderSettings);

  return (
    <div className="section">
      <div className="content">
        <div className="padding-bottom border-top">
          <Slider
            className={css["slider"]}
            sliderProps={sliderProps}
            title={title}
          >
            {playlist?.videos.map((i) => {
              let className = "";

              return (
                <VideoCard
                  key={i.id}
                  playlist={playlist}
                  slide
                  canSlide={sliderProps[1].canSlide}
                  video={i}
                  className={className}
                />
              );
            })}
          </Slider>
        </div>
      </div>
    </div>
  );
};
