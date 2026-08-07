/**
 * Shared landing-page/tickets style recipes (Figma home frames psM6NwZZF6jUyIa5gWMHB9).
 * px literals, not rem utilities: the site root font-size drops to 14px ≤1024
 * (index.scss), which would silently shrink rem-based sizes below the Figma spec.
 */

/** Section gutter ramp: 20px mobile, 32px from 768, 64px from 1280. */
export const sectionX = 'px-[20px] md:px-[32px] xl:px-[64px]'

/** Section content clamp — pairs with sectionX on the wrapper. */
export const sectionInner = 'max-w-[1312px] mx-auto'

/** Section h2. Callers append alignment/wrapping (text-center, sm:whitespace-pre-line). */
export const sectionHeading = 'text-[24px] sm:text-[32px] font-extrabold tracking-[-0.5px] leading-[1.2] text-[#160b2b]'

/** Purple all-caps eyebrow above section headings. */
export const eyebrow = 'text-[14px] font-semibold text-[#7235ed] tracking-[2px] uppercase leading-none'

/** Body copy size/leading only — color stays at the call site (#1a0d33 lead columns, #221144 support columns). */
export const bodyCopy = 'text-[14px] leading-[20px] sm:text-[16px] sm:leading-[24px]'

/** Larger intro paragraph used beside section headings. */
export const leadCopy =
  'text-[18px] leading-[26px] sm:text-[20px] sm:leading-[28.8px] tracking-[-0.25px] text-[#1a0d33]'

/** Card h3. */
export const cardTitle = 'text-[20px] font-extrabold text-[#160b2b] leading-[26px]'

/** Quiet all-caps label (0.5px tracking) — carousel label, stats banner label. */
export const sectionLabel = 'text-[14px] font-semibold tracking-[0.5px] uppercase'

/**
 * Frosted glass surface. Callers append their own shadow: WhyDevconIndia folds an
 * inset sheen into its box-shadow; JoinTheEvent's cards are overflow-hidden with a
 * full-bleed photo that would paint over an inset shadow, so they carry the sheen
 * as a separate overlay div instead. (GetInvolved's interactive cards use a darker
 * outline + hover states and stay bespoke.)
 */
export const glassCard =
  'bg-white/50 backdrop-blur-[6px] outline outline-1 outline-[rgba(255,255,255,0.66)] rounded-2xl'
