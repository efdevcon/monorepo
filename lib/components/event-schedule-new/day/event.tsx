import React from "react";
import {
  PenLine,
  Star,
  MapPin,
  Ticket,
  Users,
  ArrowUpRight,
} from "lucide-react";
import { Event as EventType } from "../model";
import { format, parseISO } from "date-fns";
import cn from "classnames";
import Image from "next/image";
// @ts-ignore
import coworkingImage from "./cowork.webp";
// @ts-ignore
import ethDayImage from "./ethday.jpg";
import DevconnectCubeLogo from "../images/cube-logo.png";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "lib/components/ui/dialog";
import { Button } from "lib/components/button";
import { Separator } from "lib/components/ui/separator";
import { useDraggableLink } from "lib/hooks/useDraggableLink";
import { DifficultyTag, TypeTag } from "../calendar.components";
import VoxelButton from "lib/components/voxel-button/button";

type EventProps = {
  event: EventType;
  duration: number;
  className?: string;
  selectedEvent: EventType | null;
  setSelectedEvent: (event: EventType | null) => void;
};
const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};

const Event: React.FC<EventProps> = ({
  event,
  duration,
  className,
  selectedEvent,
  setSelectedEvent,
}) => {
  const userIsLoggedIn = true;
  const draggableLink = useDraggableLink();

  // Get the first timeblock for display
  const timeblock = event.timeblocks[0];
  const eventClassName = className || "";

  // Format the start and end times
  const formatTime = (isoString: string) => {
    return format(parseISO(isoString), "h:mm a");
  };

  const startTime = formatTime(timeblock.start);
  const endTime = formatTime(timeblock.end);
  const durationString = `${startTime} - ${endTime}`;

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

  const isCoreEvent =
    event.id.toString() === "23" || event.id.toString() === "29";

  let eventName = event.name;

  const eventStartTime = format(parseISO(event.timeblocks[0].start), "HH:mm");
  const eventEndTime = format(parseISO(event.timeblocks[0].end), "HH:mm");
  const eventStartDate = format(
    parseISO(event.timeblocks[0].start),
    "MMM dd"
  ).toUpperCase();
  const eventEndDate = format(
    parseISO(event.timeblocks[0].end),
    "MMM dd"
  ).toUpperCase();

  // Check if start and end are on the same day
  const isSameDay = eventStartDate === eventEndDate;
  const eventTimeString = isSameDay
    ? `${eventStartTime}–${eventEndTime}, ${eventStartDate}`
    : `${eventStartTime}, ${eventStartDate} – ${eventEndTime}, ${eventEndDate}`;

  return (
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
      {...draggableLink}
      onClick={(e) => {
        const result = draggableLink.onClick(e);

        if (!result) return;

        if (event.onClick) {
          event.onClick();
        } else {
          setSelectedEvent(event);
        }
      }}
    >
      <Dialog
        open={selectedEvent?.id === event.id}
        onOpenChange={() => setSelectedEvent(null)}
      >
        <DialogContent
          className={cn(
            "max-w-[95vw] w-[450px] max-h-[90vh] overflow-y-auto text-black border-[4px] border-solid !bg-white z-[10000000]",
            typeClass
          )}
        >
          <Image
            src={coworkingImage}
            alt={event.name}
            className="w-full h-full object-cover aspect-[390/160]"
          />

          {/* <DialogHeader>
          
            <DialogTitle>{event.name}</DialogTitle>
          </DialogHeader> */}
          <div className="p-4 pt-0" draggable="false">
            <div className="flex flex-col text-[rgba(36,36,54,1)]">
              <div className="text-sm text-[rgba(94,144,189,1)] uppercase font-secondary">
                {isCoreEvent ? "Core Event" : "Community Event"} by{" "}
                {event.organizer}
              </div>

              <DialogTitle asChild>
                <div className="text-lg font-bold tracking-normal leading-tight">
                  {event.name}
                </div>
              </DialogTitle>
              {/* <div className="text-lg font-bold">{event.name}</div> */}

              <div className="text-sm">{eventTimeString}</div>

              <Separator className="my-2" />

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

              {/* <div className="text-sm">
                {event.timeblocks.map((timeblock, index) => (
                  <div
                    key={index}
                    className="mb-2 border-b last:border-b-0 pb-2"
                  >
                    <div className="font-medium text-gray-700">
                      {formatDate(timeblock.start)}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span>
                        {formatTime(timeblock.start)} -{" "}
                        {formatTime(timeblock.end)}
                      </span>
                      {timeblock.name && (
                        <span className="text-gray-600">
                          • {timeblock.name}
                        </span>
                      )}
                    </div>
                    {timeblock.location && (
                      <div className="text-gray-500 text-xs mt-0.5">
                        📍 {timeblock.location}
                      </div>
                    )}
                  </div>
                ))}
              </div> */}

              <div className="text-sm">{event.description}</div>

              <VoxelButton
                color="blue-1"
                size="sm"
                fill
                className="shrink-0  mt-2 self-start"
              >
                Visit Website
                <ArrowUpRight className="w-4 h-4 mb-0.5" />
              </VoxelButton>

              <Separator className="my-3" />

              <div className="flex gap-2 justify-between">
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

              {/* <div className="text-sm">{event.organizer}</div> */}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex h-full z-10">
        {/* <div className="flex flex-col mr-2 items-center shrink-0">
          <div className="text-[10px]">{startTime}</div>
          <div className="min-h-[10px] grow border-solid border-l border-l-neutral-400 self-center my-1"></div>
          <div className="text-[10px]">{endTime}</div>
        </div> */}
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
            <div className="flex flex-col">
              {eventName}
              <div className="text-xs text-gray-600">{eventTimeString}</div>
            </div>
          </div>

          <div className="line-clamp-1 mt-2 text-xs uppercase font-medium grow flex items-end">
            {event.organizer}
          </div>

          {/* <div className="text-xs text-gray-600 mt-1">{event.location.text}</div> */}

          <Separator className="my-1.5" />

          <div
            className={cn("flex gap-4 justify-end", {
              "justify-between": !isCoworking,
            })}
          >
            {isCoworking && (
              <a
                href="https://tickets.devconnect.org"
                target="_blank"
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
  );
};

export default Event;
