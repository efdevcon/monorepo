"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import cn from "classnames";
import { Sparkle } from "lucide-react";
import SwipeToScroll from "lib/components/event-schedule/swipe-to-scroll-native";
import { Link } from "@/routing";
import { useAnnouncements } from "@/data/announcements/useAnnouncements";
import { resolveAnnouncementLink } from "@/data/announcements/linkUtils";
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
  const link = url ? resolveAnnouncementLink(url) : null;

  const card = (
    <div
      className={cn(
        "w-[295px] shrink-0 overflow-hidden rounded-xl border border-dc-hairline bg-white",
        link &&
          "transition-[scale,box-shadow,border-color] duration-150 ease-out hover:border-dc-purple/40 hover:shadow-sm motion-safe:hover:scale-[1.03] motion-safe:active:scale-[0.97]"
      )}
    >
      {image ? (
        // crossOrigin: see Avatar.tsx — avoids opaque-response quota padding.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          crossOrigin="anonymous"
          alt=""
          className="aspect-[2/1] w-full object-cover"
        />
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

  if (!link) return card;

  const linkClass =
    "block rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-purple";

  if (!link.external) {
    return (
      <Link href={link.href} className={linkClass}>
        {card}
      </Link>
    );
  }
  return (
    <a
      href={link.href}
      target="_blank"
      rel="noopener noreferrer"
      className={linkClass}
    >
      {card}
    </a>
  );
}

export function HighlightsCarousel() {
  const { highlights } = useAnnouncements();
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [fades, setFades] = useState({ left: false, right: false });

  const sync = useCallback((el: HTMLElement) => {
    setFades({
      left: el.scrollLeft > 5,
      right: el.scrollLeft < el.scrollWidth - el.clientWidth - 5,
    });
  }, []);

  // Edge-fade state. SwipeToScroll's own scroll indicators only sync on
  // mount/resize (never on scroll), so we track the inner scroller ourselves:
  // scroll events don't bubble, but they DO fire on ancestors in the capture
  // phase, and the desktop drag path sets scrollLeft (which also fires them).
  useEffect(() => {
    const root = wrapRef.current;
    if (!root) return;
    const findScroller = (): HTMLElement | null => {
      for (const n of root.querySelectorAll<HTMLElement>("div")) {
        if (n.scrollWidth > n.clientWidth + 1) return n;
      }
      return null;
    };
    const measure = () => {
      const el = findScroller();
      if (el) sync(el);
      else setFades({ left: false, right: false });
    };
    const onScroll = (e: Event) => {
      const t = e.target;
      if (t instanceof HTMLElement) sync(t);
    };
    measure();
    root.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", measure);
    return () => {
      root.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", measure);
    };
  }, [highlights.length, sync]);

  if (highlights.length === 0) return null;

  return (
    <section>
      <h2 className="mb-4 text-[20px] font-bold leading-[28.8px] tracking-[-0.5px] text-dc-fg2">
        Highlights
      </h2>
      {/* Edge fades (right while more content, left once scrolled), applied as
          a mask so they work over the page's gradient background — same
          treatment as the speakers-page topic filters. The p-2 INSIDE the
          scroll container gives the hover scale/shadow room to render without
          being clipped by the scroller; the outer -m-2 re-aligns the cards
          with the section edge. */}
      <div
        ref={wrapRef}
        className={cn(
          "-m-2",
          fades.left &&
            fades.right &&
            "[mask-image:linear-gradient(90deg,transparent,black_40px,black_calc(100%-40px),transparent)]",
          fades.left &&
            !fades.right &&
            "[mask-image:linear-gradient(90deg,transparent,black_40px)]",
          !fades.left &&
            fades.right &&
            "[mask-image:linear-gradient(90deg,black,black_calc(100%-40px),transparent)]"
        )}
      >
        <SwipeToScroll>
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
