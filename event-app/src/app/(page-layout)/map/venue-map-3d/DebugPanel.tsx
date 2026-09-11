"use client";

import type { MapSettings } from "./types";

/** `?debug` tuning panel for the look-and-feel experiment. Not part of the product UI. */
export function DebugPanel({ settings, onChange }: { settings: MapSettings; onChange: (s: MapSettings) => void }) {
  const set = <K extends keyof MapSettings>(key: K, value: MapSettings[K]) => onChange({ ...settings, [key]: value });
  return (
    <div className="fixed right-4 top-20 z-20 w-56 rounded-xl bg-white/95 p-3 text-[12px] leading-tight text-dc-fg shadow-lg backdrop-blur">
      <p className="mb-2 font-bold">3D map debug</p>
      <label className="mb-2 flex items-center justify-between gap-2">
        Projection
        <select
          className="rounded border border-dc-border px-1 py-0.5"
          value={settings.projection}
          onChange={(e) => set("projection", e.target.value as MapSettings["projection"])}
        >
          <option value="ortho">orthographic</option>
          <option value="perspective">perspective</option>
        </select>
      </label>
      {(
        [
          ["lit", "Lit blocks"],
          ["showBlocks", "Show blocks"],
          ["showProps", "Show props"],
        ] as const
      ).map(([key, label]) => (
        <label key={key} className="mb-1 flex items-center justify-between gap-2">
          {label}
          <input type="checkbox" checked={settings[key]} onChange={(e) => set(key, e.target.checked)} />
        </label>
      ))}
      <label className="mb-1 block">
        Rotation limit ±{settings.azimuthLimitDeg}°
        <input
          type="range"
          min={10}
          max={180}
          step={5}
          className="w-full"
          value={settings.azimuthLimitDeg}
          onChange={(e) => set("azimuthLimitDeg", Number(e.target.value))}
        />
      </label>
      <label className="block">
        Double-tap zoom ×{settings.zoomStep.toFixed(1)}
        <input
          type="range"
          min={1.2}
          max={3}
          step={0.1}
          className="w-full"
          value={settings.zoomStep}
          onChange={(e) => set("zoomStep", Number(e.target.value))}
        />
      </label>
    </div>
  );
}
