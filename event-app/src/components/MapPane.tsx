"use client";

import React from "react";
import { VenueMap } from "@/app/(page-layout)/map/venue-map/VenueMap";

/**
 * The venue map tab (rendered by TabPanes; the /map route page renders
 * nothing). Fullscreen canvas: the map fills the entire viewport and sits
 * behind the floating nav (nav is z-30), so the app chrome appears to overlay
 * the map.
 */
export function MapPane() {
  return (
    <div className="fixed inset-0 z-0 flex">
      <React.Suspense
        fallback={<div className="p-8 text-gray-500">Loading map…</div>}
      >
        <VenueMap />
      </React.Suspense>
    </div>
  );
}
