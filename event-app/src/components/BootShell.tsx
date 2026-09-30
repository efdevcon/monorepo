"use client";

import { usePathname } from "next/navigation";
import { ListSkeleton, TicketSkeleton } from "./Skeletons";

/**
 * What the data boot gate (DataProvider) paints until IndexedDB and the
 * EventStore have hydrated. It is also the server-rendered HTML, so the very
 * first frame is the app gradient with a header strip and a skeleton shaped
 * like the route, never a white page. No data, no hooks beyond the pathname:
 * nothing here may depend on the providers it is standing in for.
 */
export function BootShell() {
  const pathname = usePathname() ?? "/";
  const body = pathname.startsWith("/schedule") ? (
    <ListSkeleton kind="schedule" label="Loading schedule…" />
  ) : pathname.startsWith("/speakers") ? (
    <ListSkeleton kind="speakers" label="Loading speakers…" />
  ) : pathname.startsWith("/ticket") ? (
    <TicketSkeleton />
  ) : (
    <GenericSkeleton />
  );
  return (
    <>
      <div className="app-bg" aria-hidden />
      {/* Same footprint as AppHeader: 56px bar on phones, 64px on desktop. */}
      <div
        aria-hidden
        className="h-[calc(3.5rem+var(--safe-top))] border-b border-dc-hairline bg-white/75 lg:h-[calc(4rem+var(--safe-top))]"
      />
      <div className="px-4 py-6 lg:mx-auto lg:max-w-[1312px] lg:px-8 lg:pt-[72px] xl:px-0">{body}</div>
    </>
  );
}

/** Home and anything else: a hero block and two cards. */
function GenericSkeleton() {
  const bone = "rounded bg-dc-fg2/[0.07]";
  return (
    <div role="status" className="flex flex-col gap-4 motion-safe:animate-pulse">
      <span className="sr-only">Loading…</span>
      <div aria-hidden className={`${bone} h-8 w-48`} />
      <div aria-hidden className="h-[180px] rounded-xl border border-dc-hairline bg-white" />
      <div aria-hidden className="h-[120px] rounded-xl border border-dc-hairline bg-white" />
    </div>
  );
}
