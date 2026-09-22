"use client";

import { ExternalLink, Tent } from "lucide-react";
import type { Session } from "@/data/models";
import { Link } from "@/routing";
import { communityHubIdFromRoom, findCommunityHub } from "@/data/communityHubs";

/**
 * Takes the Q&A slot on a Community Hub session: hub sessions have no
 * Meerkat room, their source of truth is the hub's own sheet.
 */
export function HubSheetLink({ session, size = "md" }: { session: Session; size?: "sm" | "md" }) {
  const hubId = communityHubIdFromRoom(session.room?.id);
  const hub = findCommunityHub(hubId);
  if (!hubId) return null;
  return (
    <section className={size === "sm" ? "px-4 pb-4" : "px-4 py-2"}>
      <div className="flex items-center justify-between gap-3 rounded-xl border border-dc-hairline bg-white px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-dc-purple-wash text-dc-purple">
            <Tent className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold leading-5 text-dc-fg2">{hub?.name ?? session.room?.name}</p>
            <p className="text-[12px] leading-4 text-dc-muted">Programme run by the hub; details live in its sheet.</p>
          </div>
        </div>
        <Link
          href={`/community-hubs/${encodeURIComponent(hubId)}`}
          className="flex shrink-0 items-center gap-1 text-[13px] font-semibold text-dc-purple"
        >
          Full sheet
          <ExternalLink className="size-3.5" />
        </Link>
      </div>
    </section>
  );
}
