import React from 'react'
import css from './particles.module.scss'
// import './particles-keyframes.css'

export const Butterflies = () => {
  return (
    <div className={css['butterflies']}>
      <div className={css['borboletas']}>
        <div className={css['borboleta-1']}>
          <div className={css['borboleta-oval-squish']}>
            <div className={css['borboleta-oval']}>
              <div className={css['borboleta-radial']}>
                <div className={css['borboleta-gfx']}>
                  <div className={css['borboleta-anim']}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className={css['borboleta-2']}>
          <div className={css['borboleta-oval-squish']}>
            <div className={css['borboleta-oval']}>
              <div className={css['borboleta-radial']}>
                <div className={css['borboleta-gfx']}>
                  <div className={css['borboleta-anim']}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
