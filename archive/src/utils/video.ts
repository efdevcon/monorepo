import { editionLabel } from "@/utils/editions";

interface VideoLike {
  id: string;
  eventId: string;
  edition?: number;
  title: string;
  description?: string;
  speakers?: { name: string }[];
  sources_youtubeId?: string;
}

/**
 * YouTube's thumbnail of a video. "hq720" is the 16:9 render; the 4:3
 * "hqdefault" carries letterbox bars but exists for every video.
 */
export const youtubeThumbnail = (youtubeId: string, size: "hq720" | "hqdefault" = "hq720") =>
  `https://img.youtube.com/vi/${youtubeId}/${size}.jpg`;

/** Editions whose sessions have a share card on devcon.org (its schedule social image). */
const DEVCON_ORG_CARD_EVENTS = ["devcon-7", "devcon8"];

/**
 * The image a shared or indexed video page shows: the session's devcon.org
 * card when its edition has them, else the video's YouTube thumbnail.
 */
export function videoImage(video: VideoLike): { url: string; width: number; height: number; alt: string } | null {
  if (DEVCON_ORG_CARD_EVENTS.includes(video.eventId)) {
    return {
      url: `https://devcon.org/api/social/schedule/${encodeURIComponent(video.id)}/`,
      width: 1200,
      height: 630,
      alt: video.title,
    };
  }
  if (video.sources_youtubeId) {
    return { url: youtubeThumbnail(video.sources_youtubeId), width: 1280, height: 720, alt: video.title };
  }
  return null;
}

/** Search engines show about this many characters of a description. */
const DESCRIPTION_LENGTH = 160;

/** Session descriptions are Markdown; a meta description is one line of plain text. */
function plainText(markdown: string): string {
  return markdown
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}(#+|>|[-*+])\s+/gm, "")
    .replace(/\*\*|__|`/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Cut at a word boundary, with an ellipsis, when longer than `max`. */
function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,.;:-]+$/, "")}…`;
}

/** "A", "A and B", "A, B and C", "A, B and 3 others". */
function speakerNames(speakers: { name: string }[]): string {
  const names = speakers.map((s) => s.name).filter(Boolean);
  if (names.length <= 1) return names[0] ?? "";
  if (names.length <= 3) return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
  return `${names.slice(0, 2).join(", ")} and ${names.length - 2} others`;
}

/** The page's meta description: who and where, then the session's own description. */
export function videoDescription(video: VideoLike): string {
  const names = speakerNames(video.speakers ?? []);
  const edition = editionLabel(video);
  const body = plainText(video.description ?? "");
  if (!body) return clip(`Watch “${video.title}”${names ? ` by ${names}` : ""}, recorded at ${edition}.`, DESCRIPTION_LENGTH);
  return clip(`${names ? `${names} at ` : ""}${edition}: ${body}`, DESCRIPTION_LENGTH);
}
