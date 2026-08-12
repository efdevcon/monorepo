import React from 'react'
import cn from 'classnames'

// Corner-pinned promo badge for the service cards in the Where-to-stay section.
// Content-agnostic: the caller passes the copy as children, so the same badge
// works for any accommodation option or future service on the page.
//
// The top-right radius matches the card's rounded-2xl so the badge sits flush
// in the corner. Sizes are in px, not rem-based Tailwind utilities, because the
// root font-size is 14px at ≤1024 (see travel-guide.module.scss).
export const PromoTag = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <span
    className={cn(
      // Deliberately not a flex container: flex turns the runs either side of
      // the bold code into anonymous items and eats the spaces around it.
      'absolute top-0 right-0 block max-w-full text-center',
      'rounded-tr-[16px] rounded-bl-[4px] bg-[#aaeaba] px-[12px] py-[8px]',
      'text-[12px] leading-[16px] md:text-[14px] md:leading-[20px] text-[#221144]',
      '[&_strong]:font-bold',
      className
    )}
  >
    {children}
  </span>
)
