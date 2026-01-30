"use client";

import APP_CONFIG from "@/CONFIG";
import { Link } from "@/routing";

const menuItems = [
  {
    href: "/schedule",
    label: "Schedule",
    description: "Browse all sessions",
    enabled: APP_CONFIG.SCHEDULE_ENABLED,
  },
  {
    href: "/speakers",
    label: "Speakers",
    description: "Meet our speakers",
    enabled: APP_CONFIG.SPEAKERS_ENABLED,
  },
  {
    href: "/room-screens",
    label: "Room Screens",
    description: "View room displays",
    enabled: APP_CONFIG.ROOMS_ENABLED,
  },
];

export function Menu() {
  const enabledItems = menuItems.filter((item) => item.enabled);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-md w-full">
        <h1 className="text-3xl font-bold mb-2">{APP_CONFIG.APP_NAME}</h1>
        <p className="text-gray-600 mb-8">{APP_CONFIG.APP_DESCRIPTION}</p>

        <nav className="space-y-3">
          {enabledItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              className="block w-full p-4 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <span className="font-semibold">{item.label}</span>
              <span className="text-sm text-gray-500 block">{item.description}</span>
            </Link>
          ))}
        </nav>

        {enabledItems.length === 0 && (
          <p className="text-gray-500 text-center">No features are currently enabled.</p>
        )}
      </div>
    </main>
  );
}
