"use client";

import { useState } from "react";
import { Bug, FlaskConical } from "lucide-react";
import { Link } from "@/routing";
import { DATASETS, getActiveDatasetKey, type DatasetKey } from "@/data/dataset";

/** local Date → "YYYY-MM-DDTHH:mm" for a datetime-local input. */
function toInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

/**
 * Dev-only debug panel: mock the current time (`mockNow`/`mockSpeed`) and swap
 * the event dataset (current ↔ Devcon 7). Applying writes the URL query params
 * and reloads, so the time hook and data provider pick them up. Visible only in
 * development or when `?debug` is present.
 */
export function DebugPanel() {
  const params =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams();
  const enabled =
    process.env.NODE_ENV === "development" || params.has("debug");

  const [open, setOpen] = useState(false);
  const [mockNow, setMockNow] = useState(() => {
    const raw = params.get("mockNow");
    if (!raw) return "";
    const d = new Date(raw);
    return isNaN(d.getTime()) ? "" : toInputValue(d);
  });
  const [mockSpeed, setMockSpeed] = useState(() => params.get("mockSpeed") ?? "");
  const [dataset, setDataset] = useState<DatasetKey>(() =>
    getActiveDatasetKey()
  );

  if (!enabled) return null;

  const apply = () => {
    const p = new URLSearchParams(window.location.search);
    if (mockNow) p.set("mockNow", new Date(mockNow).toISOString());
    else p.delete("mockNow");
    if (mockSpeed) p.set("mockSpeed", mockSpeed);
    else p.delete("mockSpeed");
    if (dataset !== "current") p.set("dataset", dataset);
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
        className="fixed top-4 right-4 z-[100] flex h-11 w-11 items-center justify-center rounded-full bg-gray-900 text-white shadow-lg transition-transform hover:scale-105"
      >
        <Bug className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed top-20 right-4 z-[100] w-72 rounded-2xl border border-[#E1E4EA] bg-white p-4 text-sm shadow-2xl">
          <p className="mb-3 font-bold">Debug</p>

          <label className="mb-1 block text-xs font-medium text-gray-500">
            Mock now
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
            onChange={(e) => setDataset(e.target.value as DatasetKey)}
            className="mb-4 w-full rounded-lg border border-[#E1E4EA] px-2 py-1.5 outline-none focus:border-[#7D52F4]"
          >
            {Object.values(DATASETS).map((d) => (
              <option key={d.key} value={d.key}>
                {d.label}
              </option>
            ))}
          </select>

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
