"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link2, Share2 } from "lucide-react";
import cn from "classnames";
import { toast } from "sonner";
import APP_CONFIG from "@/CONFIG";
import { trackEvent } from "@/data/analytics/track";
import { detailHref, type DetailKind } from "@/routing/viewParams";

/** Absolute share URL of the detail page (`/schedule/<id>`, `/speakers/<id>`). */
export function shareUrl(kind: DetailKind, id: string): string {
  const path = detailHref(kind, id);
  const origin =
    typeof window !== "undefined" ? window.location.origin : APP_CONFIG.APP_ORIGIN;
  return new URL(path, origin).toString();
}

/**
 * The post the X option pre-fills (the link follows as the post's URL).
 * First person, from an attendee: the share is theirs, not the programme's
 * (Scott's draft, 2026-10-27).
 */
export function sharePostText(kind: DetailKind, title: string): string {
  const lead = "I'm at @EFDevcon in Mumbai, India.";
  return kind === "session"
    ? `${lead} Don't miss this session: ${title}`
    : `${lead} Don't miss ${title} on stage`;
}

/** X (Twitter) glyph — lucide's brand icons are deprecated, so inline SVG. */
export function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

const MENU_WIDTH = 232;
const GAP = 8;
const GUTTER = 16;
/** Exit duration — keep in sync with the duration-100 exit class below. */
const EXIT_MS = 100;

/**
 * "Share" pill that opens a small menu anchored under it: copy the link,
 * post on X, and the platform's own share sheet where there is one ("More
 * options", so Signal, WhatsApp and the rest stay a tap away). Replaces the
 * bare native sheet, which on desktop browsers offers next to nothing
 * (Scott, 2026-10-27).
 *
 * The menu is portalled to the body and positioned from the pill's rect:
 * the pill sits inside scroll containers (side panel, expanded columns with
 * a bottom fade mask) that would clip an in-flow popover. It closes on
 * outside tap, Escape, scroll and resize rather than tracking the pill, and
 * flips above the pill when the viewport bottom is too close. Enter 150ms
 * ease-out from the top edge; exit faster (the user has already decided).
 */
export function ShareMenu({
  kind,
  id,
  title,
  className,
}: {
  kind: DetailKind;
  id: string;
  title: string;
  /** The pill recipe of the row the trigger sits in. */
  className: string;
}) {
  const [open, setOpen] = useState(false);
  // Present = kept in the DOM while the exit transition plays out.
  const [present, setPresent] = useState(false);
  const [entered, setEntered] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const menuId = useId();

  // After hydration: the server can't know the platform's share support.
  useEffect(() => {
    setCanNativeShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);
  useEffect(() => () => {
    if (exitTimer.current) clearTimeout(exitTimer.current);
  }, []);

  const openMenu = () => {
    if (exitTimer.current) clearTimeout(exitTimer.current);
    setPresent(true);
    setOpen(true);
  };

  const close = useCallback((restoreFocus = false) => {
    setOpen(false);
    setEntered(false);
    // Play the exit on the still-mounted menu, then unmount.
    if (exitTimer.current) clearTimeout(exitTimer.current);
    exitTimer.current = setTimeout(() => setPresent(false), EXIT_MS);
    if (restoreFocus) triggerRef.current?.focus();
  }, []);

  // Anchor before paint so the first frame is already in place. Written to
  // the element, not state: the rect is only valid for this one open.
  useLayoutEffect(() => {
    if (!open || !present) return;
    const trigger = triggerRef.current;
    const menu = menuRef.current;
    if (!trigger || !menu) return;
    const rect = trigger.getBoundingClientRect();
    const height = menu.offsetHeight;
    const above = rect.bottom + GAP + height > window.innerHeight - GUTTER && rect.top - GAP - height >= GUTTER;
    const left = Math.min(Math.max(rect.left, GUTTER), window.innerWidth - GUTTER - MENU_WIDTH);
    menu.style.top = `${above ? rect.top - GAP - height : rect.bottom + GAP}px`;
    menu.style.left = `${left}px`;
    menu.style.transformOrigin = above ? "bottom left" : "top left";
    // The closed state sits 4px towards the pill, so it grows out of it.
    menu.style.setProperty("--enter-y", above ? "4px" : "-4px");
    menu.style.visibility = "visible";
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, [open, present, canNativeShare]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        close(true);
        return;
      }
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      const items = Array.from(
        menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? []
      );
      if (items.length === 0) return;
      e.preventDefault();
      const current = items.indexOf(document.activeElement as HTMLButtonElement);
      const next =
        e.key === "ArrowDown"
          ? (current + 1) % items.length
          : (current - 1 + items.length) % items.length;
      items[next]?.focus();
    };
    const onScroll = () => close();
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, { capture: true, passive: true });
    window.addEventListener("resize", onScroll);
    // Focus the first option once the menu is anchored.
    menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("resize", onScroll);
    };
  }, [open, close]);

  const url = shareUrl(kind, id);
  const text = sharePostText(kind, title);

  const copyLink = async () => {
    close(true);
    trackEvent(kind, "share-copy", id);
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't copy the link");
    }
  };

  const postOnX = () => {
    close(true);
    trackEvent(kind, "share-x", id);
    const intent = new URL("https://x.com/intent/post");
    intent.searchParams.set("text", text);
    intent.searchParams.set("url", url);
    window.open(intent.toString(), "_blank", "noopener,noreferrer");
  };

  const nativeShare = async () => {
    close(true);
    trackEvent(kind, "share-native", id);
    try {
      await navigator.share({ title, text, url });
    } catch (err) {
      // The user dismissed the sheet: not an error.
      if (err instanceof DOMException && err.name === "AbortError") return;
      toast.error("Couldn't open the share sheet");
    }
  };

  const item =
    "flex min-h-11 w-full cursor-pointer items-center gap-3 px-3 text-left text-[14px] leading-5 text-dc-fg2 outline-none transition-colors duration-150 ease-out hover:bg-dc-lavender focus-visible:bg-dc-lavender lg:min-h-10";

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? close() : openMenu())}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={present ? menuId : undefined}
        className={cn(className, open && "border-dc-purple")}
      >
        <Share2 className="size-4 text-dc-purple" />
        Share
      </button>
      {present &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-label={`Share this ${kind}`}
            // Hidden until the layout effect anchors it (no flash at 0,0).
            style={{ width: MENU_WIDTH, visibility: "hidden" }}
            className={cn(
              "fixed z-[60] overflow-hidden rounded-xl border border-dc-hairline bg-white py-1 font-heading shadow-[0_8px_24px_rgba(34,17,68,0.12)]",
              "transition-[opacity,transform] ease-out motion-reduce:transition-none",
              entered
                ? "translate-y-0 scale-100 opacity-100 duration-150"
                : "translate-y-[var(--enter-y)] scale-95 opacity-0 duration-100"
            )}
          >
            <button type="button" role="menuitem" onClick={() => void copyLink()} className={item}>
              <Link2 className="size-4 shrink-0 text-dc-purple" />
              Copy link
            </button>
            <button type="button" role="menuitem" onClick={postOnX} className={item}>
              <XIcon className="size-4 shrink-0 text-dc-purple" />
              Post on X
            </button>
            {canNativeShare && (
              <button type="button" role="menuitem" onClick={() => void nativeShare()} className={item}>
                <Share2 className="size-4 shrink-0 text-dc-purple" />
                More options…
              </button>
            )}
          </div>,
          document.body
        )}
    </>
  );
}
