"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, Check, Star } from "lucide-react";
import cn from "classnames";
import { PrimaryButton, PrimaryLinkButton, SecondaryButton } from "@/components/Buttons";
import { eventFmt } from "@/data/eventTime";
import { getActiveDataset } from "@/data/dataset";
import { useSessionsOfAllProgrammes } from "@/data/hooks";
import { useInterested } from "@/data/interested/useInterested";
import { applyInterestChanges } from "@/data/interested/applyPlan";
import { useUser } from "@/data/auth/useUser";
import { shortCommunityHubName } from "@/data/communityHubs";
import { INTERESTS_PARAM } from "@/data/store/schedule-source";
import type { Session } from "@/data/models/sessions";
import {
  isEmptyPlan,
  parseCodeList,
  parsePlanParams,
  planOverlaps,
  resolvePlan,
  sessionCode,
  type PlanRequest,
} from "@/data/ai/plan";

/**
 * The page behind `/my-interests?add=…&remove=…`: what the plan would change,
 * one tap to apply it, and a paste box for codes that arrived as text (the
 * installed app cannot be opened from a link in a chat app, so pasting is the
 * path that always works). Everything reads the local stores and writes the
 * local stars, so it works offline; signed in, the stars sync to the account.
 */
export function PlanImport() {
  const params = useSearchParams();
  const fromUrl = useMemo(() => parsePlanParams(params), [params]);
  const [pasted, setPasted] = useState<PlanRequest | null>(null);
  const [draft, setDraft] = useState("");
  const request = pasted ?? fromUrl;

  const sessions = useSessionsOfAllProgrammes();
  const { ids: starred } = useInterested();
  const { user } = useUser();
  const [done, setDone] = useState<{ added: number; removed: number } | null>(null);
  const [busy, setBusy] = useState(false);

  const plan = useMemo(() => resolvePlan(request, sessions, starred), [request, sessions, starred]);
  const overlaps = useMemo(() => {
    const removing = new Set(plan.remove.map((s) => s.id));
    const kept = sessions.filter((s) => starred.has(s.id) && !removing.has(s.id));
    return planOverlaps([...kept, ...plan.add]);
  }, [plan, sessions, starred]);

  const nothingToDo = plan.add.length === 0 && plan.remove.length === 0;
  const loading = sessions.length === 0;

  const apply = async () => {
    setBusy(true);
    try {
      const result = await applyInterestChanges(
        getActiveDataset().eventId,
        plan.add.map((s) => s.id),
        plan.remove.map((s) => s.id)
      );
      setDone(result);
    } finally {
      setBusy(false);
    }
  };

  const preview = () => {
    const add = parseCodeList(draft);
    if (add.length === 0) return;
    setDone(null);
    setPasted({ add, remove: [] });
  };

  return (
    <main className="expand font-heading text-dc-fg">
      <div className="px-4 pb-16 pt-4 lg:mx-auto lg:w-full lg:max-w-[680px] lg:px-0 lg:pt-8">
        <h1 className="hidden text-[24px] font-extrabold leading-[28.8px] tracking-[-0.5px] text-dc-fg2 lg:block">
          My Interests
        </h1>
        <p className="mt-2 text-[14px] leading-5 text-dc-muted lg:mt-3">
          A plan from your AI assistant, or codes you paste below, becomes stars in My Interests. Nothing changes
          until you confirm.
        </p>

        {done ? (
          <Done added={done.added} removed={done.removed} signedIn={!!user} />
        ) : isEmptyPlan(request) ? null : loading ? (
          <p className="mt-6 text-[14px] text-dc-muted">Loading the programme…</p>
        ) : (
          <div className="mt-6 flex flex-col gap-6">
            <Group title={`Add (${plan.add.length})`} sessions={plan.add} tone="add" />
            <Group title={`Remove (${plan.remove.length})`} sessions={plan.remove} tone="remove" />
            {plan.alreadyStarred.length > 0 && (
              <Note>
                Already in your interests: {plan.alreadyStarred.map((s) => s.title).join(", ")}.
              </Note>
            )}
            {plan.notStarred.length > 0 && (
              <Note>Not in your interests, nothing to remove: {plan.notStarred.map((s) => s.title).join(", ")}.</Note>
            )}
            {plan.unknown.length > 0 && (
              <Note warn>
                Unknown codes, skipped: {plan.unknown.join(", ")}. Ask your assistant to use the codes from the
                catalogue.
              </Note>
            )}
            {overlaps.length > 0 && (
              <Note warn>
                {overlaps.length === 1 ? "One overlap" : `${overlaps.length} overlaps`} in the resulting plan:{" "}
                {overlaps.map(([a, b]) => `${a.title} and ${b.title}`).join("; ")}.
              </Note>
            )}
            <div className="flex flex-col gap-3 sm:flex-row">
              <PrimaryButton size="sm" onClick={apply} disabled={busy || nothingToDo}>
                <Star className="size-4 shrink-0" />
                {nothingToDo ? "Nothing to change" : applyLabel(plan.add.length, plan.remove.length)}
              </PrimaryButton>
            </div>
            <p className="text-[13px] leading-5 text-dc-muted">
              {user
                ? `Signed in as ${user.email}: the stars sync to your account and your other devices.`
                : "Not signed in: the stars stay in this browser. Sign in on My Devcon to sync them to the app on your phone."}
            </p>
          </div>
        )}

        <section className="mt-10 border-t border-dc-hairline pt-6">
          <h2 className="text-[16px] font-bold leading-6 text-dc-fg2">Paste codes</h2>
          <p className="mt-1 text-[14px] leading-5 text-dc-muted">
            Session codes from your assistant, separated by commas or lines. They are added to your interests.
          </p>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            placeholder="8LTCLM, SHTLDN, privacy-s03"
            className="mt-3 w-full rounded-lg border border-dc-hairline bg-white px-3 py-2 font-mono text-[14px] leading-5 text-dc-fg outline-none focus:border-dc-fg2"
          />
          <div className="mt-3">
            <SecondaryButton size="sm" onClick={preview} disabled={parseCodeList(draft).length === 0}>
              Preview
            </SecondaryButton>
          </div>
        </section>
      </div>
    </main>
  );
}

