"use client";

import { usePathname } from "next/navigation";
import cn from "classnames";
import { CalendarDays, Home, Map, Sparkles, Tv, User, Users } from "lucide-react";
import APP_CONFIG from "@/CONFIG";
import { Link } from "@/routing";
import { useUser } from "@/data/auth/useUser";

type NavItem = {
  href: string;
  /** Full label (desktop). */
  label: string;
  /** Short label (mobile). */
  short: string;
  icon: typeof Home;
  enabled: boolean;
  /** Hide this item in the mobile bottom bar. */
  hideOnMobile?: boolean;
};

const NAV_ITEMS: NavItem[] = [
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
  { href: "/profile", label: "Profile", short: "Profile", icon: User, enabled: true },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * App navigation. Mobile: a floating glass pill at the bottom (icons + short
 * labels). Desktop: a sticky, centered header with full labels.
 * Devcon-inspired purple active state.
 */
export function Nav({ onOpenAI }: { onOpenAI?: () => void } = {}) {
  const pathname = usePathname();
  const { user, hasInitialized } = useUser();
  const items = NAV_ITEMS.filter((i) => i.enabled);

  // Resolve the link target up front: Profile goes straight to /login when
  // logged out, so we don't navigate to /profile and bounce (URL flash).
  const targetHref = (item: NavItem) =>
    item.href === "/profile" && hasInitialized && !user ? "/login" : item.href;

  // No nav on the login screen or the full-screen room-screen kiosk.
  if (pathname === "/login" || pathname.startsWith("/room-screens/")) {
    return null;
  }

  return (
    <>
      {/* Desktop: sticky centered header */}
      <header className="hidden lg:flex sticky top-0 z-30 justify-center px-4 py-3">
        <nav className="flex items-center gap-1 rounded-full border border-[#E1E4EA] bg-white/80 px-2 py-1.5 shadow-sm backdrop-blur">
          {items.map((item) => {
            const href = targetHref(item);
            const active = isActive(pathname, href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={href}
                className={cn(
                  "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors",
                  active
                    ? "text-[#7D52F4]"
                    : "text-gray-600 hover:text-gray-900"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
          {onOpenAI && user && (
            <button
              onClick={onOpenAI}
              className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-[#7D52F4] transition-colors hover:bg-[#f3eeff]"
            >
              <Sparkles className="h-4 w-4" />
              AI
            </button>
          )}
        </nav>
      </header>

      {/* Mobile: floating bottom pill */}
      <nav
        className="lg:hidden fixed inset-x-0 bottom-0 z-30 flex justify-center pointer-events-none"
        style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
      >
        <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-[#E1E4EA] bg-white/80 px-2 py-2 shadow-lg backdrop-blur">
          {items
            .filter((item) => !item.hideOnMobile)
            .map((item) => {
              const href = targetHref(item);
              const active = isActive(pathname, href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={href}
                  className={cn(
                    "flex flex-col items-center justify-center gap-0.5 rounded-full px-3 py-1.5 text-[10px] font-medium transition-colors",
                    active ? "text-[#7D52F4]" : "text-gray-500 hover:text-gray-900"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.short}</span>
                </Link>
              );
            })}
          {onOpenAI && user && (
            <button
              onClick={onOpenAI}
              className="flex flex-col items-center justify-center gap-0.5 rounded-full px-3 py-1.5 text-[10px] font-medium text-[#7D52F4] transition-colors hover:bg-[#f3eeff]"
            >
              <Sparkles className="h-5 w-5" />
              <span>AI</span>
            </button>
          )}
        </div>
      </nav>
    </>
  );
}
