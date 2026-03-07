import React from 'react'
import { TextHoverEffect } from './TextHoverEffect'
import css from './landing-page.module.scss'

export function KeywordsSection() {
  return (
    <div className={css.keywords}>
      <div className={css['keywords-bg']} aria-hidden="true">
        <TextHoverEffect
          text="Devcon"
          strokeColor="rgba(22, 11, 43, 0.06)"
          fontFamily="Chloe, serif"
          fontSize="90"
          letterSpacing={-0.03}
          viewBoxOverride="0 0 355 97"
        />
      </div>
      <div className={`${css['keywords-text']} ${css['keywords-desktop']}`}>
        TALKS &bull; WORKSHOPS &bull; NETWORKING &bull; COWORK &bull; AI
        <br />
        CENSORSHIP RESISTANCE &bull; OPEN SOURCE &bull; PRIVACY &bull; SECURITY
        <br />
        DeFI &bull; Social &bull; CYPHERPUNK &bull; Art &bull; REAL WORLD ETHEREUM
      </div>
      <div className={`${css['keywords-text']} ${css['keywords-mobile']}`}>
        TALKS &bull; WORKSHOPS
        <br />
        NETWORKING &bull; COWORK &bull; AI
        <br />
        CENSORSHIP RESISTANCE
        <br />
        OPEN SOURCE &bull; PRIVACY
        <br />
        SECURITY &bull; DeFI &bull; Social
        <br />
        CYPHERPUNK &bull; Art
        <br />
        REAL WORLD ETHEREUM
      </div>
    </div>
  )
}
