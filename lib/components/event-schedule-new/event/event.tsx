import React, { useState, useEffect, useRef } from "react";
import {
  MapPin,
  Ticket,
  Users,
  ArrowUpRight,
  X,
  UsersRound,
  CalendarArrowUp,
  Heart,
  Share2,
  Check,
} from "lucide-react";
import { Event as EventType } from "../model";
import { getProgramming, Programming } from "./programming";
import { customUrlTransforms } from "../index";
const confetti = require("canvas-confetti");
import moment from "moment";
// import { format, parseISO } from "date-fns";
// import { UTCDate } from "@date-fns/utc";
import cn from "classnames";
import Image from "next/image";
import Link from "lib/components/link/Link";
// @ts-ignore
import coworkingImage from "./cowork.webp";
// @ts-ignore
import ethDayImage from "./eth-day-bg.png";
import ethDayLogo from "./eth-day-logo.png";
import ethDayDialogImage from "./eth-day-updated.png";
import DevconnectCubeLogo from "../images/cube-logo.png";
import { Dialog, DialogContent, DialogTitle } from "lib/components/ui/dialog";
import { Button } from "lib/components/button";
import { Separator } from "lib/components/ui/separator";
import { useDraggableLink } from "lib/hooks/useDraggableLink";
import { DifficultyTag, TypeTag } from "../calendar.components";
import ZupassConnection from "../zupass/zupass";
import { eventShops } from "../zupass/event-shops-list";
import VoxelButton from "lib/components/voxel-button/button";
import { convert } from "html-to-text";
import XIcon from "lib/assets/icons/x.svg";
import FarcasterIcon from "lib/assets/icons/farcaster.svg";
import InstagramIcon from "lib/assets/icons/instagram.svg";
import { TicketTag, SoldOutTag } from "../calendar.components";
import { useIsMobile } from "lib/hooks/useIsMobile";
import { toast } from "sonner";

type EventProps = {
  compact?: boolean;
  event: EventType;
  isDialog?: boolean;
  className?: string;
  selectedEvent: EventType | null;
  setSelectedEvent: (event: EventType | null) => void;
  setExports: (exports: EventType[] | null) => void;
  toggleFavoriteEvent?: (eventId: string) => void;
  favoriteEvents?: string[];
};

const formatTime = (isoString: string) => {
  return moment.utc(isoString).format("HH:mm");
};

const isMultiDayEvent = (event: EventType) => {
  const startDate = moment.utc(event.timeblocks[0].start);
  const endDate = moment.utc(event.timeblocks[0].end);
  return startDate.format("yyyy-MM-dd") !== endDate.format("yyyy-MM-dd");
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

        return `${startDate}, ${startTime} to ${endTime}, ${startTime} — ${endTime}`;
      });
  }

  return formattedTimeblocks.map((timeblock) => {
    if (!event.showTimeOfDay) {
      return timeblock.split(", ")[0];
    }

    return timeblock;
  });
};

const FavoriteEvent = ({
  event,
  isDialog,
  toggleFavoriteEvent,
  favoriteEvents,
}: {
  event: EventType;
  isDialog?: boolean;
  toggleFavoriteEvent: (eventId: string) => void;
  favoriteEvents?: string[];
}) => {
  // const { account } = useAccountContext();
  const isFavorited = favoriteEvents?.some(
    (eventId) => eventId.toString() === event.id.toString()
  );

  return (
    <div
      className="flex justify-center cursor-pointer relative shrink-0 hover:scale-110 transition-all duration-300 text-slate-600"
      onClick={(e) => {
        e.stopPropagation();

        toggleFavoriteEvent(event.id);
      }}
    >
      {/* {isFavorited && (
        <div className="absolute top-0 right-0 w-4 h-4 bg-white rounded-full flex items-center justify-center">
          <Check className="w-3 h-3 text-slate-900" />
        </div>
      )} */}
      <Heart
        fill={isFavorited ? "#ce5154" : "none"}
        className={cn(
          "w-4 h-4 mt-0.5 text-slate-500 hover:text-slate-900",
          isDialog && "w-5 h-5",
          isFavorited && "!text-[#ce5154]"
        )}
      />
    </div>
  );
};

