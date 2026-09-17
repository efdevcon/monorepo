"use client";

import { LEVEL_ORDER, type MapSettings } from "./types";

/** Tuning panel for the look-and-feel experiment, opened from DebugToggle in DebugCorner (top left). Not part of the product UI. */
export function DebugPanel({ settings, onChange }: { settings: MapSettings; onChange: (s: MapSettings) => void }) {
  const set = <K extends keyof MapSettings>(key: K, value: MapSettings[K]) => onChange({ ...settings, [key]: value });
  return (
    <div className="w-56 rounded-xl bg-white/95 p-3 text-[12px] leading-tight text-dc-fg shadow-lg backdrop-blur">
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
      <label className="mb-2 flex items-center justify-between gap-2">
        Floor
        <select
          className="rounded border border-dc-border px-1 py-0.5"
          value={settings.level ?? "all"}
          onChange={(e) => set("level", e.target.value === "all" ? null : (e.target.value as MapSettings["level"]))}
        >
          <option value="all">all (stacked)</option>
          {LEVEL_ORDER.map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </select>
      </label>
      <label className="mb-1 block">
        Stack gap {settings.levelGap.toFixed(1)}
        <input type="range" min={2} max={12} step={0.5} className="w-full" value={settings.levelGap} onChange={(e) => set("levelGap", Number(e.target.value))} />
      </label>
      <label className="mb-1 flex items-center justify-between gap-2">
        Show icons
        <input type="checkbox" checked={settings.showIcons} onChange={(e) => set("showIcons", e.target.checked)} />
      </label>
      {(
        [
          ["rotateLeftDeg", "Rotate left"],
          ["rotateRightDeg", "Rotate right"],
        ] as const
      ).map(([key, label]) => (
        <label key={key} className="mb-1 block">
          {label} {settings[key]}°
          <input type="range" min={0} max={180} step={5} className="w-full" value={settings[key]} onChange={(e) => set(key, Number(e.target.value))} />
        </label>
      ))}
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
