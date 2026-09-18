"use client";

import type { ReactNode } from "react";
import { BottomSheet } from "@/components/BottomSheet";

/**
 * Phone shell for Find: the house bottom sheet, content-hugging, with the list
 * scrolling inside. No autofocus (the sheet mounts on open, so a focus() there
 * wouldn't raise the iOS keyboard anyway, and a raised keyboard would cover
 * the category list).
 */
export function FindSheet({ open, onOpenChange, children }: { open: boolean; onOpenChange: (open: boolean) => void; children: ReactNode }) {
  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} ariaLabel="Find a place" fit>
      <div className="flex min-h-0 max-h-full flex-col rounded-t-2xl bg-white font-heading" style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}>
        {children}
      </div>
    </BottomSheet>
  );
}
