import React from "react";

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
    beginner: "text-[rgba(20,108,88,1)]  border-[rgba(20,108,88,1)]",
    intermediate: "text-[rgba(180,83,9,1)] border-[rgba(180,83,9,1)]",
    expert: "text-[rgba(153,27,27,1)] border-[rgba(153,27,27,1)]",
    "all welcome": "text-[rgba(20,108,88,1)]  border-[rgba(20,108,88,1)]",
    other: "text-[rgba(20,108,88,1)]  border-[rgba(20,108,88,1)]",
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
      className={`${difficultyColorMap[difficulty]} border border-solid px-2 py-0.5 uppercase ${sizeMap[size]} shrink-0`}
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
      className={`${typeColorMap[category]} px-2 py-0.5 rounded-full uppercase ${sizeMap[size]}`}
    >
      {typeTextMap[category]}
    </div>
  );
};

export { DifficultyTag, TypeTag };
export type { Difficulty, EventType };
