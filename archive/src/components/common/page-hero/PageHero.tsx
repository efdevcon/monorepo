"use client";

import React from "react";
import css from "./page-hero.module.scss";
import useGetElementHeight from "@/hooks/useGetElementHeight";
import { useIsScrolled } from "@/hooks/useIsScrolled";
import ChevronLeft from "@/assets/icons/chevron_left.svg";
import ChevronRight from "@/assets/icons/chevron_right.svg";
import { Button } from "@/components/common/button";
import { Link } from "@/components/common/link";
import OnDemandVideoIcon from "@/assets/icons/on_demand_video.svg";
import Image from "next/image";
import { usePathname } from "next/navigation";

type NavigationLink = {
  to: string;
  title: string;
};

type CTALink = {
  to: string;
  title: string;
  icon: any;
};

type Scene = {
  session: any;
  callToAction: () => JSX.Element;
  content: () => JSX.Element;
};

type PathSegment = {
  text: string;
  url?: string;
};

type PageHeroProps = {
  banner?: React.ReactNode;
  title?: string;
  titleSubtext?: string;
  titleClassName?: string;
  path?: string | PathSegment[];
  description?: string;
  scenes?: Scene[];
  background?: string;
  cta?: Array<CTALink>;
  renderCustom?(props?: any): JSX.Element;
  navigation?: Array<NavigationLink>;
  children?: React.ReactNode;
};

const PathNavigation = (props: PageHeroProps) => {
  let path = usePathname();

  if (!path || path === "/") return null;

  const pathSegments = path.split("/").filter((segment) => segment !== "");
  if (pathSegments.length <= 1) return null;

  const transformedPath = pathSegments.reduce((acc, segment, index) => {
    const transformedText = segment.replace(/-/g, " ");

    if (index === pathSegments.length - 1) {
      acc.push(
        <span key={`${transformedText}-${index}`}>{transformedText}</span>
      );
    } else {
      const href = "/" + pathSegments.slice(0, index + 1).join("/");
      acc.push(
        <Link
          key={`${transformedText}-${index}`}
          className="hover-underline bold"
          href={href}
        >
          {transformedText}
        </Link>
      );
    }

    if (index !== pathSegments.length - 1) {
      acc.push(<span key={`separator-${index}`}>&nbsp;/&nbsp;</span>);
    }

    return acc;
  }, [] as React.ReactNode[]);

  return (
    <p className={`${css["path"]} font-xs text-uppercase`}>{transformedPath}</p>
  );
};

export const PageHeroClient = ({ featuredItems }: any) => {
  const path = usePathname();
  const isHome = path === "/";
  const isWatch = path.startsWith("/watch");

  if (isWatch)
    return (
      <PageHero
        title="Watch"
        description="Devcon content curated and organized for your discovery and learning."
      ></PageHero>
    );

  if (isHome)
    return (
      <PageHero
        scenes={featuredItems?.map((item: any) => {
          return {
            session: item,
            callToAction: () => {
              return (
                <Button
                  href={item.id}
                  className={`red ${css["call-to-action"]}`}
                >
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
                    <p className="font-xl bold">{item.title}</p>
                    <p className={`${css["description"]} font-lg`}>
                      {item.description}
                    </p>
                  </div>

                  <div className={css["metadata"]}>
                    {item.speakers.length > 0 && (
                      <p>
                        By{" "}
                        <span className="bold">
                          {item.speakers
                            .map((speaker: any) => speaker.name)
                            .join(", ")}
                        </span>
                      </p>
                    )}
                    <p className="bold">
                      Devcon {item.eventId.replace("devcon-", "")}
                    </p>
                  </div>
                </div>
              );
            },
          };
        })}
        title="Archive"
        titleClassName="text-white"
      ></PageHero>
    );

  return null;
};

