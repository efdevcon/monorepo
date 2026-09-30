"use client";

import { use } from "react";
import { ArrowLeft } from "lucide-react";
import APP_CONFIG from "@/CONFIG";
import { closeDetail } from "@/routing/detailRoute";
import { DetailNotFound, HeaderActionsPortal } from "@/components/DetailLayer";
import { DetailSkeleton } from "@/components/Skeletons";
import { usePreviewState } from "@/hooks/usePreviewState";
import { ShareButton } from "@/components/ShareButton";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { useSpeakersData } from "@/components/speakers/useSpeakersData";
import { ScheduleSourceProvider, storeFor, useScheduleSource } from "@/data/store/schedule-source";
import { useStoreState } from "@/data/store/use-event-store";
import {
  SpeakerDetailsContent,
  SpeakerDetailsExpanded,
} from "@/components/speakers/SpeakerDetailsContent";

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
 * page-level text back button sits above the two-column card there (PR #112
 * feedback). `params` is kept for direct use as a route page component.
 *
 * Which programme: the Speakers pane has no schedule-source provider, so the
 * join below reads the Pretalx programme by default, and a Community Hub
 * speaker (only in the hubs store) came up "not found". The programme is
 * decided from the id itself, not from the URL: the `?hubs=1` a detail link
 * carries is just the schedule's own query string, and a shared link may
 * not have it. The page then renders under that source, so the join, the
 * session cards and their links all read the same store.
 */
export default function Speaker({ params, id: directId }: SpeakerClientProps) {
  const id = directId ?? use(params!).id;
  const current = useScheduleSource();
  const main = useStoreState(storeFor("main"));
  const hubs = useStoreState(storeFor("hubs"));
  const source =
    !main.snapshot.speakerById.has(id) && hubs.snapshot.speakerById.has(id) ? "hubs" : current;
  return (
    <ScheduleSourceProvider source={source}>
      <SpeakerPage id={id} />
    </ScheduleSourceProvider>
  );
}

function SpeakerPage({ id }: { id: string }) {
  const { byId, isLoading, error } = useSpeakersData();
  const preview = usePreviewState();
  const decorated = byId.get(id) ?? null;
  // JS fork rather than lg:hidden twins: the desktop layout is a different
  // structure (two cards, desktop session cards), not a restyle.
  const isDesktop = useIsDesktop();

  if (!APP_CONFIG.SPEAKERS_ENABLED) {
    return <div className="p-4 text-dc-muted">Speakers are not enabled</div>;
  }

  const detailPreview =
    preview === "loading" || preview === "notfound" || preview === "failed" ? preview : null;
  if (!decorated || detailPreview) {
    // Loading only while nothing has ever been synced; otherwise the id is
    // unknown (stale link, other dataset) or the first sync failed.
    if (detailPreview === "loading" || (!detailPreview && isLoading)) {
      return <DetailSkeleton kind="speaker" />;
    }
    return (
      <DetailNotFound
        kind="speaker"
        failed={detailPreview ? detailPreview === "failed" : Boolean(error)}
        onBack={() => closeDetail("speaker")}
      />
    );
  }

  if (isDesktop) {
    return (
      <main className="expand font-heading text-dc-fg">
        <div className="mx-auto w-full max-w-[1312px] px-8 py-8 xl:px-0">
          <SpeakerDetailsExpanded
            decorated={decorated}
            back={
              // Underline-on-hover text button — the ghost-pill fill reads
              // oddly floating over the page gradient. Closes the detail
              // (history.back() when we pushed it, else the list URL in
              // place), never leaves the app.
              <button
                type="button"
                onClick={() => closeDetail("speaker")}
                className="flex cursor-pointer items-center gap-2 self-start text-[16px] font-bold leading-none tracking-[-0.25px] text-dc-purple hover:underline"
              >
                <ArrowLeft className="size-4" />
                Back
              </button>
            }
          />
        </div>
      </main>
    );
  }

  return (
    <main className="expand font-heading text-dc-fg">
      {/* Mobile: panel-grey underlay over the app gradient (between .app-bg
          at z -10 and the content) so the surface fills the whole viewport —
          content box tricks can't reach the layout's bottom-nav padding,
          which otherwise shows the gradient below short AND long profiles. */}
      <div className="fixed inset-0 -z-[5] bg-dc-panel lg:hidden" aria-hidden />
      <HeaderActionsPortal>
        <ShareButton
          kind="speaker"
          id={decorated.speaker.id}
          title={decorated.speaker.name}
        />
      </HeaderActionsPortal>
      <SpeakerDetailsContent decorated={decorated} />
    </main>
  );
}
