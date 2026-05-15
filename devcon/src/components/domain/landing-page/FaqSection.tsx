import React from 'react'
import { useTranslations } from 'next-intl'
import { BottomFAQ, useStandardFaqItems } from 'components/common/BottomFAQ'
import ArtImage from './images/new/art-overlay.jpg'

interface FaqSectionProps {
  items?: Array<{ question: string; answer: string }>
}

export const FaqSection = ({ items: itemsProp }: FaqSectionProps) => {
  const t = useTranslations('home.faq_section')
  const items = useStandardFaqItems(itemsProp)

  return (
    <BottomFAQ
      heading={t('heading')}
      items={items}
      viewAllLabel={t('view_all')}
      viewAllHref="/tickets/faq"
      banner={ArtImage}
    />
  )
}
