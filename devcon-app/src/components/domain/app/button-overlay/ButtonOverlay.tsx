import React from 'react'
import css from './button-overlay.module.scss'

type ButtonContent = {
  id: number | string
  text?: string
  className?: string
  onClick: () => void
  render: () => React.ReactNode
}

type ButtonOverlayProps = {
  buttons: ButtonContent[]
  leftAligned?: boolean
}

export const ButtonOverlay = (props: ButtonOverlayProps) => {
  return (
    <div data-type="button-overlay" className={`${css['container']} section`}>
      <div className={`${css['shift-end']} ${props.leftAligned ? css['left-aligned'] : ''}`}>
        {props.buttons.map(button => {
          let className = css['content']

          if (button.className) className += ` ${button.className}`

          return (
            <div className={className} key={button.id} onClick={button.onClick}>
              {button.render()}
              {button.text && <span className={css['text']}>{button.text}</span>}
            </div>
          )
        })}
      </div>
      {/* <div className={css['content']}>
          {props.children}
          <span className={css['text']}>{props.text}</span>
        </div>

        <div className={css['content']}>
          {props.children}
          <span className={css['text']}>{props.text}</span>
        </div>
      </div> */}
    </div>
  )
}
