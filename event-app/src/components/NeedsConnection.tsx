"use client";

import { CloudOff } from "lucide-react";
import cn from "classnames";

/**
 * The one offline state for live-only features (Q&A, streams, chat, sign-in,
 * push, ticket refresh): a quiet inline line instead of a spinner or a red
 * error. Callers gate on `useOnline()` and render this in the feature's slot,
 * so the layout doesn't jump when the connection returns.
 */
export function NeedsConnection({
  what,
  className,
}: {
  what: string;
  className?: string;
}) {
  return (
    <p
      role="status"
      className={cn(
        // Same recipe as the header's offline pill (OfflineIndicator):
        // orange on a soft fill, no border, so it reads as status, not a button.
        "flex items-center gap-2 rounded-lg bg-dc-offline-bg px-3 py-2 font-heading text-[14px] font-medium leading-5 text-dc-offline",
        className
      )}
    >
      <CloudOff className="size-4 shrink-0" aria-hidden />
      {/* Left-aligned even inside centred states: a wrapped line stays
          beside its icon. */}
      <span className="text-left">{what} needs a connection.</span>
    </p>
  );
}
