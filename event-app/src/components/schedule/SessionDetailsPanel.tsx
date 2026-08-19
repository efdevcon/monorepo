"use client";

import type { Session } from "@/data/models";
import { CloseButton } from "@/components/Buttons";
import { SessionDetailsContent } from "./SessionDetailsContent";

/**
 * Desktop session-details side panel (Figma "Session Details - Side Menu"):
 * a 360px right column rendered from the in-memory session (no extra fetch),
 * with the white header + close. The mobile flow uses /schedule/[id] instead.
 */
export function SessionDetailsPanel({
  session,
  onClose,
}: {
  session: Session;
  onClose: () => void;
}) {
  return (
    // 141px natural offset (nav + page title) + 32px bottom clearance
    <div className="flex max-h-[calc(100dvh-173px)] min-h-0 flex-col overflow-clip rounded-xl border border-dc-hairline bg-dc-panel">
      <div className="flex shrink-0 items-center justify-between gap-4 border-b border-dc-hairline bg-white p-4">
        <span className="text-[20px] font-bold leading-[28.8px] tracking-[-0.5px] text-dc-fg2">
          Session
        </span>
        <CloseButton onClick={onClose} aria-label="Close session details" />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <SessionDetailsContent session={session}>
          {/* Q&A teaser per design; the full Q&A flow lives on the session page */}
          <div className="flex flex-col gap-3">
            <h2 className="text-[14px] leading-5 text-dc-fg2">
              <span className="font-bold">Live Q&amp;A</span> – Powered by
              Meerkat
            </h2>
            <div className="h-[364px] w-full rounded-lg bg-[#dfdfdf]" />
          </div>
        </SessionDetailsContent>
      </div>
    </div>
  );
}
