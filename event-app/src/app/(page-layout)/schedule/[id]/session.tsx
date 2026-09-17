"use client";

import cn from "classnames";
import { useSession } from "@/data/hooks";
import APP_CONFIG from "@/CONFIG";
import { use, useEffect, useRef, useState } from "react";
import { ArrowLeft, CalendarPlus } from "lucide-react";
import { closeDetail } from "@/routing/detailRoute";
import { DetailNotFound, HeaderActionsPortal } from "@/components/DetailLayer";
import { ShareButton } from "@/components/ShareButton";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import {
  SessionDetailsContent,
  SessionSpeakers,
  SessionSummary,
  downloadSessionIcs,
} from "@/components/schedule/SessionDetailsContent";
import { SessionQA } from "@/components/schedule/SessionQA";
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
  // JS fork rather than lg:hidden twins: the two layouts differ in structure
  // and each mounts the Meerkat hooks, which must not run twice.
  const isDesktop = useIsDesktop();

  if (!APP_CONFIG.SCHEDULE_ENABLED) {
    return <div className="p-4 text-dc-muted">Schedule is not enabled</div>;
  }

  if (!session) {
    // Loading only while nothing has ever been synced; otherwise the id is
    // unknown (stale link, other dataset) or the first sync failed.
    if (isLoading) {
      return <div className="p-4 py-12 text-center font-heading text-dc-muted">Loading session…</div>;
    }
    return (
      <DetailNotFound
        label={error?.message || "Session not found"}
        onBack={() => closeDetail("session")}
      />
    );
  }

  // Shared with the desktop side panel (SessionQA owns the offline line).
  const qa = <SessionQA session={session} size="md" />;

  if (isDesktop) {
    return <ExpandedSession session={session}>{qa}</ExpandedSession>;
  }

  return (
    <main className="expand font-heading text-dc-fg">
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
 * viewport-fit two-column card — session summary on the left, Live Q&A +
 * "Speakers (N)" in a 427px right rail. Both columns scroll independently;
 * the rail fades out at its bottom edge until scrolled to the end.
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
          <FadingScrollColumn className="flex w-[427px] shrink-0 flex-col gap-6 border-l border-dc-hairline p-4">
            {children}
            <SessionSpeakers speakers={session.speakers} size="md" />
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
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const atEnd = useAtScrollEnd(ref);
  return (
    <div
      ref={ref}
      className={cn("overflow-y-auto", className)}
      style={
        atEnd
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
 * Share and "Add to Calendar" circle buttons in the app header (Figma
 * fullscreen session details keeps the actions top-right in the 56px bar).
 * The portal is gated on the pane being visible, so a hidden tab's detail
 * never injects buttons into another tab's header.
 */
function HeaderActions({ session }: { session: SessionModel }) {
  return (
    <HeaderActionsPortal>
      <ShareButton kind="session" id={session.id} title={session.title} />
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
