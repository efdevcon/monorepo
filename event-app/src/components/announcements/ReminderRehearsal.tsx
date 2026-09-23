"use client";

import { useEffect, useRef, useState } from "react";
import { FlaskConical, Square } from "lucide-react";
import { useUser } from "@/data/auth/useUser";
import { authHeader } from "@/data/push/usePushSubscription";
import { getActiveDataset } from "@/data/dataset";
import { useNowMs } from "@/hooks/useNow";

const TEAM_DOMAIN = "@ethereum.org";
const TICK_MS = 60_000;

interface TickResult {
  now: string;
  mine: { id: string; title: string }[];
  due: unknown[];
  devices: number;
  sent: number;
  ok: number;
  fail: number;
  note?: string;
}

interface LogLine {
  tick: number;
  at: string;
  text: string;
  error?: boolean;
}

/**
 * Team-only rehearsal of the session reminders, from inside the app: walks
 * the app clock forward one minute per real minute for N minutes and asks
 * /api/push/test/reminders what the dispatcher would push to THIS account
 * at each minute, delivered to this account's devices only. Uses the app's
 * `useNowMs`, so `?mockNow=` (or the devcon-7 default mock clock) sets the
 * starting point; stars must have synced. Nothing is written server-side.
 * Run it from a desktop tab and watch the phone: iOS suspends timers in a
 * backgrounded PWA, so the loop must stay in the foreground somewhere.
 */
export function ReminderRehearsal() {
  const { user } = useUser();
  const nowMs = useNowMs(TICK_MS);
  const [minutes, setMinutes] = useState(20);
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<LogLine[]>([]);
  // The clock the running rehearsal started from (the label must not drift
  // with the live clock mid-run).
  const [baseMs, setBaseMs] = useState<number | null>(null);
  const runRef = useRef(0);

  useEffect(() => () => {
    runRef.current++;
  }, []);

  if (!user?.email?.toLowerCase().endsWith(TEAM_DOMAIN)) return null;

  const dataset = getActiveDataset();
  const clock = new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: dataset.timezone,
  });

  const stop = () => {
    runRef.current++;
    setRunning(false);
    setBaseMs(null);
  };

  const start = async () => {
    const run = ++runRef.current;
    const base = nowMs;
    const ticks = Math.max(1, Math.min(180, Math.round(minutes)));
    // Stands in for the claim rows: a session is due for 15 minutes but the
    // dispatcher sends it once, so this run never asks for it twice.
    const sent = new Set<string>();
    setRunning(true);
    setBaseMs(base);
    setLog([]);
    try {
      for (let i = 0; i <= ticks && runRef.current === run; i++) {
        const mock = base + i * TICK_MS;
        const at = clock.format(new Date(mock));
        try {
          // Per tick: access tokens last about an hour and auth-js refreshes
          // them, so a long run must not reuse the header it started with.
          const headers = { ...(await authHeader()), "Content-Type": "application/json" };
          const res = await fetch("/api/push/test/reminders", {
            method: "POST",
            headers,
            body: JSON.stringify({
              now: new Date(mock).toISOString(),
              event: dataset.key,
              exclude: [...sent],
            }),
          });
          const json = (await res.json()) as { success: boolean; data?: TickResult; error?: string };
          if (runRef.current !== run) return;
          if (!json.success || !json.data) throw new Error(json.error || `HTTP ${res.status}`);
          const d = json.data;
          for (const m of d.mine) sent.add(m.id);
          const text =
            d.sent > 0
              ? `${d.sent} sent to ${d.devices} device${d.devices === 1 ? "" : "s"} (${d.ok} ok, ${d.fail} failed): ${d.mine.map((m) => m.title).join(", ")}`
              : d.due.length === 0
                ? "nothing due"
                : d.note?.startsWith("nothing new")
                  ? "nothing new"
                  : `${d.due.length} due, none starred`;
          setLog((prev) => [{ tick: i, at, text }, ...prev]);
        } catch (err) {
          if (runRef.current !== run) return;
          setLog((prev) => [{ tick: i, at, text: (err as Error).message, error: true }, ...prev]);
        }
        if (i < ticks) await new Promise((r) => setTimeout(r, TICK_MS));
      }
    } finally {
      if (runRef.current === run) {
        setRunning(false);
        setBaseMs(null);
      }
    }
  };

  return (
    <div className="mt-5 border-t border-dc-hairline pt-4">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-1.5 text-[14px] font-bold leading-5 text-dc-fg2">
          <FlaskConical className="size-4 text-dc-purple" />
          Rehearse reminders
        </span>
        <span className="rounded-[2px] bg-dc-lavender px-1.5 py-[3px] text-[10px] font-semibold uppercase leading-none tracking-[0.5px] text-dc-purple">
          Team
        </span>
      </div>
      <p className="mt-2 text-[12px] leading-4 text-dc-muted">
        Walks the app clock forward one minute per minute and pushes the reminders you would
        get, to your devices only. Nothing is recorded. Keep this tab open.
      </p>
      <div className="mt-3 flex items-center gap-2">
        <label className="flex items-center gap-2 text-[14px] leading-5 text-dc-fg2">
          <input
            type="number"
            min={1}
            max={180}
            value={minutes}
            disabled={running}
            onChange={(e) => setMinutes(Number(e.target.value))}
            className="w-16 rounded-md border border-dc-hairline bg-white px-2 py-1 text-[14px] leading-5 text-dc-fg2 disabled:opacity-40"
          />
          min from {clock.format(new Date(baseMs ?? nowMs))}
        </label>
        {running ? (
          <button
            type="button"
            onClick={stop}
            className="ml-auto flex cursor-pointer items-center gap-1.5 rounded-full border border-dc-hairline bg-white px-3 py-1.5 text-[13px] font-bold leading-none text-dc-fg2 hover:bg-dc-purple-wash"
          >
            <Square className="size-3.5" />
            Stop
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void start()}
            className="ml-auto flex cursor-pointer items-center gap-1.5 rounded-full bg-dc-purple px-3 py-1.5 text-[13px] font-bold leading-none text-white hover:bg-[#6730d5]"
          >
            Start
          </button>
        )}
      </div>
      {log.length > 0 && (
        <ul className="mt-3 max-h-40 space-y-1 overflow-y-auto text-[12px] leading-4">
          {log.map((line) => (
            <li
              key={line.tick}
              className={line.error ? "text-dc-error" : line.text.startsWith("nothing") ? "text-dc-muted" : "text-dc-fg2"}
            >
              <span className="font-semibold tabular-nums">{line.at}</span> {line.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