const ShareEvent = ({
  event,
  isDialog,
}: {
  event: EventType;
  isDialog?: boolean;
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();

    // Determine the event ID to use in the URL
    let eventId = event.rkey || event.id;

    const transformMatch = customUrlTransforms.find(
      (transform) => transform.to === event.id.toString()
    );

    if (transformMatch) {
      eventId = transformMatch.from;
    }

    // Build the shareable URL
    const url = `${window.location.origin}${window.location.pathname}?event=${eventId}`;

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
      toast.error("Failed to copy to clipboard");
    }
  };

  return (
    <div
      className="flex items-center justify-center cursor-pointer relative shrink-0 hover:scale-110 transition-all duration-300 text-slate-600"
      onClick={handleCopy}
    >
      {copied ? (
        <Check className={isDialog ? "w-5 h-5" : "w-4 h-4 mt-0.5"} />
      ) : (
        <Share2 className={isDialog ? "w-5 h-5" : "w-4 h-4 mt-0.5"} />
      )}
    </div>
  );
};

const ExportEvent = ({
  event,
  isDialog,
  setExports,
}: {
  event: EventType;
  isDialog?: boolean;
  setExports: (exports: EventType[] | null) => void;
}) => {
  return (
    <div
      className="flex items-center justify-center cursor-pointer relative shrink-0 hover:scale-110 transition-all duration-300 text-slate-600"
      onClick={() => {
        setExports([event]);
      }}
    >
      <CalendarArrowUp className={isDialog ? "w-5 h-5" : "w-4 h-4 mt-0.5"} />
    </div>
  );
};

