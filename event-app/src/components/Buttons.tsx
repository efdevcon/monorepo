import cn from "classnames";
import { X } from "lucide-react";
import { Link } from "@/routing";

/**
 * Shared DC8 button primitives (filters panel footer, panel close buttons).
 * Stacked hover effects (scale + color) run on one 150ms ease-out clock —
 * keep any new animated property inside the same transition list. Note
 * Tailwind v4 scale-* sets the standalone `scale` property, not `transform`,
 * so a motion-reduce override can't cancel it: `enabled:hover:` carries two
 * pseudo-class specificity points while motion-reduce is only a media query,
 * so hover always won. The scale is gated with motion-safe instead, which
 * removes the conflict rather than fighting it.
 */
const ctaBase =
  "flex cursor-pointer items-center justify-center gap-2 rounded-full px-8 py-3.5 text-[16px] font-bold leading-none transition-[scale,background-color] duration-150 ease-out motion-safe:enabled:hover:scale-[1.03] motion-safe:enabled:active:scale-[0.97] disabled:cursor-default disabled:opacity-40 motion-reduce:transition-none";

/**
 * CTAs as links (navigation, not actions). Anchors have no :enabled state,
 * so the hover/press states drop the `enabled:` gate.
 */
const ctaLinkBase =
  "flex cursor-pointer items-center justify-center rounded-full font-bold leading-none transition-[scale,background-color] duration-150 ease-out motion-safe:hover:scale-[1.03] motion-safe:active:scale-[0.97] motion-reduce:transition-none";

/**
 * `md`: PrimaryButton's 16px label, 32px sides. `sm`: the Figma
 * "Button-Small", 40px tall, 14px label, 24px sides.
 */
type CtaLinkSize = "md" | "sm";
const ctaLinkSize = (size: CtaLinkSize) =>
  size === "sm" ? "h-10 gap-2 px-6 text-[14px]" : "gap-2 px-8 py-3.5 text-[16px]";

/** PrimaryButton's look on a link. */
export function PrimaryLinkButton({
  className,
  size = "md",
  ...props
}: React.ComponentProps<typeof Link> & { size?: CtaLinkSize }) {
  return (
    <Link
      {...props}
      className={cn(ctaLinkBase, ctaLinkSize(size), "bg-dc-purple text-dc-purple-fg hover:bg-[#6730d5]", className)}
    />
  );
}

/**
 * Ghost link (Figma ghost "Button"): purple 14px label on no fill, 40px
 * tall, 16px sides, 6px icon gap; washes purple on hover. The quiet
 * partner to a small PrimaryLinkButton.
 */
export function GhostLinkButton({ className, ...props }: React.ComponentProps<typeof Link>) {
  return (
    <Link
      {...props}
      className={cn(
        ctaLinkBase,
        "h-10 gap-1.5 px-4 text-[14px] text-dc-purple hover:bg-dc-purple-wash",
        className
      )}
    />
  );
}

/** Solid purple CTA (e.g. "Reset filters"). Darkens ~10% on hover. */
export function PrimaryButton({
  className,
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      {...props}
      className={cn(
        ctaBase,
        "bg-dc-purple text-dc-purple-fg enabled:hover:bg-[#6730d5]",
        className
      )}
    />
  );
}

/** White bordered CTA (e.g. "Close"). Tints lavender on hover. */
export function SecondaryButton({
  className,
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      {...props}
      className={cn(
        ctaBase,
        "border border-dc-hairline bg-white/80 text-dc-fg2 enabled:hover:bg-dc-lavender",
        className
      )}
    />
  );
}

/** Circular 28px panel-header close button; fills dc-purple-soft on hover. */
export function CloseButton({
  className,
  "aria-label": ariaLabel = "Close",
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      {...props}
      aria-label={ariaLabel}
      className={cn(
        "flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full bg-dc-panel transition-colors duration-150 ease-out hover:bg-dc-purple-soft",
        className
      )}
    >
      <X className="size-4 text-dc-fg2" />
    </button>
  );
}
