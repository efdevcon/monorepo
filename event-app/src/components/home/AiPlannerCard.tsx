"use client";

import cn from "classnames";
import { trackEvent } from "@/data/analytics/track";
import { useCallback, useId, useMemo, useState } from "react";
import { ArrowRight, ChevronDown, Copy } from "lucide-react";
import { toast } from "sonner";
import { BrandButton } from "@/components/Buttons";
import { Link } from "@/routing";
import { getActiveDataset } from "@/data/dataset";
import { eventFmt, getEventTimeZoneLabel } from "@/data/eventTime";
import { useEvent } from "@/data/hooks";
import { useSessionsOfAllProgrammes } from "@/data/hooks";
import { useInterested } from "@/data/interested/useInterested";
import { useHydrated } from "@/hooks/useHydrated";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { useOnline } from "@/hooks/useOnline";
import { useRetryOnReconnect } from "@/hooks/useRetryOnReconnect";
import {
  assistantLink,
  buildAssistantPrompt,
  sessionCode,
  type AssistantKind,
  type PromptInput,
} from "@/data/ai/plan";

/**
 * Home entry to "Plan with your AI": the panel below under the section
 * heading, with a link to the import page (which also takes pasted codes).
 */
export function AiPlannerCard() {
  return (
    <section aria-labelledby="home-ai-planner-title">
      <div className="mb-4 flex items-center justify-between gap-8">
        <h2 id="home-ai-planner-title" className="text-[20px] font-bold leading-[28.8px] tracking-[-0.5px] text-dc-fg2">
          Plan with your AI
        </h2>
        {/* Same shape as the Notifications section's "View all": the import
            page also takes pasted codes, so it is reachable without a link
            from an assistant. */}
        <Link
          href="/my-interests"
          className="flex shrink-0 items-center gap-1.5 font-heading text-base font-bold text-dc-purple underline-offset-2 hover:underline"
        >
          Import a plan <ArrowRight className="size-4" />
        </Link>
      </div>
      <AiPlannerPanel promptAside />
    </section>
  );
}

/**
 * The "Plan with your AI" card: one prompt, opened in ChatGPT, Claude or Grok
 * (new-chat prefill links) or copied for any other assistant, with a
 * disclosure that shows the prompt. The prompt points the assistant at the
 * API's markdown catalogue and carries the attendee's current stars by code,
 * so no account access is involved; the plan comes back as a /my-interests
 * link the attendee confirms in the app. Building the prompt needs nothing
 * from the network; opening a chat does. On Home under its section heading,
 * and on the import page's empty state (`title`/`body` adapt the copy).
 */
