"use client";

import type { ReactNode } from "react";
import { BottomSheet } from "@/components/BottomSheet";

/**
 * Phone shell for Find and Search: the house bottom sheet, content-hugging,
 * with the list scrolling inside. No autofocus: the sheet mounts on open, and
 * iOS only raises the keyboard for a focus() made synchronously inside the
 * tap, so the field would not get it anyway (the first tap on the field does).
 */
export function MapSheet({ open, onOpenChange, label, children }: { open: boolean; onOpenChange: (open: boolean) => void; label: string; children: ReactNode }) {
  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} ariaLabel={label} fit>
      <div className="flex min-h-0 max-h-full flex-col rounded-t-2xl bg-white font-heading" style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}>
        {children}
      </div>
    </BottomSheet>
  );
}
