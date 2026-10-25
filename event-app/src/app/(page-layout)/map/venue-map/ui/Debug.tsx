"use client";

import type { ReactNode } from "react";
import cn from "classnames";
import { Wrench } from "lucide-react";
import { LEVELS, type LevelId } from "../data/levels";
import { SINGLE_FLOOR, type Tuning } from "../state/mapStore";

/** Top-left corner of the map from lg up (no debug tools on phones). Holds the toggle with the panel beneath it. */
export function DebugCorner({ children, panel }: { children: ReactNode; panel?: ReactNode }) {
  return (
    <div className="fixed left-6 top-[80px] z-20 hidden flex-col items-start gap-3 lg:flex">
      {children}
      {panel}
    </div>
  );
}

/** Opens the tuning panel: a dark 44px disc (local state, never `?debug`, which rides every link). */
export function DebugToggle({ pressed, onToggle }: { pressed: boolean; onToggle: () => void }) {
  return (
    <button type="button" aria-pressed={pressed} aria-label="3D map debug" title="3D map debug" onClick={onToggle} className={cn("flex h-11 w-11 cursor-pointer items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105", pressed ? "bg-dc-purple text-white" : "bg-gray-900 text-white")}>
      <Wrench className="h-5 w-5" />
    </button>
  );
}

/** Tuning panel for the look-and-feel experiment. Not part of the product UI. */
export function DebugPanel({ tuning, floor, onTune, onFloor }: { tuning: Tuning; floor: LevelId | null; onTune: (t: Partial<Tuning>) => void; onFloor: (level: LevelId | null) => void }) {
  return (
    <div className="w-56 rounded-xl bg-white/95 p-3 text-[12px] leading-tight text-dc-fg shadow-lg backdrop-blur">
      <p className="mb-2 font-bold">3D map debug</p>
      <label className="mb-2 flex items-center justify-between gap-2">
        Projection
        <select className="rounded border border-dc-border px-1 py-0.5" value={tuning.projection} onChange={(e) => onTune({ projection: e.target.value as Tuning["projection"] })}>
          <option value="ortho">orthographic</option>
          <option value="perspective">perspective</option>
        </select>
      </label>
      {!SINGLE_FLOOR && (
        <>
          <label className="mb-2 flex items-center justify-between gap-2">
            Floor
            <select className="rounded border border-dc-border px-1 py-0.5" value={floor ?? "all"} onChange={(e) => onFloor(e.target.value === "all" ? null : (e.target.value as LevelId))}>
              <option value="all">all (stacked)</option>
              {LEVELS.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.id}
                </option>
              ))}
            </select>
          </label>
          <label className="mb-1 block">
            Stack gap {tuning.levelGap.toFixed(0)} m
            <input type="range" min={20} max={120} step={5} className="w-full" value={tuning.levelGap} onChange={(e) => onTune({ levelGap: Number(e.target.value) })} />
          </label>
        </>
      )}
      <label className="mb-1 flex items-center justify-between gap-2">
        Show icons
        <input type="checkbox" checked={tuning.showIcons} onChange={(e) => onTune({ showIcons: e.target.checked })} />
      </label>
      {(
        [
          ["rotateLeftDeg", "Rotate left"],
          ["rotateRightDeg", "Rotate right"],
        ] as const
      ).map(([key, label]) => (
        <label key={key} className="mb-1 block">
          {label} {tuning[key]}°
          <input type="range" min={0} max={180} step={5} className="w-full" value={tuning[key]} onChange={(e) => onTune({ [key]: Number(e.target.value) })} />
        </label>
      ))}
      <label className="block">
        Double-tap zoom ×{tuning.zoomStep.toFixed(1)}
        <input type="range" min={1.2} max={3} step={0.1} className="w-full" value={tuning.zoomStep} onChange={(e) => onTune({ zoomStep: Number(e.target.value) })} />
      </label>
    </div>
  );
}
