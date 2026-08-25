"use client";

import cn from "classnames";
import { Sparkle } from "lucide-react";
import SwipeToScroll from "lib/components/event-schedule/swipe-to-scroll-native";
import { Link } from "@/routing";
import { useAnnouncements } from "@/data/announcements/useAnnouncements";
import type { Announcement } from "@/data/announcements/types";

/**
 * Evergreen image cards curated in the same Notion DB as announcements
 * (Type = Highlight, ordered by the Order column). Horizontally swipeable so
 * any number of cards never pushes the rest of the home screen down — the
 * pattern proven at Devconnect ARG (devconnect-app Highlights.tsx), but
 * Notion-managed instead of hardcoded.
 */
function HighlightCard({ highlight }: { highlight: Announcement }) {
  const { title, message, url, image } = highlight;

  const card = (
    <div
      className={cn(
        "w-[295px] shrink-0 overflow-hidden rounded-xl border border-dc-hairline bg-white",
        url &&
          "transition-[scale,box-shadow] duration-150 ease-out hover:shadow-sm motion-safe:hover:scale-[1.03] motion-safe:active:scale-[0.97]"
      )}
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" className="aspect-[2/1] w-full object-cover" />
      ) : (
        <div className="flex aspect-[2/1] w-full items-center justify-center bg-dc-lavender">
          <Sparkle className="h-6 w-6 text-dc-purple/40" />
        </div>
      )}
      <div className="relative z-10 bg-white p-4">
        <p className="font-heading text-sm font-bold leading-5 text-dc-fg2">
          {title}
        </p>
        {message && (
          <p className="mt-1 line-clamp-2 font-heading text-sm leading-5 text-dc-muted">
            {message}
          </p>
        )}
      </div>
    </div>
  );

  if (!url) return card;
  if (url.startsWith("/")) {
    return <Link href={url}>{card}</Link>;
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer">
      {card}
    </a>
  );
}

export function HighlightsCarousel() {
  const { highlights } = useAnnouncements();

  if (highlights.length === 0) return null;

  return (
    <section>
      <h2 className="mb-4 font-heading text-xl font-extrabold leading-[26px] text-dc-fg2">
        Highlights
      </h2>
      {/* Edge fades (right at rest, left once scrolled) come from
          SwipeToScroll's built-in mask indicators — same treatment as the
          speakers-page topic filters. The p-2 INSIDE the scroll container
          gives the hover scale/shadow room to render without being clipped
          by the scroller; the outer -m-2 re-aligns the cards with the
          section edge (padding inside + margin outside — a negative margin
          inside a scroll container can't extend its clip box). */}
      <div className="-m-2">
        <SwipeToScroll scrollIndicatorDirections={{ left: true, right: true }}>
          <div className="flex gap-4 p-2 pr-6">
            {highlights.map((h) => (
              <HighlightCard key={h.id} highlight={h} />
            ))}
          </div>
        </SwipeToScroll>
      </div>
    </section>
  );
}
