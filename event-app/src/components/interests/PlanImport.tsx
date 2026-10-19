"use client";

import { trackEvent } from "@/data/analytics/track";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSWRConfig } from "swr";
import { AlertTriangle, Star } from "lucide-react";
import cn from "classnames";
import { PrimaryButton, PrimaryLinkButton, SecondaryButton } from "@/components/Buttons";
import { SessionCard } from "@/components/schedule/SessionCard";
import { AiPlannerPanel } from "@/components/home/AiPlannerCard";
import { formatDayLabel, formatTimeRange, groupSessionsByDay } from "@/components/schedule/utils";
import { getActiveDataset } from "@/data/dataset";
import { useSessionsOfAllProgrammes } from "@/data/hooks";
import { useInterested } from "@/data/interested/useInterested";
import { applyInterestChanges } from "@/data/interested/applyPlan";
import { useUser } from "@/data/auth/useUser";
import { INTERESTS_PARAM } from "@/data/store/schedule-source";
import { usePreviewPlan } from "@/hooks/usePreviewState";
import type { Session } from "@/data/models/sessions";
import {
  isEmptyPlan,
  parseCodeList,
  parsePlanParams,
  planOverlaps,
  resolvePlan,
  type PlanRequest,
} from "@/data/ai/plan";

/**
 * The page behind `/my-interests?add=…&remove=…` ("Import a plan"): what the
 * plan would change, one tap to apply it, and a paste box for codes that
 * arrived as text (the installed app cannot be opened from a link in a chat
 * app, so pasting is the path that always works). Everything reads the local
 * stores and writes the local stars, so it works offline; signed in, the
 * stars sync to the account.
 */