function Event({
  compact,
  event,
  isDialog,
  className,
  selectedEvent,
  setSelectedEvent,
  setExports,
  toggleFavoriteEvent,
  favoriteEvents,
}: EventProps): React.JSX.Element {
  const [showMobileProgramming, setShowMobileProgramming] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const imageRef = useRef<any>(null);
  const isMobile = useIsMobile(768);

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
    const isETHDay = event.id.toString() === "84";

    if (isCowork || isETHDay) {
      return "bg-[rgba(255,133,166,0.05)] hover:bg-[rgba(255,133,166,0.1)] !border-[rgba(255,133,166,1)] border-l-[4px]";
    } else if (isETHDay) {
      // Not used atm looks cool though
      return "bg-gradient-to-br from-[rgba(129,135,194,0.2)] via-[rgba(141,202,239,0.2)] via-[rgba(249,178,151,0.2)] to-[rgba(245,166,200,0.2)] !border-[rgba(255,133,166,1)] border-l-[4px]";
    } else if (isCoreEvent) {
      return "bg-[rgba(116,172,223,0.05)] hover:bg-[rgba(116,172,223,0.1)] !border-[rgba(116,172,223,1)] border-l-[4px]";
    } else if (isCommunityEvent) {
      return "bg-[rgba(136,85,204,0.05)] hover:bg-[rgba(136,85,204,0.1)] !border-[rgba(136,85,204,1)] border-l-[4px]";
    }

    return "";
  })();

  const isCoworking = event.id.toString() === "23";
  const isETHDay = event.id.toString() === "84";
  const isCoreEvent = event.isCoreEvent;

  const dialogOpen = selectedEvent?.id === event.id;

  useEffect(() => {
    if (isETHDay && dialogOpen && !isMobile) {
      // Wait for next render cycle for dialog to be in DOM
      const timeoutId = setTimeout(() => {
        const dialogElement = document.querySelector('[role="dialog"]');

        if (dialogElement) {
          // Create a custom confetti instance that renders on a specific z-index
          const myConfetti = confetti.create(undefined, {
            resize: true,
            useWorker: true,
          });

          // ETH logo SVG path
          const ethShape = confetti.default.shapeFromPath({
            path: "M 269.9 325.2 L 0 447.9 L 269.9 607.5 L 540 447.9 Z M 0.1 447.8 L 269.9 607.4 L 269.9 0 Z M 270 0 L 270 607.4 L 539.9 447.8 Z M 0 499 L 269.9 879.4 L 269.9 658.5 Z M 269.9 658.5 L 269.9 879.4 L 540 499 Z",
            matrix: [0.02, 0, 0, 0.02, -5.4, -8.8], // Scale down to fit confetti size
          });

          // Fire confetti from left bottom corner
          myConfetti({
            particleCount: 120, // Fewer particles
            angle: 70, // Shoot straight up
            spread: 45,
            startVelocity: 115, // Faster velocity for more height
            gravity: 1.2, // Normal fall speed
            drift: 0, // No drift for cleaner look
            ticks: 250, // Still last longer
            origin: { x: 0, y: 1 }, // Bottom left corner
            shapes: [ethShape],
            colors: [
              "#5C5F8B", // Purple/indigo
              "#7AC7E3", // Light blue
              "#F7B68C", // Peach/orange
              "#ff86a6", // Pink/magenta
              // "#ffffff", // White
            ],
            scalar: 1.8, // Slightly smaller but still visible
            flat: false, // Keep 3D rotation
            spin: { min: -5, max: 5 }, // Moderate spin
            zIndex: 10000000,
            disableForReducedMotion: true,
          });

          myConfetti({
            particleCount: 120, // Fewer particles
            angle: 90, // Shoot straight up
            spread: 150,
            startVelocity: 50, // Faster velocity for more height
            gravity: 1.2, // Normal fall speed
            drift: 0, // No drift for cleaner look
            ticks: 250, // Still last longer
            origin: { x: 0.5, y: 1 }, // Bottom left corner
            shapes: [ethShape],
            colors: [
              "#5C5F8B", // Purple/indigo
              "#7AC7E3", // Light blue
              "#F7B68C", // Peach/orange
              "#ff86a6", // Pink/magenta
              // "#ffffff", // White
            ],
            scalar: 1.8, // Slightly smaller but still visible
            flat: false, // Keep 3D rotation
            spin: { min: -5, max: 5 }, // Moderate spin
            zIndex: 10000000,
            disableForReducedMotion: true,
          });

          // Fire confetti from right bottom corner
          myConfetti({
            particleCount: 120, // Fewer particles
            angle: 110, // Shoot at angle
            spread: 45,
            startVelocity: 115, // Faster velocity for more height
            gravity: 1.2, // Normal fall speed
            drift: 0, // No drift for cleaner look
            ticks: 250, // Still last longer
            origin: { x: 1, y: 1 }, // Bottom right corner
            shapes: [ethShape],
            colors: [
              "#5C5F8B", // Purple/indigo
              "#7AC7E3", // Light blue
              "#F7B68C", // Peach/orange
              "#ff86a6", // Pink/magenta
              // "#ffffff", // White
            ],
            scalar: 1.8, // Slightly smaller but still visible
            flat: false, // Keep 3D rotation
            spin: { min: -10, max: 10 }, // Moderate spin
            zIndex: 10000000,
            disableForReducedMotion: true,
          });
        }
      }, 100); // Wait 100ms for dialog to render

      // Cleanup timeout on unmount
      return () => clearTimeout(timeoutId);
    }
  }, [isETHDay, dialogOpen, isMobile]);

  let eventName = event.name;

  const timeOfDay = computeEventTimeString(event);
  const isMultiDay = isMultiDayEvent(event);
  const programming = getProgramming(event);

  const showVisitSite =
    event.eventLink !== "https://devconnect.org/calendar" &&
    event.eventLink !== event.ticketsUrl;
  const showBuyTickets = event.ticketsUrl;
  const showProgrammingButton = programming && !showMobileProgramming;
  const showTicketTag = event.ticketsAvailable || event.isCoreEvent;
  const isGated = eventShops.some(
    (shop) => shop.supabase_id === event.id.toString()
  );

  return (
    <>
      {isDialog && (
        <Dialog open>
          <DialogContent
            data-dialog-content
            className={cn(
              "max-w-[95vw] w-[475px] max-h-[90vh] overflow-y-auto text-black border-[4px] border-solid !bg-white z-[9998] gap-0 flex flex-col shrink-0",
              typeClass,
              isETHDay || isCoworking ? "lg:w-[950px]" : ""
            )}
            onInteractOutside={(e) => {
              console.log("onInteractOutside");

              // If the zupass dialog is open, don't close the event dialog
              const zupassOpen = document.querySelector(".parcnet-dialog");

              const nestedDialogs =
                document.querySelectorAll(".dialog-overlay").length > 1;

              if (zupassOpen || nestedDialogs) {
                return;
              }

              e.stopPropagation();
              e.preventDefault();

              if (selectedEvent?.id === event.id) {
                setSelectedEvent(null);
                setShowMobileProgramming(false);
              }
            }}
          >
            <div className="absolute top-4 right-4 z-10">
              <div
                className="bg-white p-1.5 cursor-pointer border border-solid border-neutral-400"
                onClick={(e) => {
                  e.stopPropagation();

                  if (showMobileProgramming) {
                    setShowMobileProgramming(false);
                  } else {
                    setSelectedEvent(null);
                  }
                }}
              >
                <X className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className={cn("flex flex-col", programming && "lg:flex-row")}>
              <div className="flex flex-col">
                {isCoworking && (
                  <div className="aspect-[390/160] relative w-full overflow-hidden shrink-0">
                    <Image
                      src={coworkingImage}
                      alt={event.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {isETHDay && (
                  <div className="aspect-[390/160] relative w-full overflow-hidden shrink-0">
                    <Image
                      src={ethDayDialogImage}
                      alt={event.name}
                      className="w-full h-full object-cover object-left"
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
                    <div className="flex items-center justify-between gap-2">
                      <div
                        className={cn(
                          "text-sm font-medium uppercase font-secondary text-[rgba(136,85,204,1)]",
                          {
                            "!text-[rgba(94,144,189,1)]":
                              isCoreEvent && !isETHDay && !isCoworking,
                          },
                          { "!text-[#FF85A6]": isETHDay || isCoworking }
                        )}
                      >
                        <div>
                          {isETHDay || isCoworking
                            ? "EWF & COWORK"
                            : isCoreEvent
                            ? "Core Event"
                            : "Community Event"}
                        </div>
                      </div>
                    </div>

                    <DialogTitle asChild>
                      <div className="text-xl font-bold tracking-normal leading-tight mt-1">
                        {event.name}
                      </div>
                    </DialogTitle>

                    {event.organizer && (
                      <div className="text-xs">hosted by {event.organizer}</div>
                    )}

                    <div className="flex items-center gap-2">
                      <div className="flex flex-col mt-2 w-full">
                        {timeOfDay.map((time, index) => (
                          <div
                            key={index}
                            className="text-sm text-gray-600 font-medium"
                          >
                            {time}
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center gap-3 mr-2">
                        <ShareEvent event={event} isDialog />
                        <ExportEvent
                          event={event}
                          isDialog
                          setExports={setExports}
                        />
                        {toggleFavoriteEvent && (
                          <FavoriteEvent
                            event={event}
                            isDialog
                            toggleFavoriteEvent={toggleFavoriteEvent}
                            favoriteEvents={favoriteEvents}
                          />
                        )}
                      </div>
                    </div>

                    <Separator className="my-3" />

                    <div className="text-sm flex gap-4 mb-2">
                      <div className="flex justify-center gap-1.5 items-center font-medium shrink-0">
                        <MapPin className="w-4 h-4 mb-0.5" />
                        {typeof event.location === "string"
                          ? event.location
                          : event.location.text}
                      </div>
                      {event.amountPeople && !isETHDay && (
                        <div className="flex items-center gap-1.5 font-medium">
                          <Users className="w-4 h-4 mb-0.5" />{" "}
                          {event.amountPeople}
                        </div>
                      )}
                      {isETHDay && (
                        <div className="flex items-center gap-4 grow">
                          <div className="flex items-center  gap-1.5 font-semibold shrink-0">
                            <Users className="w-4 h-4 mb-0.5" /> 3000
                          </div>
                          <div className="flex justify-end grow">
                            <div className="p-1.5 px-3 bg-[#FFEBF0] text-xs font-medium">
                              Limited capacity - first come, first serve
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="text-sm mt-1">
                      {convert(event.description)}
                    </div>

                    <div className="flex justify-between items-center gap-2 flex-wrap">
                      <div className="flex gap-2 items-center flex-wrap">
                        {showVisitSite && (
                          <Link href={event.eventLink} className="self-start">
                            <VoxelButton
                              color="blue-1"
                              size="sm"
                              fill
                              className="shrink-0  mt-3 self-start"
                            >
                              Visit Site
                              <ArrowUpRight className="w-4 h-4 mb-0.5" />
                            </VoxelButton>
                          </Link>
                        )}

                        {showBuyTickets && !isGated && (
                          <Link href={event.ticketsUrl} className="self-start">
                            <VoxelButton
                              color="blue-1"
                              size="sm"
                              fill
                              className="shrink-0  mt-3 self-start"
                            >
                              Get Tickets
                              <ArrowUpRight className="w-4 h-4 mb-0.5" />
                            </VoxelButton>
                          </Link>
                        )}

                        {showProgrammingButton && (
                          <VoxelButton
                            color="blue-1"
                            size="sm"
                            fill
                            className="shrink-0  mt-3 self-start block lg:hidden"
                            onClick={() => setShowMobileProgramming(true)}
                          >
                            View Program
                          </VoxelButton>
                        )}
                      </div>

                      <div className="flex gap-1 text-xl mt-3 mr-1">
                        {event.xHandle && (
                          <Link href={`${event.xHandle}`} className="p-1">
                            <XIcon className="icon self-end" />
                          </Link>
                        )}

                        {event.instagramHandle && (
                          <Link
                            href={`${event.instagramHandle}`}
                            className="p-1"
                          >
                            <InstagramIcon className="icon self-end" />
                          </Link>
                        )}

                        {event.farcasterHandle && (
                          <Link
                            href={`${event.farcasterHandle}`}
                            className="p-1"
                          >
                            <FarcasterIcon className="icon self-end" />
                          </Link>
                        )}
                      </div>
                    </div>

                    <Separator className="my-3" />

                    {eventShops.some(
                      (shop) => shop.supabase_id === event.id.toString()
                    ) && (
                      <>
                        <ZupassConnection
                          eventId={event.id}
                          shopUrl={event.ticketsUrl || event.eventLink}
                        />

                        <Separator className="my-4" />
                      </>
                    )}

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
              </div>

              <Programming
                event={event}
                programming={programming}
                showMobileProgramming={showMobileProgramming}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {!isDialog && (
        <div
          style={{
            // height: event.spanRows ? `minmax(120px, 100%)` : "auto"
            // height: event.spanRows ? `${event.spanRows * 60}px` : "100%",
            height: "100%",
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
                    src={ethDayLogo}
                    alt="ETH Day"
                    className="w-[26px] object-contain md:hidden"
                  />
                )}

                <div className="flex flex-col w-full">
                  <div className="flex justify-between gap-2">
                    <div className="md:line-clamp-none">{eventName}</div>
                    {toggleFavoriteEvent && (
                      <FavoriteEvent
                        event={event}
                        toggleFavoriteEvent={toggleFavoriteEvent}
                        favoriteEvents={favoriteEvents}
                      />
                    )}
                  </div>
                  <div className="flex gap-4 justify-between w-full">
                    {timeOfDay.map((time, index) => (
                      <div key={index} className="text-xs text-gray-600">
                        {time}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {isETHDay && !compact && (
                <div className="hidden md:flex items-center justify-center mt-2">
                  <Image
                    src={ethDayImage}
                    alt="ETH Day"
                    className="w-full object-contain"
                  />
                </div>
              )}

              <div className="line-clamp-1 mt-2 text-xs uppercase font-medium grow flex items-end">
                {event.organizer}
              </div>

              <Separator className="my-1.5 hidden md:block" />

              <div
                className={cn("hidden md:flex gap-4 justify-end", {
                  "justify-between": !isCoworking || isMultiDay,
                })}
              >
                <div
                  className={cn(
                    "flex gap-2 grow items-end text-[9px] flex-wrap",
                    { "justify-between": isMultiDay }
                  )}
                >
                  {(showTicketTag || event.amountPeople) && (
                    <div className="flex gap-1 items-center">
                      {showTicketTag && <TicketTag event={event} />}
                      {event.amountPeople && (
                        <div
                          className={`rounded text-[11px] px-1.5 py-0.5 flex gap-1 font-medium items-center`}
                        >
                          <Users className="w-3 h-3" />
                          {event.amountPeople}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <TypeTag category={event.eventType} size="sm" />

                    <DifficultyTag difficulty={event.difficulty} size="sm" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Event;
