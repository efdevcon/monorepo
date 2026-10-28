"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import cn from "classnames";
import {
  DATASETS,
  DEFAULT_DATASET_KEY,
  communityHubsDataset,
  getActiveDataset,
  getActiveDatasetKey,
  type DatasetKey,
} from "@/data/dataset";
import { utcMsToWallClock, wallClockToUtcMs } from "@/data/eventTime";
import { useNowMs } from "@/hooks/useNow";
import { useSyncStatus } from "@/data/hooks";
import { knownInstallVersion, launchInstallVersion } from "@/data/install/deviceInstallVersion";
import { eventStore } from "@/data/store/event-store";
import { hubStore } from "@/data/store/hub-store";
import { useStoreState } from "@/data/store/use-event-store";

/**
 * Two rows of the EF internal tools on My Devcon:
 * - MockClockTools: mock the app clock (`?mockNow=` / `?mockSpeed=`) and
 *   switch the event dataset (`?dataset=`). Applying writes the URL params and
 *   reloads, so the time hook and the data provider pick them up; the params
 *   then ride every in-app link (routing/index.tsx).
 * - EventDataTools: the EventStore's sync state, with a force sync.
 *
 * Until 2026-10-02 this was a floating bug button on Home, shown in dev, with
 * `?debug` or with NEXT_PUBLIC_ENABLE_DEBUG; now it is simply part of the
 * @ethereum.org-only section, so it needs no flag and never shows to
 * attendees. The Mock-now field is venue wall-clock time (the chosen
 * dataset's timezone), matching what the schedule displays; the URL param it
 * writes stays a plain UTC instant.
 */

const label = "block text-[12px] leading-4 text-dc-muted";
const field =
  "mt-1 h-8 w-full rounded-md border border-dc-hairline bg-white px-2 text-[14px] leading-5 text-dc-fg2 outline-none focus:border-dc-purple";
const pill =
  "flex h-8 cursor-pointer items-center gap-1.5 rounded-full px-3 text-[13px] font-bold leading-none transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-purple";
const primaryPill = cn(pill, "bg-dc-purple text-white hover:bg-[#6730d5]");
export const quietPill = cn(pill, "border border-dc-hairline bg-white text-dc-fg2 hover:bg-dc-purple-wash");

/**
 * Live readout of the effective "now" (venue wall-clock). Reads the same
 * shared clock as the schedule (useNow), so it shows exactly what the
 * live/upcoming logic sees, mock included. Its own component so the ticking
 * hook only runs where it is rendered.
 */
function DebugClock({ tz, speed }: { tz: string; speed: number }) {
  const nowMs = useNowMs(1000);
  const wall = utcMsToWallClock(tz, nowMs, true);
  const [date, time] = wall.split("T");
  // DD/MM/YYYY, matching how the Mock-now datetime-local field displays.
  const [y, m, d] = date.split("-");
  return (
    <span className="tabular-nums">
      {d}/{m}/{y} {time}
      {speed !== 1 && <span className="ml-1 font-semibold">×{speed}</span>}
    </span>
  );
}

/** EventStore readout + force sync. */
export function EventDataTools() {
  const { status, version, scheduleVersion, syncedAt, checkedAt, hydrateMs, lastError } = useSyncStatus();
  // Install version (data/install/installVersion.ts): what this launch's URL
  // says, and the highest this device has launched with. Read after mount: the
  // URL is browser-only and the device value comes from Dexie.
  const [install, setInstall] = useState<{ launch: number | null; known: number | null } | null>(null);
  useEffect(() => {
    void knownInstallVersion().then((known) => setInstall({ launch: launchInstallVersion(), known }));
  }, []);
  // Stored timestamps, not "now": plain formatting is fine here.
  const fmt = (ms: number | null) => (ms ? new Date(ms).toLocaleTimeString() : "never");
  return (
    <div className="mt-3 rounded-md border border-dc-hairline bg-white p-3 text-[12px] leading-4 text-dc-muted">
      <p className="text-[14px] leading-5 text-dc-fg2">
        Schedule release: <span className="font-semibold">{scheduleVersion ?? "unknown"}</span>
      </p>
      <p>
        status: {status} · data version: {version ?? "none"}
      </p>
      <p>
        synced: {fmt(syncedAt)} · checked: {fmt(checkedAt)} · hydrate: {hydrateMs ?? "?"} ms
      </p>
      {install && (
        <p>
          install version: {install.launch ?? "none"} (launch) · {install.known ?? "none"} (device)
        </p>
      )}
      {lastError && <p className="text-dc-error">{lastError}</p>}
      <button
        type="button"
        onClick={() => void eventStore.sync(getActiveDataset(), { force: true })}
        className={cn(quietPill, "mt-2")}
      >
        <RefreshCw className="size-3.5 text-dc-purple" />
        Force sync
      </button>
    </div>
  );
}

/**
 * The Community Hubs bundle version in words. devcon-api builds it as
 * `<last sheet change>-<hub count>[-<speaker photos written>]` (versionOf in
 * services/community-hubs.ts); anything else is shown as it is.
 */
function hubsVersionLabel(version: string | null): string {
  if (!version) return "none";
  const [changed, count, photos] = version.split("-").map(Number);
  if (!changed || !count) return version;
  // Stored timestamps, not "now": plain formatting is fine here.
  const at = (ms: number) =>
    new Date(ms).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  return `${count} hubs · last sheet change ${at(changed)}` + (photos ? ` · speaker photos ${at(photos)}` : "");
}

