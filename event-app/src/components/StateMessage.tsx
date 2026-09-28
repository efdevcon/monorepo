"use client";

import { useState } from "react";
import cn from "classnames";
import { RefreshCw, type LucideIcon } from "lucide-react";
import { PrimaryButton } from "@/components/Buttons";
import { forceSync } from "@/data/hooks/use-sessions";

/** Shared failed-sync line, same wording on lists and detail pages. */
export const FAILED_BODY = "Something went wrong on our side, please try again in a moment.";

/** Min-height that puts a list-slot message in the middle of the viewport
 *  (viewport less the header, toolbars and, on phones, the tab bar). */
export const LIST_SLOT_CENTER = "min-h-[calc(100dvh-360px)] py-8 lg:min-h-[calc(100dvh-600px)]";

/**
 * The centred state recipe (not found, couldn't load): 64px lavender circle
 * with a 28px purple mark, a 20px heading, one 16px line, then full-width
 * stacked actions capped at the copy column (420px).
 */
export function StateMessage({
  icon: Icon,
  title,
  body,
  className,
  headingLevel = "p",
  children,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  className?: string;
  /** Page-level uses (error, offline) render the title as the page's h1. */
  headingLevel?: "h1" | "p";
  children?: React.ReactNode;
}) {
  const Title = headingLevel;
  return (
    <div className={cn("flex w-full flex-col items-center justify-center gap-6 px-4 text-center font-heading", className)}>
      <span className="flex size-16 items-center justify-center rounded-full bg-dc-lavender">
        <Icon className="size-7 text-dc-purple" aria-hidden />
      </span>
      <div className="flex max-w-[420px] flex-col gap-1 text-dc-fg">
        <Title className="text-[20px] font-bold leading-[28.8px] tracking-[-0.5px]">{title}</Title>
        <p className="text-[16px] leading-6">{body}</p>
      </div>
      {children && <div className="flex w-full max-w-[420px] flex-col gap-3">{children}</div>}
    </div>
  );
}

/** Re-runs the catalogue sync; label first, spinning icon on the right. */
export function TryAgainButton() {
  const [retrying, setRetrying] = useState(false);
  const retry = async () => {
    setRetrying(true);
    try {
      await forceSync();
    } finally {
      setRetrying(false);
    }
  };
  return (
    <PrimaryButton type="button" onClick={retry} disabled={retrying} className="w-full">
      {retrying ? "Retrying…" : "Try again"}
      <RefreshCw className={retrying ? "size-4 animate-spin" : "size-4"} />
    </PrimaryButton>
  );
}
