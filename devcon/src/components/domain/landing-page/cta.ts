/**
 * Shared CTA pill recipe — Tailwind port of the Travel Guide buttons
 * (src/pages/travel-guide/travel-guide.module.scss %btn-pill / .btn-primary / .btn-secondary),
 * which match the Figma Button component (pl-32 pr-28 py-16, min-h 36, gap 8, 16px Bold).
 * `active:` must stay declared alongside `hover:` — Tailwind orders active after hover
 * so the press state wins on mouse.
 */
const pillBase =
  // px literals, not rem utilities: the site root font-size drops to 14px ≤1024
  // (index.scss), which would shrink rem-based padding/text below the SCSS recipe.
  'inline-flex items-center justify-center gap-[8px] min-h-[36px] rounded-full pl-[32px] pr-[28px] py-[16px] text-[16px] font-bold leading-none whitespace-nowrap transition-[transform,opacity,background-color] duration-150 ease-out motion-safe:hover:scale-[1.03] motion-safe:active:scale-[0.97]'

export const ctaPrimary = `${pillBase} bg-[#7235ed] text-[#f9f8fa] hover:opacity-90`

export const ctaSecondary = `${pillBase} bg-white/80 text-[#1a0d33] outline outline-1 outline-[rgba(34,17,68,0.1)] hover:bg-white`
