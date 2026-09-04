"use client";

import { usePathname } from "next/navigation";
import cn from "classnames";
import { ArrowLeft, Sparkles } from "lucide-react";
import APP_CONFIG from "@/CONFIG";
import { Link } from "@/routing";
import { closeDetail, useDetailView } from "@/routing/detailParam";
import { handleTabClick } from "@/components/paneContext";
import type { DetailKind } from "@/routing/viewParams";
import { useUser } from "@/data/auth/useUser";
import { useAnnouncements } from "@/data/announcements/useAnnouncements";
import { NAV_ITEMS, isNavActive } from "@/components/Nav";
import { useRetryOnReconnect } from "@/hooks/useRetryOnReconnect";
import { OfflineIndicator } from "./OfflineIndicator";

/**
 * Pages render their own header buttons (filter, jump-to-now, …) into this
 * portal target so the header itself stays page-agnostic.
 */
export const HEADER_ACTIONS_ID = "header-actions";

/**
 * Mobile fold-out slot directly under the header bar (search drawer). An
 * absolutely-positioned overlay inside the sticky header, so opening it never
 * changes the header's height — every hardcoded sticky offset below
 * (top-14, top-[103px], scroll margins, the speakers rail math) stays valid.
 */
export const HEADER_DRAWER_ID = "header-drawer";

/** Circular 32px glass icon button used in the app header (Figma). Border
 *  and fill are applied per-usage (resting vs active) — Tailwind resolves
 *  same-property conflicts by stylesheet order, not class order, so an
 *  appended active bg-* could not reliably override one baked in here.
 *  before:-inset-1.5 extends the 32px circle to the 44px touch floor; the
 *  ±6px extensions exactly meet across the header's 12px gaps. */
export const headerCircle =
  "relative flex size-8 cursor-pointer items-center justify-center rounded-full border transition-opacity before:absolute before:-inset-1.5 before:content-['']";
export const headerCircleResting = "border-dc-hairline bg-white";
export const headerCircleActive = "border-dc-purple bg-dc-lavender";

interface RouteChrome {
  title: string;
  /** Detail views show a back arrow (closing the view) instead of the logomark. */
  back?: DetailKind;
}

function routeChrome(pathname: string, detail: DetailKind | null): RouteChrome {
  if (detail === "session") return { title: "Session details", back: "session" };
  if (detail === "speaker") return { title: "Speaker details", back: "speaker" };
  if (pathname.startsWith("/schedule")) return { title: "Schedule" };
  if (pathname.startsWith("/speakers")) return { title: "Speakers" };
  if (pathname.startsWith("/map")) return { title: "Map" };
  if (pathname.startsWith("/ticket")) return { title: "My Devcon" };
  if (pathname.startsWith("/announcements")) return { title: "Announcements" };
  if (pathname.startsWith("/room-screens")) return { title: "Room Screens" };
  if (pathname === "/") return { title: "Home" };
  return { title: APP_CONFIG.APP_NAME };
}

/**
 * App chrome header (Figma "Dev Handoff" / PWA Schedule).
 * Mobile: 56px glass bar — Devcon 8 logomark + page title left, page-provided
 * icon buttons right (via the #header-actions portal target).
 * Desktop: glass nav bar — full Devcon 8 India logo + underline-tab links.
 * Every enabled route stays reachable here regardless of the design's 5-item
 * nav (Tickets, Room Screens, Announcements and the AI entry included).
 */
