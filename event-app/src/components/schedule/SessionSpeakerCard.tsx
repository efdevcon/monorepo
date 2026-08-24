"use client";

import { Speech } from "lucide-react";
import type { Speaker } from "@/data/models";
import { Link } from "@/routing";
import { Avatar } from "@/components/Avatar";

/**
 * Speaker row in session details (Figma): 48px avatar (spoofed initials
 * placeholder when the data has no image), bold name, session count / role,
 * and outlined uppercase mini-tags.
 */
export function SessionSpeakerCard({ speaker }: { speaker: Speaker }) {
  const sessionCount = speaker.sessions?.length ?? 0;
  const subtitle =
    sessionCount > 0
      ? `${sessionCount} session${sessionCount > 1 ? "s" : ""}`
      : [speaker.role, speaker.company].filter(Boolean).join(" · ");
  const tags = (speaker.tracks ?? []).slice(0, 2);

  return (
    <Link
      href={`/speakers/${speaker.id}`}
      // No viewport prefetch (see SpeakerCard) — client page on cached data.
      prefetch={false}
      className="flex items-center gap-4 rounded-lg border border-dc-hairline bg-white p-3 transition-colors hover:border-dc-purple/40"
    >
      <Avatar name={speaker.name} src={speaker.avatar || undefined} size={48} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="truncate text-[14px] font-bold leading-5 text-dc-fg">
          {speaker.name}
        </p>
        {subtitle && (
          <p className="flex items-center gap-1 text-[12px] leading-none text-dc-muted">
            <Speech className="size-3.5 shrink-0" />
            <span className="truncate">{subtitle}</span>
          </p>
        )}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-[2px] border border-dc-muted px-1.5 py-[3px] text-[9px] font-semibold uppercase leading-none tracking-[0.5px] text-dc-muted"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