/** Community Hubs store readout (its own store, see hub-store.ts) + force sync. */
export function CommunityHubsDataTools() {
  const { status, meta, lastError } = useStoreState(hubStore);
  const dataset = communityHubsDataset(getActiveDataset());
  if (!dataset) return null;
  const fmt = (ms: number | null | undefined) => (ms ? new Date(ms).toLocaleTimeString() : "never");
  const version = meta?.version ?? null;
  // The hubs bundle carries its content release ("12") where the Pretalx
  // bundle carries the schedule release.
  const release = meta?.scheduleVersion;
  return (
    <div className="mt-3 rounded-md border border-dc-hairline bg-white p-3 text-[12px] leading-4 text-dc-muted">
      <p className="text-[14px] leading-5 text-dc-fg2">
        Community Hubs release: <span className="font-semibold">{release ? `v${release}` : "unknown"}</span>
      </p>
      <p>{hubsVersionLabel(version)}</p>
      <p>
        status: {status} · data version: {version ?? "none"}
      </p>
      <p>
        synced: {fmt(meta?.syncedAt)} · checked: {fmt(meta?.checkedAt)}
      </p>
      {lastError && <p className="text-dc-error">{lastError}</p>}
      <button
        type="button"
        onClick={() => void hubStore.sync(dataset, { force: true })}
        className={cn(quietPill, "mt-2")}
      >
        <RefreshCw className="size-3.5 text-dc-purple" />
        Force sync
      </button>
    </div>
  );
}

// Effective mock speed with useNow's clamp rule (NaN / <=0 → 1).
function parseSpeed(raw: string | null): number {
  const n = raw ? parseFloat(raw) : NaN;
  return isNaN(n) || n <= 0 ? 1 : n;
}

export function MockClockTools() {
  const params =
    typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const [mockNow, setMockNow] = useState(() => {
    // Seed from ?mockNow when present, else the active dataset's event start
    // (the same seed as switching datasets), so the field is never blank.
    const active = DATASETS[getActiveDatasetKey()];
    const raw = params.get("mockNow");
    const t = raw ? new Date(raw).getTime() : NaN;
    return utcMsToWallClock(active.timezone, isNaN(t) ? Date.parse(active.startDate) : t);
  });
  const [mockSpeed, setMockSpeed] = useState(() => params.get("mockSpeed") ?? "");
  const [dataset, setDataset] = useState<DatasetKey>(() => getActiveDatasetKey());

  // Selecting a dataset mocks "now" to the start of that conference so the
  // schedule's live/today logic lands on day 1; the field stays editable.
  const handleDatasetChange = (key: DatasetKey) => {
    setDataset(key);
    const start = DATASETS[key]?.startDate;
    if (start) setMockNow(utcMsToWallClock(DATASETS[key].timezone, Date.parse(start)));
  };

  // Clock timezone comes from the URL-active dataset (what the schedule
  // renders), not the form's unsaved selection.
  const activeTz = DATASETS[getActiveDatasetKey()].timezone;
  const effectiveSpeed = parseSpeed(params.get("mockSpeed"));
  const mocked = params.has("mockNow") || params.has("mockSpeed") || params.has("dataset");

  const apply = () => {
    const p = new URLSearchParams(window.location.search);
    if (mockNow) {
      p.set("mockNow", new Date(wallClockToUtcMs(DATASETS[dataset].timezone, mockNow)).toISOString());
    } else p.delete("mockNow");
    if (mockSpeed) p.set("mockSpeed", mockSpeed);
    else p.delete("mockSpeed");
    if (dataset !== DEFAULT_DATASET_KEY) p.set("dataset", dataset);
    else p.delete("dataset");
    window.location.search = p.toString();
  };

  const reset = () => {
    const p = new URLSearchParams(window.location.search);
    ["mockNow", "mockSpeed", "dataset", "debug"].forEach((k) => p.delete(k));
    window.location.search = p.toString();
  };

  return (
    <div>
      <p className="mt-2 text-[14px] leading-5 text-dc-fg2">
        Now ({activeTz}): <DebugClock tz={activeTz} speed={effectiveSpeed} />
        {mocked && <span className="ml-1 text-dc-purple">(mocked)</span>}
      </p>

      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <label className={label}>
          Mock now (venue time · {DATASETS[dataset].timezone})
          <input
            type="datetime-local"
            value={mockNow}
            onChange={(e) => setMockNow(e.target.value)}
            className={field}
          />
        </label>
        <label className={label}>
          Speed (×)
          <input
            type="number"
            min={0}
            step="any"
            value={mockSpeed}
            onChange={(e) => setMockSpeed(e.target.value)}
            placeholder="1"
            className={field}
          />
        </label>
        <label className={label}>
          Dataset
          <select
            value={dataset}
            onChange={(e) => handleDatasetChange(e.target.value as DatasetKey)}
            className={field}
          >
            {Object.values(DATASETS).map((d) => (
              <option key={d.key} value={d.key}>
                {d.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={apply} className={primaryPill}>
          Apply &amp; reload
        </button>
        <button type="button" onClick={reset} className={quietPill}>
          Reset
        </button>
      </div>
    </div>
  );
}