export function AppHeader({ onOpenAI }: { onOpenAI?: () => void } = {}) {
  // Shared by the mobile logomark and the desktop logo — one reconnect retries
  // whichever of them failed.
  const { attempt: markAttempt, markFailed: markLogoFailed } =
    useRetryOnReconnect();
  const pathname = usePathname();
  const { kind: detailKind } = useDetailView();
  const { user } = useUser();
  const { unreadCount } = useAnnouncements({
    enabled:
      APP_CONFIG.ANNOUNCEMENTS_ENABLED && !pathname.startsWith("/room-screens/"),
  });

  // No chrome on the full-screen room-screen kiosk.
  if (pathname.startsWith("/room-screens/")) {
    return null;
  }

  const items = NAV_ITEMS.filter((i) => i.enabled);
  const { title, back } = routeChrome(pathname, detailKind);

  return (
    <header className="sticky top-0 z-30 font-heading">
      {/* Mobile: 56px glass bar with page title. pt/min-h grow by --safe-top
          so the glass itself covers the iOS status-bar strip. */}
      <div className="flex min-h-[calc(3.5rem+var(--safe-top))] items-center justify-between border-b border-dc-hairline bg-white/75 px-4 pb-3 pt-[calc(0.75rem+var(--safe-top))] backdrop-blur-[4px] lg:hidden">
        <div className="flex min-w-0 items-center gap-2">
          {back ? (
            // Closes the in-page detail view: history.back() when we pushed
            // it, otherwise (deep link) drops the param in place. Never
            // leaves the app.
            <button
              type="button"
              onClick={() => closeDetail(back)}
              aria-label="Back"
              className="-m-1 flex size-7 shrink-0 cursor-pointer items-center justify-center p-1"
            >
              <ArrowLeft className="size-5 text-dc-fg2" />
            </button>
          ) : (
            <span className="flex size-7 shrink-0 items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={markAttempt}
                src="/schedule/devcon8-logomark.svg"
                onError={markLogoFailed}
                alt="Devcon 8 India"
                className="h-7 w-auto"
              />
            </span>
          )}
          <span className="truncate text-[16px] font-bold leading-none tracking-[-0.25px] text-dc-fg2">
            {title}
          </span>
          <OfflineIndicator />
        </div>
        <div
          id={HEADER_ACTIONS_ID}
          className="flex shrink-0 items-center justify-end gap-3"
        />
      </div>

      {/* Mobile fold-out drawer slot (search) — overlays the content below
          the bar rather than growing the header. */}
      <div id={HEADER_DRAWER_ID} className="absolute inset-x-0 top-full lg:hidden" />

      {/* Desktop: full-bleed glass bar, content centered at ~1440px.
          --safe-top matters here too (iPad PWA). */}
      <div className="hidden border-b border-dc-hairline bg-white/75 px-8 pb-3 pt-[calc(0.75rem+var(--safe-top))] backdrop-blur-[4px] lg:block xl:px-16">
        <div className="mx-auto flex w-full max-w-[1440px] items-center gap-10">
        <Link href="/" prefetch className="shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={markAttempt}
            src="/schedule/devcon8-logo.svg"
            onError={markLogoFailed}
            alt="Devcon 8 India"
            className="h-10 w-auto"
          />
        </Link>
        <nav className="flex min-w-0 items-center gap-2">
          {items.map((item) => {
            const active = isNavActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                // Full prefetch (RSC included) so the SW caches each route's
                // payload — enables smooth offline navigation between routes.
                prefetch
                onClick={(e) => handleTabClick(e, item.href, pathname)}
                className={cn(
                  "flex items-center gap-2 border-b-2 px-2 pb-2 pt-3 text-[16px] leading-none tracking-[-0.25px] transition-colors",
                  active
                    ? "border-dc-purple font-bold text-dc-purple"
                    : "border-transparent text-dc-fg2 hover:text-dc-purple"
                )}
              >
                {item.label}
                {item.unreadBadge && unreadCount > 0 && (
                  <span className="rounded-full bg-dc-purple px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                    {unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
          {onOpenAI && user && (
            <button
              onClick={onOpenAI}
              className="flex cursor-pointer items-center gap-1.5 border-b-2 border-transparent px-2 pb-2 pt-3 text-[16px] font-bold leading-none tracking-[-0.25px] text-dc-purple transition-colors hover:opacity-80"
            >
              <Sparkles className="size-4" />
              AI
            </button>
          )}
        </nav>
        </div>
      </div>
    </header>
  );
}
