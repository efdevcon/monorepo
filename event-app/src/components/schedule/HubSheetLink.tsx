"use client";

import { ArrowUpRight } from "lucide-react";
import type { Session } from "@/data/models";
import { Link } from "@/routing";
import { communityHubIdFromRoom, findCommunityHub } from "@/data/communityHubs";

/**
 * "Hub details": takes the Q&A slot on a Community Hub session (hub sessions
 * have no Meerkat room; their source of truth is the hub's own sheet). Same
 * shape as the Speakers section beside it: its heading (`sm` the side
 * panel's 14px caption, `md` the 16px page heading), then a full-width card
 * with the hub's name in the speaker card's name style; the whole card
 * links to the sheet, labelled under the copy.
 */
export function HubSheetLink({ session, size = "md" }: { session: Session; size?: "sm" | "md" }) {
  const hubId = communityHubIdFromRoom(session.room?.id);
  const hub = findCommunityHub(hubId);
  if (!hubId) return null;
  return (
    <section className="flex flex-col gap-3">
      {size === "md" ? (
        <h2 className="text-[16px] font-bold leading-6 text-dc-fg">Hub details</h2>
      ) : (
        <h2 className="text-[14px] font-bold leading-5 text-dc-fg2">Hub details</h2>
      )}
      {/* The whole card is the link (like the speaker cards beside it);
          "View on Fileverse" is its visible label. */}
      <Link
        href={`/community-hubs/${encodeURIComponent(hubId)}`}
        className="group flex flex-col gap-1 rounded-lg border border-dc-hairline bg-white p-3 transition-colors hover:border-dc-purple/40"
      >
        <p className="truncate text-[14px] font-bold leading-5 text-dc-fg">{hub?.name ?? session.room?.name}</p>
        <p className="text-[12px] leading-4 text-dc-muted">
          All programming is organized by the hub. View more details on their Fileverse sheet.
        </p>
        <span className="mt-2 flex w-fit items-center gap-1 text-[13px] font-semibold text-dc-purple group-hover:underline">
          View on Fileverse
          <ArrowUpRight className="size-3.5" />
        </span>
      </Link>
    </section>
  );
}
