"use client";

import dynamic from "next/dynamic";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentType,
  type RefObject,
} from "react";
import { PaneActiveContext, PanePathContext } from "./paneContext";
import { isTabPath } from "@/routing/viewParams";

/**
 * Persistent tab panes for the bottom-bar destinations. Each pane mounts
 * lazily on its first visit (code-split, client-only) and then stays mounted;
 * switching tabs toggles `hidden` instead of mounting a page. On a mid-range
 * phone the speakers list alone cost ~800 ms of render per visit; a toggle is
 * a few milliseconds, and each tab keeps its own scroll position like a
 * native tab bar.
 *
 * Routes and URLs are unchanged (precache, deep links, redirects and
 * metadata all still hang off them): the tab routes' page.tsx files render
 * nothing and this layout-level component renders the pane for the pathname.
 * Non-tab routes (announcements, room screens, admin) render through the
 * layout's children as before, with every pane hidden.
 */
const TABS: { path: string; Component: ComponentType }[] = [
  {
    path: "/",
    Component: dynamic(() => import("@/components/home/Home").then((m) => m.Home), { ssr: false }),
  },
  {
    path: "/schedule",
    Component: dynamic(() => import("@/app/(page-layout)/schedule/schedule"), { ssr: false }),
  },
  {
    path: "/speakers",
    Component: dynamic(() => import("@/app/(page-layout)/speakers/speakers"), { ssr: false }),
  },
  {
    path: "/map",
    Component: dynamic(() => import("@/components/MapPane").then((m) => m.MapPane), { ssr: false }),
  },
  {
    path: "/ticket",
    Component: dynamic(() => import("@/components/Ticket").then((m) => m.Ticket), { ssr: false }),
  },
];

export function TabPanes({ pathname }: { pathname: string }) {
  const active = isTabPath(pathname) ? pathname : null;
  // Panes mount on first visit and are never unmounted. Derived state during
  // render (guarded), so the newly visited pane mounts in this same render.
  const [visited, setVisited] = useState<string[]>(() => (active ? [active] : []));
  if (active && !visited.includes(active)) setVisited((v) => [...v, active]);

  return (
    <>
      {TABS.filter((t) => visited.includes(t.path)).map((t) => (
        <Pane key={t.path} path={t.path} active={t.path === active}>
          <t.Component />
        </Pane>
      ))}
    </>
  );
}

function Pane({
  path,
  active,
  children,
}: {
  path: string;
  active: boolean;
  children: React.ReactNode;
}) {
  const savedScroll = useRef<number | null>(null);
  const activeRef = useRef(active);

  // Remember where this tab was scrolled. The listener ignores events while
  // inactive: hiding a tall pane makes the browser clamp scrollY and fire a
  // scroll event before the passive cleanup would have run.
  useEffect(() => {
    const onScroll = () => {
      if (activeRef.current) savedScroll.current = window.scrollY;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <PaneActiveContext.Provider value={active}>
      <PanePathContext.Provider value={path}>
        {/* The pane spans the outer `.section` grid (`expand`) and is itself a
            `.section` grid, so the page root inside it matches the same
            `.section > *` / `.section > .expand` placement rules as a normal
            route child. (`display: contents` was tried first: it removes the
            pane's box but the page root is still a grandchild in the DOM, so
            those child selectors no longer match and the page auto-places
            into the 16px gutter column.) `hidden` is display:none !important
            and wins when inactive. */}
        <div hidden={!active} className="section expand">
          <ScrollRestorer active={active} activeRef={activeRef} saved={savedScroll} />
          {children}
        </div>
      </PanePathContext.Provider>
    </PaneActiveContext.Provider>
  );
}

/**
 * Rendered as the pane's FIRST child on purpose: layout effects run in tree
 * order, so this runs before the page's own layout effects. On first show it
 * scrolls to the top and the page's landing logic (the schedule's jump to
 * "live now") runs after it and wins; on later shows it restores the saved
 * position and nothing overrides it.
 */
function ScrollRestorer({
  active,
  activeRef,
  saved,
}: {
  active: boolean;
  activeRef: RefObject<boolean>;
  saved: RefObject<number | null>;
}) {
  useLayoutEffect(() => {
    activeRef.current = active;
    if (!active) return;
    window.scrollTo({ top: saved.current ?? 0, behavior: "auto" });
  }, [active, activeRef, saved]);
  return null;
}
