"use client";

import { ArrowRight, ArrowUpRight, Sparkle } from "lucide-react";
import cn from "classnames";
import APP_CONFIG from "@/CONFIG";
import { Link } from "@/routing";
import { useAnnouncements } from "@/data/announcements/useAnnouncements";
import { useRetryOnReconnect } from "@/hooks/useRetryOnReconnect";
import { resolveAnnouncementLink } from "@/data/announcements/linkUtils";

/**
 * "Featured" section: the home-screen hero, driven by whichever highlight has
 * Featured ticked in Notion (see `useAnnouncements` for how one is chosen).
 *
 * This used to be a hardcoded card, which made the most prominent slot on the
 * home screen the one thing editors couldn't change without a deploy — exactly
 * the slot you want to retarget mid-event.
 *
 * Renders nothing when there's no highlight to show (announcements switched
 * off, an empty Notion DB, or a fresh install that hasn't synced yet), the same
 * way the announcements and highlights sections below it drop out when empty.
 */
export function FeaturedCard() {
  const { featured } = useAnnouncements({
    enabled: APP_CONFIG.ANNOUNCEMENTS_ENABLED,
  });
  const { failed, attempt, markFailed } = useRetryOnReconnect();

  if (!featured) return null;

  const { title, message, url } = featured;
  // Treating a failed load as "no image" reuses the placeholder and the
  // light-on-photo / dark-on-panel text switch below, instead of showing a
  // broken image over unreadable text. Retries on reconnect.
  const image = failed ? null : featured.image;
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
    "group relative flex h-[208px] w-full flex-col justify-end overflow-hidden rounded-xl border border-dc-hairline p-4 lg:h-60 lg:max-w-[400px]",
    link &&
      "transition-[scale,box-shadow] duration-150 ease-out hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-purple motion-safe:hover:scale-[1.03] motion-safe:active:scale-[0.97]"
  );

  return (
    <section>
      <h2 className="mb-4 text-[20px] font-bold leading-[28.8px] tracking-[-0.5px] text-dc-fg2">
        Featured
      </h2>
      {/* A highlight without a URL is still worth showing, just inert — the
          same rule the announcement cards follow. */}
      {!link ? (
        <div className={shell}>{body}</div>
      ) : link.external ? (
        <a
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className={shell}
        >
          {body}
        </a>
      ) : (
        <Link href={link.href} className={shell}>
          {body}
        </Link>
      )}
    </section>
  );
}
