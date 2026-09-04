"use client";

import { CalendarPlus } from "lucide-react";
import type { Session as SessionModel } from "@/data/models";
import { HeaderActionsPortal } from "@/components/DetailLayer";
import { ShareButton } from "@/components/ShareButton";
import {
  SessionDetailsContent,
  downloadSessionIcs,
} from "./SessionDetailsContent";
import { SessionQA } from "./SessionQA";

/**
 * Full session details (the mobile detail layer's body). Renders from the
 * in-memory session; nothing is fetched. The Share and "Add to calendar"
 * circles are portaled into the app header (Figma fullscreen session details
 * keeps the actions top-right in the 56px bar).
 */
export function SessionDetailsView({ session }: { session: SessionModel }) {
  return (
    <div className="font-heading text-dc-fg">
      <HeaderActions session={session} />
      <SessionDetailsContent session={session}>
        <SessionQA sessionId={session.id} />
      </SessionDetailsContent>
    </div>
  );
}

function HeaderActions({ session }: { session: SessionModel }) {
  return (
    <HeaderActionsPortal>
      <ShareButton kind="session" id={session.id} title={session.title} />
      <button
        onClick={() => downloadSessionIcs(session)}
        aria-label="Add to calendar"
        className="flex size-8 cursor-pointer items-center justify-center rounded-full border border-dc-hairline bg-white"
      >
        <CalendarPlus className="size-4 text-dc-purple" />
      </button>
    </HeaderActionsPortal>
  );
}
