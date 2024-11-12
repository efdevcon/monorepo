import dayjs from "dayjs";
import makeBlockie from "ethereum-blockies-base64";

export async function getSession(id: string) {
  const apiUrl = process.env.API_URL || "http://localhost:4000";
  const res = await fetch(`${apiUrl}/sessions/${id}`);
  const { data } = await res.json();

  return data;
}

export function getExpertiseColor(expertise?: string) {
  if (expertise === "Beginner") return "bg-[#d2ffd6]";
  if (expertise === "Intermediate") return "bg-[#e3dcff]";
  if (expertise === "Expert") return "bg-[#f7dbe4]";

  return "bg-[#d0cbec]";
}

export function getTrackImage(track?: string) {
  if (track === "Core Protocol") return "CoreProtocol.png";
  if (track === "Cypherpunk & Privacy") return "Cypherpunk.png";
  if (track === "Usability") return "Usability.png";
  if (track === "Real World Ethereum") return "RealWorldEthereum.png";
  if (track === "Applied Cryptography") return "AppliedCryptography.png";
  if (track === "Cryptoeconomics") return "CryptoEconomics.png";
  if (track === "Coordination") return "Coordination.png";
  if (track === "Developer Experience") return "DeveloperExperience.png";
  if (track === "Security") return "Security.png";
  if (track === "Layer 2") return "Layer2.png";
  if (track === "Entertainment") return "Entertainment.png";

  return "RealWorldEthereum.png";
}

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
  if (track === "Layer 2") return "bg-[#F0F1FF]";
  if (track === "Entertainment") return "bg-[#FFF0F2]";

  return "bg-[#FFEDDF]";
}

export function getTitleClass(title: string, av?: boolean) {
  console.log("TITLE Length", title.length, av ? "AV" : "SCHEDULE");

  if (av) {
    if (title.length > 100) return "text-6xl leading-tight";
    if (title.length > 85) return "text-6xl leading-normal";
    if (title.length > 80) return "text-7xl leading-snug";
    if (title.length > 70) return "text-7xl leading-normal";
    if (title.length > 35) return "text-7xl leading-normal";
    if (title.length >= 18) return "text-8xl leading-normal";
    return "text-9xl leading-normal";
  }

  if (title.length > 100) return "text-4xl";
  if (title.length >= 85) return "text-4xl leading-snug";
  if (title.length >= 80) return "text-5xl leading-tight";
  if (title.length >= 70) return "text-5xl leading-snug";
  if (title.length >= 60) return "text-5xl leading-tight";
  if (title.length >= 35) return "text-5xl leading-snug";
  if (title.length >= 18) return "text-6xl leading-snug";
  return "text-7xl leading-snug";
}

export function getDay(date: string) {
  const day = dayjs(date).format("DD");
  if (day === "12") return "Day 1";
  if (day === "13") return "Day 2";
  if (day === "14") return "Day 3";
  if (day === "15") return "Day 4";

  return day;
}

export async function fetchImageWithTimeout(
  src: string,
  timeout: number = 2000
) {
  if (!src) return null;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(src, {
      signal: controller.signal,
      next: { revalidate: 3600 }, // Cache for 1 hour
    });
    clearTimeout(id);
    return response.ok ? src : null;
  } catch {
    clearTimeout(id);
    return null;
  }
}

export async function fetchSpeakerImages(data: any) {
  if (!data?.speakers?.length) return [];

  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Speaker images fetch timeout")), 5000)
  );

  try {
    const imagesPromise = Promise.all(
      data.speakers.map(async (i: any) => {
        const imageSrc = await fetchImageWithTimeout(i.avatar);
        return {
          ...i,
          imageSrc:
            imageSrc || generateAvatar(i.ens || i.name || i.id || "unknown"),
        };
      })
    );

    return await Promise.race([imagesPromise, timeout]);
  } catch (error) {
    console.error("Error fetching speaker images:", error);
    // Fallback to generated avatars
    return data.speakers.map((i: any) => ({
      ...i,
      imageSrc: generateAvatar(i.ens || i.name || i.id || "unknown"),
    }));
  }
}

export function generateAvatar(username: string) {
  return makeBlockie(username);
}
