import React from 'react'
import { WritingText } from './WritingText'
import css from './landing-page.module.scss'

export function LargeCallout() {
  return (
    <div className={css.callout}>
      <div className={css['callout-pattern']} />
      <div className="section">
        <WritingText
          className={css['callout-text']}
          segments={[
            { text: 'India is not just where Ethereum is used.' },
            { text: "It's where Ethereum is built.", className: css['callout-bold'] },
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
