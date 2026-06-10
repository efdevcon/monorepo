"use client";

import APP_CONFIG from "@/CONFIG";
import { Speakers as SpeakersView } from "@/components/speakers";

export default function Speakers() {
  if (!APP_CONFIG.SPEAKERS_ENABLED) {
    return <div className="p-4 text-gray-500">Speakers are not enabled</div>;
  }

  return <SpeakersView />;
}
