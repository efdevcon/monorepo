"use client";

import cn from "classnames";
import { useMemo, useSyncExternalStore } from "react";
import {
  ArrowUpRight,
  Check,
  ChevronUp,
  MessageCircleQuestion,
  Mic,
} from "lucide-react";
import {
  FetchError,
  MeerkatProvider,
  useQuestions,
  type Question,
} from "@meerkat-events/react";
import { Link } from "@/routing";
import { NeedsConnection } from "@/components/NeedsConnection";
import { useUser } from "@/data/auth/useUser";
import { useOnline } from "@/hooks/useOnline";
import { useRealWorldNowMs } from "@/hooks/useNow";
import { isStandalone } from "@/utils/platform";
import { relativeTime } from "@/utils/relativeTime";

type Size = "sm" | "md";

/**
 * Live Q&A (Meerkat) for one session, shared by the mobile page and the
 * expanded desktop view (`md`: 16px heading) and the desktop side panel
 * (`sm`: the panel's 14px caption). Reading is public through Meerkat's REST
 * API; asking is a plain link to `/api/meerkat/go`, which checks the sign-in
 * (auth cookies) and a paid ticket server-side and redirects to Meerkat with
 * a short-lived token. Live-only: offline it renders one quiet line and
 * recovers on reconnect.
 */
export function SessionQA({
  sessionId,
  size = "md",
}: {
  sessionId: string;
  size?: Size;
}) {
  const online = useOnline();
  if (!online) {
    return (
      <div className="flex flex-col gap-3">
        <QAHeading size={size} />
        <NeedsConnection what="Live Q&A" />
      </div>
    );
  }
  return (
    <MeerkatProvider>
      <QAFeed sessionId={sessionId} size={size} />
    </MeerkatProvider>
  );
}

/** "Live Q&A (N)" left, "Powered by Meerkat" right, sized like SessionSpeakers. */
function QAHeading({ size, count }: { size: Size; count?: number }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2
        className={cn(
          "font-bold",
          size === "md"
            ? "text-[16px] leading-6 text-dc-fg"
            : "text-[14px] leading-5 text-dc-fg2"
        )}
      >
        Live Q&amp;A
        {count ? <span className="font-normal"> ({count})</span> : null}
      </h2>
      <span
        className={cn(
          "text-dc-muted",
          size === "md" ? "text-[14px] leading-5" : "text-[12px] leading-4"
        )}
      >
        Powered by Meerkat
      </span>
    </div>
  );
}

function QAFeed({ sessionId, size }: { sessionId: string; size: Size }) {
  const { user } = useUser();
  const mock = useMockQuestions();
  // Realtime (SSE) stays off for now: every mounted feed would hold its own
  // stream. SWR still revalidates when the tab regains focus, which covers
  // coming back from Meerkat after asking.
  const live = useQuestions({ sessionId, sort: "popular", realtime: false });
  const { data: questions, isLoading, error } = mock
    ? { data: mock, isLoading: false, error: undefined }
    : live;
  // Meerkat answers 404 for a session it has no Q&A for: not an error to the
  // attendee, and no hand-off link either (Meerkat would 404 on that too).
  const notOpen = error instanceof FetchError && error.status === 404;
  const standalone = useStandalone();

  return (
    <div className="flex flex-col gap-3">
      <QAHeading size={size} count={questions?.length} />

      {!notOpen && (
        <div className="text-[14px] leading-5">
          {user ? (
            // A real navigation: the server checks the ticket and redirects
            // to Meerkat. New tab in a browser; in place in the installed
            // app, where a new tab wouldn't carry the app's cookies on iOS
            // (the OS shows the out-of-scope page in an in-app browser).
            <a
              href={`/api/meerkat/go?session=${encodeURIComponent(sessionId)}`}
              target={standalone ? undefined : "_blank"}
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-bold text-dc-purple hover:underline"
            >
              Ask a question
              <ArrowUpRight className="size-4" aria-hidden />
            </a>
          ) : (
            <Link
              href="/ticket"
              className="font-bold text-dc-purple hover:underline"
            >
              Sign in to ask a question
            </Link>
          )}
        </div>
      )}

      {notOpen ? (
        <QuietLine>Q&amp;A isn&apos;t open for this session yet.</QuietLine>
      ) : error ? (
        <p className="text-[14px] leading-5 text-red-500">
          Couldn&apos;t load questions.{" "}
          <button
            type="button"
            onClick={() => void live.mutate()}
            className="cursor-pointer font-medium text-dc-purple hover:underline"
          >
            Retry
          </button>
        </p>
      ) : isLoading ? (
        <p className="text-[14px] leading-5 text-dc-muted">
          Loading questions…
        </p>
      ) : !questions?.length ? (
        <QuietLine>No questions yet. Be the first to ask!</QuietLine>
      ) : (
        <QuestionList questions={questions} />
      )}
    </div>
  );
}

