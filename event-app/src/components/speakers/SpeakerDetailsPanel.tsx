"use client";

import { Maximize2 } from "lucide-react";
import { Link } from "@/routing";
import { CloseButton } from "@/components/Buttons";
import type { DecoratedSpeaker } from "./useSpeakersData";
import { SpeakerDetailsContent } from "./SpeakerDetailsContent";

/**
 * Desktop speaker-details side panel (Figma "Speaker details - Side Menu"):
 * a 360px right column rendered from the in-memory join (no extra fetch).
 * The white header carries both actions — an expand icon that navigates to
 * the full /speakers/[id] page and the close circle — so the body needs no
 * footer bar (PR #112 feedback: avoid unnecessary scroll). Mobile uses the
 * full page directly.
 */
export function SpeakerDetailsPanel({
  decorated,
  onClose,
}: {
  decorated: DecoratedSpeaker;
  onClose: () => void;
}) {
  return (
    // The var (set by Speakers' scroll handler) keeps a 16px gap to the
    // viewport bottom as the sticky aside pins — the same gap the top edge
    // gets from the header (sticky top-[81px] under the 65px header), so
    // both ends of the panel match. The fallback matches the resting 141px
    // natural offset (nav + page title) + that 16px clearance.
    <div className="flex max-h-[var(--speaker-panel-max-h,calc(100dvh-157px))] min-h-0 flex-col overflow-clip rounded-xl border border-dc-hairline bg-dc-panel">
      <div className="flex shrink-0 items-center justify-between gap-4 border-b border-dc-hairline bg-white p-4">
        <span className="text-[20px] font-bold leading-[28.8px] tracking-[-0.5px] text-dc-fg2">
          Speaker
        </span>
        <div className="flex items-center gap-2">
          <Link
            href={`/speakers/${decorated.speaker.id}`}
            aria-label="Expand speaker details"
            // CloseButton's circular recipe (Buttons.tsx) on a Link — the
            // header-icon primitives are <button>-only.
            className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full bg-dc-panel transition-colors duration-150 ease-out hover:bg-dc-purple-soft"
          >
            <Maximize2 className="size-4 text-dc-fg2" />
          </Link>
          <CloseButton onClick={onClose} aria-label="Close speaker details" />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <SpeakerDetailsContent decorated={decorated} />
      </div>
    </div>
  );
}
