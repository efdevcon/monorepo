"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, Sparkle } from "lucide-react";
import cn from "classnames";
import APP_CONFIG from "@/CONFIG";
import { Link } from "@/routing";
import { useAnnouncements } from "@/data/announcements/useAnnouncements";
import { useRetryOnReconnect } from "@/hooks/useRetryOnReconnect";
import { resolveAnnouncementLink } from "@/data/announcements/linkUtils";
import type { Announcement } from "@/data/announcements/types";

/**
 * "Featured" section: the home-screen hero, driven by the highlights with
 * Featured ticked in Notion (see `useAnnouncements` for how they're chosen).
 *
 * This used to be a hardcoded card, which made the most prominent slot on the
 * home screen the one thing editors couldn't change without a deploy — exactly
 * the slot you want to retarget mid-event. Since 2026-11-01 it is a carousel:
 * one ticked row renders as the single hero it always was; more than one swipe
 * side by side with the next card peeking in from the edge and a dot per card
 * underneath (Scott: several things need to stay in front of everyone through
 * the week).
 *
 * Renders nothing when there's no highlight to show (announcements switched
 * off, an empty Notion DB, or a fresh install that hasn't synced yet), the same
 * way the announcements and highlights sections below it drop out when empty.
 */
export function FeaturedCard() {
  const { featured } = useAnnouncements({
    enabled: APP_CONFIG.ANNOUNCEMENTS_ENABLED,
  });

  if (featured.length === 0) return null;

  return (
    <section>
      <h2 className="mb-4 text-[20px] font-bold leading-[28.8px] tracking-[-0.5px] text-dc-fg2">
        Featured
      </h2>
      {featured.length === 1 ? (
        <FeaturedSlide highlight={featured[0]} single />
      ) : (
        <FeaturedCarousel highlights={featured} />
      )}
    </section>
  );
}

/**
 * The swipeable row: native horizontal scroll with mandatory snap points (one
 * per card), bleeding to the screen edge on phones so the next card peeks in
 * past the column's gutter, and a row of dots that doubles as paging when the
 * row actually overflows, phones only (desktop fits two or three cards side
 * by side, and a pager under a row that can't move would only puzzle).
 */
