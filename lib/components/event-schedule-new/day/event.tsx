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

  // const { selectedEvent, setSelectedEvent } = useCalendarStore();
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

  // Determine CSS class based on difficulty
  const difficultyClass =
    event.difficulty === "beginner" || event.difficulty === "all welcome"
      ? "bg-[#f0faff] hover:bg-[#d9e8f0] !border-[#74ACDF] border-l-[4px]"
      : event.difficulty === "intermediate"
      ? "bg-[#FFD700] hover:bg-[#FFD700] !border-[#FFD700] border-l-[4px]"
      : "bg-[#FF0000] hover:bg-[#FF0000] !border-[#FF0000] border-l-[4px]";

  const isCoworking = event.id.toString() === "23"; // event.isCoreEvent; // event.name.includes("Coworking");
  const isETHDay = event.id.toString() === "29"; // event.isFairEvent; // event.name.includes("ETH Day");

  const isCoreEvent =
    event.id.toString() === "23" || event.id.toString() === "22"; // event.isCoreEvent || event.isFairEvent;

  let eventName = event.name;

  // const difficultyColor = (() => {
  //   if (event.difficulty === "beginner" || event.difficulty === "all welcome") {
  //     return "#74ACDF";
  //   } else if (event.difficulty === "intermediate") {
  //     return "#FFD700";
  //   } else if (event.difficulty === "advanced") {
  //     return "#FF0000";
  //   }
  // })();

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

  // console.log(event);

  return (
    <div
      style={{
        // height: event.spanRows ? `minmax(120px, 100%)` : "auto"
        height: event.spanRows ? `${event.spanRows * 60}px` : "auto",
      }}
      className={cn(
        `group cursor-pointer`,
        "flex flex-col gap-4 border border-solid border-neutral-300 p-2 px-2 h-full shrink-0 relative overflow-hidden hover:border-black transition-all duration-300",
        difficultyClass,

        eventClassName
        // isCoreEvent && !isETHDay && !isCoworking && "bg-blue border-solid",
        // selectedEvent?.id === event.id && "border-black"
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
      {/* {isCoworking && (
        <div className="absolute left-[0%] top-0 right-0 bottom-0 overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-[80%] bg-gradient-to-r from-white to-transparent z-10"></div>
          <Image
            src={coworkingImage}
            alt="Coworking"
            className="w-[100%] h-full object-end position-end object-cover"
          />
        </div>
      )} */}

      {/* {isETHDay && (
        <div className="absolute left-[0%] top-0 right-0 bottom-0 overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 h-[70%] w-full bg-gradient-to-b from-white to-transparent z-10"></div>
          <Image
            src={ethDayImage}
            alt="ETH Day"
            className="w-[100%] h-full object-cover"
          />
        </div>
      )} */}

      <Dialog
        open={selectedEvent?.id === event.id}
        onOpenChange={() => setSelectedEvent(null)}
      >
        <DialogContent
          className={cn(
            "w-[auto] max-w-[1000px] min-w-[550px] max-h-[90vh] overflow-y-auto text-black border-[4px] border-solid !bg-white",
            difficultyClass
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

              <div className="text-lg font-bold">{event.name}</div>

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
                className="shrink-0  mt-4 self-start"
              >
                Visit Website
                <ArrowUpRight className="w-4 h-4 mb-0.5" />
              </VoxelButton>

              <div className="flex gap-2 justify-between mt-4">
                {event.event_type && (
                  <div className="text-sm">
                    <TypeTag category={event.event_type} />
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
            {isCoreEvent && (
              <Image
                src={DevconnectCubeLogo}
                alt="Devconnect Cube"
                className="w-[26px] object-contain"
              />
            )}
            <div className="flex flex-col">
              {eventName}
              <div className="text-xs text-gray-600">{eventTimeString}</div>
            </div>
          </div>

          <div className="line-clamp-1 mt-2 text-xs uppercase font-medium">
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
              <TypeTag category={event.event_type} size="sm" />

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
