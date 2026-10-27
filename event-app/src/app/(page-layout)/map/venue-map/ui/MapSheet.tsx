"use client";

import type { ReactNode } from "react";
import { BottomSheet } from "@/components/BottomSheet";

/**
 * Phone shell for Find and Search: the house bottom sheet, content-hugging,
 * the list scrolling inside. No autofocus: iOS only raises the keyboard for
 * a focus() made synchronously inside the tap, and the sheet mounts on open.
 * A phone in landscape pads the content past the notch on either side
 * (`--safe-left` / `--safe-right`, as the schedule's gutters do): the sheet
 * stays full-bleed, its rows start where the display does.
 */
export function MapSheet({ open, onOpenChange, label, children }: { open: boolean; onOpenChange: (open: boolean) => void; label: string; children: ReactNode }) {
  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} ariaLabel={label} fit>
      <div className="flex min-h-0 max-h-full flex-col rounded-t-2xl bg-white font-heading phone-landscape:pl-[max(0px,calc(var(--safe-left)-16px))] phone-landscape:pr-[max(0px,calc(var(--safe-right)-16px))]" style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}>
        {children}
      </div>
    </BottomSheet>
  );
}