export function PlanImport() {
  const params = useSearchParams();
  const fromUrl = useMemo(() => parsePlanParams(params), [params]);
  const [pasted, setPasted] = useState<PlanRequest | null>(null);
  const [draft, setDraft] = useState("");
  const request = pasted ?? fromUrl;

  // Once per page open: the URL plan is fixed for the page's life.
  const fromUrlRef = useRef(fromUrl);
  useEffect(() => {
    if (!isEmptyPlan(fromUrlRef.current)) trackEvent("planner", "apply-opened");
  }, []);

  const sessions = useSessionsOfAllProgrammes();
  const { ids: starred } = useInterested();
  const { user } = useUser();
  const [applied, setDone] = useState<{ added: number; removed: number } | null>(null);
  // Dev preview of the applied state (`?previewPlan=done`), sample counts.
  const previewPlan = usePreviewPlan();
  const done = applied ?? (previewPlan === "done" ? { added: 4, removed: 1 } : null);
  const { mutate } = useSWRConfig();
  const [busy, setBusy] = useState(false);
  // The Dexie write failed (storage full, private mode, a closed database);
  // the plan stays on screen so the tap can be repeated.
  const [applyFailed, setApplyFailed] = useState(false);
  const failed = applyFailed || previewPlan === "failed";

  // A new link while the page is mounted (a refined plan from the same chat)
  // starts over: no Done card, no pasted plan, no stale failure from the
  // previous one. State reset during render, keyed on the URL plan, so no
  // effect and no extra paint.
  const [seenUrlPlan, setSeenUrlPlan] = useState(fromUrl);
  if (seenUrlPlan !== fromUrl) {
    setSeenUrlPlan(fromUrl);
    setDone(null);
    setPasted(null);
    setApplyFailed(false);
  }

  const plan = useMemo(() => resolvePlan(request, sessions, starred), [request, sessions, starred]);
  const overlaps = useMemo(() => {
    const removing = new Set(plan.remove.map((s) => s.id));
    const kept = sessions.filter((s) => starred.has(s.id) && !removing.has(s.id));
    return planOverlaps([...kept, ...plan.add]);
  }, [plan, sessions, starred]);

  const nothingToDo = plan.add.length === 0 && plan.remove.length === 0;
  // No plan in the URL or pasted, nothing applied: the paste box leads (it is
  // what a visitor without a link came for), the planner card follows.
  const empty = isEmptyPlan(request) && !done;
  const loading = sessions.length === 0;

  const apply = async () => {
    setBusy(true);
    setApplyFailed(false);
    try {
      const result = await applyInterestChanges(
        getActiveDataset().eventId,
        plan.add.map((s) => s.id),
        plan.remove.map((s) => s.id),
        mutate
      );
      setDone(result);
      trackEvent("planner", "applied", undefined, result.added + result.removed);
    } catch {
      setApplyFailed(true);
    } finally {
      setBusy(false);
    }
  };

  const preview = () => {
    const add = parseCodeList(draft);
    if (add.length === 0) return;
    setDone(null);
    setApplyFailed(false);
    setPasted({ add, remove: [] });
  };

  return (
    <main className="expand font-heading text-dc-fg">
      <div className="px-4 pb-16 pt-4 lg:mx-auto lg:w-full lg:max-w-[800px] lg:px-0 lg:pt-8">
        <h1 className="hidden text-[24px] font-extrabold leading-[28.8px] tracking-[-0.5px] text-dc-fg2 lg:block">
          Import a plan
        </h1>
        {/* No intro on the empty page: the planner card below says it. */}
        {!empty && (
          <p className="mt-2 text-[14px] leading-5 text-dc-muted lg:mt-3 lg:text-[16px] lg:leading-6">
            The plan your assistant drafted lands here. Check the sessions it wants to add or remove, then put them
            in My Interests in one tap. Nothing changes until you confirm.
          </p>
        )}

        {empty && (
          <>
            <PasteCodes draft={draft} onChange={setDraft} onPreview={preview} first />
            <div className="mt-10 border-t border-dc-hairline pt-6">
              <AiPlannerPanel
                title="No plan yet? Ask your assistant"
                body="Your assistant reads the full programme, asks what you are into and sends you back here with a plan to confirm. Your starred sessions are included."
              />
            </div>
          </>
        )}
        {done ? (
          <Done added={done.added} removed={done.removed} signedIn={!!user} />
        ) : isEmptyPlan(request) ? null : loading ? (
          <p className="mt-6 text-[14px] text-dc-muted">Loading the programme…</p>
        ) : (
          <div className="mt-8 flex flex-col gap-8">
            <Group title="Sessions to add" sessions={plan.add} />
            <Group title="Sessions to remove" sessions={plan.remove} muted />
            <Group
              title="Already in your interests"
              description="The plan includes these too. They are starred already, so nothing changes."
              sessions={plan.alreadyStarred}
            />
            {/* plan.notStarred (a remove of something never starred) is not
                shown: nothing changes for the attendee. */}
            {(plan.unknown.length > 0 || overlaps.length > 0) && (
              <section className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <h2 className="text-[16px] font-bold leading-6 text-dc-fg2">
                    Conflicts and errors{" "}
                    <span className="font-normal">({plan.unknown.length + overlaps.length})</span>
                  </h2>
                  <p className="text-[14px] leading-5 text-dc-muted">
                    Worth a look before you apply. Neither stops the plan from being added.
                  </p>
                </div>
                <div className="flex flex-col gap-3">
                  {plan.unknown.length > 0 && (
                    <NoteList
                      tone="warn"
                      title={
                        plan.unknown.length === 1 ? "One unknown code skipped" : `${plan.unknown.length} unknown codes skipped`
                      }
                      body="Ask your assistant to use the codes from the catalogue."
                    >
                      {plan.unknown.map((code) => (
                        <span key={code} className="font-mono">
                          {code}
                        </span>
                      ))}
                    </NoteList>
                  )}
                  {overlaps.length > 0 && (
                    <NoteList
                      tone="warn"
                      title={overlaps.length === 1 ? "One overlap in the plan" : `${overlaps.length} overlaps in the plan`}
                      body="Both sessions stay in My Interests; pick one on the day."
                    >
                      {overlaps.map(([a, b]) => (
                        <div key={`${a.id}:${b.id}`} className="flex flex-col gap-1.5">
                          <SessionLine session={a} />
                          <SessionLine session={b} />
                        </div>
                      ))}
                    </NoteList>
                  )}
                </div>
              </section>
            )}
            <div className="flex flex-col gap-3">
              {failed && (
                <Note tone="error">
                  The plan could not be saved on this device. Try again; if it keeps failing, free up some storage
                  or open the app in a regular (not private) window.
                </Note>
              )}
              <div className="flex flex-col gap-3 sm:flex-row">
                <PrimaryButton size="sm" onClick={apply} disabled={busy || nothingToDo}>
                  <Star className="size-4 shrink-0" />
                  {nothingToDo
                    ? "Nothing to change"
                    : failed
                      ? "Try again"
                      : applyLabel(plan.add.length, plan.remove.length)}
                </PrimaryButton>
              </div>
              <p className="text-[13px] leading-5 text-dc-muted">
                {user ? (
                  <>
                    Signed in as <span className="font-bold text-dc-fg2">{user.email}</span>: the stars sync to your
                    account and your other devices.
                  </>
                ) : (
                  "Not signed in: the stars stay in this browser. Sign in on My Devcon to sync them to the app on your phone."
                )}
              </p>
            </div>
          </div>
        )}
        {!empty && <PasteCodes draft={draft} onChange={setDraft} onPreview={preview} />}
      </div>
    </main>
  );
}

