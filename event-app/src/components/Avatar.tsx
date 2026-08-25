"use client";

import { useMemo } from "react";
import cn from "classnames";
import { DC8_TRACKS } from "@/components/schedule/trackTheme";

const initials = (name: string) =>
  name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

/** Deterministic pastel per name so spoofed avatars stay stable. */
function pastelFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return DC8_TRACKS[hash % DC8_TRACKS.length].color;
}

/**
 * devcon-api serves a pixel-identicon as an inline `data:image/svg+xml` URI
 * for every speaker without an uploaded photo (all 729 of DC7's). Rendering
 * those as `<img src="data:…">` crashed iOS: each SVG *image resource* becomes
 * its own SVG document plus raster buffer in WebKit, `loading="lazy"` can't
 * defer a data URI (no fetch to postpone), and the speakers list mounts ~750
 * cards at once — so an A–Z jump smooth-scrolling across the list forced
 * hundreds of rasterizations at once and the content process was killed
 * (PR #112: "crashes if you click multiple letters quickly in Jump to").
 *
 * Inlining the same markup avoids that entirely: inline SVG lives in the host
 * document's render tree, with no per-element document or raster buffer. The
 * identicons are tiny (an 8×8 grid: one background rect plus a few paths).
 *
 * Parsed into React elements rather than injected as HTML — an API-supplied
 * SVG string in `dangerouslySetInnerHTML` would be an XSS vector (SVG can
 * carry <script>), whereas `fill`/`d` attribute values cannot execute.
 */
const IDENTICON_MAX_BYTES = 4096;

type Identicon = { bg: string | null; paths: { fill: string; d: string }[] };

function parseIdenticon(src: string): Identicon | null {
  if (!src.startsWith("data:image/svg+xml") || src.length > IDENTICON_MAX_BYTES) {
    return null;
  }
  let markup: string;
  try {
    markup = decodeURIComponent(src.slice(src.indexOf(",") + 1));
  } catch {
    return null;
  }
  // Only the generated identicon shape is understood; anything else (a real
  // illustration, a <script>, a <foreignObject>) falls back to initials.
  if (/<(?!svg|rect|path)[a-z]/i.test(markup)) return null;

  const bg = markup.match(/<rect[^>]*fill=['"]([^'"]+)['"]/i)?.[1] ?? null;
  const paths = [...markup.matchAll(/<path[^>]*>/gi)].flatMap((tag) => {
    const fill = tag[0].match(/fill=['"]([^'"]+)['"]/i)?.[1];
    const d = tag[0].match(/\sd=['"]([^'"]+)['"]/i)?.[1];
    return fill && d ? [{ fill, d }] : [];
  });
  return paths.length > 0 || bg ? { bg, paths } : null;
}

/**
 * Round avatar: the speaker's uploaded photo, the API's identicon rendered
 * inline (see above), or initials on a stable DC8 pastel.
 */
export function Avatar({
  name,
  src,
  size = 48,
  className,
}: {
  name: string;
  src?: string;
  size?: number;
  className?: string;
}) {
  const identicon = useMemo(
    () => (src?.startsWith("data:") ? parseIdenticon(src) : null),
    [src]
  );

  if (identicon) {
    return (
      <svg
        viewBox="0 0 8 8"
        shapeRendering="crispEdges"
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className={cn("shrink-0 rounded-full", className)}
        aria-hidden
      >
        {identicon.bg && <rect width="8" height="8" fill={identicon.bg} />}
        {identicon.paths.map((p, i) => (
          <path key={i} fill={p.fill} d={p.d} />
        ))}
      </svg>
    );
  }

  // A non-identicon data URI is never rendered as an <img> (that's the crash
  // path); it degrades to initials below.
  if (src && !src.startsWith("data:")) {
    return (
      // crossOrigin: request with CORS so the response is a real 200 rather
      // than an opaque one. Opaque cache entries are quota-padded far beyond
      // their real size, which can trip the service worker's
      // purgeOnQuotaError and wipe every cached image. Safe because all our
      // avatars are mirrored to our own Supabase Storage, which sends
      // Access-Control-Allow-Origin: *.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        crossOrigin="anonymous"
        alt={name}
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className={cn("shrink-0 rounded-full object-cover", className)}
        loading="lazy"
        decoding="async"
      />
    );
  }

  return (
    <span
      style={{
        width: size,
        height: size,
        backgroundColor: pastelFor(name),
        fontSize: Math.round(size / 3),
      }}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-bold text-dc-fg2",
        className
      )}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
