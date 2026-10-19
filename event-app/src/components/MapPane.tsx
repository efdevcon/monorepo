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

const inlineLink = "font-bold text-dc-purple underline underline-offset-2 hover:no-underline";

/** The app's centred state recipe (StateMessage) on the app gradient, as the
 *  error and offline pages use; centred between the header and the tab bar. */
function MapComingSoon() {
  return (
    <div className="flex flex-1 items-center justify-center pb-[var(--nav-clearance)] pt-16">
      <div className="app-bg" aria-hidden />
      <StateMessage
        icon={MapIcon}
        title="The venue map is on its way"
        body={
          <>
            We&apos;re putting the finishing touches on the event map. Check out the{" "}
            <Link href="/schedule" className={inlineLink}>
              Schedule
            </Link>{" "}
            to plan your days and add your tickets and swag in{" "}
            <Link href="/my-devcon" className={inlineLink}>
              My Devcon
            </Link>
            .
          </>
        }
      />
    </div>
  );
}
