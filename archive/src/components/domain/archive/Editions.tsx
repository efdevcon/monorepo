"use client";

import React, { useState } from "react";
import { HorizontalScroller } from "@/components/common/horizontal-scroller";
import { Button } from "@/components/common/button";
import { Event } from "@/types";
import Image from "next/image";
import OnDemandVideoIcon from "@/assets/icons/on_demand_video.svg";
import css from "./editions.module.scss";
import dayjs from "dayjs";

interface Props {
  className?: string;
  events: Event[];
}

const Clock = (props: any) => {
  const animationEl = React.useRef<any>();

  React.useEffect(() => {
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
};

export const Editions = (props: Props) => {
  const [selectedEditionIndex, setSelectedEditionIndex] = useState(0);
  let className = `padding-bottom ${css["container"]}`;
  if (props.className) {
    className += ` ${props.className}`;
  }

  const selectedEdition = props.events[selectedEditionIndex];

  return (
    <div className="section">
      <div className="content">
        <h2
          className={`bold font-xl font-primary padding-top border-top padding-bottom ${css["title"]}`}
        >
          All Devcons
        </h2>

        <div className={className}>
          <div className={css["numbers"]}>
            {props.events.map((i: any, index: number) => {
              const selected = i.edition === selectedEdition.edition;
              let className = css["edition"];

              if (selected) className += ` ${css["selected"]}`;

              return (
                <div key={`edition-numbering-${index}`} className={className}>
                  <p className={css["conference"]}>Devcon Editions</p>

                  {selected ? (
                    <Clock
                      next={() =>
                        setSelectedEditionIndex((curr) =>
                          curr === props.events.length - 1 ? 0 : curr + 1
                        )
                      }
                    >
                      {i.edition}
                    </Clock>
                  ) : (
                    <button
                      className={`${css["number"]} plain`}
                      onClick={() => setSelectedEditionIndex(index)}
                    >
                      {i.edition}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className={css["image-container"]}>
            <div className="aspect square">
              {props.events.map((i: any, index: number) => {
                const nConstellations = 3;
                const gridConstellation = (index % nConstellations) + 1;
                let className = `${css["constellation-" + gridConstellation]} ${
                  css["images"]
                }`;

                if (index === selectedEditionIndex)
                  className += ` ${css["selected"]}`;

                return (
                  <div key={`edition-images-${index}`} className={className}>
                    <div className={css["image-wrapper"]}>
                      <Image
                        src={`/images/events/${i.id}_1.png`}
                        alt={i.title}
                        width={0}
                        height={0}
                        sizes="100vw"
                        style={{ width: "100%", height: "auto" }}
                      />
                    </div>

                    <div className={css["image-wrapper"]}>
                      <Image
                        src={`/images/events/${i.id}_2.png`}
                        alt={i.title}
                        width={0}
                        height={0}
                        sizes="100vw"
                        style={{ width: "100%", height: "auto" }}
                      />
                    </div>

                    {i.id !== "devcon-1" && (
                      <div className={css["image-wrapper"]}>
                        <Image
                          src={`/images/events/${i.id}_3.png`}
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
                        src={`/images/events/${i.id}_title.png`}
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

          <div className={css["info"]} key={selectedEdition.edition}>
            <div className={css["title"]}>
              <p className="title">{selectedEdition.title}</p>
              <p className="subtitle">{selectedEdition.location}</p>
              {selectedEdition.startDate && selectedEdition.endDate ? (
                <p>
                  {dayjs(selectedEdition.startDate).format("MMM DD")} -{" "}
                  {dayjs(selectedEdition.endDate).format("MMM DD")},{" "}
                  {dayjs(selectedEdition.endDate).format("YYYY")}
                </p>
              ) : (
                <p>2022 </p>
              )}
              {selectedEdition.title === "Devcon VI" && (
                <p>(Devcon Week: Oct 7 - Oct 16, 2022)</p>
              )}
            </div>
            <div className={css["description"]}>
              <p>{selectedEdition.description}</p>
            </div>
            <div className={css["buttons-container"]}>
              <div className={css["buttons"]}>
                {/* Only show watch now button after the event has started */}
                {dayjs().unix() > dayjs(selectedEdition.startDate).unix() && (
                  <Button
                    href={`/watch?event=devcon-${selectedEdition.edition}`}
                    className={`${css["button"]} red ghost sm`}
                  >
                    Watch <OnDemandVideoIcon />
                  </Button>
                )}
              </div>
            </div>
            <div className={css["background-text"]}>
              <p>Ethereum</p>
              <p>Developer</p>
              <p>Conference</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
