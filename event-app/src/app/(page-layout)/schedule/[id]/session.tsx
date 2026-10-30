"use client";

import cn from "classnames";
import { useSession } from "@/data/hooks";
import APP_CONFIG from "@/CONFIG";
import { use, useEffect, useRef, useState } from "react";
import { ArrowLeft, CalendarPlus } from "lucide-react";
import { closeDetail } from "@/routing/detailRoute";
import { DetailNotFound, HeaderActionsPortal } from "@/components/DetailLayer";
import { DetailSkeleton } from "@/components/Skeletons";
import { usePreviewState } from "@/hooks/usePreviewState";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import {
  SessionDetailsContent,
  SessionSpeakers,
  SessionSummary,
  downloadSessionIcs,
} from "@/components/schedule/SessionDetailsContent";
import { SessionQA } from "@/components/schedule/SessionQA";
import { roomHasNoQa } from "@/data/meerkat";
import { isCommunityHubSession } from "@/data/communityHubs";
import type { Session as SessionModel } from "@/data/models";

interface SessionClientProps {
  params?: Promise<{ id: string }>;
  id?: string;
}

/**
 * Fullscreen session details. Rendered by the Schedule tab's persistent pane
 * for `/schedule/<id>` (mobile: over the list; desktop: instead of it), from
 * the local store, so it works offline for any session once the event has
 * synced. `params` is kept for direct use as a route page component.
 */
export default function Session({ params, id: directId }: SessionClientProps) {
  const id = directId ?? use(params!).id;

  const { session, isLoading, error } = useSession(id);
  const preview = usePreviewState();
  // JS fork rather than lg:hidden twins: the two layouts differ in structure
  // and each mounts the Meerkat hooks, which must not run twice.
  const isDesktop = useIsDesktop();

  if (!APP_CONFIG.SCHEDULE_ENABLED) {
    return <div className="p-4 text-dc-muted">Schedule is not enabled</div>;
  }

  const detailPreview =
    preview === "loading" || preview === "notfound" || preview === "failed" ? preview : null;
  if (!session || detailPreview) {
    // Loading only while nothing has ever been synced; otherwise the id is
    // unknown (stale link, other dataset) or the first sync failed.
    if (detailPreview === "loading" || (!detailPreview && isLoading)) {
      return <DetailSkeleton kind="session" />;
    }
    return (
      <DetailNotFound
        kind="session"
        failed={detailPreview ? detailPreview === "failed" : Boolean(error)}
        onBack={() => closeDetail("session")}
      />
    );
  }

  // Shared with the desktop side panel (SessionQA owns the offline line).
  // A Community Hub session has no Q&A room: point at the hub's sheet instead.
  // Neither do performance rooms (roomHasNoQa: the Music Stage).
  const qa = isCommunityHubSession(session) || roomHasNoQa(session.room?.id) ? null : (
    <SessionQA session={session} size="md" />
  );

  if (isDesktop) {
    return <ExpandedSession session={session}>{qa}</ExpandedSession>;
  }

  return (
    // Room under the speakers for the Q&A's docked button (SessionQA): 69px tall.
    <main className="expand font-heading text-dc-fg has-[[data-qa-cta]]:pb-[69px]">
      {/* Mobile: panel-grey underlay over the app gradient (between .app-bg
          at z -10 and the content) so the surface fills the whole viewport —
          the content block alone ends at its own height, which left the
          gradient showing below short sessions. Same fix as speaker.tsx. */}
      <div className="fixed inset-0 -z-[5] bg-dc-panel lg:hidden" aria-hidden />
      <HeaderActions session={session} />
      <SessionDetailsContent session={session} variant="page">
        {qa}
      </SessionDetailsContent>
    </main>
  );
}

/**
 * Desktop "Expanded Session Details" (Figma 5114:1308): Back link, then a
 * viewport-fit two-column card — session summary on the left, "Speakers (N)"
 * then Live Q&A in a 427px right rail (speakers first, like the side panel:
 * they're short and fixed, the Q&A grows during the talk). Both columns scroll independently;
 * a column fades out at its bottom edge until scrolled to the end, except a
 * rail with a Q&A, where the Q&A's button docks to that edge instead.
 */
function ExpandedSession({
  session,
  children,
}: {
  session: SessionModel;
  children: React.ReactNode;
}) {
  return (
    <main className="expand font-heading text-dc-fg">
      <div className="mx-auto w-full max-w-[1312px] px-8 py-8 xl:px-0">
        {/* Closes the page in place (history.back() when we pushed it, else
            the list URL), never leaves the app. */}
        <button
          type="button"
          onClick={() => closeDetail("session")}
          className="mb-4 flex cursor-pointer items-center gap-2 text-[16px] font-bold leading-none tracking-[-0.25px] text-dc-purple hover:underline"
        >
          <ArrowLeft className="size-4" />
          Back
        </button>
        {/* 161px = 65 header + 32 top padding + 16 Back + 16 gap + 32 bottom padding. */}
        <div className="flex h-[calc(100dvh-161px-var(--safe-top))] min-h-[560px] overflow-clip rounded-2xl border border-dc-hairline bg-dc-panel">
          <FadingScrollColumn className="min-w-0 flex-1">
            <SessionSummary session={session} heading="Session details" />
          </FadingScrollColumn>
          {/* No fade with a Q&A: its button docks to this column's bottom edge. */}
          <FadingScrollColumn
            fade={!children}
            className="flex w-[427px] shrink-0 flex-col gap-6 border-l border-dc-hairline p-4"
          >
            <SessionSpeakers speakers={session.speakers} size="md" />
            {children}
          </FadingScrollColumn>
        </div>
      </div>
    </main>
  );
}

const BOTTOM_FADE_MASK =
  "linear-gradient(to bottom, black calc(100% - 56px), transparent)";

/**
 * Vertical scroll container whose bottom 56px fades while more content is
 * below. A mask (not an overlay) so the fade reads over any content; lifted
 * once scrolled to the end so the last item isn't permanently dim.
 */
function FadingScrollColumn({
  className,
  fade = true,
  children,
}: {
  className?: string;
  fade?: boolean;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const atEnd = useAtScrollEnd(ref);
  return (
    <div
      ref={ref}
      className={cn("overflow-y-auto", className)}
      style={
        atEnd || !fade
          ? undefined
          : { maskImage: BOTTOM_FADE_MASK, WebkitMaskImage: BOTTOM_FADE_MASK }
      }
    >
      {children}
    </div>
  );
}

/** True while a scroll container is scrolled to (or has no) bottom overflow. */
function useAtScrollEnd(ref: React.RefObject<HTMLElement | null>) {
  const [atEnd, setAtEnd] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () =>
      setAtEnd(el.scrollTop + el.clientHeight >= el.scrollHeight - 1);
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    for (const child of Array.from(el.children)) ro.observe(child);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [ref]);
  return atEnd;
}

/**
 * "Add to Calendar" circle button in the app header (Figma fullscreen
 * session details keeps the actions top-right in the 56px bar). Share left
 * the header for the Share pill in the summary, one entry point on every
 * layout (Scott, 2026-10-27). The portal is gated on the pane being visible,
 * so a hidden tab's detail never injects buttons into another tab's header.
 */
function HeaderActions({ session }: { session: SessionModel }) {
  return (
    <HeaderActionsPortal>
      <button
        onClick={() => downloadSessionIcs(session)}
        aria-label="Add to calendar"
        className="flex size-8 cursor-pointer items-center justify-center rounded-full border border-dc-hairline bg-white"
      >
        <CalendarPlus className="size-4 text-dc-purple" />
      </button>
    </HeaderActionsPortal>
  );
}
