import React, { useState, useEffect, useRef } from "react";
import { MapPin, Ticket, Users, ArrowUpRight, X } from "lucide-react";
import { Event as EventType } from "../model";
import moment from "moment";
// import { format, parseISO } from "date-fns";
// import { UTCDate } from "@date-fns/utc";
import cn from "classnames";
import Image from "next/image";
// @ts-ignore
import coworkingImage from "./cowork.webp";
// @ts-ignore
import ethDayImage from "./ethday.jpg";
import Link from "lib/components/link/Link";
import DevconnectCubeLogo from "../images/cube-logo.png";
import { Dialog, DialogContent, DialogTitle } from "lib/components/ui/dialog";
import { Button } from "lib/components/button";
import { Separator } from "lib/components/ui/separator";
import { useDraggableLink } from "lib/hooks/useDraggableLink";
import { DifficultyTag, TypeTag } from "../calendar.components";
import VoxelButton from "lib/components/voxel-button/button";
import { convert } from "html-to-text";

type EventProps = {
  event: EventType;
  duration: number;
  className?: string;
  selectedEvent: EventType | null;
  setSelectedEvent: (event: EventType | null) => void;
};

const formatTime = (isoString: string) => {
  return moment.utc(isoString).format("HH:mm");
};

const computeEventTimeString = (event: EventType): string[] => {
  // the "> 1" is on purpose
  const hasTimeblocks = event.timeblocks.length > 1;

  let formattedTimeblocks: string[] = [];

  if (!hasTimeblocks) {
    const startDate = moment.utc(event.timeblocks[0].start);
    const endDate = moment.utc(event.timeblocks[0].end);
    const startDateFormatted = startDate.format("MMM DD");
    const endDateFormatted = endDate.format("MMM DD");
    const startTime = formatTime(event.timeblocks[0].start);
    const endTime = formatTime(event.timeblocks[0].end);
    const isMultiDay =
      startDate.format("yyyy-MM-dd") !== endDate.format("yyyy-MM-dd");

    if (isMultiDay) {
      formattedTimeblocks = [
        `${startDateFormatted} — ${endDateFormatted}, ${startTime} to ${endTime} every day`,
      ];
    } else {
      formattedTimeblocks = [
        `${startDateFormatted}, ${startTime} to ${endTime}`,
      ];
    }
  } else {
    formattedTimeblocks = event.timeblocks
      .slice()
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
      .map((timeblock) => {
        const startDate = moment.utc(timeblock.start).format("MMM DD");
        const endDate = moment.utc(timeblock.end).format("MMM DD");
        const startTime = formatTime(timeblock.start);
        const endTime = formatTime(timeblock.end);

        return `${startDate}, ${startTime} to ${endTime}`; // , ${startTime} — ${endTime}`;
      });
  }

  return formattedTimeblocks.map((timeblock) => {
    if (!event.showTimeOfDay) {
      return timeblock.split(", ")[0];
    }

    return timeblock;
  });
};

