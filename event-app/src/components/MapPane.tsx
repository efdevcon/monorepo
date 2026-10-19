"use client";

import React from "react";
import { Map as MapIcon } from "lucide-react";
import { VenueMap3D } from "@/app/(page-layout)/map/venue-map-3d/VenueMap3D";
import { StateMessage } from "@/components/StateMessage";
import { useUser } from "@/data/auth/useUser";
import { useReleased } from "@/data/release/releaseGates";
import { Link } from "@/routing";

/**
 * The venue map tab (rendered by TabPanes; the /map route page renders
 * nothing). Fullscreen canvas: the map fills the entire viewport and sits
 * behind the floating nav (nav is z-30), so the app chrome appears to overlay
 * the map.
 *
 * Until RELEASED.venueMap, attendees get MapComingSoon instead (the tab and
 * every "on map" link stay, as Devconnect's app did with its map); the team
 * still gets the real map.
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

/** The app's centred state recipe (StateMessage) in a white hairline card on
 *  the app gradient; centred between the header and the tab bar. The pointer
 *  to the other tabs is its own paragraph in the action slot. */
function MapComingSoon() {
  return (
    <div className="flex flex-1 items-center justify-center px-4 pb-[var(--nav-clearance)] pt-16">
      <div className="app-bg" aria-hidden />
      {/* The card adds 8px to StateMessage's own 16px gutter: 24px sides, 40px top and bottom. */}
      <div className="w-full max-w-[420px] rounded-[12px] bg-white px-2 py-10 outline outline-dc-hairline">
        <StateMessage icon={MapIcon} title="The venue map is on its way" body="We're adding the finishing touches.">
          <p className="text-[16px] leading-6 text-dc-muted">
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
        </StateMessage>
      </div>
    </div>
  );
}
