"use client";

import { useEffect, useState } from "react";
import cn from "classnames";
import { Download, RefreshCw } from "lucide-react";
import APP_CONFIG from "@/CONFIG";
import { updateApplyNow, updateCheckNow, useUpdateDebug } from "@/components/ServiceWorkerUpdater";
import { HIDDEN_DELAY_MS, TOAST_AFTER_MS } from "@/utils/silentUpdate";
import { quietPill } from "./DebugTools";

/**
 * The real wall clock, once a second. The worker's timers run on real time,
 * so this readout must too: the app's mockable clock would show countdowns
 * that no timer follows. Debug tooling only; everything else uses useNow.
 */
function useRealSeconds(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

const WORDS: Record<string, string> = {
  idle: "nothing to apply",
  available: "a new build is waiting",
  updating: "switching to the new build",
  slow: "switch taking longer than it should",
  kiosk: "TV screen",
  launch: "launch",
  hidden: "tab hidden",
  return: "back after a minute away",
  offline: "offline",
  changeover: "a session changeover",
  visible: "the tab was visible",
  "too-soon": "hidden for under a minute",
  media: "a stream or translation player",
  dialog: "an open sheet or dialog",
  typing: "text in a field",
};
const word = (key: string) => WORDS[key] ?? key;

/**
 * EF internal tools row: what the updater (ServiceWorkerUpdater.tsx) is doing
 * on this device, since quiet updates are invisible by design: worker status,
 * whether a new build waits, the check clock with a countdown, the rule that
 * applies here, the last deferral and the last automatic switch (kept across
 * the reload it causes), plus "Check now" and "Apply now".
 */
export function UpdateTools() {
  const d = useUpdateDebug();
  const now = useRealSeconds();
  const time = (ms: number) => new Date(ms).toLocaleTimeString();
  const ago = (ms: number) => `${Math.max(0, Math.round((now - ms) / 1000))} s ago`;
  const until = (ms: number) => `${Math.max(0, Math.round((ms - now) / 1000))} s`;

  if (!d.supported) {
    return (
      <div className="mt-3 rounded-md border border-dc-hairline bg-white p-3 text-[12px] leading-4 text-dc-muted">
        No service worker here: under <code>pnpm dev</code> updates are off, and the toast only appears in production builds.
      </div>
    );
  }

  const rule = d.kiosk
    ? `This screen applies a waiting build as soon as it is online and no session changes over within two minutes${APP_CONFIG.KIOSK_AUTO_UPDATE ? "" : " (switched off in CONFIG)"}.`
    : `A waiting build applies at the next launch${APP_CONFIG.SILENT_UPDATE_LAUNCH ? "" : " (off)"}, ${HIDDEN_DELAY_MS / 1000} s after the app goes to the background, or when it comes back to the front after at least ${HIDDEN_DELAY_MS / 1000} s away${APP_CONFIG.SILENT_UPDATE_HIDDEN ? "" : " (off)"}, with no player, sheet or typing on the page. While the app stays in front nothing switches; the toast comes after ${TOAST_AFTER_MS / 3_600_000} h.`;

  return (
    <div className="mt-3 rounded-md border border-dc-hairline bg-white p-3 text-[12px] leading-4 text-dc-muted">
      <p className="text-[14px] leading-5 text-dc-fg2">
        New build waiting:{" "}
        <span className={cn("font-semibold", d.waiting ? "text-dc-purple" : "")}>{d.waiting ? "yes" : "no"}</span>
        {" · "}updater: {word(d.state)}
      </p>
      <p>
        worker {d.controlled ? "controls this page" : "not controlling this page yet"} ·{" "}
        {d.lastCheckAt ? `last check ${time(d.lastCheckAt)} (${ago(d.lastCheckAt)})` : "no check yet"} ·{" "}
        {d.nextCheckAt ? `next in ${until(d.nextCheckAt)}` : "next check pending"}
      </p>
      <p className="mt-1">{rule}</p>
      {d.hiddenSince !== null && <p>hidden since {time(d.hiddenSince)}</p>}
      {d.lastDefer && (
        <p>
          last held back: {word(d.lastDefer.reason)} at {time(d.lastDefer.at)}
        </p>
      )}
      {d.lastRequest && (
        <p>
          last automatic switch: {word(d.lastRequest.trigger)} at {time(d.lastRequest.at)}
        </p>
      )}
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" onClick={updateCheckNow} className={quietPill}>
          <RefreshCw className="size-3.5 text-dc-purple" />
          Check now
        </button>
        <button type="button" onClick={updateApplyNow} disabled={!d.waiting} className={cn(quietPill, !d.waiting && "opacity-50")}>
          <Download className="size-3.5 text-dc-purple" />
          Apply now
        </button>
      </div>
    </div>
  );
}
