"use client";

import { useSession } from "@/data/hooks";
import APP_CONFIG from "@/CONFIG";
import { use, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarPlus } from "lucide-react";
import { Link } from "@/routing";
import { HEADER_ACTIONS_ID } from "@/components/AppHeader";
import {
  SessionDetailsContent,
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

export default function Session({ params, id: directId }: SessionClientProps) {
  const id = directId ?? use(params!).id;

  const { session, isLoading, isError, error } = useSession(id);

  if (!APP_CONFIG.SCHEDULE_ENABLED) {
    return <div className="p-4 text-dc-muted">Schedule is not enabled</div>;
  }

  if (isLoading) {
    return <div className="p-4 py-12 text-center font-heading text-dc-muted">Loading session…</div>;
  }

  if (isError || !session) {
    return (
      <div className="p-4 py-12 text-center font-heading text-dc-red">
        {error?.message || "Session not found"}
      </div>
    );
  }

  return (
    <main className="expand font-heading text-dc-fg">
      {/* Mobile: panel-grey underlay over the app gradient (between .app-bg
          at z -10 and the content) so the surface fills the whole viewport —
          the content block alone ends at its own height, which left the
          gradient showing below short sessions. Same fix as speaker.tsx. */}
      <div className="fixed inset-0 -z-[5] bg-dc-panel lg:hidden" aria-hidden />
      <CalendarHeaderAction session={session} />
      <div className="lg:mx-auto lg:w-full lg:max-w-[720px] lg:py-8">
        <div className="lg:overflow-clip lg:rounded-xl lg:border lg:border-dc-hairline">
          <SessionDetailsContent session={session}>
            <MeerkatProvider>
              <SessionQA sessionId={id} />
            </MeerkatProvider>
          </SessionDetailsContent>
        </div>
      </div>
    </main>
  );
}

/**
 * Portals the "Add to Calendar" circle button into the app header (Figma
 * fullscreen session details keeps it top-right in the 56px bar).
 */
function CalendarHeaderAction({ session }: { session: SessionModel }) {
  const [target, setTarget] = useState<Element | null>(null);
  useEffect(() => {
    setTarget(document.getElementById(HEADER_ACTIONS_ID));
  }, []);
  if (!target) return null;
  return (
    <>
      {createPortal(
    <button
      onClick={() => downloadSessionIcs(session)}
      aria-label="Add to calendar"
      className="flex size-8 cursor-pointer items-center justify-center rounded-full border border-dc-hairline bg-white"
    >
      <CalendarPlus className="size-4 text-dc-purple" />
    </button>,
        target
      )}
    </>
  );
}

function SessionQA({ sessionId }: { sessionId: string }) {
  const { user } = useUser();
  // WIP: realtime disabled until Meerkat integration is avaiable
  const { data: questions, isLoading, error } = useQuestions({ sessionId, sort: "popular", realtime: false });
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
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[14px] leading-5 text-dc-fg2">
          <span className="font-bold">Live Q&amp;A</span> – Powered by Meerkat
        </h2>
        <div className="flex items-center gap-3 text-sm">
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
      </div>

      {needsSignIn && (
        <p className="mb-3 text-sm text-gray-500">
          Your session expired.{" "}
          <Link href="/ticket" className="text-dc-purple font-medium hover:underline">
            Sign in
          </Link>{" "}
          to ask a question.
        </p>
      )}

      {tokenError && (
        <p className="mb-3 text-sm text-red-500">{tokenError}</p>
      )}

      {debugToken && (
        <div className="mb-4 p-3 bg-gray-50 border border-dashed border-gray-300 rounded text-xs font-mono space-y-3">
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
