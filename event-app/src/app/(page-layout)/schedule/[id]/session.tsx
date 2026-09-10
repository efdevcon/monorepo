"use client";

import cn from "classnames";
import { useSession } from "@/data/hooks";
import APP_CONFIG from "@/CONFIG";
import { use, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ArrowLeft, CalendarPlus } from "lucide-react";
import { Link } from "@/routing";
import { closeDetail } from "@/routing/detailRoute";
import { DetailNotFound, HeaderActionsPortal } from "@/components/DetailLayer";
import { NeedsConnection } from "@/components/NeedsConnection";
import { ShareButton } from "@/components/ShareButton";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { useOnline } from "@/hooks/useOnline";
import {
  SessionDetailsContent,
  SessionSpeakers,
  SessionSummary,
  downloadSessionIcs,
} from "@/components/schedule/SessionDetailsContent";
import type { Session as SessionModel } from "@/data/models";
import { supabase } from "@/data/auth/supabase";
import { useUser } from "@/data/auth/useUser";
import {
  MeerkatProvider,
  useQuestions,
  useSessionUrl,
} from "@meerkat-events/react";

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
  const online = useOnline();
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

  // Live-only feature: one quiet line offline, recovers on reconnect.
  const qa = online ? (
    <MeerkatProvider>
      <SessionQA sessionId={id} />
    </MeerkatProvider>
  ) : (
    <SessionQAOffline />
  );

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

/** Figma heading row: "Live Q&A" left, "Powered by Meerkat" right. */
function QAHeading() {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-[16px] font-bold leading-6 text-dc-fg">
        Live Q&amp;A
      </h2>
      <span className="text-[14px] leading-5 text-dc-muted">
        Powered by Meerkat
      </span>
    </div>
  );
}

/** Live-only feature: one quiet line offline, recovers on reconnect. */
function SessionQAOffline() {
  return (
    <div className="flex flex-col gap-3">
      <QAHeading />
      <NeedsConnection what="Live Q&A" />
    </div>
  );
}

/**
 * `?mockQa=1` renders placeholder questions instead of the Meerkat feed so the
 * layout can be previewed before the integration is live (same URL-param
 * convention as `?mockNow=`, see src/hooks/useNow.ts).
 */
const MOCK_QUESTIONS = [
  { id: "m1", votes: 12, question: "How do you see the role of L1 changing as more activity moves to L2s over the next few years?" },
  { id: "m2", votes: 8, question: "What would make you consider the Merge a success from a values perspective, not just a technical one?" },
  { id: "m3", votes: 5, question: "Is local block building actually dead, or just unfashionable?" },
  { id: "m4", votes: 3, question: "Which cypherpunk principle do you think we've drifted furthest from?" },
  { id: "m5", votes: 1, question: "Are timing games a governance problem or a protocol problem?" },
];

const noopSubscribe = () => () => {};
function useMockQa(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => new URLSearchParams(window.location.search).get("mockQa") === "1",
    () => false
  );
}

