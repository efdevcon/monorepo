"use client";

import { Copy, Globe, Star } from "lucide-react";
import cn from "classnames";
import { toast } from "sonner";
import { Avatar } from "@/components/Avatar";
import { useInterestedSpeakers } from "@/data/interested/useInterestedSpeakers";
import type { DecoratedSpeaker } from "./useSpeakersData";
import { SpeakerTagChip } from "./SpeakerCard";
import { SpeakerSessionMiniCard } from "./SpeakerSessionMiniCard";

/** GitHub glyph — lucide dropped its brand icons, so inline SVG. */
function GithubIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className={className}
    >
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55 0-.27-.01-1.17-.02-2.12-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.75 2.69 1.25 3.34.95.1-.74.4-1.25.72-1.53-2.55-.29-5.23-1.28-5.23-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.16-1.18 3.16-1.18.63 1.59.24 2.76.12 3.05.74.81 1.18 1.83 1.18 3.09 0 4.42-2.69 5.39-5.25 5.67.41.36.78 1.05.78 2.12 0 1.53-.01 2.77-.01 3.15 0 .3.2.67.8.55A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5" />
    </svg>
  );
}

/** X (Twitter) glyph — lucide's brand icons are deprecated, so inline SVG. */
function XIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className={className}
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

const socialLink =
  "flex size-6 items-center justify-center text-white transition-opacity hover:opacity-80";

/**
 * Speaker details body (Figma "Speaker details" / side menu): hero image with
 * KEYNOTE badge, name and social links, then Profile + action pills, then the
 * speaker's sessions. Used by both the desktop side panel and the mobile
 * /speakers/[id] page (SessionDetailsContent pattern).
 */
export function SpeakerDetailsContent({
  decorated,
  className,
}: {
  decorated: DecoratedSpeaker;
  /** Extra root classes — the mobile page stretches the panel surface. */
  className?: string;
}) {
  const { speaker, sessions, tags, isFeatured } = decorated;
  const { isInterested, toggle } = useInterestedSpeakers();
  const interested = isInterested(speaker.id);

  // Blockie avatars are data-URI placeholders — as a 16:9 cover they'd blow
  // up into abstract noise, so those (and missing avatars) get the pastel
  // treatment with a large round Avatar instead.
  const photo =
    speaker.avatar && !speaker.avatar.startsWith("data") ? speaker.avatar : "";

  const copyName = async () => {
    try {
      await navigator.clipboard.writeText(speaker.name);
      toast(
        <span>
          <span className="font-semibold">{speaker.name}</span> copied to
          clipboard.
        </span>
      );
    } catch {
      toast("Couldn’t copy the name.");
    }
  };

  return (
    <div className={cn("flex flex-col bg-dc-panel", className)}>
      {/* Hero */}
      <div className="relative flex aspect-[160/90] w-full flex-col justify-end overflow-clip">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo}
            alt=""
            className="absolute inset-0 size-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-dc-lavender">
            <Avatar
              name={speaker.name}
              src={speaker.avatar || undefined}
              size={96}
            />
          </div>
        )}
        {/* Legibility gradient behind the name row (Figma: 56px band) */}
        <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-b from-transparent to-dc-fg2" />
        <div className="relative flex flex-col items-start gap-2 p-4">
          {isFeatured && (
            <span className="rounded-[2px] bg-dc-keynote px-1.5 py-[3px] text-[11px] font-semibold uppercase leading-none tracking-[0.5px] text-dc-fg2">
              Featured
            </span>
          )}
          <div className="flex w-full items-center justify-between gap-3">
            <h1 className="min-w-0 truncate text-[20px] font-bold leading-[28.8px] tracking-[-0.5px] text-white">
              {speaker.name}
            </h1>
            <div className="flex shrink-0 items-center gap-3">
              {speaker.website && (
                <a
                  href={speaker.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${speaker.name}’s website`}
                  className={socialLink}
                >
                  <Globe className="size-5" />
                </a>
              )}
              {speaker.github && (
                <a
                  href={`https://github.com/${speaker.github}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${speaker.name} on GitHub`}
                  className={socialLink}
                >
                  <GithubIcon className="size-5" />
                </a>
              )}
              {speaker.twitter && (
                <a
                  href={`https://x.com/${speaker.twitter}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${speaker.name} on X`}
                  className={socialLink}
                >
                  {/* All hero icons: 20px glyph in the 24px container */}
                  <XIcon className="size-5" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Profile + actions */}
      <div className="flex flex-col gap-6 border-b border-dc-hairline p-4">
        {(speaker.description || tags.length > 0) && (
          <div className="flex flex-col gap-2">
            {speaker.description && (
              <>
                <h2 className="text-[14px] font-bold leading-5 text-dc-fg2">
                  Profile
                </h2>
                <p className="text-[14px] leading-5 text-dc-fg2">
                  {speaker.description}
                </p>
              </>
            )}
            {/* Topic-tag recap — the list clips these, so the details view
                spells them out (PR #112 feedback). Same 3-tag cap as the
                desktop card row. */}
            {tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1 pt-1">
                {tags.slice(0, 3).map((tag) => (
                  <SpeakerTagChip key={tag} tag={tag} />
                ))}
              </div>
            )}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => void toggle(speaker.id, speaker.name)}
            className={cn(
              "flex min-h-8 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-full border px-2 py-1 text-[12px] leading-none text-dc-fg2",
              interested
                ? "border-dc-purple bg-dc-lavender"
                : "border-dc-hairline bg-white"
            )}
          >
            <Star
              className={cn(
                "size-4",
                interested
                  ? "fill-dc-purple text-dc-purple"
                  : "fill-transparent text-dc-fg2"
              )}
            />
            {interested ? "Interested" : "Add to Interests"}
          </button>
          <button
            onClick={() => void copyName()}
            className="flex min-h-8 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-full border border-dc-hairline bg-white px-2 py-1 text-[12px] leading-none text-dc-fg2"
          >
            <Copy className="size-4 text-dc-purple" />
            Copy name
          </button>
        </div>
      </div>

      {/* Sessions */}
      <div className="flex flex-col gap-3 p-4">
        <h2 className="text-[14px] leading-5 text-dc-fg2">
          <span className="font-bold">Sessions</span> ({sessions.length})
        </h2>
        {sessions.length > 0 ? (
          sessions.map((session) => (
            <SpeakerSessionMiniCard key={session.id} session={session} />
          ))
        ) : (
          <p className="text-[14px] leading-5 text-dc-muted">
            No sessions listed yet.
          </p>
        )}
      </div>
    </div>
  );
}
