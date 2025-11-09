import React from "react";
import { TicketIcon } from "lucide-react";
import Link from "next/link";

type Difficulty =
  | "beginner"
  | "intermediate"
  | "expert"
  | "all welcome"
  | "other";

const DifficultyTag = ({
  difficulty,
  size = "sm",
}: {
  difficulty: Difficulty;
  size?: "sm" | "md";
}) => {
  const difficultyColorMap = {
    beginner: "text-[#146C58] border-[#146C58]",
    intermediate: "text-[rgba(180,83,9,1)] border-[rgba(180,83,9,1)]",
    expert: "text-[rgba(153,27,27,1)] border-[rgba(153,27,27,1)]",
    "all welcome": "text-[#146C58]  border-[#146C58]",
    other: "text-[#146C58]  border-[#146C58]",
  };

  const difficultyTextMap = {
    beginner: "Beginner",
    intermediate: "Intermediate",
    expert: "Expert",
    "all welcome": "All Welcome",
    other: "All Welcome",
  };

  const sizeMap = {
    sm: "text-[10px]",
    md: "text-[12px]",
  };

  return (
    <div
      className={`${difficultyColorMap[difficulty]} bg-white font-medium border border-solid px-2 py-0.5 uppercase ${sizeMap[size]} shrink-0`}
    >
      {difficultyTextMap[difficulty]}
    </div>
  );
};

type EventType =
  | "talks"
  | "discussion"
  | "presentation"
  | "hackathon"
  | "workshop"
  | "panel"
  | "mixed format"
  | "social"
  | "other";

const TypeTag = ({
  category,
  size = "sm",
}: {
  category?: EventType;
  size?: "sm" | "md";
}) => {
  const typeColorMap = {
    talks: "border border-solid border-[rgba(100,100,100,1)]",
    discussion: "border border-solid border-[rgba(100,100,100,1)]",
    presentation: "border border-solid border-[rgba(100,100,100,1)]",
    hackathon: "border border-solid border-[rgba(100,100,100,1)]",
    workshop: "border border-solid border-[rgba(100,100,100,1)]",
    panel: "border border-solid border-[rgba(100,100,100,1)]",
    "mixed format": "border border-solid border-[rgba(100,100,100,1)]",
    social: "border border-solid border-[rgba(100,100,100,1)]",
    other: "border border-solid border-[rgba(100,100,100,1)]",
  };

  const typeTextMap = {
    talks: "Talks",
    discussion: "Discussion",
    presentation: "Presentation",
    hackathon: "Hackathon",
    workshop: "Workshop",
    panel: "Panel",
    "mixed format": "Mixed Format",
    social: "Social",
    other: "Other",
  };

  const sizeMap = {
    sm: "text-[10px]",
    md: "text-[12px]",
  };

  if (!category) {
    return null;
  }

  return (
    <div
      className={`${typeColorMap[category]} px-2 py-0.5 font-medium bg-white rounded-full uppercase ${sizeMap[size]}`}
    >
      {typeTextMap[category]}
    </div>
  );
};

export const TicketTag = ({
  event,
  compact = false,
  renderTicketsCTA,
}: {
  event: any;
  compact?: boolean;
  renderTicketsCTA?: any;
}) => {
  const isCommunityCalendar = !event.isCoreEvent;
  const isCoworking = event.id.toString() === "23";
  const isSoldOut = event.soldOut;
  const requiresSignup = event.requiresSignup;
  const isPaidEvent = event.ticketsAvailable;

  if (compact) {
    if (!isPaidEvent) {
      if (isCommunityCalendar) {
        return null;
      }

      return (
        <div
          className={`px-1.5 py-0.5 font-medium border border-solid text-[rgba(27,111,174,1)] border-[rgba(27,111,174,1)] bg-[white] uppercase text-[10px] flex items-center gap-1.5 shrink-0`}
        >
          Included in Devconnect Ticket
        </div>
      );
    }

    if (renderTicketsCTA && renderTicketsCTA(event)) {
      return (
        <Link
          href="/tickets"
          onClick={(e) => {
            e.stopPropagation();
          }}
          className="px-1.5 py-0.5 font-medium border border-solid border-[rgb(27,174,59)] bg-[#e0ffed] uppercase text-[10px] flex items-center gap-1.5 shrink-0"
        >
          You have a ticket!
        </Link>
      );
    }

    if (isCoworking) {
      return (
        <div className="px-1.5 py-0.5 font-medium border border-solid border-[rgba(27,111,174,1)] bg-[rgba(27,111,174,1)] text-white uppercase text-[10px] flex items-center gap-1.5 shrink-0">
          Requires Devconnect Ticket
        </div>
      );
    }

    return (
      <div className="px-1.5 py-0.5 font-medium border border-solid border-[rgba(27,111,174,1)] bg-[rgba(27,111,174,1)] text-white uppercase text-[10px] flex items-center gap-1.5 shrink-0">
        {isPaidEvent && "Signup Required"}
      </div>
    );
  }

  if (isCoworking) {
    return (
      <div className="px-1.5 py-0.5 font-medium border border-solid border-[rgba(27,111,174,1)] bg-[rgba(27,111,174,1)] text-white uppercase text-[10px] flex items-center gap-1.5 shrink-0">
        Get Your Tickets
      </div>
    );
  }

  if (isCommunityCalendar) {
    return (
      <div className="px-1.5 py-0.5 font-medium border border-solid border-[rgba(100,100,100,0)] bg-[rgba(113,56,188,1)] text-white uppercase text-[10px] flex items-center gap-1.5 shrink-0">
        Tickets Required
      </div>
    );
  }

  if (isSoldOut) {
    return (
      <div className="px-1.5 py-0.5 font-medium border border-solid border-[rgba(100,100,100,0)] bg-black text-white uppercase text-[10px] flex items-center gap-1.5 shrink-0">
        Sold Out
      </div>
    );
  }

  if (isPaidEvent || requiresSignup || isSoldOut) {
    return (
      <div className="px-1.5 py-0.5 font-medium border border-solid bg-[rgba(58,54,94,1)] text-white uppercase text-[10px] flex items-center gap-1.5 shrink-0">
        {isSoldOut
          ? "Sold Out!"
          : requiresSignup
          ? "+ Signup Required"
          : "+ Signup Required"}
      </div>
    );
  }

  if (event.description === "Details coming soon.") {
    return (
      <div
        className={`px-1.5 py-0.5 font-medium border border-solid text-[#3A365E] border-[#3A365E] bg-[white] uppercase text-[10px] flex items-center gap-1.5 shrink-0`}
      >
        Details Soon
      </div>
    );
  }

  return (
    <div
      className={`px-1.5 py-0.5 font-medium border border-solid text-[rgba(27,111,174,1)] border-[rgba(27,111,174,1)] bg-[white] uppercase text-[10px] flex items-center gap-1.5 shrink-0`}
    >
      {event.description === "Details coming soon."
        ? "Details soon"
        : "Included in Ticket"}
    </div>
  );
};

export const SoldOutTag = () => {
  return (
    <div className="px-2 bg-black py-0.5 font-medium border border-solid border-[rgba(100,100,100,0)] text-white uppercase text-[10px] flex items-center gap-1.5 shrink-0">
      Sold Out
    </div>
  );
};

export { DifficultyTag, TypeTag };
export type { Difficulty, EventType };