/** Same quiet card as NeedsConnection, for the empty and not-open states. */
function QuietLine({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-2 rounded-lg border border-dc-hairline bg-white px-3 py-2 text-[14px] leading-5 text-dc-muted">
      <MessageCircleQuestion className="size-4 shrink-0 text-dc-purple" />
      {children}
    </p>
  );
}

function QuestionList({ questions }: { questions: Question[] }) {
  // Real-world clock: questions are stamped when asked, not in event time.
  const nowMs = useRealWorldNowMs(60_000);
  return (
    <ul className="flex flex-col gap-2">
      {questions.map((q) => (
        <QuestionCard key={q.id} question={q} nowMs={nowMs} />
      ))}
    </ul>
  );
}

/**
 * One question: vote count in a lavender chip, the text, then who asked and
 * when. A moderator's pick gets a purple frame and "Being answered"; answered
 * questions fall back to muted text with an "Answered" tag.
 */
function QuestionCard({
  question: q,
  nowMs,
}: {
  question: Question;
  nowMs: number;
}) {
  const answered = !!q.answeredAt;
  const selected = !answered && !!q.selectedAt;
  const meta = [q.user?.name, relativeTime(q.createdAt, nowMs)]
    .filter(Boolean)
    .join(" · ");

  return (
    <li
      className={cn(
        "flex gap-3 rounded-lg border bg-white p-3",
        selected ? "border-dc-purple" : "border-dc-hairline"
      )}
    >
      <span
        className={cn(
          "flex min-w-10 shrink-0 flex-col items-center justify-center gap-0.5 self-start rounded-lg px-1.5 py-1.5 text-[13px] font-bold leading-none",
          answered ? "bg-dc-panel text-dc-muted" : "bg-dc-lavender text-dc-purple"
        )}
      >
        <ChevronUp className="size-4" aria-hidden />
        {q.votes}
        <span className="sr-only"> votes</span>
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p
          className={cn(
            "text-[14px] leading-5 [overflow-wrap:anywhere]",
            answered ? "text-dc-muted" : "text-dc-fg2"
          )}
        >
          {q.question}
        </p>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] leading-none text-dc-muted">
          {meta && <span className="truncate">{meta}</span>}
          {selected && (
            <span className="inline-flex items-center gap-1 rounded-full bg-dc-lavender px-2 py-1 font-semibold text-dc-purple">
              <Mic className="size-3" aria-hidden />
              Being answered
            </span>
          )}
          {answered && (
            <span className="inline-flex items-center gap-1 rounded-full bg-dc-panel px-2 py-1 font-semibold">
              <Check className="size-3" aria-hidden />
              Answered
            </span>
          )}
        </div>
      </div>
    </li>
  );
}

/**
 * `?mockQa=1` swaps the Meerkat feed for placeholder questions covering every
 * state (plain, being answered, answered) so the layout can be previewed on
 * any session. Same URL-param convention as `?mockNow=` (src/hooks/useNow.ts).
 */
const noopSubscribe = () => () => {};

/** Installed app (or native shell) rather than a browser tab; false until hydration. */
function useStandalone(): boolean {
  return useSyncExternalStore(noopSubscribe, isStandalone, () => false);
}

function useMockQaParam(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => new URLSearchParams(window.location.search).get("mockQa") === "1",
    () => false
  );
}

function useMockQuestions(): Question[] | null {
  const enabled = useMockQaParam();
  const nowMs = useRealWorldNowMs(60_000);
  return useMemo(() => {
    if (!enabled) return null;
    const minutesAgo = (m: number) => new Date(nowMs - m * 60_000);
    const base = { sessionId: "mock", user: { id: "u", name: "curious-otter" } };
    return [
      { ...base, id: 1, votes: 12, createdAt: minutesAgo(25), selectedAt: minutesAgo(1), question: "How do you see the role of L1 changing as more activity moves to L2s over the next few years?" },
      { ...base, id: 2, votes: 8, createdAt: minutesAgo(18), question: "What would make you consider the Merge a success from a values perspective, not just a technical one?" },
      { ...base, id: 3, votes: 5, createdAt: minutesAgo(40), answeredAt: minutesAgo(5), question: "Is local block building actually dead, or just unfashionable?" },
      { ...base, id: 4, votes: 3, createdAt: minutesAgo(9), user: undefined, question: "Which cypherpunk principle do you think we've drifted furthest from?" },
      { ...base, id: 5, votes: 1, createdAt: minutesAgo(2), question: "Are timing games a governance problem or a protocol problem?" },
    ];
  }, [enabled, nowMs]);
}