export function AiPlannerPanel({
  title = "Get a draft schedule from your assistant",
  body = "Your assistant reads the full programme, asks what you are into and suggests a plan to add to My Interests in one tap. Your starred sessions are included.",
  promptAside = false,
}: {
  title?: string;
  body?: string;
  /**
   * Desktop: the prompt open in a right-hand column, scrolling inside the
   * card (Home). Off, every width gets the "Preview the prompt"
   * disclosure (the import page).
   */
  promptAside?: boolean;
}) {
  const online = useOnline();
  const sessions = useSessionsOfAllProgrammes();
  const { ids } = useInterested();
  const { event } = useEvent();
  const [previewOpen, setPreviewOpen] = useState(false);
  // Home's pane stays mounted behind other routes, so the import page's copy
  // of this panel needs its own disclosure id.
  const previewId = useId();

  const input = useCallback((): PromptInput => {
    const dataset = getActiveDataset();
    const starred = sessions.filter((s) => ids.has(s.id)).map((s) => ({ code: sessionCode(s), title: s.title }));
    const dayCount =
      event?.startDate && event?.endDate
        ? Math.max(0, Math.round((Date.parse(event.endDate) - Date.parse(event.startDate)) / 86_400_000) + 1)
        : 0;
    const dates =
      event?.startDate && event?.endDate
        ? `${eventFmt("en-GB", { day: "numeric" }).format(new Date(event.startDate))} to ${eventFmt("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(new Date(event.endDate))}`
        : "";
    return {
      appOrigin: window.location.origin,
      eventId: dataset.eventId,
      eventTitle: event?.title || dataset.label,
      dates,
      timezoneLabel: getEventTimeZoneLabel(),
      dayCount,
      starred,
    };
  }, [sessions, ids, event]);
  const prompt = useCallback(() => buildAssistantPrompt(input()), [input]);
  // The prompt string, for the desktop aside (always open) and the phone
  // disclosure (while open). Built only when something shows it: Home's pane
  // stays mounted behind every route, so an unconditional build would run on
  // every star tap. Only after hydration, since it reads window.location.
  const hydrated = useHydrated();
  const desktop = useIsDesktop();
  const showAside = promptAside && desktop;
  const promptText = useMemo(
    () => (hydrated && (showAside || previewOpen) ? prompt() : ""),
    [hydrated, showAside, previewOpen, prompt]
  );

  const open = (kind: AssistantKind) => {
    trackEvent("planner", `open-${kind}`);
    window.open(assistantLink(kind, input()), "_blank", "noopener");
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt());
      trackEvent("planner", "copy");
      toast.success("Prompt copied. Paste it into your assistant to draft a schedule.");
    } catch {
      toast.error("Couldn't copy the prompt");
    }
  };

  return (
    <div
      className={cn(
        "rounded-xl border border-dc-hairline bg-white p-5 lg:p-6",
        promptAside && "lg:grid lg:grid-cols-[3fr_2fr] lg:items-center lg:gap-6 lg:py-8"
      )}
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h3 className="text-[20px] font-bold leading-[1.2] tracking-[-0.5px] text-dc-fg2">{title}</h3>
          <p className="text-[14px] leading-5 text-dc-muted lg:text-[16px] lg:leading-6">{body}</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {/* Brand fills and marks per Figma (5987:142 / 5987:138 / 5987:134); the
              marks are the brands' own files, served from public/home/ai-planner.
              Grok's fill is lifted from Figma's #1a1a1a so it doesn't pair off
              with ChatGPT's black. */}
          <BrandButton className="bg-[#d0572f]" onClick={() => open("claude")} disabled={!online}>
            Ask Claude
            <BrandMark src="/home/ai-planner/claude.svg" />
          </BrandButton>
          <BrandButton className="bg-black" onClick={() => open("chatgpt")} disabled={!online}>
            Ask ChatGPT
            <BrandMark src="/home/ai-planner/chatgpt.svg" />
          </BrandButton>
          <BrandButton className="bg-[#333333]" onClick={() => open("grok")} disabled={!online}>
            Ask Grok
            <BrandMark src="/home/ai-planner/grok.svg" />
          </BrandButton>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-[13px] leading-5 text-dc-muted">
            Opens in a new tab with the prompt pre-filled. You may need to sign in. If it opens empty, copy it and
            paste. Any other AI works too, local or private ones included: copy the prompt and paste it in.
          </p>
          {!online && (
            <p className="text-[13px] leading-5 text-dc-muted">
              Opening a chat needs a connection. Copying works offline.
            </p>
          )}
        </div>
        {/* The disclosure under the buttons; with `promptAside`, desktop shows
            the prompt in the right-hand column instead (below). */}
        <div className={cn("flex flex-col gap-3", promptAside && "lg:hidden")}>
          <div className="-my-3 flex items-center justify-between gap-4">
            <button
              type="button"
              aria-expanded={previewOpen}
              aria-controls={previewId}
              onClick={() => setPreviewOpen((v) => !v)}
              className={cn(textActionClass, "py-3")}
            >
              Preview the prompt
              <ChevronDown
                className={cn(
                  "size-4 shrink-0 transition-transform duration-150 ease-out motion-reduce:transition-none",
                  previewOpen && "rotate-180"
                )}
              />
            </button>
            <CopyPromptAction onClick={copy} className="py-3" />
          </div>
          {/* Always in the DOM so aria-controls resolves; the prompt is only
              built while open because it reads window.location (client-only). */}
          {/* Outer box owns the radius and clips, so the scrollbar's track
              stays inside the rounded corners. */}
          <div hidden={!previewOpen} className="overflow-hidden rounded-[14px] border border-dc-hairline bg-white">
            <div
              id={previewId}
              role="region"
              aria-label="Prompt preview"
              tabIndex={0}
              className="max-h-[260px] overflow-y-auto whitespace-pre-wrap p-4 font-mono text-[12.5px] leading-[1.5] text-dc-fg2 [overflow-wrap:anywhere]"
            >
              {previewOpen ? promptText : null}
            </div>
          </div>
        </div>
      </div>
      {/* Desktop: the prompt, open, scrolling inside the card's height
          (the column stretches to the left-hand content; the absolute inner
          box keeps the prompt from growing the card). */}
      {promptAside && (
        <div className="hidden min-h-[240px] flex-col gap-3 lg:flex">
          <div className="flex items-center justify-between gap-4">
            <p className="text-[12px] font-bold uppercase leading-[18px] tracking-[0.5px] text-dc-muted">Prompt</p>
            <CopyPromptAction onClick={copy} />
          </div>
          <div className="relative min-h-0 flex-1">
            <div className="absolute inset-0 overflow-hidden rounded-[14px] border border-dc-hairline bg-dc-panel">
              <div
                role="region"
                aria-label="Prompt preview"
                tabIndex={0}
                className="h-full overflow-y-auto whitespace-pre-wrap p-4 font-mono text-[12.5px] leading-[1.5] text-dc-fg2 [overflow-wrap:anywhere]"
              >
                {promptText}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Purple text action with a 16px icon: the prompt disclosure and the copy action share it. */
const textActionClass =
  "flex w-fit cursor-pointer items-center gap-1.5 text-[14px] font-bold leading-none text-dc-purple transition-colors duration-150 ease-out hover:text-dc-purple-600";

/**
 * "Copy" as a text action beside the prompt's label (desktop aside) or
 * its disclosure (phones, the import page), not a button in the brand row:
 * the row is for opening a chat, copying is for every other assistant.
 */
function CopyPromptAction({ onClick, className }: { onClick: () => void; className?: string }) {
  return (
    <button type="button" onClick={onClick} className={cn(textActionClass, "shrink-0", className)}>
      <Copy className="size-4 shrink-0" />
      Copy
    </button>
  );
}

/**
 * A brand's mark beside its label. Hidden if the file fails to load (the
 * label stands alone), remounted on reconnect so the same URL is fetched
 * again (event-app/CLAUDE.md, Images rule 5).
 */
function BrandMark({ src }: { src: string }) {
  const { failed, attempt, markFailed } = useRetryOnReconnect();
  if (failed) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img key={attempt} src={src} onError={markFailed} alt="" width={20} height={20} className="size-5 shrink-0" />
  );
}
