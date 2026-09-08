"use client";

import { use } from "react";
import { ArrowLeft } from "lucide-react";
import APP_CONFIG from "@/CONFIG";
import { closeDetail } from "@/routing/detailRoute";
import { DetailNotFound, HeaderActionsPortal } from "@/components/DetailLayer";
import { ShareButton } from "@/components/ShareButton";
import { useSpeakersData } from "@/components/speakers/useSpeakersData";
import { SpeakerDetailsContent } from "@/components/speakers/SpeakerDetailsContent";

interface SpeakerClientProps {
  params?: Promise<{ id: string }>;
  id?: string;
}

/**
 * Fullscreen speaker details. Rendered by the Speakers tab's persistent pane
 * for `/speakers/<id>` (mobile: over the list; desktop: instead of it, also
 * the side panel's "Expand details" target). Resolves from the cached
 * speakers × sessions join, so a speaker never opened while online still
 * renders offline once the lists have loaded. Mobile back navigation comes
 * from AppHeader (routeChrome); the desktop header has no back slot, so a
 * page-level text back button sits above the card there (PR #112 feedback).
 * `params` is kept for direct use as a route page component.
 */
export default function Speaker({ params, id: directId }: SpeakerClientProps) {
  const id = directId ?? use(params!).id;

  const { byId, isLoading, error } = useSpeakersData();
  const decorated = byId.get(id) ?? null;

  if (!APP_CONFIG.SPEAKERS_ENABLED) {
    return <div className="p-4 text-dc-muted">Speakers are not enabled</div>;
  }

  if (!decorated) {
    // Loading only while nothing has ever been synced; otherwise the id is
    // unknown (stale link, other dataset) or the first sync failed.
    if (isLoading) {
      return (
        <div className="p-4 py-12 text-center font-heading text-dc-muted">
          Loading speaker…
        </div>
      );
    }
    return (
      <DetailNotFound
        label={(error as Error | undefined)?.message || "Speaker not found"}
        onBack={() => closeDetail("speaker")}
      />
    );
  }

  return (
    <main className="expand font-heading text-dc-fg">
      {/* Mobile: panel-grey underlay over the app gradient (between .app-bg
          at z -10 and the content) so the surface fills the whole viewport —
          content box tricks can't reach the layout's 112px bottom-nav padding,
          which otherwise shows the gradient below short AND long profiles. */}
      <div className="fixed inset-0 -z-[5] bg-dc-panel lg:hidden" aria-hidden />
      <HeaderActionsPortal>
        <ShareButton
          kind="speaker"
          id={decorated.speaker.id}
          title={decorated.speaker.name}
        />
      </HeaderActionsPortal>
      <div className="lg:mx-auto lg:w-full lg:max-w-[720px] lg:py-8">
        {/* Desktop-only back control: underline-on-hover text button — the
            ghost-pill fill reads oddly floating over the page gradient. The
            breakpoint gate lives on a wrapper because the button styles set
            their own display. Closes the detail (history.back() when we
            pushed it, else the list URL in place), never leaves the app. */}
        <div className="hidden lg:block">
          <button
            type="button"
            onClick={() => closeDetail("speaker")}
            className="mb-3 flex cursor-pointer items-center gap-1.5 text-[14px] font-bold leading-none text-dc-purple hover:underline"
          >
            <ArrowLeft className="size-4" />
            Back
          </button>
        </div>
        <div className="lg:overflow-clip lg:rounded-xl lg:border lg:border-dc-hairline">
          <SpeakerDetailsContent decorated={decorated} />
        </div>
      </div>
    </main>
  );
}
