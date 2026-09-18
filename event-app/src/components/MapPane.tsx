"use client";

import React from "react";
import { VenueMap3D } from "@/app/(page-layout)/map/venue-map-3d/VenueMap3D";

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
        <VenueMap3D />
      </React.Suspense>
    </div>
  );
}
