"use client";

import { ArrowRightToLine } from "lucide-react";
import { Link } from "@/routing";
import { CloseButton, SecondaryButton } from "@/components/Buttons";
import type { DecoratedSpeaker } from "./useSpeakersData";
import { SpeakerDetailsContent } from "./SpeakerDetailsContent";

/**
 * Desktop speaker-details side panel (Figma "Speaker details - Side Menu"):
 * a 360px right column rendered from the in-memory join (no extra fetch),
 * with the white header + close and a sticky footer whose "Expand details"
 * navigates to the full /speakers/[id] page. Mobile uses that page directly.
 */
export function SpeakerDetailsPanel({
  decorated,
  onClose,
}: {
  decorated: DecoratedSpeaker;
  onClose: () => void;
}) {
  return (
    // The var (set by Speakers' scroll handler) keeps a 32px gap to the
    // viewport bottom as the sticky aside pins; the fallback matches the
    // resting 141px natural offset (nav + page title) + 32px clearance.
    <div className="flex max-h-[var(--speaker-panel-max-h,calc(100dvh-173px))] min-h-0 flex-col overflow-clip rounded-xl border border-dc-hairline bg-dc-panel">
      <div className="flex shrink-0 items-center justify-between gap-4 border-b border-dc-hairline bg-white p-4">
        <span className="text-[20px] font-bold leading-[28.8px] tracking-[-0.5px] text-dc-fg2">
          Speaker
        </span>
        <CloseButton onClick={onClose} aria-label="Close speaker details" />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <SpeakerDetailsContent decorated={decorated} />
      </div>
      <div className="flex shrink-0 gap-3 border-t border-dc-hairline bg-white p-4">
        <SecondaryButton onClick={onClose}>
          <ArrowRightToLine className="size-4" />
          Close
        </SecondaryButton>
        <Link
          href={`/speakers/${decorated.speaker.id}`}
          // PrimaryButton's recipe (Buttons.tsx) on a Link — the CTA
          // primitives are <button>-only.
          className="flex flex-1 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-full bg-dc-purple px-8 py-3.5 text-[16px] font-bold leading-none text-dc-purple-fg transition-[scale,background-color] duration-150 ease-out hover:scale-[1.03] hover:bg-[#6730d5] active:scale-[0.97] motion-reduce:transform-none motion-reduce:transition-none"
        >
          Expand
        </Link>
      </div>
    </div>
  );
}
