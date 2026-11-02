"use client";

import { RefreshCw } from "lucide-react";
import cn from "classnames";
import { useQuietUpdating } from "@/components/ServiceWorkerUpdater";

/**
 * "Updating" pill in the app header, the offline pill's twin, shown only
 * while a quiet app update is switching this page over (ServiceWorkerUpdater:
 * launch, return after a minute away, hidden tab, TV). The switch ends in a
 * reload within a few seconds, so this is the one hint that the refresh the
 * person is about to see is the app updating, not a glitch. A clicked Update
 * has the toast's own "Updating" face instead, so this stays hidden for it.
 */
export function UpdatingIndicator({
  iconOnly = false,
}: {
  /** Toolbar rows have no room for the label: icon only, words in the tooltip. */
  iconOnly?: boolean;
}) {
  const updating = useQuietUpdating();
  if (!updating) return null;
  const label = "Updating the app";
  return (
    <span
      role="status"
      aria-live="polite"
      aria-label={label}
      title={label}
      className={cn(
        "flex h-8 shrink-0 select-none items-center gap-1.5 rounded-full bg-dc-purple-wash font-heading text-[14px] font-medium leading-none text-dc-purple",
        iconOnly ? "w-8 justify-center" : "px-3"
      )}
    >
      <RefreshCw className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
      {!iconOnly && <span aria-hidden>Updating</span>}
    </span>
  );
}
