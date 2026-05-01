import React from 'react'
import { WritingText } from './WritingText'
import css from './landing-page.module.scss'
import { useTranslations } from 'next-intl'

export function LargeCallout() {
  const t = useTranslations('home.callout')
  return (
    <div className={css.callout}>
      <div className={css['callout-pattern']} />
      <div className="section">
        <WritingText
          className={css['callout-text']}
          segments={[
            { text: t('line_1') },
            { text: t('line_2'), className: css['callout-bold'] },
          ]}
          triggerOnScroll
          stagger={0.05}
          stiffness={150}
          damping={18}
        />
      </div>
    </div>
  )
}