function SessionQA({ sessionId }: { sessionId: string }) {
  const { user } = useUser();
  const mockQa = useMockQa();
  // WIP: realtime disabled until Meerkat integration is avaiable
  const live = useQuestions({ sessionId, sort: "popular", realtime: false });
  const { data: questions, isLoading, error } = mockQa
    ? { data: MOCK_QUESTIONS, isLoading: false, error: null }
    : live;
  const sessionUrl = useSessionUrl(sessionId);
  const [isGenerating, setIsGenerating] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [debugToken, setDebugToken] = useState<{ raw: string; header: unknown; payload: unknown } | null>(null);

  async function handleAskQuestion() {
    setIsGenerating(true);
    setTokenError(null);
    setNeedsSignIn(false);
    try {
      // Attach the Supabase access token so the server can verify the user and
      // their ticket before issuing the handover JWT.
      const accessToken = (await supabase?.auth.getSession())?.data.session
        ?.access_token;
      if (!accessToken) {
        setNeedsSignIn(true);
        return;
      }

      const res = await fetch("/api/meerkat", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) {
        if (res.status === 401) {
          setNeedsSignIn(true);
          return;
        }
        const { error } = await res.json().catch(() => ({ error: null }));
        setTokenError(
          res.status === 403
            ? error || "A valid ticket is required to ask questions."
            : error || "Failed to generate token. Please try again."
        );
        return;
      }
      const { token } = await res.json();

      // TODO: Remove this debug block once Meerkat integration is live — redirect instead:
      // const url = new URL(sessionUrl);
      // url.searchParams.set("token", token);
      // window.open(url.toString(), "_blank", "noopener,noreferrer");
      const [headerB64, payloadB64] = token.split(".");
      const header = JSON.parse(atob(headerB64));
      const payload = JSON.parse(atob(payloadB64));
      setDebugToken({ raw: token, header, payload });
    } catch (err) {
      console.error("Failed to generate token:", err);
      setTokenError("Failed to generate token. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <QAHeading />

      <div className="text-sm">
        {user ? (
          <button
            onClick={handleAskQuestion}
            disabled={isGenerating}
            className="font-bold text-dc-purple hover:underline disabled:opacity-50 cursor-pointer"
          >
            {isGenerating ? "Loading..." : "Ask a question"}
          </button>
        ) : (
          <Link href="/ticket" className="font-bold text-dc-purple hover:underline">
            Sign in to ask a question
          </Link>
        )}
      </div>

      {needsSignIn && (
        <p className="text-sm text-gray-500">
          Your session expired.{" "}
          <Link href="/ticket" className="text-dc-purple font-medium hover:underline">
            Sign in
          </Link>{" "}
          to ask a question.
        </p>
      )}

      {tokenError && (
        <p className="text-sm text-red-500">{tokenError}</p>
      )}

      {debugToken && (
        <div className="p-3 bg-gray-50 border border-dashed border-gray-300 rounded text-xs font-mono space-y-3">
          <p className="text-gray-500 font-sans text-sm font-medium">
            Meerkat handover — debug view (remove when integration is live)
          </p>

          <div>
            <p className="text-gray-500 font-sans text-xs mb-1">Redirect URL</p>
            <p className="break-all">{sessionUrl}?token={debugToken.raw}</p>
          </div>

          <div>
            <p className="text-gray-500 font-sans text-xs mb-1">Signing secret</p>
            <p className="break-all">devcon-meerkat-handover-secret-2026</p>
          </div>

          <div>
            <p className="text-gray-500 font-sans text-xs mb-1">Raw JWT</p>
            <p className="break-all">{debugToken.raw}</p>
          </div>

          <div>
            <p className="text-gray-500 font-sans text-xs mb-1">Decoded header</p>
            <pre>{JSON.stringify(debugToken.header, null, 2)}</pre>
          </div>

          <div>
            <p className="text-gray-500 font-sans text-xs mb-1">Decoded payload</p>
            <pre>{JSON.stringify(debugToken.payload, null, 2)}</pre>
          </div>

          <p className="text-gray-400 font-sans text-xs">
            Next: Meerkat reads ?token param, verifies HS256 signature with shared secret, extracts email + sessionId. See src/app/api/meerkat/README.md
          </p>
        </div>
      )}

      {error ? (
        <p className="text-red-500 text-sm">{error.message}</p>
      ) : isLoading ? (
        <p className="text-gray-500 text-sm">Loading questions...</p>
      ) : !questions?.length ? (
        <p className="text-gray-500 text-sm">No questions yet. Be the first to ask!</p>
      ) : (
        <ul className="space-y-2">
          {questions.map((q) => (
            <li key={q.id} className="flex gap-3 rounded-lg border border-dc-hairline bg-white p-3">
              <span className="text-sm font-medium text-dc-purple shrink-0 min-w-[2rem] text-center">
                {q.votes}
              </span>
              <span className="text-sm text-gray-700">{q.question}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
