import React from "react";
import { PenLine, Star, MapPin, Ticket } from "lucide-react";
import { Event as EventType } from "../model";
import { format, parseISO } from "date-fns";
import cn from "classnames";
import Image from "next/image";
// @ts-ignore
import coworkingImage from "./cowork.webp";
// @ts-ignore
import ethDayImage from "./ethday.jpg";
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
    event.difficulty === "Beginner" || event.difficulty === "All Welcome"
      ? "bg-green-300"
      : event.difficulty === "Intermediate"
      ? "bg-yellow-300"
      : "bg-red-300";

  const isCoworking = event.isCoreEvent; // event.name.includes("Coworking");
  const isETHDay = event.isFairEvent; // event.name.includes("ETH Day");

  const isCoreEvent = event.isCoreEvent || event.isFairEvent;

  let eventName = event.name;

  return (
    <div
      style={{
        height: `${event.spanRows ? event.spanRows * 60 : 60}px`,
      }}
      className={cn(
        `group bg-[#f0faff] cursor-pointer`,
        "flex flex-col gap-4 border border-solid border-neutral-400 p-2 px-2 h-full shrink-0 relative rounded-lg overflow-hidden hover:border-black transition-all duration-300",
        {
          "bg-[rgb(187,232,255)] border-neutral-400 border-solid":
            isCoworking || isETHDay,
        },
        eventClassName,
        isCoreEvent && !isETHDay && !isCoworking && "bg-blue border-solid",
        selectedEvent?.id === event.id && "border-black"
      )}
      onClick={() => {
        if (event.onClick) {
          event.onClick();
        } else {
          setSelectedEvent(event);
        }
      }}
    >
      {isCoworking && (
        <div className="absolute left-[0%] top-0 right-0 bottom-0 overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-[80%] bg-gradient-to-r from-white to-transparent z-10"></div>
          <Image
            src={coworkingImage}
            alt="Coworking"
            className="w-[100%] h-full object-end position-end object-cover"
          />
        </div>
      )}

      <Dialog
        open={selectedEvent?.id === event.id}
        onOpenChange={() => setSelectedEvent(null)}
      >
        <DialogContent className="w-[auto] max-w-[1000px] max-h-[90vh] overflow-y-auto text-black">
          <DialogHeader>
            <DialogTitle>{event.name}</DialogTitle>
          </DialogHeader>
          <DialogDescription>
            <div className="flex flex-col gap-2">
              <div className="text-sm">
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
              </div>
              <div className="text-sm">{event.description}</div>
              <div className="text-sm">{event.location.text}</div>
              <div className="text-sm">{event.difficulty}</div>
              <div className="text-sm">{event.amountPeople}</div>
              <div className="text-sm">{event.organizer}</div>
            </div>
          </DialogDescription>
          <DialogFooter>
            <Button>RSVP</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isETHDay && (
        <div className="absolute left-[0%] top-0 right-0 bottom-0 overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 h-[70%] w-full bg-gradient-to-b from-white to-transparent z-10"></div>
          <Image
            src={ethDayImage}
            alt="ETH Day"
            className="w-[100%] h-full object-cover"
          />
        </div>
      )}

      <div className="flex h-full z-10">
        {/* <div className="flex flex-col mr-2 items-center shrink-0">
          <div className="text-[10px]">{startTime}</div>
          <div className="min-h-[10px] grow border-solid border-l border-l-neutral-400 self-center my-1"></div>
          <div className="text-[10px]">{endTime}</div>
        </div> */}
        <div className="flex flex-col grow justify-between items-stretch">
          <div className={cn("text-xs font-medium line-clamp-1 flex h-full")}>
            {eventName}
          </div>
          {/* <div className="text-xs text-gray-600 mt-1">{event.location.text}</div> */}

          <div className="flex justify-between">
            {isCoworking && (
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
            )}

            <div className="flex gap-2 grow shrink-0 items-end justify-end text-[9px]">
              <div
                className={`rounded text-[10px] ${difficultyClass} px-2 py-0.5 flex gap-1.5 items-center`}
              >
                {event.difficulty}
              </div>
              <div
                className={`rounded text-[10px] bg-[#bef0ff] px-2 py-0.5 flex gap-1.5 items-center`}
              >
                <Star className="text-black shrink-0" size={11} />
                {event.organizer}
              </div>
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
