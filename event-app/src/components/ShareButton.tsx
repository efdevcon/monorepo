"use client";

import { Share2 } from "lucide-react";
import cn from "classnames";
import { toast } from "sonner";
import APP_CONFIG from "@/CONFIG";
import { shareHref, type DetailKind } from "@/routing/viewParams";

/** Absolute share URL: the short path form, which redirects into the app. */
export function shareUrl(kind: DetailKind, id: string): string {
  const path = shareHref(kind, id);
  const origin =
    typeof window !== "undefined" ? window.location.origin : APP_CONFIG.APP_ORIGIN;
  return new URL(path, origin).toString();
}

/**
 * Native share sheet where the platform has one (mobile, Safari), otherwise
 * copy the link. Works offline: nothing here needs a network, and the pasted
 * link resolves for the recipient through the server redirect.
 */
export async function shareDetail(opts: {
  kind: DetailKind;
  id: string;
  title: string;
}): Promise<void> {
  const url = shareUrl(opts.kind, opts.id);
  if (typeof navigator.share === "function") {
    try {
      await navigator.share({ title: opts.title, url });
      return;
    } catch (err) {
      // The user dismissed the sheet: not an error, and not a reason to copy.
      if (err instanceof DOMException && err.name === "AbortError") return;
      // Any other failure falls through to the clipboard.
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    toast.success("Link copied");
  } catch {
    toast.error("Couldn't copy the link");
  }
}

/**
 * Circular share icon button. Two complete recipes rather than overrides:
 * Tailwind resolves same-property conflicts by stylesheet order, so a passed
 * `size-7` could not reliably beat a baked-in `size-8`.
 * - header: the 32px white circle used by the mobile app header actions.
 * - panel: the 28px panel-grey circle matching CloseButton in the desktop
 *   side panels.
 */
export function ShareButton({
  kind,
  id,
  title,
  variant = "header",
}: {
  kind: DetailKind;
  id: string;
  title: string;
  variant?: "header" | "panel";
}) {
  return (
    <button
      type="button"
      onClick={() => void shareDetail({ kind, id, title })}
      aria-label="Share"
      className={cn(
        "flex shrink-0 cursor-pointer items-center justify-center rounded-full",
        variant === "header"
          ? "size-8 border border-dc-hairline bg-white"
          : "size-7 bg-dc-panel transition-colors duration-150 ease-out hover:bg-dc-purple-soft"
      )}
    >
      <Share2
        className={cn(
          "size-4",
          variant === "header" ? "text-dc-purple" : "text-dc-fg2"
        )}
      />
    </button>
  );
}
