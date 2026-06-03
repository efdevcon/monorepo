"use client";

import { CalendarDays, Tv, User, Users, type LucideIcon } from "lucide-react";
import APP_CONFIG from "@/CONFIG";
import { Link } from "@/routing";
import { useUser } from "@/data/auth/useUser";

type MenuItem = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  enabled: boolean;
};

const menuItems: MenuItem[] = [
  {
    href: "/schedule",
    label: "Schedule",
    description: "Browse all sessions",
    icon: CalendarDays,
    enabled: APP_CONFIG.SCHEDULE_ENABLED,
  },
  {
    href: "/speakers",
    label: "Speakers",
    description: "Meet our speakers",
    icon: Users,
    enabled: APP_CONFIG.SPEAKERS_ENABLED,
  },
  {
    href: "/room-screens",
    label: "Room Screens",
    description: "View room displays",
    icon: Tv,
    enabled: APP_CONFIG.ROOMS_ENABLED,
  },
  {
    href: "/profile",
    label: "Profile",
    description: "Manage your account",
    icon: User,
    enabled: true,
  },
];

export function Menu() {
  const { user } = useUser();
  const enabledItems = menuItems.filter((item) => item.enabled);
  const name = user?.email?.split("@")[0];

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6">
      {/* Welcome hero */}
      <section className="relative mb-6 overflow-hidden rounded-2xl bg-[#3D00BF]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/login/backdrop.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="relative flex min-h-[220px] flex-col justify-end p-6 text-white">
          <p className="text-sm font-medium text-white/80">
            {name ? `Welcome back, ${name} 👋` : "Hello, welcome 👋"}
          </p>
          <h1 className="mt-1 text-3xl font-bold">{APP_CONFIG.APP_NAME}</h1>
          <p className="mt-1 max-w-md text-sm text-white/80">
            {APP_CONFIG.APP_DESCRIPTION}
          </p>
        </div>
      </section>

      {/* Quick access */}
      {enabledItems.length === 0 ? (
        <p className="text-center text-gray-500">
          No features are currently enabled.
        </p>
      ) : (
        <nav className="grid grid-cols-2 gap-3">
          {enabledItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch
                className="flex flex-col gap-2 rounded-xl border border-[#E1E4EA] p-4 transition-colors hover:border-[#ac9fdf] hover:bg-[#f3eeff]"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f3eeff] text-[#7D52F4]">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="font-semibold">{item.label}</span>
                <span className="text-sm text-gray-500">{item.description}</span>
              </Link>
            );
          })}
        </nav>
      )}
    </main>
  );
}
