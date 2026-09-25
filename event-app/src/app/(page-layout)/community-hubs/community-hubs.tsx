"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { ExternalLink, Tent } from "lucide-react";
import { Link, useRouter } from "@/routing";
import {
  COMMUNITY_HUBS,
  communityHubEmbedUrl,
  defaultCommunityHub,
  findCommunityHub,
  type CommunityHub,
} from "@/data/communityHubs";

/**
 * Community Hubs: the hub's own dSheets programme, embedded. Desktop shows the
 * hub list beside the sheet; mobile puts a hub picker above it. Hubs without a
 * sheet yet are listed but show a placeholder.
 */
export default function CommunityHubs({ hubId }: { hubId?: string }) {
  const router = useRouter();
  const hub = findCommunityHub(hubId) ?? defaultCommunityHub();
  // Only hubs that have published a sheet are listed; the rest stay reachable by URL.
  const listedHubs = COMMUNITY_HUBS.filter((h) => h.sheetUrl);

  return (
    // `expand` leaves the layout's 680px reading column; the page then takes
    // the app's usual 1312px desktop width, like the schedule and tickets.
    <div className="expand">
      {/* Mobile is edge to edge (the sheet needs every pixel); desktop keeps the app's gutters. */}
      <div
        data-hub-page=""
        className="flex flex-col gap-2 py-2 font-heading lg:mx-auto lg:w-full lg:max-w-[1312px] lg:gap-6 lg:px-8 lg:py-8 xl:px-0"
      >
        <div className="hidden flex-col gap-2 lg:flex">
          {/* Mobile title comes from AppHeader (routeChrome); page h1 is desktop-only. */}
          <h1 className="text-[24px] font-extrabold leading-[28.8px] tracking-[-0.5px] text-dc-fg2">Community Hubs</h1>
          <p className="text-[14px] leading-5 text-dc-muted">
            Community-run spaces with their own programme across all four days. Each hub keeps its schedule in a
            shared sheet, shown here as the hub publishes it.
          </p>
        </div>

        {/* Mobile picker */}
        <label className="flex flex-col gap-1 px-4 lg:hidden">
          <select
            value={hub.id}
            onChange={(e) => router.push(`/community-hubs/${e.target.value}`)}
            className="h-11 rounded-xl border border-dc-hairline bg-white px-3 text-[15px] font-semibold text-dc-fg2"
          >
            {listedHubs.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        </label>

        <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-6">
          {/* Desktop hub list */}
          <nav aria-label="Community hubs" className="hidden lg:block">
            <ul className="flex flex-col gap-1 rounded-xl border border-dc-hairline bg-white p-2">
              {listedHubs.map((h) => (
                <HubItem key={h.id} hub={h} active={h.id === hub.id} />
              ))}
            </ul>
          </nav>

          <HubPanel hub={hub} />
        </div>
      </div>
    </div>
  );
}

function HubItem({ hub, active }: { hub: CommunityHub; active: boolean }) {
  return (
    <li>
      <Link
        href={`/community-hubs/${hub.id}`}
        aria-current={active ? "page" : undefined}
        className={`flex flex-col gap-0.5 rounded-lg px-3 py-2 transition-colors ${
          active ? "bg-dc-purple-wash text-dc-purple" : "text-dc-fg2 hover:bg-dc-purple-wash/60"
        }`}
      >
        <span className="text-[14px] font-semibold leading-5">{hub.name}</span>
      </Link>
    </li>
  );
}

const MIN_FRAME_HEIGHT = 320;

/**
 * Height that runs from the iframe's top edge to the top of the bottom bar
 * (or the viewport bottom on desktop, where the bar is hidden), measured
 * with the page scrolled to the top so the page never needs to scroll.
 */
function useFrameHeight(ref: React.RefObject<HTMLElement | null>): number | null {
  const [height, setHeight] = useState<number | null>(null);
  useLayoutEffect(() => {
    const measure = () => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const top = rect.top + window.scrollY;
      const nav = document.querySelector<HTMLElement>("[data-bottom-nav]");
      const navHeight = nav ? nav.getBoundingClientRect().height : 0;
      // Whatever the page renders after the frame (desktop bottom padding,
      // panel border) also has to fit, or the page scrolls by that much.
      const wrapper = el.closest<HTMLElement>("[data-hub-page]");
      const below = wrapper ? Math.max(0, wrapper.getBoundingClientRect().bottom - rect.bottom) : 0;
      const viewport = window.visualViewport?.height ?? window.innerHeight;
      setHeight(Math.max(MIN_FRAME_HEIGHT, Math.floor(viewport - top - navHeight - below)));
    };
    measure();
    // Fonts and the header settle after first paint; measure once more.
    const raf = requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    window.visualViewport?.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
      window.visualViewport?.removeEventListener("resize", measure);
    };
  }, [ref]);
  return height;
}

function HubPanel({ hub }: { hub: CommunityHub }) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const frameHeight = useFrameHeight(frameRef);
  return (
    <section className="flex min-w-0 flex-col overflow-hidden border-y border-dc-hairline bg-white lg:rounded-xl lg:border">
      <header className="flex items-start justify-between gap-3 border-b border-dc-hairline px-4 py-2 lg:py-3">
        <div className="min-w-0">
          <h2 className="truncate text-[16px] font-bold leading-6 text-dc-fg2">{hub.name}</h2>
          <p className="hidden text-[13px] leading-5 text-dc-muted lg:block">{hub.description}</p>
        </div>
        {hub.sheetUrl && (
          <a
            href={hub.sheetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex shrink-0 items-center gap-1 text-[13px] font-semibold text-dc-purple"
          >
            Open sheet
            <ExternalLink className="size-3.5" />
          </a>
        )}
      </header>
      {hub.sheetUrl ? (
        <iframe
          key={hub.id}
          ref={frameRef}
          src={communityHubEmbedUrl(hub.sheetUrl)}
          title={`${hub.name} schedule`}
          loading="lazy"
          // Class heights only cover the first paint; the measured height
          // fills exactly to the bottom bar (mobile) or viewport (desktop).
          className="h-[calc(100dvh-13rem)] w-full bg-white lg:h-[calc(100dvh-14rem)]"
          style={frameHeight ? { height: frameHeight } : undefined}
        />
      ) : (
        <div className="flex h-[40dvh] min-h-[280px] flex-col items-center justify-center gap-2 px-6 text-center text-dc-muted">
          <Tent className="size-8" />
          <p className="text-[14px] leading-5">This hub has not published its schedule yet. Check back closer to Devcon.</p>
        </div>
      )}
    </section>
  );
}
