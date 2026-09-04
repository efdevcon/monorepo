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
        "flex items-center gap-2 rounded-lg border border-dc-hairline bg-white px-3 py-2 text-[14px] leading-5 text-dc-muted",
        className
      )}
    >
      <CloudOff className="size-4 shrink-0 text-dc-purple" />
      {what} needs a connection.
    </p>
  );
}
