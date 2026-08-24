"use client";

import { memo } from "react";
import { Speech, Star } from "lucide-react";
import cn from "classnames";
import { Link } from "@/routing";
import { Avatar } from "@/components/Avatar";
import { isDesktopNow } from "@/hooks/useIsDesktop";
import type { DecoratedSpeaker } from "./useSpeakersData";

/** Outlined uppercase topic-tag chip, shared by the card and details views. */
export function SpeakerTagChip({ tag }: { tag: string }) {
  return (
    <span className="whitespace-nowrap rounded-[2px] border border-dc-muted px-1.5 py-[3px] text-[9px] font-semibold uppercase leading-none tracking-[0.5px] text-dc-muted">
      {tag}
    </span>
  );
}

/**
 * Speaker card (Figma "Speaker-Card"): 48px avatar, bold name + optional
 * KEYNOTE chip, session count + outlined uppercase topic tags, interested
 * star. Desktop shows 3 tags inline in the meta row; mobile wraps 2 tags onto
 * their own row (compact variant). The star toggles the local "Interested"
 * speaker state without navigating.
 *
 * Memoized, with the interested state passed down from the page's single
 * subscription: hundreds of cards each running their own SWR hook made every
 * star toggle / scroll-spy tick / selection change reconcile the whole list.
 */
export const SpeakerCard = memo(function SpeakerCard({
  decorated,
  selected = false,
  interested,
  onOpen,
  onToggleInterested,
}: {
  decorated: DecoratedSpeaker;
  /** Desktop side-panel selection highlight. */
  selected?: boolean;
  interested: boolean;
  /**
   * Desktop: open the speaker details side panel instead of navigating.
   * Mobile keeps the normal link navigation to /speakers/[id].
   */
  onOpen?: (id: string) => void;
  onToggleInterested: (id: string, name: string) => void;
}) {
  const { speaker, sessionCount, tags, isKeynote } = decorated;

  const tagChip = (tag: string) => <SpeakerTagChip key={tag} tag={tag} />;

  return (
    <Link
      href={`/speakers/${speaker.id}`}
      // No viewport prefetch: hundreds of cards sweeping past the shared link
      // observer during an A–Z jump fire an /speakers/[id]?_rsc= request storm
      // that thrashes the SW prefetch cache and crashes iOS Safari — and the
      // target is a client page reading the same Dexie/SWR join anyway.
      prefetch={false}
      onClick={(e) => {
        if (onOpen && isDesktopNow()) {
          e.preventDefault();
          onOpen(speaker.id);
        }
      }}
      className={cn(
        "group relative flex items-center gap-4 overflow-clip rounded-lg border bg-white p-4 transition-colors duration-150 ease-out",
        selected
          ? "border-dc-purple bg-dc-lavender"
          : "border-dc-hairline hover:border-dc-purple"
      )}
    >
      <Avatar name={speaker.name} src={speaker.avatar || undefined} size={48} />

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div
          className={cn(
            "flex min-w-0 items-center gap-2",
            // Mobile keeps long names clear of the absolute corner badge.
            isKeynote && "pr-10 lg:pr-0"
          )}
        >
          <span className="truncate text-[14px] font-bold leading-5 text-dc-fg2 lg:text-[16px] lg:leading-6">
            {speaker.name}
          </span>
          {/* Desktop: inline badge next to the name */}
          {isKeynote && (
            <span className="hidden shrink-0 rounded-[4px] bg-dc-keynote px-1.5 py-[3px] text-[10px] font-semibold uppercase leading-none tracking-[0.5px] text-dc-fg2 lg:inline-flex">
              Keynote
            </span>
          )}
        </div>

        <div className="flex min-w-0 items-center gap-3">
          <span className="inline-flex shrink-0 items-center gap-1 text-[12px] leading-none text-dc-muted">
            <Speech className="size-3.5 shrink-0" />
            {sessionCount} session{sessionCount === 1 ? "" : "s"}
          </span>
          {/* Desktop: up to 3 tags inline in the meta row */}
          {tags.length > 0 && (
            <span className="hidden min-w-0 items-center gap-1 overflow-hidden lg:flex">
              {tags.slice(0, 3).map(tagChip)}
            </span>
          )}
        </div>

        {/* Mobile: up to 2 tags on their own row (compact card variant) */}
        {tags.length > 0 && (
          <div className="flex min-w-0 items-center gap-1 overflow-hidden lg:hidden">
            {tags.slice(0, 2).map(tagChip)}
          </div>
        )}
      </div>

      <button
        aria-label={
          interested
            ? `Remove ${speaker.name} from interested`
            : `Add ${speaker.name} to interested`
        }
        aria-pressed={interested}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggleInterested(speaker.id, speaker.name);
        }}
        className="group/star -m-2 flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-dc-purple-soft"
      >
        <Star
          className={cn(
            "size-5 transition-colors",
            interested
              ? "fill-dc-purple text-dc-purple"
              : "fill-transparent text-dc-muted group-hover/star:text-dc-purple"
          )}
        />
      </button>

      {/* Mobile: absolute corner badge (mobile SessionCard grammar) */}
      {isKeynote && (
        <span className="absolute right-0 top-0 rounded-bl-[2px] bg-dc-keynote px-2 py-1 text-[10px] font-semibold uppercase leading-none tracking-[0.5px] text-dc-fg lg:hidden">
          Keynote
        </span>
      )}
    </Link>
  );
});
