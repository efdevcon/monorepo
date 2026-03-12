"use client";

import { useSession } from "@/data/hooks";
import APP_CONFIG from "@/CONFIG";
import { use, useState } from "react";
import { Link, BackButton } from "@/routing";
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
    return <div className="p-4 text-gray-500">Schedule is not enabled</div>;
  }

  if (isLoading) {
    return <div className="p-4">Loading session...</div>;
  }

  if (isError || !session) {
    return (
      <div className="p-4 text-red-500">
        {error?.message || "Session not found"}
      </div>
    );
  }

  return (
    <div className="p-4">
      <BackButton
        fallbackHref="/schedule"
        className="text-blue-500 hover:underline mb-4 block cursor-pointer"
      >
        ← Back to Schedule
      </BackButton>

      <h1 className="text-2xl font-bold mb-2">{session.title}</h1>

      <div className="space-y-2 text-gray-600 mb-4">
        <p>
          {session.day} • {session.date}
        </p>
        {session.room && <p>Room: {session.room.name}</p>}
        {session.track && <p>Track: {session.track}</p>}
        {session.type && <p>Type: {session.type}</p>}
      </div>

      {session.description && (
        <div className="mb-4">
          <h2 className="font-semibold mb-1">Description</h2>
          <p className="text-gray-700">{session.description}</p>
        </div>
      )}

      {session.speakers.length > 0 && (
        <div>
          <h2 className="font-semibold mb-2">Speakers</h2>
          <div className="space-y-2">
            {session.speakers.map((speaker) => (
              <Link
                key={speaker.id}
                href={`/speakers/${speaker.id}`}
                className="block p-2 border rounded hover:bg-gray-50 cursor-pointer"
              >
                {speaker.name}
                {speaker.company && (
                  <span className="text-gray-500"> • {speaker.company}</span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      <MeerkatProvider>
        <SessionQA sessionId={id} />
      </MeerkatProvider>
    </div>
  );
}

function SessionQA({ sessionId }: { sessionId: string }) {
  // WIP: realtime disabled until Meerkat integration is avaiable
  const { data: questions, isLoading, error } = useQuestions({ sessionId, sort: "popular", realtime: false });
  const sessionUrl = useSessionUrl(sessionId);
  const [isGenerating, setIsGenerating] = useState(false);
  const [debugToken, setDebugToken] = useState<{ raw: string; header: unknown; payload: unknown } | null>(null);

  async function handleAskQuestion() {
    setIsGenerating(true);
    try {
      const res = await fetch("/api/meerkat", { method: "POST" });
      if (!res.ok) throw new Error("Failed to generate token");
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
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold">Questions</h2>
        <div className="flex items-center gap-3 text-sm">
          <button
            onClick={handleAskQuestion}
            disabled={isGenerating}
            className="text-blue-500 hover:underline disabled:opacity-50 cursor-pointer"
          >
            {isGenerating ? "Loading..." : "Ask a question"}
          </button>
        </div>
      </div>

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
            <li key={q.id} className="flex gap-3 p-3 border rounded">
              <span className="text-sm font-medium text-blue-600 shrink-0 min-w-[2rem] text-center">
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
