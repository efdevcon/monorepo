import React from "react";
import { TicketIcon } from "lucide-react";

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
      className={`${difficultyColorMap[difficulty]} bg-white border border-solid px-2 py-0.5 uppercase ${sizeMap[size]} shrink-0`}
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
      className={`${typeColorMap[category]} px-2 py-0.5 bg-white rounded-full uppercase ${sizeMap[size]}`}
    >
      {typeTextMap[category]}
    </div>
  );
};

export const TicketTag = () => {
  return (
    <div
      className={`px-2 py-0.5 border border-solid border-[rgba(100,100,100,0)] bg-[#1B6FAE] text-white uppercase text-[10px] flex items-center gap-1.5 shrink-0`}
    >
      <TicketIcon size={13} className="shrink-0" />
      Tickets Required
    </div>
  );
};

export const SoldOutTag = () => {
  return (
    <div className="px-2 bg-black py-0.5 border border-solid border-[rgba(100,100,100,0)] text-white uppercase text-[10px] flex items-center gap-1.5 shrink-0">
      Sold Out
    </div>
  );
};

export { DifficultyTag, TypeTag };
export type { Difficulty, EventType };
