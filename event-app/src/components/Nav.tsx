"use client";

import { usePathname } from "next/navigation";
import cn from "classnames";
import {
  Bell,
  CalendarDays,
  CircleUserRound,
  Home,
  Map,
  Tv,
  Users,
} from "lucide-react";
import APP_CONFIG from "@/CONFIG";
import { Link } from "@/routing";

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
  {
    // Mobile tab reads "Me" (Figma tab-bar redesign); desktop keeps the
    // fuller "Tickets" wording in the header.
    href: "/ticket",
    label: "Tickets",
    short: "Me",
    icon: CircleUserRound,
    enabled: true,
  },
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
 * Mobile detail views (session / speaker details) hide the bottom bar so
 * they read as focused, single-purpose screens — the header back arrow is
 * the way out. The layout also trims its nav clearance on these routes.
 */
export function isDetailView(pathname: string): boolean {
  return (
    pathname.startsWith("/schedule/") || pathname.startsWith("/speakers/")
  );
}

/**
 * Mobile bottom tab bar (Figma "Dev Handoff" / "tab bar idea 2"): a
 * full-width translucent glass bar docked to the bottom edge, top corners
 * rounded, shadow cast upward; the active tab is a purple pill chip.
 * Desktop navigation lives in AppHeader.
 */
export function Nav() {
  const pathname = usePathname();

  // No nav on the full-screen room-screen kiosk or on mobile detail views.
  if (pathname.startsWith("/room-screens/") || isDetailView(pathname)) {
    return null;
  }

  const items = NAV_ITEMS.filter((i) => i.enabled && !i.hideOnMobile);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-1 rounded-t-2xl bg-[rgba(255,255,255,0.33)] px-3 pt-2 font-heading shadow-[0px_-1px_4px_0px_rgba(0,0,0,0.06)] outline outline-1 outline-[rgba(255,255,255,0.67)] backdrop-blur-[6px] lg:hidden"
      style={{ paddingBottom: "calc(12px + env(safe-area-inset-bottom))" }}
    >
      {items.map((item) => {
        const active = isNavActive(pathname, item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch
            className={cn(
              // Uniform px on both states — the Figma's 12px-active/8px-idle
              // split made labels shift on every tab change. flex-auto (not
              // flex-1): the basis is each label's natural width, so longer
              // labels (Schedule, Speakers) get proportionally more room and
              // only the leftover space is shared equally.
              "flex flex-auto flex-col items-center justify-center gap-1.5 rounded-xl px-2 py-1 text-[11px] leading-none transition-colors",
              active ? "bg-dc-purple font-bold text-white" : "font-medium text-dc-fg2"
            )}
          >
            <Icon className="size-5" />
            {/* Stacked twin: the invisible bold copy reserves the label's
                active-state width, so flex-auto bases (and every tab's
                position) hold still when the weight flips on tab change. */}
            <span className="grid text-center">
              <span className="col-start-1 row-start-1">{item.short}</span>
              <span aria-hidden className="invisible col-start-1 row-start-1 font-bold">
                {item.short}
              </span>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
