"use client";

import React from "react";
import { Map as MapIcon } from "lucide-react";
import { VenueMap3D } from "@/app/(page-layout)/map/venue-map-3d/VenueMap3D";
import { useUser } from "@/data/auth/useUser";
import { useReleased } from "@/data/release/releaseGates";
import { Link } from "@/routing";

/**
 * The venue map tab (rendered by TabPanes; the /map route page renders
 * nothing). Fullscreen canvas: the map fills the entire viewport and sits
 * behind the floating nav (nav is z-30), so the app chrome appears to overlay
 * the map.
 *
 * Until RELEASED.venueMap, everyone gets MapComingSoon instead (the tab and
 * every "on map" link stay, as Devconnect's app did with its map); the team
 * turns the real map on per device in EF internal tools.
 */
export function MapPane() {
  const { hasInitialized } = useUser();
  const released = useReleased("venueMap");

  return (
    <div className="fixed inset-0 z-0 flex">
      {!hasInitialized ? (
        <MapLoading />
      ) : released ? (
        <React.Suspense fallback={<MapLoading />}>
          <VenueMap3D />
        </React.Suspense>
      ) : (
        <MapComingSoon />
      )}
    </div>
  );
}

function MapLoading() {
  return <div className="p-8 text-gray-500">Loading map…</div>;
}

const inlineLink = "whitespace-nowrap font-bold text-dc-purple underline underline-offset-2 hover:no-underline";

/** The centred state recipe's parts (64px lavender circle, 28px purple mark,
 *  20px heading, 16px muted lines) laid out by hand in a white hairline card,
 *  since its gaps differ from StateMessage's: 16px under the title, 8px
 *  between the two lines. Centred between the header and the tab bar. */
function MapComingSoon() {
  return (
    <div className="flex flex-1 items-center justify-center px-4 pb-[var(--nav-clearance)] pt-16">
      <div className="app-bg" aria-hidden />
      <div className="flex w-full max-w-[480px] flex-col items-center gap-6 rounded-[12px] bg-white p-8 text-center font-heading outline outline-dc-hairline">
        <span className="flex size-16 items-center justify-center rounded-full bg-dc-lavender">
          <MapIcon className="size-7 text-dc-purple" aria-hidden />
        </span>
        <div className="flex flex-col gap-4 text-dc-fg">
          <p className="text-[20px] font-bold leading-[28.8px] tracking-[-0.5px]">The venue map is on its way</p>
          <div className="flex flex-col gap-2 text-[16px] leading-6 text-dc-muted">
            <p>We&apos;re adding the finishing touches.</p>
            <p>
              In the meantime, plan your days in the{" "}
              <Link href="/schedule" className={inlineLink}>
                Schedule
              </Link>{" "}
              and add your tickets and swag in{" "}
              <Link href="/my-devcon" className={inlineLink}>
                My Devcon
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
