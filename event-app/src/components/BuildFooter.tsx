"use client";

import { useState } from "react";
import cn from "classnames";
import { buildInfo } from "@/data/build";
import { refreshApp, useUpdateDebug } from "@/components/ServiceWorkerUpdater";

/**
 * Bottom of My Devcon, for everyone: one quiet line with the build this
 * device runs and when it was made, and a "Refresh" that checks for a new
 * build, applies one that is waiting (ServiceWorkerUpdater) and otherwise
 * reloads. The link reads "Update", in purple, while a newer build is
 * already waiting on this device, so the footnote doubles as the quiet hint
 * that a tap brings the new version. Deliberately minimal otherwise. The
 * full line with the deploy context lives in the EF internal tools.
 */
export function BuildFooter() {
  const [busy, setBusy] = useState(false);
  const { waiting } = useUpdateDebug();
  const { build, time } = buildInfo();
  // Stored timestamp, not "now": viewer-local formatting is right here.
  const when = time
    ? new Date(time).toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })
    : null;
  const refresh = async () => {
    setBusy(true);
    try {
      await refreshApp();
    } finally {
      // Normally the page is gone by now; if not, let them try again.
      setBusy(false);
    }
  };
  return (
    <footer className="mt-10 text-center font-heading text-[11px] leading-4 text-dc-muted">
      <span className="tabular-nums">Version {build}</span>
      {when && <span> · {when}</span>}
      <span> · </span>
      <button
        type="button"
        onClick={() => void refresh()}
        disabled={busy}
        className={cn(
          "cursor-pointer underline underline-offset-2 hover:text-dc-purple disabled:cursor-default disabled:no-underline",
          waiting && "font-bold text-dc-purple"
        )}
      >
        {busy ? (waiting ? "Updating…" : "Refreshing…") : waiting ? "Update" : "Refresh"}
      </button>
    </footer>
  );
}
