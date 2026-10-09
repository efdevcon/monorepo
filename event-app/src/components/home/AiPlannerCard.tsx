"use client";

import { useCallback } from "react";
import { Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { PrimaryButton, SecondaryButton } from "@/components/Buttons";
import { getActiveDataset } from "@/data/dataset";
import { eventFmt, getEventTimeZoneLabel } from "@/data/eventTime";
import { useEvent } from "@/data/hooks";
import { useSessionsOfAllProgrammes } from "@/data/hooks";
import { useInterested } from "@/data/interested/useInterested";
import { useOnline } from "@/hooks/useOnline";
import { assistantUrl, buildAssistantPrompt, sessionCode, type AssistantKind } from "@/data/ai/plan";

/**
 * Home entry to "Plan with your AI": one prompt, opened in ChatGPT or Claude
 * (new-chat prefill links) or copied for any other assistant. The prompt
 * points the assistant at the API's markdown catalogue and carries the
 * attendee's current stars by code, so no account access is involved; the
 * plan comes back as a /my-interests link the attendee confirms in the app.
 * Building the prompt needs nothing from the network; opening a chat does.
 */
export function AiPlannerCard() {
  const online = useOnline();
  const sessions = useSessionsOfAllProgrammes();
  const { ids } = useInterested();
  const { event } = useEvent();

  const prompt = useCallback(() => {
    const dataset = getActiveDataset();
    const starred = sessions.filter((s) => ids.has(s.id)).map((s) => ({ code: sessionCode(s), title: s.title }));
    const dates =
      event?.startDate && event?.endDate
        ? `${eventFmt("en-GB", { day: "numeric" }).format(new Date(event.startDate))} to ${eventFmt("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(new Date(event.endDate))}`
        : "";
    return buildAssistantPrompt({
      appOrigin: window.location.origin,
      eventId: dataset.eventId,
      eventTitle: event?.title || dataset.label,
      dates,
      timezoneLabel: getEventTimeZoneLabel(),
      starred,
    });
  }, [sessions, ids, event]);

  const open = (kind: AssistantKind) => {
    window.open(assistantUrl(kind, prompt()), "_blank", "noopener");
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt());
      toast.success("Instructions copied, paste them into your assistant");
    } catch {
      toast.error("Couldn't copy the instructions");
    }
  };

  return (
    <section aria-labelledby="home-ai-planner-title">
      <h2 id="home-ai-planner-title" className="mb-4 text-[20px] font-bold leading-[28.8px] tracking-[-0.5px] text-dc-fg2">
        Plan with your AI
      </h2>
      <div className="flex flex-col gap-4 rounded-xl border border-dc-hairline bg-gradient-to-t from-[#fbfafc] from-20% to-[#f3effc] p-5 shadow-[0_10px_15px_-3px_rgba(22,11,43,0.1),0_4px_6px_-4px_rgba(22,11,43,0.1)] lg:p-6">
        <div className="flex flex-col gap-2">
          <h3 className="text-[20px] font-bold leading-[1.2] tracking-[-0.5px] text-dc-fg2">
            Let your assistant build your schedule
          </h3>
          <p className="text-[14px] leading-5 text-dc-muted lg:text-[16px] lg:leading-6">
            ChatGPT, Claude or any assistant that can read a link gets the full programme, asks what you are into
            and hands back a plan you add to My Interests in one tap. The instructions include the titles of the
            sessions you already starred.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <PrimaryButton size="sm" onClick={() => open("chatgpt")} disabled={!online}>
            Open in ChatGPT
            <ExternalLink className="size-4 shrink-0" />
          </PrimaryButton>
          <PrimaryButton size="sm" onClick={() => open("claude")} disabled={!online}>
            Open in Claude
            <ExternalLink className="size-4 shrink-0" />
          </PrimaryButton>
          <SecondaryButton size="sm" onClick={copy}>
            <Copy className="size-4 shrink-0" />
            Copy instructions
          </SecondaryButton>
        </div>
        {!online && (
          <p className="text-[13px] leading-5 text-dc-muted">
            Opening a chat needs a connection. Copying works offline.
          </p>
        )}
      </div>
    </section>
  );
}
