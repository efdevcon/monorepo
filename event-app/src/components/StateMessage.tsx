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
 * with a 28px purple mark, a 20px heading, one 16px muted line, then full-width
 * stacked actions capped at the copy column (420px).
 */
export function StateMessage({
  icon: Icon,
  title,
  body,
  className,
  headingLevel = "p",
  tone = "default",
  size = "page",
  children,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  className?: string;
  /** Page-level uses (error, offline) render the title as the page's h1. */
  headingLevel?: "h1" | "p";
  /** `critical` (crashes): red mark on the soft pink live/error fill. */
  tone?: "default" | "critical";
  /** `compact`: the inline version for a block inside a page (Q&A, the
   *  inbox's reminders note): 48px circle, 20px mark, 16px title, 14px body. */
  size?: "page" | "compact";
  children?: React.ReactNode;
}) {
  const Title = headingLevel;
  const compact = size === "compact";
  return (
    <div
      className={cn(
        "flex w-full flex-col items-center justify-center px-4 text-center font-heading",
        compact ? "gap-3" : "gap-6",
        className
      )}
    >
      <span
        className={cn(
          "flex items-center justify-center rounded-full",
          compact ? "size-12" : "size-16",
          tone === "critical" ? "bg-dc-live-bg" : "bg-dc-lavender"
        )}
      >
        <Icon
          className={cn(compact ? "size-5" : "size-7", tone === "critical" ? "text-dc-red" : "text-dc-purple")}
          aria-hidden
        />
      </span>
      <div className={cn("flex flex-col text-dc-fg", compact ? "max-w-[360px] gap-0.5" : "max-w-[420px] gap-1")}>
        <Title
          className={
            compact
              ? "text-[16px] font-bold leading-6"
              : "text-[20px] font-bold leading-[28.8px] tracking-[-0.5px]"
          }
        >
          {title}
        </Title>
        <p className={cn("text-dc-muted", compact ? "text-[14px] leading-5" : "text-[16px] leading-6")}>{body}</p>
      </div>
      {children && (
        <div className={cn("flex w-full flex-col gap-3", compact ? "max-w-[320px]" : "max-w-[420px]")}>{children}</div>
      )}
    </div>
  );
}

/** Re-runs the catalogue sync (or `onRetry`); label first, spinning icon on the right. */
export function TryAgainButton({ onRetry = forceSync }: { onRetry?: () => Promise<unknown> }) {
  const [retrying, setRetrying] = useState(false);
  const retry = async () => {
    setRetrying(true);
    try {
      await onRetry();
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
