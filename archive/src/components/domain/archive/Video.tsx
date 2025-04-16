"use client";

import React, { useState } from "react";
import archiveCss from "./archive.module.scss";
import css from "./video.module.scss";
import { Tabs } from "@/components/common/tabs";
import { Tab } from "@/components/common/tabs/Tabs";
import { VideoCard } from "@/components/domain/archive/VideoCard";
import GoogleSlides from "@/assets/icons/google_slides.svg";
import { Link } from "@/components/common/link";
import { Avatar } from "./Avatar";
import { Banner } from "@/components/domain/ipfs";
import { Playlist, UserProfile } from "@/types";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
dayjs.extend(duration);

const List = ({ video, playlist, videos }: any) => {
  return (
    <div className={css["list"]}>
      {videos.map((playlistVideo: any, index: number) => {
        const isCurrentlyWatching = video.title === playlistVideo.title;

        let className = "";

        if (isCurrentlyWatching) className = css["selected"];

        return (
          <VideoCard
            compact
            playlist={playlist}
            key={index}
            video={playlistVideo}
            className={className}
          />
        );
      })}
    </div>
  );
};

const Suggested = ({ video, relatedVideos, playlists }: any) => {
  const [playlist, setPlaylist] = React.useState<null | any>(null);
  const tabsRef = React.useRef();

  React.useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const playlistParam = searchParams.get("playlist");

    if (playlistParam) {
      const activePlaylist = playlists?.find(
        (pl: any) => playlistParam === pl.title
      );

      if (activePlaylist) {
        setPlaylist(activePlaylist);
        tabsRef?.current?.setActiveTab("Playlist");
      }
    }
  }, []);

  if (!playlist && relatedVideos?.length === 0) return null;

  return (
    <div className={css["suggested"]}>
      <Tabs ref={tabsRef} tabContentClassName={css["tab-content"]}>
        {playlist && playlist.videos.length > 0 && (
          <Tab title="Playlist">
            <div className={css["description"]}>
              <div className="label">{playlist.videos.length} talks</div>
              <h2 className="title">{playlist.title}</h2>
              {playlist.curators && playlist.curators.length > 0 && (
                <p className="text-uppercase font-sm">
                  By{" "}
                  <span className="bold">{playlist.curators.join(", ")}</span>
                </p>
              )}
            </div>

            <List video={video} playlist={playlist} videos={playlist.videos} />
          </Tab>
        )}

        {relatedVideos && relatedVideos.length > 0 && (
          <Tab title="Related">
            <List video={video} videos={relatedVideos} />
          </Tab>
        )}
      </Tabs>
    </div>
  );
};

