"use client";

import { useState } from "react";
import { Bug, FlaskConical } from "lucide-react";
import { Link } from "@/routing";
import {
  DATASETS,
  DEFAULT_DATASET_KEY,
  getActiveDataset,
  getActiveDatasetKey,
  type DatasetKey,
} from "@/data/dataset";
import { utcMsToWallClock, wallClockToUtcMs } from "@/data/eventTime";
import { useNowMs } from "@/hooks/useNow";
import { useSyncStatus } from "@/data/hooks";
import { eventStore } from "@/data/store/event-store";

/**
 * Dev-only debug panel: mock the current time (`mockNow`/`mockSpeed`) and swap
 * the event dataset (test-devcon-8 / devcon8 / Devcon 7). Applying writes the URL query params
 * and reloads, so the time hook and data provider pick them up. Visible in
 * development, when `?debug` is present, or when NEXT_PUBLIC_ENABLE_DEBUG=true.
 *
 * The Mock-now field is venue wall-clock time (the selected dataset's
 * timezone), matching what the schedule displays; the `?mockNow=` URL param it
 * writes remains a plain UTC instant.
 */
/**
 * Live readout of the effective "now" (venue wall-clock). Reads the same
 * shared clock as the schedule (useNow), so it shows exactly what the
 * live/upcoming logic sees — including `?mockNow=` / `?mockSpeed=`. A child
 * component so the ticking hook only runs where it's rendered.
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

/** EventStore readout + force sync (the old SWR mutate has no UI otherwise). */
function SyncDebug() {
  const { status, version, syncedAt, checkedAt, hydrateMs, lastError } =
    useSyncStatus();
  // Stored timestamps, not "now": plain formatting is fine here.
  const fmt = (ms: number | null) =>
    ms ? new Date(ms).toLocaleTimeString() : "never";
  return (
    <div className="mb-4 rounded-lg border border-[#E1E4EA] p-2 text-xs text-gray-600">
      <p className="mb-1 font-medium text-gray-500">Event data</p>
      <p>
        status: {status} · version: {version ?? "none"}
      </p>
      <p>
        synced: {fmt(syncedAt)} · checked: {fmt(checkedAt)} · hydrate:{" "}
        {hydrateMs ?? "?"} ms
      </p>
      {lastError && <p className="text-red-600">{lastError}</p>}
      <button
        type="button"
        onClick={() => eventStore.sync(getActiveDataset(), { force: true })}
        className="mt-2 rounded-full border border-[#E1E4EA] px-3 py-1 font-medium text-gray-600 hover:bg-gray-50"
      >
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

export function DebugPanel() {
  const params =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams();
  // Available in local dev, when `?debug` is in the URL, or in any environment
  // (incl. production) when NEXT_PUBLIC_ENABLE_DEBUG is set at build time. The
  // env flag is the supported way to turn this on in production without abusing
  // NODE_ENV (a non-standard NODE_ENV breaks the Next.js production build).
  const enabled =
    process.env.NODE_ENV === "development" ||
    process.env.NEXT_PUBLIC_ENABLE_DEBUG === "true" ||
    params.has("debug");

  const [open, setOpen] = useState(false);
  const [mockNow, setMockNow] = useState(() => {
    // Seed from ?mockNow when present, else default to the active dataset's
    // event start (same seed as switching datasets) so the field is never a
    // blank dd/mm/yyyy, --:-- picker.
    const active = DATASETS[getActiveDatasetKey()];
    const raw = params.get("mockNow");
    const t = raw ? new Date(raw).getTime() : NaN;
    return utcMsToWallClock(
      active.timezone,
      isNaN(t) ? Date.parse(active.startDate) : t
    );
  });
  const [mockSpeed, setMockSpeed] = useState(() => params.get("mockSpeed") ?? "");
  const [dataset, setDataset] = useState<DatasetKey>(() =>
    getActiveDatasetKey()
  );

  // Selecting a dataset mocks "now" to the beginning of that conference so the
  // schedule/live/today logic lands on day 1. Users can still tweak the field
  // afterwards before applying.
  const handleDatasetChange = (key: DatasetKey) => {
    setDataset(key);
    const start = DATASETS[key]?.startDate;
    if (start) {
      setMockNow(utcMsToWallClock(DATASETS[key].timezone, Date.parse(start)));
    }
  };

  if (!enabled) return null;

  // Clock timezone comes from the URL-active dataset (what the schedule
  // renders), not the panel's unsaved selection.
  const activeTz = DATASETS[getActiveDatasetKey()].timezone;
  const effectiveSpeed = parseSpeed(params.get("mockSpeed"));

  const apply = () => {
    const p = new URLSearchParams(window.location.search);
    if (mockNow) {
      p.set(
        "mockNow",
        new Date(
          wallClockToUtcMs(DATASETS[dataset].timezone, mockNow)
        ).toISOString()
      );
    }
    else p.delete("mockNow");
    if (mockSpeed) p.set("mockSpeed", mockSpeed);
    else p.delete("mockSpeed");
    if (dataset !== DEFAULT_DATASET_KEY) p.set("dataset", dataset);
    else p.delete("dataset");
    p.set("debug", "1"); // keep the panel available after reload
    window.location.search = p.toString();
  };

  const reset = () => {
    const p = new URLSearchParams(window.location.search);
    ["mockNow", "mockSpeed", "dataset"].forEach((k) => p.delete(k));
    window.location.search = p.toString();
  };

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        title="Debug panel"
        // Bottom-LEFT, not under the header: top-right sat on top of page
        // content (the /ticket card, the speakers filter rows) and crowded the
        // A-Z rail. Mobile lifts it clear of the docked tab bar by the bar's
        // measured height (--nav-clearance, from Nav.tsx — it varies with the
        // safe-area inset between browser tab and installed PWA, which is why
        // a hardcoded offset sat differently in each); where there is no bar
        // (desktop, detail views) the clearance is 0 and it drops to the
        // corner. +48 (not +12): the venue map parks its Find button in this
        // same corner at clearance+12 — the debug tool yields and floats
        // above it.
        className="fixed bottom-[calc(var(--nav-clearance)+48px)] left-4 z-[100] flex h-11 w-11 items-center justify-center rounded-full bg-gray-900 text-white shadow-lg transition-transform hover:scale-105 lg:bottom-4"
      >
        <Bug className="h-5 w-5" />
      </button>

      {open && (
        <div // Anchored above the button so it opens upward from the same corner.
          // 48px FAB offset + 44px button + 12px gap.
          className="fixed bottom-[calc(var(--nav-clearance)+104px)] left-4 z-[100] w-72 rounded-2xl border border-dc-hairline bg-white p-4 text-sm shadow-2xl lg:bottom-[72px]">
          <p className="mb-3 font-bold">Debug</p>

          <div className="mb-3 text-xs text-gray-500">
            <p>Now ({activeTz}):</p>
            <p>
              <DebugClock tz={activeTz} speed={effectiveSpeed} />
            </p>
          </div>

          <label className="mb-1 block text-xs font-medium text-gray-500">
            Mock now (venue time · {DATASETS[dataset].timezone})
          </label>
          <input
            type="datetime-local"
            value={mockNow}
            onChange={(e) => setMockNow(e.target.value)}
            className="mb-3 w-full rounded-lg border border-[#E1E4EA] px-2 py-1.5 outline-none focus:border-[#7D52F4]"
          />

          <label className="mb-1 block text-xs font-medium text-gray-500">
            Speed (×)
          </label>
          <input
            type="number"
            min={0}
            step="any"
            value={mockSpeed}
            onChange={(e) => setMockSpeed(e.target.value)}
            placeholder="1"
            className="mb-3 w-full rounded-lg border border-[#E1E4EA] px-2 py-1.5 outline-none focus:border-[#7D52F4]"
          />

          <label className="mb-1 block text-xs font-medium text-gray-500">
            Dataset
          </label>
          <select
            value={dataset}
            onChange={(e) => handleDatasetChange(e.target.value as DatasetKey)}
            className="mb-4 w-full rounded-lg border border-[#E1E4EA] px-2 py-1.5 outline-none focus:border-[#7D52F4]"
          >
            {Object.values(DATASETS).map((d) => (
              <option key={d.key} value={d.key}>
                {d.label}
              </option>
            ))}
          </select>

          <SyncDebug />

          <div className="flex gap-2">
            <button
              onClick={apply}
              className="flex-1 rounded-full bg-[#7D52F4] py-2 font-medium text-white hover:bg-[#6A3FD1]"
            >
              Apply &amp; reload
            </button>
            <button
              onClick={reset}
              className="rounded-full border border-[#E1E4EA] px-3 py-2 font-medium text-gray-600 hover:bg-gray-50"
            >
              Reset
            </button>
          </div>

          {/* Tools */}
          <div className="mt-4 border-t border-[#E1E4EA] pt-3">
            <p className="mb-2 text-xs font-medium text-gray-500">Tools</p>
            <Link
              href="/admin/inference-test"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-[#7D52F4] hover:bg-[#f3eeff]"
            >
              <FlaskConical className="h-4 w-4" />
              Inference debugger
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
