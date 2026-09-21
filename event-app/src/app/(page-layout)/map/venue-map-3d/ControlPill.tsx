"use client";

import cn from "classnames";
import type { LucideIcon } from "lucide-react";

/**
 * A bottom-left control pill (Find, Search): 44px tall (Scott, 2026-09-21;
 * was 40 + a 44px pseudo hit box), icon + 14px label, lavender + purple border
 * while its panel or sheet is open. 4px more padding on the label side than
 * the icon side, or the pill reads lopsided (Scott). `trigger` marks the pill
 * so the desktop panel's outside-click check leaves it alone (MapPanel).
 */
export function ControlPill({ icon: Icon, label, open, onClick, trigger }: { icon: LucideIcon; label: string; open: boolean; onClick: () => void; trigger: string }) {
  return (
    <button
      type="button"
      data-map-trigger={trigger}
      aria-expanded={open}
      onClick={onClick}
      className={cn(
        "pointer-events-auto relative z-10 flex h-11 cursor-pointer items-center gap-1.5 rounded-full border pl-3 pr-4 text-[14px] font-bold leading-none text-dc-purple shadow-[0_1px_3px_rgba(22,11,43,0.12)] backdrop-blur transition-colors duration-150 ease-out",
        open ? "border-dc-purple bg-dc-lavender" : "border-dc-hairline bg-white/90 hover:bg-dc-purple-wash"
      )}
    >
      <Icon className="size-4" aria-hidden />
      {label}
    </button>
  );
}
