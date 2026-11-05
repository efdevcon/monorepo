export const CONFIG = {
  NODE_ENV: process.env.NODE_ENV || "development",

  API_BASE_URL:
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://api.devcon.org",
};

export const TRACKS = [
  "Cryptoeconomics",
  "Devcon",
  "Developer Experience",
  "Coordination",
  "Core Protocol",
  "Layer 2s",
  "Real World Ethereum",
  "Cypherpunk & Privacy",
  "Security",
  "Applied Cryptography",
  "Usability",
];

/** Devcon 8 tracks, spelled as the API carries them (badges in public/images/tracks/devcon8). */
export const DEVCON8_TRACKS = [
  "Core Protocol",
  "Privacy & Consent",
  "Security",
  "Futures Worth Building",
  "Rights, Freedoms, and Governance",
  "Permissionless Networks",
  "Users, Builders, and Agents",
  "Applied Cryptography",
  "Open & Verifiable Stack",
];

export function getTrackColor(track?: string) {
  if (track === "Core Protocol") return "bg-[#F6F2FF]";
  if (track === "Cypherpunk & Privacy") return "bg-[#FFF4FF]";
  if (track === "Usability") return "bg-[#FFF4F4]";
  if (track === "Real World Ethereum") return "bg-[#FFEDDF]";
  if (track === "Applied Cryptography") return "bg-[#FFFEF4]";
  if (track === "Cryptoeconomics") return "bg-[#F9FFDF]";
  if (track === "Coordination") return "bg-[#E9FFD7]";
  if (track === "Developer Experience") return "bg-[#E8FDFF]";
  if (track === "Security") return "bg-[#E4EEFF]";
  if (track === "Layer 2s") return "bg-[#F0F1FF]";
  if (track === "Entertainment") return "bg-[#FFF0F2]";
  // Devcon 8 (the website's social-card canvas colors)
  if (track === "Privacy & Consent") return "bg-[#E6E3E8]";
  if (track === "Futures Worth Building") return "bg-[#FFF9D1]";
  if (track === "Rights, Freedoms, and Governance") return "bg-[#E9E5F6]";
  if (track === "Permissionless Networks") return "bg-[#E6EBFF]";
  if (track === "Users, Builders, and Agents") return "bg-[#FFE5E6]";
  if (track === "Open & Verifiable Stack") return "bg-[#DBFFF8]";

  return "bg-[#FFEDDF]";
}
