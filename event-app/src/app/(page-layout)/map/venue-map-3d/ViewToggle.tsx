"use client";

import { Box, Map as MapIcon } from "lucide-react";
import { Segmented } from "./Segmented";
import type { MapView } from "./types";

const OPTIONS: { view: MapView; label: string; Icon: typeof Box }[] = [
  { view: "3d", label: "3D", Icon: Box },
  { view: "top", label: "Flat", Icon: MapIcon },
];

/** 3D / top-down camera switch, top right, sharing the source switch's row. */
export function ViewToggle({ value, onChange }: { value: MapView; onChange: (v: MapView) => void }) {
  return (
    <Segmented
      ariaLabel="Map view"
      value={value}
      onChange={onChange}
      className="fixed right-4 top-[calc(3.5rem+var(--safe-top)+12px)] lg:right-6 lg:top-[80px]"
      options={OPTIONS.map(({ view, label, Icon }) => ({
        value: view,
        label,
        className: "px-2.5",
        children: (
          <>
            <Icon className="size-4" />
            <span>{label}</span>
          </>
        ),
      }))}
    />
  );
}
