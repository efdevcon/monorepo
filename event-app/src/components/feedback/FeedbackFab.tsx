"use client";

import cn from "classnames";
import { MessageSquarePlus } from "lucide-react";
import { usePathname } from "next/navigation";
import { openFeedback } from "@/data/feedback/feedbackState";

/**
 * Floating "Send feedback" button on every page, in the corner the old
 * debug button used: bottom-left, clear of the tab bar. The schedule (its
 * list/timeline toggle) and the map (filters, 3D controls) already own that
 * corner on phones, so there it stacks one control higher; on desktop the
 * map docks it top-left under the 3D map's own tools, like the old tool did.
 * Not on the room screens, which are unattended stage displays.
 */
export function FeedbackFab() {
  const pathname = usePathname();
  if (pathname.startsWith("/room-screens")) return null;
  const onMap = pathname.startsWith("/map");
  const stacked = onMap || pathname.startsWith("/schedule");

  return (
    <button
      type="button"
      aria-label="Send feedback"
      onClick={() => openFeedback({ source: "feedback" })}
      className={cn(
        "fixed z-40 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-dc-purple text-white shadow-[0_4px_12px_rgba(22,11,43,0.25)] transition-transform hover:scale-105 motion-reduce:transition-none",
        stacked ? "bottom-[calc(var(--nav-clearance)+72px)] left-4" : "bottom-[calc(var(--nav-clearance)+48px)] left-4",
        onMap ? "lg:bottom-auto lg:left-6 lg:top-[136px]" : "lg:bottom-4"
      )}
    >
      <MessageSquarePlus className="size-5" />
    </button>
  );
}
