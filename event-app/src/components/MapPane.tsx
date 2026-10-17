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

const inlineLink = "font-bold text-dc-purple underline underline-offset-2";

function MapComingSoon() {
  return (
    <div className="flex flex-1 items-center justify-center bg-dc-lavender px-4 pb-[var(--nav-clearance)] pt-16">
      <div className="flex w-full max-w-[420px] flex-col items-center gap-4 rounded-[12px] bg-white px-6 py-8 text-center outline outline-dc-hairline">
        <div className="flex size-14 items-center justify-center rounded-full bg-dc-purple-wash">
          <MapIcon className="size-7 text-dc-purple" />
        </div>
        <h2 className="text-[20px] font-bold leading-7 text-dc-fg2">The venue map is on its way</h2>
        <p className="text-[14px] leading-5 text-dc-muted">
          We&apos;re putting the finishing touches on it. Meanwhile, plan your days in the{" "}
          <Link href="/schedule" className={inlineLink}>
            Schedule
          </Link>{" "}
          and add your ticket in{" "}
          <Link href="/my-devcon" className={inlineLink}>
            My Devcon
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
