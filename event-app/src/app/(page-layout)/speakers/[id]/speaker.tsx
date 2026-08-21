"use client";

import { use } from "react";
import { ArrowLeft } from "lucide-react";
import cn from "classnames";
import APP_CONFIG from "@/CONFIG";
import { BackButton } from "@/routing";
import { ghostPill } from "@/components/ActionPills";
import { useSpeakersData } from "@/components/speakers/useSpeakersData";
import { SpeakerDetailsContent } from "@/components/speakers/SpeakerDetailsContent";

interface SpeakerClientProps {
  params?: Promise<{ id: string }>;
  id?: string;
}

/**
 * Fullscreen speaker details (mobile flow + the desktop panel's "Expand
 * details" target). Resolves from the cached speakers × sessions join, so a
 * speaker never opened while online still renders offline once the lists have
 * loaded. Mobile back navigation comes from AppHeader (routeChrome); the
 * desktop header has no back slot, so a page-level ghost-pill BackButton
 * sits above the card there (PR #112 feedback).
 */
export default function Speaker({ params, id: directId }: SpeakerClientProps) {
  const id = directId ?? use(params!).id;

  const { byId, isLoading, isError, error } = useSpeakersData();
  const decorated = byId.get(id) ?? null;

  if (!APP_CONFIG.SPEAKERS_ENABLED) {
    return <div className="p-4 text-dc-muted">Speakers are not enabled</div>;
  }

  if (isLoading && !decorated) {
    return (
      <div className="p-4 py-12 text-center font-heading text-dc-muted">
        Loading speaker…
      </div>
    );
  }

  if (!decorated) {
    return (
      <div className="p-4 py-12 text-center font-heading text-dc-red">
        {(isError && (error as Error | undefined)?.message) ||
          "Speaker not found"}
      </div>
    );
  }

  return (
    <main className="expand font-heading text-dc-fg">
      {/* Mobile: panel-grey underlay over the app gradient (between .app-bg
          at z -10 and the content) so the surface fills the whole viewport —
          content box tricks can't reach the layout's 112px bottom-nav padding,
          which otherwise shows the gradient below short AND long profiles. */}
      <div className="fixed inset-0 -z-[5] bg-dc-panel lg:hidden" aria-hidden />
      <div className="lg:mx-auto lg:w-full lg:max-w-[720px] lg:py-8">
        {/* Desktop-only back control (ghostPill carries its own `flex`, so
            the breakpoint gate lives on a wrapper) — pulled left (-ml-3) so
            the label's optical edge aligns with the card below. */}
        <div className="hidden lg:block">
          <BackButton
            fallbackHref="/speakers"
            className={cn(ghostPill, "-ml-3 mb-2")}
          >
            <ArrowLeft className="size-4" />
            Back
          </BackButton>
        </div>
        <div className="lg:overflow-clip lg:rounded-xl lg:border lg:border-dc-hairline">
          <SpeakerDetailsContent decorated={decorated} />
        </div>
      </div>
    </main>
  );
}
