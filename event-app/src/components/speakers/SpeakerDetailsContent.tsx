"use client";

import { Copy, Globe, Star } from "lucide-react";
import cn from "classnames";
import { toast } from "sonner";
import { Avatar } from "@/components/Avatar";
import { useInterestedSpeakers } from "@/data/interested/useInterestedSpeakers";
import { SessionCard } from "@/components/schedule/SessionCard";
import { groupSessionsByDay } from "@/components/schedule/utils";
import type { Session } from "@/data/models";
import type { DecoratedSpeaker } from "./useSpeakersData";
import { SpeakerTagChip } from "./SpeakerCard";
import { SpeakerSessionMiniCard } from "./SpeakerSessionMiniCard";

/** GitHub glyph — lucide dropped its brand icons, so inline SVG. */
function GithubIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className={className}
    >
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55 0-.27-.01-1.17-.02-2.12-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.75 2.69 1.25 3.34.95.1-.74.4-1.25.72-1.53-2.55-.29-5.23-1.28-5.23-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.16-1.18 3.16-1.18.63 1.59.24 2.76.12 3.05.74.81 1.18 1.83 1.18 3.09 0 4.42-2.69 5.39-5.25 5.67.41.36.78 1.05.78 2.12 0 1.53-.01 2.77-.01 3.15 0 .3.2.67.8.55A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5" />
    </svg>
  );
}

/** X (Twitter) glyph — lucide's brand icons are deprecated, so inline SVG. */
function XIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className={className}
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

const socialLink =
  "flex size-6 items-center justify-center text-dc-purple transition-opacity hover:opacity-80";

/**
 * Two typographic scales share one structure:
 * - `sm` — the 360px side panel and the mobile page (Figma 5114:4920 / 4702 /
 *   4811): 20px name, 96px avatar, 14px bio, 9px tags, full-width pills.
 * - `lg` — the desktop expanded page's 520px speaker card (Figma 5114:4036):
 *   24px name, 120px avatar, 16px bio, 11px tags, auto-width pills.
 */
type Scale = "sm" | "lg";

/**
 * Header band: name (wraps) with X / GitHub / website links, and a ringed
 * avatar. Featured speakers get a marigold ring, a FEATURED tag under the
 * avatar and a peach band; everyone else a purple ring and a lavender band.
 * The tint fades into the panel grey over the top 80% (Figma stop at 20%).
 */