/**
 * The paste box. `first`: it leads the empty page, so it loses the divider
 * and the "instead".
 */
function PasteCodes({
  draft,
  onChange,
  onPreview,
  first = false,
}: {
  draft: string;
  onChange: (value: string) => void;
  onPreview: () => void;
  first?: boolean;
}) {
  return (
    <section className={first ? "mt-2 lg:mt-6" : "mt-10 border-t border-dc-hairline pt-6"}>
      {/* Same type as the planner card's title and body, so the two sections read as peers. */}
      <h2 className="text-[20px] font-bold leading-[1.2] tracking-[-0.5px] text-dc-fg2">
        {first ? "Paste codes" : "Paste codes instead"}
      </h2>
      <p className="mt-2 text-[14px] leading-5 text-dc-muted lg:text-[16px] lg:leading-6">
        Paste the session codes from your assistant&apos;s plan, separated by commas or new lines.
      </p>
      <textarea
        value={draft}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        placeholder="8LTCLM, SHTLDN, privacy-s03"
        className="mt-3 w-full rounded-lg border border-dc-hairline bg-white px-3 py-2 font-mono text-[14px] leading-5 text-dc-fg outline-none focus:border-dc-fg2"
      />
      {/* Full width on phones, like the confirm button's row. */}
      <div className="mt-3 flex flex-col sm:flex-row">
        <SecondaryButton size="sm" onClick={onPreview} disabled={parseCodeList(draft).length === 0}>
          Preview the changes
        </SecondaryButton>
      </div>
    </section>
  );
}

const sessionsWord = (n: number) => (n === 1 ? "session" : "sessions");

/** "Confirm plan"; a plan that only removes says so: "Remove 1 session". */
function applyLabel(add: number, remove: number): string {
  if (add === 0) return `Remove ${remove} ${sessionsWord(remove)}`;
  return "Confirm plan";
}

/** "4 sessions added and 1 removed", "1 session added", "2 sessions removed". */
function doneSummary(added: number, removed: number): string {
  if (added && removed) return `${added} ${sessionsWord(added)} added and ${removed} removed`;
  if (added) return `${added} ${sessionsWord(added)} added`;
  return `${removed} ${sessionsWord(removed)} removed`;
}

