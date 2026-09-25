"use client";

import { ArrowRight, ArrowUpRight } from "lucide-react";
import { GhostLinkButton, PrimaryLinkButton } from "@/components/Buttons";
import { HUBS_PARAM } from "@/data/store/schedule-source";
import { useRetryOnReconnect } from "@/hooks/useRetryOnReconnect";

/**
 * Home entry to the Community Hubs' programmes (Figma 5171:433 desktop,
 * 5174:1013 mobile): a section title like the page's others, then a card
 * with a photo collage of past hubs under a translucent tent mark. Mobile
 * stacks it (photo on top, text below, full-width CTAs); desktop lays it
 * out in a row with the photo on the right. The photo fades into the card
 * with a mask (bottom edge on mobile, left edge on desktop) rather than a
 * white overlay, so the card's gradient shows through.
 */
export function CommunityHubsCard() {
  // Retries when the connection returns: a static image that failed while
  // offline otherwise stays blank for the page's life (see Tickets.tsx).
  const { attempt, markFailed } = useRetryOnReconnect();

  return (
    <section aria-labelledby="home-community-hubs-title">
      <h2
        id="home-community-hubs-title"
        className="mb-4 text-[20px] font-bold leading-[28.8px] tracking-[-0.5px] text-dc-fg2"
      >
        Community Hubs
      </h2>
      <div className="flex flex-col overflow-clip rounded-xl border border-dc-hairline bg-gradient-to-t from-[#fbfafc] from-20% to-[#fff5fa] shadow-[0_10px_15px_-3px_rgba(22,11,43,0.1),0_4px_6px_-4px_rgba(22,11,43,0.1)] lg:flex-row lg:items-center lg:gap-8 lg:pl-6">
        {/* Photo: 256px tall full-width band on mobile, 503×225 on the right
            on desktop. */}
        <div className="relative h-[256px] w-full shrink-0 lg:order-last lg:h-[225px] lg:w-[503px] lg:max-w-[45%]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={attempt}
            src="/home/community-hubs.jpg"
            onError={markFailed}
            alt=""
            className="absolute inset-0 size-full object-cover [mask-image:linear-gradient(to_top,transparent,black_48px)] lg:[mask-image:linear-gradient(to_right,transparent,black_64px)]"
          />
          {/* Tent mark: a 1px backdrop blur cut to the tent's shape (the
              solid Figma export as a mask; an <img> can't blur what's behind
              it), under the 40% white tent itself. */}
          <div className="absolute inset-0 m-auto h-[182.811px] w-[201.562px]">
            <div className="absolute inset-0 backdrop-blur-[1px] [mask-image:url(/home/community-hubs-tent-mask.svg)] [mask-size:100%_100%] [mask-repeat:no-repeat]" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/home/community-hubs-tent.svg"
              alt=""
              width={201.562}
              height={182.811}
              className="absolute inset-0"
            />
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-4 p-5 lg:flex-1 lg:p-0">
          <div className="flex flex-col gap-1">
            <h3 className="text-[20px] font-bold leading-[28.8px] tracking-[-0.5px] text-dc-fg2">
              Discover Community Hubs in the Devcon app
            </h3>
            <p className="text-[14px] leading-5 text-dc-muted lg:text-[16px] lg:leading-6">
              Community-run spaces inside Devcon, each with their own focus
              area and programming.
            </p>
          </div>
          <div className="flex flex-col gap-3 lg:flex-row">
            <PrimaryLinkButton size="sm" href={`/schedule?${HUBS_PARAM}=1`}>
              View Community Hubs
              <ArrowRight className="size-4 shrink-0" />
            </PrimaryLinkButton>
            <GhostLinkButton href="/community-hubs">
              View on Fileverse
              <ArrowUpRight className="size-4 shrink-0" />
            </GhostLinkButton>
          </div>
        </div>
      </div>
    </section>
  );
}
