"use client";

import {
  useContext,
  useEffect,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from "react";
import { NativeNavigationContext, withCarriedParams } from "@/routing";
import { openDetail } from "@/routing/detailRoute";
import { detailHref, type DetailKind } from "@/routing/viewParams";

/**
 * Link to a session or speaker page. A plain anchor with the real href
 * (`/schedule/<id>`): cmd/middle-click opens a new tab and crawlers see a
 * normal link, but a plain click opens the detail in place (routing/
 * detailRoute.ts) instead of a Next navigation. Not `next/link` on purpose:
 * hundreds of cards would each prefetch their RSC payload on viewport entry
 * or touchstart (a request storm that thrashed the SW cache on iOS), for a
 * page that renders from the local store anyway.
 *
 * `onOpen` replaces the default open (the desktop lists use it to select the
 * side panel instead of navigating).
 */
export function DetailLink({
  kind,
  id,
  onOpen,
  className,
  style,
  title,
  children,
}: {
  kind: DetailKind;
  id: string;
  onOpen?: (id: string) => void;
  className?: string;
  style?: CSSProperties;
  title?: string;
  children: ReactNode;
}) {
  const nativeNav = useContext(NativeNavigationContext);
  const href = detailHref(kind, id);
  // Carried debug params (dataset, mockNow) only after mount: SSR and the
  // first client render must match to avoid a hydration mismatch on href.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const finalHref = mounted ? withCarriedParams(href) : href;

  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    // Modifier or middle click: let the browser open a new tab/window.
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    event.preventDefault();
    if (onOpen) {
      onOpen(id);
    } else if (nativeNav) {
      nativeNav.navigate(finalHref);
    } else {
      openDetail(kind, id);
    }
  };

  return (
    <a href={finalHref} onClick={onClick} className={className} style={style} title={title}>
      {children}
    </a>
  );
}
