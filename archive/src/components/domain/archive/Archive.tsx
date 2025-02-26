import React from "react";
import { Header } from "@/components/common/layouts/header";
import { Footer } from "@/components/common/layouts/footer";
import css from "./archive.module.scss";
import { PageHero } from "@/components/common/page-hero";
import { CuratedPlaylists, Playlists, StaffPicks } from "./playlists";
import { Editions } from "./Editions";
import { usePlaylists } from "@/hooks/usePlaylists";
import { useStaffPicks } from "@/hooks/useStaffPicks";
import { Interests } from "./interests";
import OnDemandVideoIcon from "src/assets/icons/on_demand_video.svg";
import { Button } from "lib/components/button";
import { Link } from "@/components/link";

type ArchiveProps = {};

export const Archive = (props: ArchiveProps) => {
  const playlists = usePlaylists();
  const staffpicks = useStaffPicks();
  const curated = playlists.filter((i) =>
    i.categories.includes("Community Curated")
  );

  return (
    <div className={css["container"]}>
      {/* TODO: Add SEO component */}
      <Header withStrip={false} />
      <PageHero
        scenes={staffpicks.videos.map((video: any) => {
          return {
            image:
              video.image ||
              video.imageUrl ||
              `https://img.youtube.com/vi/${video.youtubeUrl
                .split("/")
                .pop()}/maxresdefault.jpg`,
            imageProps: {
              alt: "Staff pick",
            },
            callToAction: () => {
              const slug = `${video.slug}?playlist=${encodeURIComponent(
                staffpicks.title
              )}`;

              return (
                <Button to={slug} className={`red ${css["call-to-action"]}`}>
                  <span className={css["watch-now"]}>Watch Now</span>

                  <OnDemandVideoIcon
                    className={`icon ${css["watch-now-icon"]}`}
                  />
                </Button>
              );
            },
            content: () => {
              return (
                <div className={css["page-hero-scene"]}>
                  <div className={css["body"]}>
                    <div className="label bold">Staff Pick</div>
                    <p className="font-xl bold">{video.title}</p>
                    <p className={`${css["description"]} font-lg`}>
                      {video.description}
                    </p>
                  </div>

                  <div className={css["metadata"]}>
                    {video.speakers.length > 0 && (
                      <p>
                        By{" "}
                        <span className="bold">
                          {video.speakers.join(", ")}
                        </span>
                      </p>
                    )}
                    <p className="bold">Devcon {video.edition}</p>
                  </div>
                </div>
              );
            },
          };
        })}
        title="Archive"
        titleClassName={css["white-title"]}
        // titleSubtext="Devcon"
        banner={
          <div>
            Devcon 7 videos will be added to the archive soon.{" "}
            <Link href="https://app.devcon.org/schedule">
              Visit the app in the meantime to watch them now.
            </Link>
          </div>
        }
      ></PageHero>

      <div className={css["content"]}>
        <Interests />

        <StaffPicks />

        <Playlists />

        <Editions />

        <CuratedPlaylists title="Curated Playlists" items={curated} viewMore />

        <Footer />
      </div>
    </div>
  );
};
