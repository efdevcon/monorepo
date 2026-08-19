"use client";

import { usePathname } from "next/navigation";
import cn from "classnames";
import { ArrowLeft, Sparkles } from "lucide-react";
import APP_CONFIG from "@/CONFIG";
import { Link, BackButton } from "@/routing";
import { useUser } from "@/data/auth/useUser";
import { useAnnouncements } from "@/data/announcements/useAnnouncements";
import { NAV_ITEMS, isNavActive } from "@/components/Nav";

/**
 * Pages render their own header buttons (filter, jump-to-now, …) into this
 * portal target so the header itself stays page-agnostic.
 */
export const HEADER_ACTIONS_ID = "header-actions";

interface RouteChrome {
  title: string;
  /** Detail pages show a back arrow instead of the logomark. */
  back?: boolean;
  /** Where the back arrow lands when there is no history (deep link). */
  backFallback?: string;
}

function routeChrome(pathname: string): RouteChrome {
  if (pathname.startsWith("/schedule/"))
    return { title: "Session details", back: true, backFallback: "/schedule" };
  if (pathname.startsWith("/schedule")) return { title: "Schedule" };
  if (pathname.startsWith("/speakers/"))
    return { title: "Speaker details", back: true, backFallback: "/speakers" };
  if (pathname.startsWith("/speakers")) return { title: "Speakers" };
  if (pathname.startsWith("/map")) return { title: "Map" };
  if (pathname.startsWith("/ticket")) return { title: "Tickets" };
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
  const pathname = usePathname();
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
  const { title, back, backFallback } = routeChrome(pathname);

  return (
    <header className="sticky top-0 z-30 font-heading">
      {/* Mobile: 56px glass bar with page title */}
      <div className="flex min-h-14 items-center justify-between border-b border-dc-hairline bg-white/75 px-4 py-3 backdrop-blur-[4px] lg:hidden">
        <div className="flex min-w-0 items-center gap-2">
          {back ? (
            <BackButton
              fallbackHref={backFallback}
              className="-m-1 flex size-7 shrink-0 cursor-pointer items-center justify-center p-1"
            >
              <ArrowLeft className="size-5 text-dc-fg2" />
            </BackButton>
          ) : (
            <span className="flex size-7 shrink-0 items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/schedule/devcon8-logomark.svg"
                alt="Devcon 8 India"
                className="h-7 w-auto"
              />
            </span>
          )}
          <span className="truncate text-[16px] font-bold leading-none tracking-[-0.25px] text-dc-fg2">
            {title}
          </span>
        </div>
        <div
          id={HEADER_ACTIONS_ID}
          className="flex shrink-0 items-center justify-end gap-3"
        />
      </div>

      {/* Desktop: full-bleed glass bar, content centered at ~1440px */}
      <div className="hidden border-b border-dc-hairline bg-white/75 px-8 py-3 backdrop-blur-[4px] lg:block xl:px-16">
        <div className="mx-auto flex w-full max-w-[1440px] items-center gap-10">
        <Link href="/" prefetch className="shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/schedule/devcon8-logo.svg"
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