function FeaturedCarousel({ highlights }: { highlights: Announcement[] }) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(0);
  const [overflows, setOverflows] = useState(false);
  const [fades, setFades] = useState({ left: false, right: false });

  // Which card is nearest the snap edge, from the scroll offset against the
  // first card's width plus the gap (every card is the same width).
  const sync = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setOverflows(el.scrollWidth > el.clientWidth + 1);
    setFades({ left: el.scrollLeft > 5, right: el.scrollLeft < el.scrollWidth - el.clientWidth - 5 });
    const first = el.firstElementChild as HTMLElement | null;
    const second = first?.nextElementSibling as HTMLElement | null;
    const step = first && second ? second.offsetLeft - first.offsetLeft : first?.offsetWidth ?? 0;
    if (step <= 0) return;
    setActive(Math.max(0, Math.min(highlights.length - 1, Math.round(el.scrollLeft / step))));
  }, [highlights.length]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    sync();
    el.addEventListener("scroll", sync, { passive: true });
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", sync);
      observer.disconnect();
    };
  }, [sync]);

  const goTo = (index: number) => {
    const el = scrollerRef.current;
    const card = el?.children.item(index) as HTMLElement | null;
    if (!el || !card) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // offsetLeft is measured from the scroller's padding edge, which is where
    // scroll-padding snaps the cards, so this lands exactly on the snap point.
    el.scrollTo({ left: card.offsetLeft - el.clientLeft - parseFloat(getComputedStyle(el).paddingLeft), behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <div>
      {/* -mx-4 / px-4 / scroll-px-4: the row spans the phone screen edge to
          edge while the cards still snap flush with the page column, so the
          next card shows past the gutter. Desktop keeps the column and only
          borrows 8px each side (and vertically) so the hover scale isn't
          clipped by the scroller — the Highlights carousel's trick. The
          scrollbar is hidden: the dots and the peeking card say "more".
          Desktop has neither, so a fourth card that runs past the column
          gets the Highlights carousel's edge fades instead (right while
          there is more, left once scrolled), masked so they work over the
          page's gradient background. */}
      <div
        ref={scrollerRef}
        className={cn(
          "-mx-4 -my-2 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 py-2 scroll-px-4",
          "lg:-mx-2 lg:gap-4 lg:px-2 lg:scroll-px-2",
          "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          fades.left && fades.right && "lg:[mask-image:linear-gradient(90deg,transparent,black_40px,black_calc(100%-40px),transparent)]",
          fades.left && !fades.right && "lg:[mask-image:linear-gradient(90deg,transparent,black_40px)]",
          !fades.left && fades.right && "lg:[mask-image:linear-gradient(90deg,black,black_calc(100%-40px),transparent)]"
        )}
      >
        {highlights.map((h) => (
          <FeaturedSlide key={h.id} highlight={h} />
        ))}
      </div>
      {/* Phones only: the active card is a 40px purple bar, the others 6px
          circles, iOS page-control style. Desktop fits the cards side by side
          (two or three 428px cards in the 1312px box), so there is nothing to
          page through and the row stays hidden (Scott, 2026-11-01). */}
      {overflows && (
        <div className="mt-4 flex justify-center gap-1.5 lg:hidden" role="tablist" aria-label="Featured cards">
          {highlights.map((h, i) => (
            <button
              key={h.id}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={`${h.title} (${i + 1} of ${highlights.length})`}
              onClick={() => goTo(i)}
              // The 24px-tall hit area is the button; the inner span draws the
              // 6px mark and grows into the bar when active.
              className="group flex h-6 cursor-pointer items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-purple"
            >
              <span
                className={cn(
                  "block h-1.5 rounded-full transition-[width,background-color] duration-150 ease-out motion-reduce:transition-none",
                  i === active ? "w-10 bg-dc-purple" : "w-1.5 bg-dc-purple/25 group-hover:bg-dc-purple/50"
                )}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * One hero card. `single` is the one-row case: full column width on phones, as
 * the section rendered before it became a carousel. In a row each card leaves
 * 20px of the column free, which with the 12px gap and the 16px gutter shows
 * 24px of the next card past the screen edge; desktop cards are a fixed 428px
 * either way (the Figma hero width).
 */
function FeaturedSlide({ highlight, single = false }: { highlight: Announcement; single?: boolean }) {
  const { title, message, url } = highlight;
  const { failed, attempt, markFailed } = useRetryOnReconnect();
  // Treating a failed load as "no image" reuses the placeholder and the
  // light-on-photo / dark-on-panel text switch below, instead of showing a
  // broken image over unreadable text. Retries on reconnect.
  const image = failed ? null : highlight.image;
  const link = url ? resolveAnnouncementLink(url) : null;
  // Near-white on the glass circle over a photo (as the design has it); purple
  // on the solid white circle, where near-white would be invisible.
  const arrowColor = cn("size-4", image ? "text-dc-purple-fg" : "text-dc-purple");

  const body = (
    <>
      {image ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={attempt}
            src={image}
            onError={markFailed}
            // See Avatar.tsx: CORS keeps these out of the opaque-response
            // quota padding that can wipe the whole image cache.
            crossOrigin="anonymous"
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-x-0 bottom-0 h-[120px] bg-gradient-to-t from-black from-[14%] to-transparent" />
        </>
      ) : (
        // A highlight can have no image; light text would vanish on a photo-less
        // card, so it falls back to the lavender panel the carousel uses.
        <div className="absolute inset-0 flex items-center justify-center bg-dc-lavender">
          <Sparkle className="size-8 text-dc-purple/40" />
        </div>
      )}

      {link && (
        <div
          className={cn(
            "absolute right-4 top-4 flex size-9 items-center justify-center rounded-full transition-colors duration-150 ease-out",
            image
              ? "bg-white/20 shadow-[inset_0_0_1px_rgba(255,255,255,0.66)] backdrop-blur-[1.5px] group-hover:bg-white/30"
              : "bg-white shadow-sm group-hover:bg-white/90"
          )}
        >
          {link.external ? (
            <ArrowUpRight className={arrowColor} />
          ) : (
            <ArrowRight className={arrowColor} />
          )}
        </div>
      )}

      <div className="relative">
        <p
          className={cn(
            "font-heading text-lg font-bold tracking-[-0.5px]",
            image ? "text-dc-purple-fg" : "text-dc-fg2"
          )}
        >
          {title}
        </p>
        {message && (
          <p
            className={cn(
              "mt-1 font-heading text-sm leading-5",
              image ? "text-dc-purple-fg" : "text-dc-muted"
            )}
          >
            {message}
          </p>
        )}
      </div>
    </>
  );

  const shell = cn(
    "group relative flex h-80 shrink-0 snap-start flex-col justify-end overflow-hidden rounded-xl border border-dc-hairline p-4 lg:h-[280px] lg:w-[428px]",
    single ? "w-full" : "w-[calc(100%-20px)]",
    link &&
      "transition-[scale,box-shadow] duration-150 ease-out hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-purple motion-safe:hover:scale-[1.03] motion-safe:active:scale-[0.97]"
  );

  // A highlight without a URL is still worth showing, just inert — the same
  // rule the announcement cards follow.
  if (!link) return <div className={shell}>{body}</div>;
  if (link.external) {
    return (
      <a href={link.href} target="_blank" rel="noopener noreferrer" className={shell}>
        {body}
      </a>
    );
  }
  return (
    <Link href={link.href} className={shell}>
      {body}
    </Link>
  );
}
