import cn from "classnames";
import { X } from "lucide-react";

/**
 * Shared DC8 button primitives (filters panel footer, panel close buttons).
 * Stacked hover effects (scale + color) run on one 150ms ease-out clock —
 * keep any new animated property inside the same transition list. Note
 * Tailwind v4 scale-* sets the standalone `scale` property, not `transform`.
 */
const ctaBase =
  "flex cursor-pointer items-center justify-center gap-2 rounded-full px-8 py-3.5 text-[16px] font-bold leading-none transition-[scale,background-color] duration-150 ease-out hover:scale-[1.03] active:scale-[0.97] motion-reduce:transform-none motion-reduce:transition-none";

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
        "bg-dc-purple text-dc-purple-fg hover:bg-[#6730d5]",
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
        "border border-dc-hairline bg-white/80 text-dc-fg2 hover:bg-dc-lavender",
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