function Done({ added, removed, signedIn }: { added: number; removed: number; signedIn: boolean }) {
  return (
    <div className="mt-6 flex flex-col gap-4 rounded-xl border border-dc-hairline bg-white p-5">
      <p className="text-[16px] font-bold text-dc-fg2">Plan successfully added</p>
      <p className="text-[14px] leading-5 text-dc-muted">
        <span className="font-bold text-dc-fg2">{doneSummary(added, removed)}</span>.{" "}
        {signedIn
          ? "The plan is now live in My Interests. It syncs to your account, so the app on your phone has it too."
          : "The plan is now live in My Interests on this browser. Sign in on My Devcon to see it in the app on your phone."}
      </p>
      <div>
        <PrimaryLinkButton size="sm" href={`/schedule?${INTERESTS_PARAM}=1`}>
          Open My Interests
        </PrimaryLinkButton>
      </div>
    </div>
  );
}

/**
 * The real session cards, read-only (no link, no star), under the speaker
 * page's small day headers, in time order. `description` explains the
 * no-op groups (already starred, never starred).
 */
function Group({
  title,
  description,
  sessions,
  muted = false,
}: {
  title: string;
  description?: string;
  sessions: Session[];
  muted?: boolean;
}) {
  if (sessions.length === 0) return null;
  const groups = groupSessionsByDay([...sessions].sort((a, b) => a.start - b.start));
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-[16px] font-bold leading-6 text-dc-fg2">
          {title} <span className="font-normal">({sessions.length})</span>
        </h2>
        {description && <p className="text-[14px] leading-5 text-dc-muted">{description}</p>}
      </div>
      {groups.map((group) => (
        <div key={group.key} className="flex flex-col gap-3">
          <h3 className="text-[14px] font-medium leading-5 text-dc-muted">{group.label}</h3>
          <div className={cn("flex flex-col gap-3", muted && "opacity-70")}>
            {group.sessions.map((s) => (
              <SessionCard key={s.id} session={s} dense readOnly />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

type NoteTone = "info" | "warn" | "error";
const noteTone: Record<NoteTone, string> = {
  info: "bg-[#f9f8fa] text-dc-muted",
  warn: "bg-[#fff6e5] text-dc-fg2",
  error: "bg-dc-live-bg text-dc-fg2",
};

/** One-line note; `warn` and `error` carry the triangle. */
function Note({ children, tone = "info" }: { children: React.ReactNode; tone?: NoteTone }) {
  return (
    <p className={cn("flex gap-2 rounded-lg px-3 py-2 text-[13px] leading-5", noteTone[tone])}>
      {tone !== "info" && <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />}
      <span>{children}</span>
    </p>
  );
}

/**
 * A bold title, a body line, then one row per item (a session, a pair, a
 * code), hairline-divided.
 */
function NoteList({
  title,
  body,
  tone = "info",
  children,
}: {
  title: string;
  body: string;
  tone?: NoteTone;
  children: React.ReactNode[];
}) {
  return (
    <div className={cn("rounded-lg px-3 py-3 text-[13px] leading-5", noteTone[tone])}>
      <div className="flex gap-2">
        {tone !== "info" && <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />}
        <div className="flex flex-col gap-0.5">
          <h3 className="text-[14px] font-bold leading-5 text-dc-fg2">{title}</h3>
          <p>{body}</p>
        </div>
      </div>
      <ul className={cn("mt-2 flex flex-col divide-y divide-dc-fg2/10", tone !== "info" && "pl-6")}>
        {children.map((child, i) => (
          <li key={i} className="py-2">
            {child}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Title over day and time; the text colour follows the note's tone. */
function SessionLine({ session }: { session: Session }) {
  return (
    <p className="flex flex-col">
      <span className="font-semibold text-dc-fg2">{session.title}</span>
      <span className="text-dc-muted">
        {formatDayLabel(session)} · {formatTimeRange(session)}
      </span>
    </p>
  );
}
