import React from "react";

type Difficulty = "beginner" | "intermediate" | "advanced" | "all welcome";

const DifficultyTag = ({
  difficulty,
  size = "sm",
}: {
  difficulty: Difficulty;
  size?: "sm" | "md";
}) => {
  const difficultyColorMap = {
    beginner: "text-[rgba(20,108,88,1)]  border-[rgba(20,108,88,1)]",
    intermediate: "bg-yellow-500",
    advanced: "bg-red-500",
    "all welcome": "bg-blue-500",
  };

  const difficultyTextMap = {
    beginner: "Beginner",
    intermediate: "Intermediate",
    advanced: "Advanced",
    "all welcome": "All Welcome",
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
  | "real world ethereum"
  | "defi"
  | "cypherpunk & privacy"
  | "security"
  | "ai"
  | "protocol"
  | "devex"
  | "usability"
  | "applied cryptography"
  | "coordination"
  | "scalability"
  | "other";

const TypeTag = ({
  category = "other",
  size = "sm",
}: {
  category?: EventType;
  size?: "sm" | "md";
}) => {
  const typeColorMap = {
    "real world ethereum": "bg-green-500",
    defi: "bg-yellow-500",
    "cypherpunk & privacy": "bg-red-500",
    security: "bg-blue-500",
    ai: "bg-purple-500",
    protocol: "bg-orange-500",
    devex: "bg-pink-500",
    usability: "bg-teal-500",
    "applied cryptography": "bg-indigo-500",
    coordination: "bg-lime-500",
    scalability: "bg-cyan-500",
    other: "border border-solid border-[rgba(100,100,100,1)]",
    "all welcome": "bg-blue-500",
  };

  const typeTextMap = {
    "real world ethereum": "Real World Ethereum",
    defi: "DeFi",
    "cypherpunk & privacy": "Cypherpunk & Privacy",
    security: "Security",
    ai: "AI",
    protocol: "Protocol",
    devex: "Devex",
    usability: "Usability",
    "applied cryptography": "Applied Cryptography",
    coordination: "Coordination",
    scalability: "Scalability",
    other: "Other",
    "all welcome": "All Welcome",
  };

  const sizeMap = {
    sm: "text-[10px]",
    md: "text-[12px]",
  };

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
