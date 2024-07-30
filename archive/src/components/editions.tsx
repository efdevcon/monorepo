"use client";

import { Event } from "@/types";
import { useEffect, useRef, useState } from "react";
import { Link } from "./link";
import Image from "next/image";
import dayjs from "dayjs";
import css from "./editions.module.scss";

interface Props {
  events: Event[];
  className?: string;
}

export function Editions(props: Props) {
  let className = "container mx-auto border-t border-b border-gray-300 py-8";
  if (props.className) className += ` ${props.className}`;
  const [eventIndex, setEventIndex] = useState(7);
  const event = props.events.reverse()[eventIndex];

  return (
    <div className={className}>
      <h2 className="text-2xl font-semibold mb-8">All Devcons</h2>

      <div className={css["container"]}>
          <div className={css["numbers"]}>
            {props.events.reverse().map((i: Event) => {
              const selected = i.edition === event.edition;
              let className = css["edition"];

              if (selected) className += ` ${css["selected"]}`;

              return (
                <div key={i.edition} className={className}>
                  <p className={css["conference"]}>Devcon Editions</p>

                  {selected ? (
                    <Clock
                      next={() =>
                        setEventIndex((curr) =>
                          curr === props.events.length - 1 ? 0 : curr + 1
                        )
                      }
                    >
                      {i.edition}
                    </Clock>
                  ) : (
                    <button
                      className={`${css["number"]} plain`}
                      onClick={() => setEventIndex(i.edition)}
                    >
                      {i.edition}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

        <div className={css["image-container"]}>
          <div className={`${css["aspect"]} ${css["square"]}`}>
            {props.events.reverse().map((i: Event, index: number) => {
              const nConstellations = 3;
              const gridConstellation = (index % nConstellations) + 1;
              let className = `${css["constellation-" + gridConstellation]} ${
                css["images"]
              }`;

              if (index === eventIndex) className += ` ${css["selected"]}`;

              return (
                <div className={className} key={index}>
                  <div className={css["image-wrapper"]}>
                    <Image
                      src={`/images/events/${event.id}_1.png`}
                      alt={i.title}
                      width={0}
                      height={0}
                      sizes="100vw"
                      style={{ width: "100%", height: "auto" }}
                    />
                  </div>

                  <div className={css["image-wrapper"]}>
                    <Image
                      src={`/images/events/${event.id}_2.png`}
                      alt={i.title}
                      width={0}
                      height={0}
                      sizes="100vw"
                      style={{ width: "100%", height: "auto" }}
                    />
                  </div>

                  {eventIndex !== 1 && (
                    <div className={css["image-wrapper"]}>
                      <Image
                        src={`/images/events/${event.id}_3.png`}
                        alt={i.title}
                        width={0}
                        height={0}
                        sizes="100vw"
                        style={{ width: "100%", height: "auto" }}
                      />
                    </div>
                  )}

                  <div className={`${css["image-wrapper"]} ${css["title"]}`}>
                    <Image
                      src={`/images/events/${event.id}_title.png`}
                      alt={i.title}
                      width={0}
                      height={0}
                      sizes="50vw"
                      style={{ width: "50%", height: "auto" }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className={css["info"]} key={event.title}>
          <div className={css["title"]}>
            <p className="title">{event.title}</p>
            <p className="subtitle">{event.location}</p>
            <p>
              {dayjs(event.startDate).format("MMM DD")} -{" "}
              {dayjs(event.endDate).format("MMM DD")},{" "}
              {dayjs(event.endDate).format("YYYY")}
            </p>
          </div>
          <div className={css["description"]}>
            <p>{event.description}</p>
          </div>

          {/* Only show watch now button after the event has started */}
          {dayjs().isAfter(dayjs(event.startDate)) && (
            <div className={css["buttons-container"]}>
              <div className={css["buttons"]}>
                <Link href={`watch?event=${event.id}`} className="button">
                  Watch
                </Link>
                <Link href={`playlists/${event.id}`} className="button">
                  Playlist
                </Link>
              </div>
            </div>
          )}

          <div className={css["background-text"]}>
            <p>Ethereum</p>
            <p>Developer</p>
            <p>Conference</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Clock(props: any) {
  const animationEl = useRef<any>();

  useEffect(() => {
    const handler = () => {
      props.next();
    };

    animationEl.current.addEventListener("animationend", handler);

    return () => {
      // TODO: Something messed up with react 18 upgrade here (warns about "falling back to react 17 behaviour" because of some gatsby internals using old apis) - need this check - won't spend too much energy on it since we'll be moving to nextjs anyway
      if (animationEl.current) {
        animationEl.current.removeEventListener("animationend", handler);
      }
    };
  }, [props.next]);

  return (
    <div className={`${css["circle-wrap"]}`}>
      <div className={`${css["circle"]}`}>
        <div className={`${css["mask"]} ${css["full"]}`}>
          <div ref={animationEl} className={`${css["fill"]}`}></div>
        </div>
        <div className={`${css["mask"]} ${css["half"]}`}>
          <div className={`${css["fill"]}`}></div>
        </div>

        <div className={`${css["inside-circle"]}`}>
          <div>{props.children}</div>
        </div>
      </div>
    </div>
  );
}
