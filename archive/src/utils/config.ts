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
