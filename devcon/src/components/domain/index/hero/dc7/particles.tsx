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
      <div className="borboleta-3">
        <div className="borboleta-oval-squish">
          <div className="borboleta-oval">
            <div className="borboleta-radial">
              <div className="borboleta-gfx">
                <div className="borboleta-anim"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
