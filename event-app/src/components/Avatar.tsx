"use client";

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
 * Round avatar with a spoofed placeholder when no image exists (most speakers
 * have no avatar in the current data): initials on a stable DC8 pastel.
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
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        style={{ width: size, height: size }}
        className={cn("shrink-0 rounded-full object-cover", className)}
        loading="lazy"
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
