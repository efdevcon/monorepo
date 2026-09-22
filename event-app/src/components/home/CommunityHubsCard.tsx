"use client";

import { ArrowRight, Tent } from "lucide-react";
import { Link } from "@/routing";
import { HUBS_PARAM } from "@/data/store/schedule-source";

/** Home entry points for the Community Hubs' programmes. */
export function CommunityHubsCard() {
  const links = [
    { href: `/schedule?${HUBS_PARAM}=1`, label: "Hub schedules" },
    { href: "/community-hubs", label: "Hub sheets, as the hubs publish them" },
  ];

  return (
    <section className="rounded-xl border border-dc-hairline bg-white p-4 lg:p-5">
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-dc-purple-wash text-dc-purple">
          <Tent className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-[16px] font-bold leading-6 text-dc-fg2">Community Hubs</h2>
          <p className="text-[13px] leading-5 text-dc-muted">
            Community-run spaces with their own programme across all four days.
          </p>
        </div>
      </div>
      <ul className="mt-3 flex flex-col divide-y divide-dc-hairline">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="flex items-center justify-between gap-3 py-2.5 text-[14px] font-semibold text-dc-fg2 hover:text-dc-purple"
            >
              {link.label}
              <ArrowRight className="size-4 shrink-0 text-dc-purple" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