function applyLabel(add: number, remove: number): string {
  const parts: string[] = [];
  if (add) parts.push(`Add ${add}`);
  if (remove) parts.push(`remove ${remove}`);
  return parts.join(", ");
}

function Done({ added, removed, signedIn }: { added: number; removed: number; signedIn: boolean }) {
  return (
    <div className="mt-6 flex flex-col gap-4 rounded-xl border border-dc-hairline bg-white p-5">
      <p className="flex items-center gap-2 text-[16px] font-bold text-dc-fg2">
        <Check className="size-5 shrink-0 text-dc-purple" aria-hidden />
        Done: {added} added, {removed} removed.
      </p>
      <p className="text-[14px] leading-5 text-dc-muted">
        {signedIn
          ? "They sync to your account, so they show up in the app on your phone too."
          : "They are saved in this browser. Sign in on My Devcon to see them in the app on your phone."}
      </p>
      <div>
        <PrimaryLinkButton size="sm" href={`/schedule?${INTERESTS_PARAM}=1`}>
          Open my schedule
        </PrimaryLinkButton>
      </div>
    </div>
  );
}

function Group({ title, sessions, tone }: { title: string; sessions: Session[]; tone: "add" | "remove" }) {
  if (sessions.length === 0) return null;
  return (
    <section>
      <h2 className="text-[16px] font-bold leading-6 text-dc-fg2">{title}</h2>
      <ul className="mt-2 flex flex-col divide-y divide-dc-hairline rounded-xl border border-dc-hairline bg-white">
        {sessions.map((s) => (
          <li key={s.id} className={cn("flex flex-col gap-0.5 px-4 py-3", tone === "remove" && "opacity-70")}>
            <span className="text-[15px] font-semibold leading-5 text-dc-fg2">{s.title}</span>
            <span className="text-[13px] leading-5 text-dc-muted">
              {when(s)}
              {s.room?.name ? ` · ${shortCommunityHubName(s.room.name)}` : ""} · {sessionCode(s)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function when(s: Session): string {
  const day = eventFmt("en-GB", { weekday: "short", day: "numeric", month: "short" }).format(s.start);
  const time = eventFmt("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${day} · ${time.format(s.start)}–${time.format(s.end)}`;
}

function Note({ children, warn = false }: { children: React.ReactNode; warn?: boolean }) {
  return (
    <p
      className={cn(
        "flex gap-2 rounded-lg px-3 py-2 text-[13px] leading-5",
        warn ? "bg-[#fff6e5] text-dc-fg2" : "bg-[#f9f8fa] text-dc-muted"
      )}
    >
      {warn && <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />}
      <span>{children}</span>
    </p>
  );
}