export const PageHero = (props: PageHeroProps) => {
  const stripHeight = useGetElementHeight("strip");
  const headerHeight = useGetElementHeight("header");
  const pageHeaderHeight = useGetElementHeight("page-navigation");
  const pageHeroHeight = useGetElementHeight("page-hero");
  const negativeOffset = `-${
    pageHeroHeight - pageHeaderHeight - headerHeight
  }px`;
  const isScrolled = useIsScrolled();
  const [currentScene, setCurrentScene] = React.useState(0);

  // console.log(pageHeroHeight, pageHeaderHeight, headerHeight, 'pagehero/pageheader/header')

  let style: any = {
    "--negative-offset": negativeOffset,
    "--strip-height": `${stripHeight}px`,
  };

  // console.log(headerHeight, 'header height')

  if (props.background) {
    style.backgroundImage = `url(${props.background})`;
    style.backgroundSize = "cover";
  }

  let className = `${css["hero"]} margin-bottom`;

  if (props.background) className += ` ${css["custom-background"]}`;
  if (isScrolled) className += ` ${css["scrolled"]}`;
  if (props.navigation) className += ` ${css["with-navigation"]}`;
  if (props.scenes) className += ` ${css["with-scenes"]}`;
  if (props.children) className += ` ${css["as-background"]}`;

  const setNextScene = React.useMemo(
    () => (increment: number) => {
      const nextScene = currentScene + increment;

      if (nextScene >= props.scenes.length) {
        setCurrentScene(0);
      } else if (nextScene < 0) {
        setCurrentScene(props.scenes.length - 1);
      } else {
        setCurrentScene(nextScene);
      }
    },
    [currentScene, setCurrentScene, props.scenes]
  );

  // Auto scroll through images
  React.useEffect(() => {
    if (props.scenes) {
      const timeout = setTimeout(() => {
        setNextScene(1);
      }, 1000 * 8);

      return () => clearTimeout(timeout);
    }
  }, [props.scenes, setNextScene]);

  return (
    <div id="page-hero" className={className} style={style}>
      <div className="section">
        <div className={css["info"]}>
          <PathNavigation {...props} />

          <div className={css["title-block"]}>
            <h1
              className={`font-massive-2 ${
                props.titleSubtext ? css["subtext"] : ""
              } ${props.titleClassName ? props.titleClassName : ""}`}
            >
              {props.title}
              {props.titleSubtext && <span>{props.titleSubtext}</span>}
            </h1>
            {props.description && (
              <span className={css["description"]}>{props.description}</span>
            )}

            {props.cta && (
              <div className={css["buttons"]}>
                {props.cta.map((link: CTALink) => {
                  return (
                    <Link
                      key={link.to + link.title}
                      className="button white lg"
                      href={link.to}
                    >
                      {link.icon}
                      <span>{link.title}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {props.children}

          {props.banner && (
            <div className={css["banner"]}>
              <div className="section">{props.banner}</div>
            </div>
          )}

          {props.scenes && (
            <div className={css["scenes"]}>
              {props.scenes.map((scene: any, i: number) => {
                const selected = i === currentScene;

                let className = css["scene"];

                if (selected) className += ` ${css["active"]}`;

                return (
                  <div key={i} className={className}>
                    {scene.content()}
                  </div>
                );
              })}

              <div className={css["controls-dots"]}>
                {props.scenes.map((_: any, i: number) => {
                  const selected = i === currentScene;

                  let className = css["dot"];

                  if (selected) className += ` ${css["active"]}`;

                  return (
                    <div
                      key={i}
                      className={className}
                      onClick={() => setCurrentScene(i)}
                    >
                      <div className={css["circle"]}></div>
                    </div>
                  );
                })}
              </div>

              <div className={css["controls"]}>
                {props.scenes[currentScene].callToAction()}

                <div className={css["arrows"]}>
                  <Button
                    className={`${css["arrow"]} white squared`}
                    aria-label="View previous slide"
                    onClick={() => setNextScene(-1)}
                  >
                    <ChevronLeft />
                  </Button>
                  <Button
                    className={`${css["arrow"]} white squared`}
                    aria-label="View next slide"
                    onClick={() => setNextScene(1)}
                  >
                    <ChevronRight />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {props.renderCustom && props.renderCustom()}

          {props.navigation && (
            <div id="page-navigation" className={css["page-navigation"]}>
              {props.navigation &&
                props.navigation.map((link) => {
                  return (
                    <Link
                      key={link.to + link.title}
                      href={link.to}
                      className="font-xs bold text-uppercase"
                    >
                      {link.title}
                    </Link>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      {props.scenes?.map((scene, i: number) => {
        const selected = i === currentScene;

        let className = css["scene-background-image"];

        if (selected) className += ` ${css["active"]}`;

        return (
          <div key={i} className={className}>
            <Image
              src={`/images/featured/${scene.session.eventId}/${scene.session.id}.png`}
              alt={scene.session.title}
              fill
              priority={i === 0}
              quality={85}
              sizes="100vw"
              className={css["scene-image"]}
              style={{
                objectFit: "cover",
              }}
            />
          </div>
        );
      })}
    </div>
  );
};
