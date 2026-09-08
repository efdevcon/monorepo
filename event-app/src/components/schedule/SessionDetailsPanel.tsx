"use client";

import { Maximize2 } from "lucide-react";
import type { Session } from "@/data/models";
import { CloseButton } from "@/components/Buttons";
import { ShareButton } from "@/components/ShareButton";
import { openDetail } from "@/routing/detailRoute";
import { SessionDetailsContent } from "./SessionDetailsContent";

/**
 * Desktop session-details side panel (Figma "Session Details - Side Menu"):
 * a 360px right column rendered from the in-memory session (no extra fetch).
 * The white header carries expand (the fullscreen page `/schedule/<id>`,
 * opened in place), share and close. Mobile renders the fullscreen page
 * directly (schedule/[id]/session.tsx).
 */
export function SessionDetailsPanel({
  session,
  onClose,
}: {
  session: Session;
  onClose: () => void;
}) {
  return (
    // The var (set by Schedule's scroll handler) keeps a 16px gap to the
    // viewport bottom as the sticky aside pins — same growth behavior as the
    // speakers panel. The fallback matches the resting 141px natural offset
    // (nav + page title) + that 16px clearance.
    <div className="flex max-h-[var(--schedule-panel-max-h,calc(100dvh-157px-var(--safe-top)))] min-h-0 flex-col overflow-clip rounded-xl border border-dc-hairline bg-dc-panel">
      <div className="flex shrink-0 items-center justify-between gap-4 border-b border-dc-hairline bg-white p-4">
        <span className="text-[20px] font-bold leading-[28.8px] tracking-[-0.5px] text-dc-fg2">
          Session
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => openDetail("session", session.id)}
            aria-label="Expand session details"
            // CloseButton's circular recipe (Buttons.tsx), same as ShareButton's
            // panel variant.
            className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full bg-dc-panel transition-colors duration-150 ease-out hover:bg-dc-purple-soft"
          >
            <Maximize2 className="size-4 text-dc-fg2" />
          </button>
          <ShareButton
            kind="session"
            id={session.id}
            title={session.title}
            variant="panel"
          />
          <CloseButton onClick={onClose} aria-label="Close session details" />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <SessionDetailsContent session={session}>
          {/* Q&A teaser per design; the full Q&A flow lives in the mobile view */}
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