const Labels = ({ tags, playlists }: any) => {
  const hasPlaylists = playlists?.length > 0;
  const hasTags = tags?.length > 0;

  if (!hasTags && !hasPlaylists) return null;

  return (
    <div className={css["labels-container"]}>
      {hasTags && (
        <div className={css["group"]}>
          <p className="font-xs bold">Categories</p>
          <div className={css["labels"]}>
            {tags.map((tag: any) => {
              return (
                <Link
                  href={`/watch?tags=${encodeURIComponent(tag)}`}
                  key={tag}
                  className="label label-hover white bold scale"
                >
                  {tag}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {hasPlaylists && (
        <div className={css["group"]}>
          <p className="font-xs bold">Playlists</p>
          <div className={css["labels"]}>
            {playlists.map((playlist: Playlist) => {
              return (
                <Link
                  href={playlist.id}
                  key={playlist.title}
                  className="label label-hover white bold scale"
                >
                  {playlist.title}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export const Video = (props: any) => {
  const [activeTab, setActiveTab] = useState("");
  const video = props.video;
  const swarmHash = video.ethernaPermalink?.split("/").pop() ?? "";

  return (
    <div className={archiveCss["container"]}>
      <div className={css["container"]}>
        <div className={css["video"]}>
          <div className={css["player"]}>
            <Tabs onSelectTab={setActiveTab} useQuerystring>
              <Tab title="YouTube">
                <div className="aspect">
                  {props.video.sources_youtubeId && (
                    <iframe
                      src={`https://www.youtube.com/embed/${props.video.sources_youtubeId}`}
                      title="YouTube video player"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  )}

                  {!props.video.sources_youtubeId && (
                    <img
                      src={"/images/video-soon.png"}
                      alt={`${props.video.title} preview`}
                    />
                  )}
                </div>
              </Tab>

              {props.video.sources_ipfsHash && (
                <Tab title="IPFS">
                  <div className="aspect">
                    <video controls autoPlay={false}>
                      <source
                        src={`https://cloudflare-ipfs.com/ipfs/${props.video.sources_ipfsHash}`}
                      />
                    </video>
                  </div>
                </Tab>
              )}

              {/* {props.video.ethernaPermalink && (
                  <Tab title="Swarm">
                    <div className="aspect">
                      <iframe
                        src={props.video.ethernaPermalink}
                        title="Etherna video player"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  </Tab>
                )} */}
            </Tabs>
          </div>

          <div className={css["tabs-video"]}>
            {activeTab === "IPFS" && (
              <Banner
                type="IPFS"
                className={css["banner"]}
                cta="Access on IPFS"
                hash={props.video.sources_ipfsHash}
                learnMore
              />
            )}
            {activeTab === "Swarm" && (
              <Banner
                type="Swarm"
                className={css["banner"]}
                cta="Access on Swarm"
                hash={props.video.sources_swarmHash}
              />
            )}
            <Tabs>
              <Tab title="Details">
                <div className={css["content"]}>
                  <h1 className="font-xxl title">{video.title}</h1>

                  <div className={css["descriptors"]}>
                    <p className={css["descriptor"]}>
                      <span>Duration:</span>{" "}
                      {dayjs
                        .duration(video.duration, "seconds")
                        .format("HH:mm:ss")}
                    </p>
                    <p className={css["descriptor"]}>
                      <span>Speaker:</span>{" "}
                      {video.speakers.map((i: any) => i.name).join(", ")}
                    </p>
                    <p className={css["descriptor"]}>
                      <span>Type:</span> {video.type}
                    </p>
                    <p className={css["descriptor"]}>
                      <span>Expertise:</span> {video.expertise}
                    </p>
                    <p className={css["descriptor"]}>
                      <span>Event:</span> Devcon {video.edition}
                    </p>
                    <p className={css["descriptor"]}>
                      <span>Date:</span>{" "}
                      {dayjs(video.slot_start).format("MMM YYYY")}
                    </p>
                  </div>

                  <div className={css["description"]}>
                    <div className={css["text"]}>{video.description}</div>
                  </div>
                </div>

                <Labels tags={video.tags} playlists={props.playlists} />

                {video.slidesUrl && (
                  <div className={css["resources"]}>
                    <span
                      className={`${css["title"]} font-sm bold text-uppercase`}
                    >
                      Resources
                    </span>

                    <div className={css["list"]}>
                      {video.slidesUrl && (
                        <a
                          className={css["link"]}
                          href={video.slidesUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <span className={css["type"]}>
                            <GoogleSlides />
                          </span>
                          Presentation Slides
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {video.profiles?.length > 0 && (
                  <div className={css["speakers"]}>
                    <span
                      className={`${css["title"]} font-sm bold text-uppercase`}
                    >
                      About the speakers
                    </span>
                    {video.profiles.map((i: UserProfile) => {
                      return (
                        <div key={i.name} className={css["speaker"]}>
                          <Avatar profile={i} className={css["thumbnail"]} />
                          <div className={css["text"]}>
                            <div className={css["title"]}>
                              <p className="bold">{i.name}</p>
                              {i.role && <p className="font-xs"> {i.role}</p>}
                            </div>
                            <p className="font-sm">{i.description}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Tab>
              {video.resources && <Tab title="Resources">Resources</Tab>}
            </Tabs>
          </div>
        </div>

        <Suggested
          video={video}
          playlists={props.playlists}
          relatedVideos={props.relatedVideos}
        />
      </div>
    </div>
  );
};
