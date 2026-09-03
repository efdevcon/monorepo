"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useLinkStatus } from "next/link";
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
 * One tab's icon + label. Rendered inside the Link so `useLinkStatus` can
 * read that Link's pending navigation: the tapped tab lights up on the tap
 * itself, not when the route commits (that gap is what read as a sluggish
 * app). Outside a Link (native branch) the hook reports not pending.
 */
function NavTab({
  item,
  active,
}: {
  item: NavItem;
  active: boolean;
}) {
  const { pending } = useLinkStatus();
  const Icon = item.icon;
  const lit = active || pending;
  return (
    <span
      className={cn(
        // Figma Tab Bar (5088:124): 40px cell, 16px icon, 12px label, 4px
        // gap, uniform 8/4 padding in both states, active radius 4.
        "flex h-10 w-full flex-col items-center justify-center gap-1 rounded px-2 py-1 text-[12px] leading-none transition-colors",
        lit ? "bg-dc-purple font-bold text-white" : "font-medium text-dc-fg"
      )}
    >
      <Icon className="size-4" />
      <span className="whitespace-nowrap text-center">{item.short}</span>
    </span>
  );
}

/**
 * Mobile bottom tab bar (Figma "Dev Handoff" / "Tab Bar" 5088:124): a
 * full-width translucent glass bar docked to the bottom edge, top corners
 * rounded, shadow cast upward; five equal-width cells, the active one a
 * purple chip. Desktop navigation lives in AppHeader.
 */
export function Nav() {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement | null>(null);

  // No nav on the full-screen room-screen kiosk or on mobile detail views.
  const hidden =
    pathname.startsWith("/room-screens/") || isDetailView(pathname);

  // Publish the bar's rendered height as --nav-clearance so bottom-anchored
  // overlays outside the layout flow (map controls, debug FAB) can sit above
  // it. Measured, not hardcoded: the height varies between browser tab and
  // installed PWA with env(safe-area-inset-bottom). 0 wherever the bar isn't
  // rendered (desktop's lg:hidden, detail views, kiosk), so those overlays
  // fall back to the screen edge.
  useEffect(() => {
    const root = document.documentElement;
    const el = navRef.current;
    if (!el) {
      root.style.setProperty("--nav-clearance", "0px");
      return;
    }
    const publish = () =>
      root.style.setProperty("--nav-clearance", `${el.offsetHeight}px`);
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(el);
    return () => {
      observer.disconnect();
      root.style.setProperty("--nav-clearance", "0px");
    };
  }, [hidden]);

  if (hidden) {
    return null;
  }

  const items = NAV_ITEMS.filter((i) => i.enabled && !i.hideOnMobile);

  return (
    <nav
      ref={navRef}
      // The 1px hairline is a ring shadow, not a border (no layout space)
      // and not an outline (outline only follows border-radius from Safari
      // 16.4 — earlier iOS drew it square around the rounded top corners).
      className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-1 rounded-t-2xl bg-[rgba(255,255,255,0.33)] px-3 pt-2 font-heading shadow-[0_0_0_1px_rgba(255,255,255,0.67),0px_-1px_4px_0px_rgba(0,0,0,0.06)] backdrop-blur-[6px] lg:hidden"
      // max(), not 12px + inset: the label row already carries 12px of its
      // own breathing room, so stacking the full home-indicator inset on top
      // read as dead space in the installed PWA (the inset alone clears the
      // indicator).
      style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
    >
      {items.map((item) => (
        // flex-1 + min-w-px (Figma `flex: 1 0 0`): a zero basis so every cell
        // is the same width regardless of label length, which also keeps the
        // tabs still when the active weight flips (no twin-label trick needed).
        <Link
          key={item.href}
          href={item.href}
          prefetch
          className="flex min-w-px flex-1"
        >
          <NavTab item={item} active={isNavActive(pathname, item.href)} />
        </Link>
      ))}
    </nav>
  );
}
