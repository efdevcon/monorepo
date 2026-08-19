"use client";

import { usePathname } from "next/navigation";
import cn from "classnames";
import { Bell, CalendarDays, Home, Map, Sparkles, Ticket, Tv, Users } from "lucide-react";
import APP_CONFIG from "@/CONFIG";
import { Link } from "@/routing";
import { useUser } from "@/data/auth/useUser";

export type NavItem = {
  href: string;
  /** Full label (desktop header). */
  label: string;
  /** Short label (mobile bottom bar). */
  short: string;
  icon: typeof Home;
  enabled: boolean;
  /** Hide this item in the mobile bottom bar. */
  hideOnMobile?: boolean;
  /** Show the announcements unread-count badge on this item. */
  unreadBadge?: boolean;
};

/** Shared route list for AppHeader (desktop) and the mobile bottom bar. */
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home", short: "Home", icon: Home, enabled: true },
  {
    href: "/schedule",
    label: "Schedule",
    short: "Schedule",
    icon: CalendarDays,
    enabled: APP_CONFIG.SCHEDULE_ENABLED,
  },
  {
    href: "/speakers",
    label: "Speakers",
    short: "Speakers",
    icon: Users,
    enabled: APP_CONFIG.SPEAKERS_ENABLED,
  },
  {
    href: "/map",
    label: "Venue Map",
    short: "Map",
    icon: Map,
    enabled: APP_CONFIG.MAP_ENABLED,
  },
  {
    href: "/room-screens",
    label: "Room Screens",
    short: "Rooms",
    icon: Tv,
    enabled: APP_CONFIG.ROOMS_ENABLED,
    hideOnMobile: true,
  },
  { href: "/ticket", label: "Tickets", short: "Tickets", icon: Ticket, enabled: true },
  {
    // Mobile reaches announcements via the home-screen section; the bottom
    // pill is already at capacity.
    href: "/announcements",
    label: "Announcements",
    short: "News",
    icon: Bell,
    enabled: APP_CONFIG.ANNOUNCEMENTS_ENABLED,
    hideOnMobile: true,
    unreadBadge: true,
  },
];

export function isNavActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Mobile bottom tab bar (Figma "Dev Handoff" / PWA Schedule): a floating
 * glass pill 24px off the bottom; the active tab is a purple square-ish chip
 * with a soft purple glow. Desktop navigation lives in AppHeader.
 */
export function Nav({ onOpenAI }: { onOpenAI?: () => void } = {}) {
  const pathname = usePathname();
  const { user } = useUser();

  // No nav on the full-screen room-screen kiosk.
  if (pathname.startsWith("/room-screens/")) {
    return null;
  }

  const items = NAV_ITEMS.filter((i) => i.enabled && !i.hideOnMobile);

  return (
    <nav
      className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 font-heading lg:hidden"
      style={{ paddingBottom: "max(24px, env(safe-area-inset-bottom))" }}
    >
      <div className="pointer-events-auto flex w-full max-w-[420px] items-center justify-between overflow-clip rounded-full border border-dc-hairline bg-white/75 px-4 py-1 backdrop-blur-[5px]">
        {items.map((item) => {
          const active = isNavActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              className={cn(
                "flex h-10 flex-col items-center justify-center gap-1 px-2 py-1 text-[11px] leading-none transition-colors",
                active
                  ? "rounded-[4px] bg-dc-purple font-bold text-white shadow-[0px_2px_2px_rgba(114,53,237,0.3),0px_1px_1px_rgba(114,53,237,0.3)]"
                  : "rounded-full font-medium text-dc-fg"
              )}
            >
              <Icon className="size-4" />
              <span>{item.short}</span>
            </Link>
          );
        })}
        {onOpenAI && user && (
          <button
            onClick={onOpenAI}
            className="flex h-10 cursor-pointer flex-col items-center justify-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium leading-none text-dc-purple"
          >
            <Sparkles className="size-4" />
            <span>AI</span>
          </button>
        )}
      </div>
    </nav>
  );
}