const Event: React.FC<EventProps> = ({
  event,
  duration,
  className,
  selectedEvent,
  setSelectedEvent,
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const imageRef = useRef<any>(null);

  // Reset image loaded state when imageUrl changes
  useEffect(() => {
    setImageLoaded(false);
  }, [event.imageUrl]);

  // Check if image is already loaded (e.g., cached)
  useEffect(() => {
    const img = imageRef.current;
    if (img?.complete && img?.naturalWidth > 0) {
      setImageLoaded(true);
    }
  }, [event.imageUrl]);

  const userIsLoggedIn = true;
  const draggableLink1 = useDraggableLink();
  const eventClassName = className || "";

  // Type of event and resulting customization class
  const typeClass = (() => {
    const isCoreEvent = event.isCoreEvent;
    const isCowork = event.id.toString() === "23";
    const isCommunityEvent = !isCoreEvent;

    if (isCowork) {
      return "bg-[rgba(255,133,166,0.05)] hover:bg-[rgba(255,133,166,0.1)] !border-[rgba(255,133,166,1)] border-l-[4px]";
    } else if (isCoreEvent) {
      return "bg-[rgba(116,172,223,0.05)] hover:bg-[rgba(116,172,223,0.1)] !border-[rgba(116,172,223,1)] border-l-[4px]";
    } else if (isCommunityEvent) {
      return "bg-[rgba(136,85,204,0.05)] hover:bg-[rgba(136,85,204,0.1)] !border-[rgba(136,85,204,1)] border-l-[4px]";
    }

    return "";
  })();

  const isCoworking = event.id.toString() === "23";
  const isETHDay = event.id.toString() === "29";
  const isCoreEvent = event.isCoreEvent;

  let eventName = event.name;

  const timeOfDay = computeEventTimeString(event);

  return (
    <>
      <Dialog open={selectedEvent?.id === event.id}>
        <DialogContent
          className={cn(
            "max-w-[95vw] w-[475px] max-h-[90vh] overflow-y-auto text-black border-[4px] border-solid !bg-white z-[10000000] gap-0 flex flex-col shrink-0",
            typeClass
          )}
          onInteractOutside={(e) => {
            e.stopPropagation();
            e.preventDefault();
            setSelectedEvent(null);
          }}
        >
          <div className="absolute top-4 right-4 z-10">
            <div
              className="bg-white p-1.5 cursor-pointer border border-solid border-neutral-400"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedEvent(null);
              }}
            >
              <X className="w-3.5 h-3.5" />
            </div>
          </div>

          {isCoworking && (
            <div className="aspect-[390/160] relative w-full overflow-hidden shrink-0">
              <Image
                src={coworkingImage}
                alt={event.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {event.imageUrl && imageLoaded && (
            <div className="aspect-[390/160] relative w-full overflow-hidden shrink-0">
              <img
                src={event.imageUrl}
                alt={event.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Load and see if it errors out prior to showing the image */}
          {event.imageUrl && (
            <img
              ref={imageRef}
              src={event.imageUrl}
              alt={event.name}
              className="hidden"
              onLoad={() => {
                setImageLoaded(true);
              }}
              onError={() => {
                setImageLoaded(false);
              }}
            />
          )}

          <div className="p-4 shrink-0">
            <div className="flex flex-col text-[rgba(36,36,54,1)]">
              <div className="text-sm text-[rgba(94,144,189,1)] uppercase font-secondary">
                <div>{isCoreEvent ? "Core Event" : "Community Event"}</div>
              </div>

              <DialogTitle asChild>
                <div className="text-xl font-bold tracking-normal leading-tight mt-1">
                  {event.name}
                </div>
              </DialogTitle>

              {event.organizer && (
                <div className="text-xs">hosted by {event.organizer}</div>
              )}

              <div className="flex flex-col mt-2 w-full">
                {timeOfDay.map((time, index) => (
                  <div key={index} className="text-xs text-gray-600">
                    {time}
                  </div>
                ))}
              </div>

              <Separator className="my-3" />

              <div className="text-sm flex gap-2 mb-2">
                <div className="flex justify-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {typeof event.location === "string"
                    ? event.location
                    : event.location.text}
                </div>
                {event.amountPeople && (
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3" /> {event.amountPeople}
                  </div>
                )}
              </div>

              <div className="text-sm">{convert(event.description)}</div>

              {event.eventLink !== "https://devconnect.org/calendar" && (
                <Link href={event.eventLink} className="self-start">
                  <VoxelButton
                    color="blue-1"
                    size="sm"
                    fill
                    className="shrink-0  mt-2 self-start"
                  >
                    Visit Site
                    <ArrowUpRight className="w-4 h-4 mb-0.5" />
                  </VoxelButton>
                </Link>
              )}

              <Separator className="my-3" />

              <div className="flex gap-2 justify-between shrink-0">
                {event.eventType && (
                  <div className="text-sm">
                    <TypeTag category={event.eventType} />
                  </div>
                )}

                {event.difficulty && (
                  <div className="text-sm">
                    <DifficultyTag difficulty={event.difficulty} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div
        style={{
          // height: event.spanRows ? `minmax(120px, 100%)` : "auto"
          height: event.spanRows ? `${event.spanRows * 60}px` : "100%",
        }}
        className={cn(
          `group cursor-pointer`,
          "flex flex-col gap-4 border border-solid border-neutral-300 p-2 px-2 h-full shrink-0 relative overflow-hidden hover:border-black transition-all duration-300",
          typeClass,
          eventClassName
        )}
        {...draggableLink1}
        onClick={(e) => {
          const result = draggableLink1.onClick(e);

          if (!result) return;

          if (event.onClick) {
            event.onClick();
          } else if (!selectedEvent) {
            console.log("setting selected event");
            setSelectedEvent(event);
          }
        }}
      >
        <div className="flex h-full z-10">
          <div className="flex flex-col grow justify-between items-stretch">
            <div
              className={cn(
                "text-sm font-medium line-clamp-1 shrink-0 flex items-center gap-2"
              )}
            >
              {isCoworking && (
                <Image
                  src={DevconnectCubeLogo}
                  alt="Devconnect Cube"
                  className="w-[26px] object-contain"
                />
              )}
              {isETHDay && (
                <Image
                  src={ethDayImage}
                  alt="ETH Day"
                  className="w-[26px] object-contain"
                />
              )}
              <div className="flex flex-col w-full">
                {eventName}
                <div className="flex gap-4 justify-between w-full">
                  {timeOfDay.map((time, index) => (
                    <div key={index} className="text-xs text-gray-600">
                      {time}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="line-clamp-1 mt-2 text-xs uppercase font-medium grow flex items-end">
              {event.organizer}
            </div>

            <Separator className="my-1.5" />

            <div
              className={cn("flex gap-4 justify-end", {
                "justify-between": !isCoworking,
              })}
            >
              {isCoworking && (
                <a
                  href="https://tickets.devconnect.org/?mtm_campaign=devconnect.org&mtm_source=website"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  <Button
                    size="sm"
                    color="blue-1"
                    fill
                    className="shrink-0 px-4 py-2 flex text-xs gap-2 items-center"
                  >
                    <Ticket className="shrink-0" size={16} />
                    Tickets Available Now
                    <Ticket className="shrink-0" size={16} />
                  </Button>
                </a>
              )}

              <div
                className={cn(
                  "flex gap-2 grow items-end justify-between text-[9px]",
                  { "!justify-end": isCoworking }
                )}
              >
                <TypeTag category={event.eventType} size="sm" />

                {/* {event.organizer && (
                <div
                  className={`rounded text-[10px] bg-[#bef0ff] px-2 py-0.5 flex gap-1.5 items-center`}
                >
                  <Star className="text-black hidden md:block" size={11} />
                  <div className="line-clamp-1">{event.organizer}</div>
                </div>
              )} */}

                <DifficultyTag difficulty={event.difficulty} size="sm" />

                {/* <div
                className={`rounded text-[10px] px-2 bg-[#bef0ff] py-0.5 flex gap-1.5 items-center`}
              >
                {event.amountPeople}
              </div> */}
                {/* <div className="rounded text-[10px] bg-[#bef0ff] px-2 py-0.5 flex gap-1 items-center justify-end">
              <Star className="text-black shrink-0" size={11} />
              RSVP
            </div> */}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Event;
