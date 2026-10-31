"use client";

import cn from "classnames";
import { trackEvent } from "@/data/analytics/track";
import { useCallback, useId, useMemo, useState } from "react";
import { ArrowRight, ChevronDown, Copy } from "lucide-react";
import { toast } from "sonner";
import { PrimaryButton, SecondaryButton } from "@/components/Buttons";
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
 * Home entry to "Plan with your AI": the panel, with its "Import a plan"
 * link inside (the section heading and the link's row above the card went
 * on 2026-10-31).
 */
export function AiPlannerCard() {
  return (
    <section aria-label="Plan with your AI">
      <AiPlannerPanel promptAside importLink />
    </section>
  );
}

/**
 * The "Plan with your AI" card: one prompt, copied for a local or private
 * assistant (the first button: the attendee's own AI is the point of the
 * feature) or opened in Claude, ChatGPT or Grok (new-chat prefill links),
 * with a disclosure that shows the prompt. The first button is the solid
 * primary one, the three brands share the quiet outlined style and are told
 * apart by their marks, not by their colours. The prompt points the assistant at the
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
  importLink = false,
}: {
  title?: string;
  body?: string;
  /** An "Import a plan" link to /my-interests at the foot of the text column (Home; the import page is that page). */
  importLink?: boolean;
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

  // `action` tells the two copy entries apart in analytics: the row's button
  // ("copy-other-ai") and the text action beside the prompt ("copy").
  const copy = async (action: "copy" | "copy-other-ai" = "copy") => {
    try {
      await navigator.clipboard.writeText(prompt());
      trackEvent("planner", action);
      toast.success("Prompt copied. Paste it into your assistant to draft a schedule.");
    } catch {
      toast.error("Couldn't copy the prompt");
    }
  };

  return (
    <div
      className={cn(
        "rounded-xl border border-dc-hairline bg-gradient-to-t from-[#fbfafc] from-20% to-[#fff5fa] px-5 pb-5 pt-6 lg:p-6",
        promptAside && "lg:grid lg:grid-cols-[3fr_2fr] lg:items-center lg:gap-6 lg:py-8"
      )}
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h3 className="text-[20px] font-bold leading-[1.2] tracking-[-0.5px] text-dc-fg2">{title}</h3>
          <p className="text-[14px] leading-5 text-dc-muted lg:text-[16px] lg:leading-6">{body}</p>
        </div>
        {/* One line from 1280px wide (16px button sides, 8px gaps); narrower
            desktops wrap the last button, phones stack. */}
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-2">
          {/* Every assistant, the local and private ones first and in the
              primary colour: they get the prompt through the clipboard, which
              needs no connection, so that button is never disabled. The brand
              marks are the brands' own files (public/home/ai-planner), in the
              text colour; the brand fills of the Figma design (5987:142 /
              5987:138 / 5987:134) were dropped so the row does not shout. */}
          <PrimaryButton size="fluid" onClick={() => copy("copy-other-ai")}>
            <Copy className="size-4 shrink-0" />
            Local or private AI
          </PrimaryButton>
          <SecondaryButton size="fluid" onClick={() => open("claude")} disabled={!online}>
            Ask Claude
            <BrandMark src="/home/ai-planner/claude-mark.svg" />
          </SecondaryButton>
          <SecondaryButton size="fluid" onClick={() => open("chatgpt")} disabled={!online}>
            Ask ChatGPT
            <BrandMark src="/home/ai-planner/chatgpt-mark.svg" />
          </SecondaryButton>
          <SecondaryButton size="fluid" onClick={() => open("grok")} disabled={!online}>
            Ask Grok
            <BrandMark src="/home/ai-planner/grok-mark.svg" />
          </SecondaryButton>
        </div>
        {/* The import page also takes pasted codes, so it is reachable
            without a link from an assistant. Straight under the buttons
            on phones, under their note on desktop, in the buttons' 14px; phones draw a hairline above it to
            set it apart from the stack (Scott, 2026-10-31). */}
        {importLink && (
          <div className="border-t border-dc-hairline pt-4 lg:order-last lg:border-t-0 lg:pt-0">
            <Link href="/my-interests" className={cn(textActionClass, "mx-auto lg:mx-0")}>
              Import a plan instead
              <ArrowRight className="size-4 shrink-0" />
            </Link>
          </div>
        )}
        <div className="flex flex-col gap-1">
          <p className="text-[13px] leading-5 text-dc-muted">
            Local or private AI copies the prompt, to paste into any assistant. The others open a new tab with it
            pre-filled; you may need to sign in, and if it opens empty, copy and paste it instead.
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
            <CopyPromptAction onClick={() => copy()} className="py-3" />
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
            <CopyPromptAction onClick={() => copy()} />
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
 * "Copy" as a text action beside the prompt's label (desktop aside) or its
 * disclosure (phones, the import page): for whoever has just read the prompt.
 * The row's "Local or private AI" button is the same action for those who
 * have not.
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