function SpeakerHeaderBand({
  decorated,
  scale,
}: {
  decorated: DecoratedSpeaker;
  scale: Scale;
}) {
  const { speaker, isFeatured } = decorated;
  const lg = scale === "lg";
  return (
    <div
      className={cn(
        "flex items-center gap-4 bg-gradient-to-t from-[rgba(249,248,250,0)] from-20%",
        lg ? "p-4" : "px-4 pb-2 pt-4",
        // Featured: peach (marigold tint); otherwise lavender (purple tint).
        isFeatured ? "to-[#ffe3d1]" : "to-[#e2d5fb]"
      )}
    >
      <div className={cn("flex min-w-0 flex-1 flex-col", lg ? "gap-3" : "gap-2")}>
        <h1
          className={cn(
            "font-bold leading-[1.2] tracking-[-0.5px] text-dc-fg2 [overflow-wrap:anywhere]",
            lg ? "text-[24px]" : "text-[20px]"
          )}
        >
          {speaker.name}
        </h1>
        {(speaker.twitter || speaker.github || speaker.website) && (
          // 20px glyphs in 24px boxes, 12px apart (Figma order: X, GitHub, web)
          <div className="flex items-center gap-3">
            {speaker.twitter && (
              <a
                href={`https://x.com/${speaker.twitter}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${speaker.name} on X`}
                className={socialLink}
              >
                <XIcon className="size-5" />
              </a>
            )}
            {speaker.github && (
              <a
                href={`https://github.com/${speaker.github}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${speaker.name} on GitHub`}
                className={socialLink}
              >
                <GithubIcon className="size-5" />
              </a>
            )}
            {speaker.website && (
              <a
                href={speaker.website}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${speaker.name}’s website`}
                className={socialLink}
              >
                <Globe className="size-5" />
              </a>
            )}
          </div>
        )}
      </div>
      <div className="relative shrink-0">
        {/* 96px (panel) / 120px (expanded) circle with a 2px ring: marigold
            for featured, purple-300 (#b08df5, not a dc-* token yet)
            otherwise. Avatar handles photo / identicon / initials; the size
            fills the ring's inner box. */}
        <div
          className={cn(
            "flex items-center justify-center overflow-clip rounded-full border-2",
            lg ? "size-[120px]" : "size-24",
            isFeatured ? "border-dc-featured" : "border-[#b08df5]"
          )}
        >
          <Avatar
            name={speaker.name}
            src={speaker.avatar || undefined}
            size={lg ? 116 : 92}
          />
        </div>
        {isFeatured && (
          // Centred under the avatar, overlapping its bottom edge by 8px.
          <span
            className={cn(
              "absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-[2px] bg-dc-featured px-1.5 py-[3px] font-semibold uppercase leading-none tracking-[0.5px] text-dc-fg2",
              lg ? "text-[12px]" : "text-[10px]"
            )}
          >
            Featured
          </span>
        )}
      </div>
    </div>
  );
}

/** Bio, topic-tag recap and the Interested / Copy-name pills. */
function SpeakerProfile({
  decorated,
  scale,
}: {
  decorated: DecoratedSpeaker;
  scale: Scale;
}) {
  const { speaker, tags } = decorated;
  const lg = scale === "lg";
  const { isInterested, toggle } = useInterestedSpeakers();
  const interested = isInterested(speaker.id);

  const copyName = async () => {
    try {
      await navigator.clipboard.writeText(speaker.name);
      toast(
        <span>
          <span className="font-semibold">{speaker.name}</span> copied to
          clipboard.
        </span>
      );
    } catch {
      toast("Couldn’t copy the name.");
    }
  };

  const pill =
    "flex min-h-8 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-full border px-2 py-1 text-[12px] leading-none text-dc-fg2";

  return (
    <div className="flex flex-col gap-4 p-4">
      {(speaker.description || tags.length > 0) && (
        <div className={cn("flex flex-col", lg ? "gap-4" : "gap-2")}>
          {speaker.description && (
            // No section title: the header already names the person, so the
            // bio reads as theirs without a "Profile" label above it.
            <p
              className={cn(
                // [overflow-wrap:anywhere]: bios carry long unbroken URLs,
                // which otherwise widen the fixed detail layer past the
                // viewport (iOS Safari then widens the whole layout viewport).
                "text-dc-fg2 [overflow-wrap:anywhere]",
                lg ? "text-[16px] leading-6" : "text-[14px] leading-5"
              )}
            >
              {speaker.description}
            </p>
          )}
          {/* Topic-tag recap — the list clips these, so the details view
              spells them out (PR #112 feedback). Same 3-tag cap as the
              desktop card row. */}
          {tags.length > 0 && (
            <div
              className={cn(
                "flex flex-wrap items-center",
                lg ? "gap-2" : "gap-1 pt-1"
              )}
            >
              {tags.slice(0, 3).map((tag) =>
                lg ? (
                  <span
                    key={tag}
                    className="whitespace-nowrap rounded-[2px] border border-dc-muted px-2 py-1 text-[11px] font-semibold uppercase leading-none tracking-[0.5px] text-dc-muted"
                  >
                    {tag}
                  </span>
                ) : (
                  <SpeakerTagChip key={tag} tag={tag} />
                )
              )}
            </div>
          )}
        </div>
      )}
      {/* Panel/mobile: two equal pills; expanded: auto-width pills, 12px apart. */}
      <div className={cn(lg ? "flex items-center gap-3" : "grid grid-cols-2 gap-3")}>
        <button
          onClick={() => void toggle(speaker.id, speaker.name)}
          className={cn(
            pill,
            interested
              ? "border-dc-purple bg-dc-lavender"
              : "border-dc-hairline bg-white"
          )}
        >
          <Star
            className={cn(
              "size-4 text-dc-purple",
              interested ? "fill-dc-purple" : "fill-transparent"
            )}
          />
          {interested ? "Interested" : "Add to Interests"}
        </button>
        <button
          onClick={() => void copyName()}
          className={cn(pill, "border-dc-hairline bg-white")}
        >
          <Copy className="size-4 text-dc-purple" />
          Copy name
        </button>
      </div>
    </div>
  );
}

/**
 * "Sessions (N)" heading + the speaker's sessions under small day headers
 * ("Tue, Nov 12", 14px medium muted). `renderCard` picks the card: the
 * mobile mini card for the panel/mobile page, the desktop SessionCard for
 * the expanded page.
 */
function SpeakerSessionsByDay({
  sessions,
  renderCard,
  groupGap,
}: {
  sessions: Session[];
  renderCard: (session: Session) => React.ReactNode;
  /** Gap between heading and groups (Figma: 12 in the panel, 20 expanded). */
  groupGap: "sm" | "lg";
}) {
  const groups = groupSessionsByDay(sessions);
  return (
    <div className={cn("flex flex-col", groupGap === "lg" ? "gap-5" : "gap-3")}>
      <h2 className="text-[16px] font-bold leading-6 text-dc-fg2">
        Sessions <span className="font-normal">({sessions.length})</span>
      </h2>
      {groups.length > 0 ? (
        groups.map((group) => (
          <div key={group.key} className="flex flex-col gap-3">
            <h3 className="text-[14px] font-medium leading-5 text-dc-muted">
              {group.label}
            </h3>
            {group.sessions.map(renderCard)}
          </div>
        ))
      ) : (
        <p className="text-[14px] leading-5 text-dc-muted">
          No sessions listed yet.
        </p>
      )}
    </div>
  );
}

/**
 * Single-column speaker details (Figma "Speaker details" 5114:4920 / 4702 /
 * 4811): header band, profile + pills, then sessions grouped by day using the
 * mobile mini card. Used by the desktop side panel and the mobile detail
 * layer at /speakers/<id> — the two surfaces are continuous (no gap between
 * the profile and the session list).
 */
export function SpeakerDetailsContent({
  decorated,
  className,
}: {
  decorated: DecoratedSpeaker;
  /** Extra root classes — the mobile page stretches the panel surface. */
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col bg-dc-panel", className)}>
      <SpeakerHeaderBand decorated={decorated} scale="sm" />
      <div className="border-b border-dc-hairline">
        <SpeakerProfile decorated={decorated} scale="sm" />
      </div>
      <div className="p-4">
        <SpeakerSessionsByDay
          sessions={decorated.sessions}
          groupGap="sm"
          renderCard={(session) => (
            <SpeakerSessionMiniCard key={session.id} session={session} />
          )}
        />
      </div>
    </div>
  );
}

/**
 * Desktop "Expanded Speaker Details" (Figma 5114:4036 / 4507 / 4183): a
 * 520px speaker card beside a flex-1 sessions card, both on the panel grey
 * with a 16px radius. Sessions use the desktop SessionCard (gem rail, inline
 * badges) at the dense 14px title scale, grouped under day headers.
 *
 * The left column (Back link + speaker card) is sticky so a long session
 * list never scrolls the person — or the way back — out of view. It pins
 * 16px under the 65px desktop header, like the list pages' side panels.
 */
export function SpeakerDetailsExpanded({
  decorated,
  back,
}: {
  decorated: DecoratedSpeaker;
  /** The page's Back control; rendered inside the sticky column. */
  back: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="sticky top-[calc(81px+var(--safe-top))] flex w-[520px] shrink-0 flex-col gap-4">
        {back}
        <div className="flex flex-col overflow-clip rounded-2xl border border-dc-hairline bg-dc-panel">
          <SpeakerHeaderBand decorated={decorated} scale="lg" />
          <SpeakerProfile decorated={decorated} scale="lg" />
        </div>
      </div>
      {/* Offset by the Back row (16px) + gap so the two cards' tops align. */}
      <div className="mt-8 min-w-0 flex-1 rounded-2xl border border-dc-hairline bg-dc-panel p-4">
        <SpeakerSessionsByDay
          sessions={decorated.sessions}
          groupGap="lg"
          renderCard={(session) => (
            <SessionCard key={session.id} session={session} dense />
          )}
        />
      </div>
    </div>
  );
}
